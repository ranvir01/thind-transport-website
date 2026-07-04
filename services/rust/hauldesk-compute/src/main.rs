//! HaulDesk compute sidecar — IFTA penny math and other correctness-critical work.
//! Mirrors `src/lib/hub/ifta-core.ts`; golden-fixture parity is enforced by the
//! test module below (`cargo test`), which copies every fixture and expected
//! penny from the TS suites.
//!
//! Security: when HAULDESK_SIDECAR_SECRET is set, every route except /health
//! requires a matching X-Hauldesk-Secret header (sent by src/lib/hub/sidecars.ts
//! from the same env var). Never expose this service publicly without it.

use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use tiny_http::{Header, Method, Response, Server, StatusCode};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IftaInputs {
    miles_by_jurisdiction: BTreeMap<String, f64>,
    gallons_by_jurisdiction: BTreeMap<String, f64>,
    rates: BTreeMap<String, RateEntry>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RateEntry {
    rate: f64,
    #[serde(default)]
    surcharge_rate: Option<f64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct IftaReportRow {
    jurisdiction: String,
    miles: f64,
    taxable_gallons: f64,
    tax_paid_gallons: f64,
    rate: f64,
    surcharge_rate: f64,
    tax_cents: i64,
    surcharge_cents: i64,
    net_cents: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct IftaResult {
    fleet_miles: f64,
    fleet_gallons: f64,
    mpg: f64,
    rows: Vec<IftaReportRow>,
    net_tax_cents: i64,
    missing_rates: Vec<String>,
    source: &'static str,
}

fn round_half_away_from_zero(x: f64) -> i64 {
    if x >= 0.0 {
        (x + 0.5).floor() as i64
    } else {
        (x - 0.5).ceil() as i64
    }
}

/// Port of `computeIfta` in `src/lib/hub/ifta-core.ts` (golden parity: see tests).
fn compute_ifta(inputs: &IftaInputs) -> IftaResult {
    let mut jurisdictions = BTreeSet::new();
    jurisdictions.extend(inputs.miles_by_jurisdiction.keys().cloned());
    jurisdictions.extend(inputs.gallons_by_jurisdiction.keys().cloned());

    let fleet_miles: f64 = inputs.miles_by_jurisdiction.values().sum();
    let fleet_gallons: f64 = inputs.gallons_by_jurisdiction.values().sum();
    let mpg = if fleet_gallons > 0.0 {
        fleet_miles / fleet_gallons
    } else {
        0.0
    };

    let mut rows = Vec::new();
    let mut missing_rates = Vec::new();

    for jurisdiction in jurisdictions {
        let miles = *inputs.miles_by_jurisdiction.get(&jurisdiction).unwrap_or(&0.0);
        let tax_paid_gallons = *inputs
            .gallons_by_jurisdiction
            .get(&jurisdiction)
            .unwrap_or(&0.0);

        let Some(rate_entry) = inputs.rates.get(&jurisdiction) else {
            // Purchases-only jurisdictions matter too: without a rate their
            // tax-paid credit silently computes to $0 (parity with ifta-core.ts).
            if miles > 0.0 || tax_paid_gallons > 0.0 {
                missing_rates.push(jurisdiction.clone());
            }
            rows.push(IftaReportRow {
                jurisdiction,
                miles,
                taxable_gallons: if mpg > 0.0 { miles / mpg } else { 0.0 },
                tax_paid_gallons,
                rate: 0.0,
                surcharge_rate: 0.0,
                tax_cents: 0,
                surcharge_cents: 0,
                net_cents: 0,
            });
            continue;
        };

        let taxable_gallons = if mpg > 0.0 { miles / mpg } else { 0.0 };
        let tax_cents = round_half_away_from_zero(
            (taxable_gallons - tax_paid_gallons) * rate_entry.rate * 100.0,
        );
        let surcharge_rate = rate_entry.surcharge_rate.unwrap_or(0.0);
        let surcharge_cents = if surcharge_rate > 0.0 {
            round_half_away_from_zero(taxable_gallons * surcharge_rate * 100.0)
        } else {
            0
        };

        rows.push(IftaReportRow {
            jurisdiction,
            miles: (miles * 100.0).round() / 100.0,
            taxable_gallons: (taxable_gallons * 1000.0).round() / 1000.0,
            tax_paid_gallons: (tax_paid_gallons * 1000.0).round() / 1000.0,
            rate: rate_entry.rate,
            surcharge_rate,
            tax_cents,
            surcharge_cents,
            net_cents: tax_cents + surcharge_cents,
        });
    }

    let net_tax_cents: i64 = rows.iter().map(|r| r.net_cents).sum();

    IftaResult {
        fleet_miles: (fleet_miles * 100.0).round() / 100.0,
        fleet_gallons: (fleet_gallons * 1000.0).round() / 1000.0,
        mpg: (mpg * 10000.0).round() / 10000.0,
        rows,
        net_tax_cents,
        missing_rates,
        source: "rust-compute",
    }
}

fn json_response(status: u16, body: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    Response::from_string(body)
        .with_status_code(StatusCode(status))
        .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
}

/// Constant-time-ish comparison is overkill for a LAN sidecar, but never leak
/// which prefix matched: compare full bytes only when lengths agree.
fn secret_matches(request: &tiny_http::Request, secret: &str) -> bool {
    let sent = request
        .headers()
        .iter()
        .find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("x-hauldesk-secret"))
        .map(|h| h.value.as_str().to_string())
        .unwrap_or_default();
    sent.len() == secret.len()
        && sent
            .bytes()
            .zip(secret.bytes())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
            == 0
}

fn main() {
    let secret = std::env::var("HAULDESK_SIDECAR_SECRET").unwrap_or_default();
    let server = Server::http("0.0.0.0:8082").expect("bind :8082");
    eprintln!(
        "hauldesk-compute listening on :8082 (auth: {})",
        !secret.is_empty()
    );

    for mut request in server.incoming_requests() {
        let path = request.url().to_string();
        let method = request.method().clone();

        // /health stays open for load-balancer checks; work endpoints are gated.
        if path != "/health" && !secret.is_empty() && !secret_matches(&request, &secret) {
            let _ = request.respond(json_response(401, r#"{"error":"unauthorized"}"#));
            continue;
        }

        let response = match (method, path.as_str()) {
            (Method::Get, "/health") => json_response(
                200,
                r#"{"service":"hauldesk-compute","status":"ok"}"#,
            ),
            (Method::Post, "/ifta/summary") => {
                let mut body = String::new();
                if request.as_reader().read_to_string(&mut body).is_err() {
                    json_response(400, r#"{"error":"bad request"}"#)
                } else {
                    match serde_json::from_str::<IftaInputs>(&body) {
                        Ok(inputs) => {
                            let result = compute_ifta(&inputs);
                            match serde_json::to_string(&result) {
                                Ok(json) => json_response(200, &json),
                                Err(_) => json_response(500, r#"{"error":"encode failed"}"#),
                            }
                        }
                        Err(_) => json_response(400, r#"{"error":"invalid ifta inputs"}"#),
                    }
                }
            }
            _ => json_response(404, r#"{"error":"not found"}"#),
        };

        let _ = request.respond(response);
    }
}
#[cfg(test)]
mod tests {
    //! Golden-parity suite: every fixture and expected penny below is copied
    //! from `src/lib/hub/__tests__/ifta.test.ts` and `fuel-use.test.ts`.
    //! If these pass, the Rust engine is line-for-line compatible with the TS
    //! engine — the precondition for ever setting HAULDESK_RUST_COMPUTE_URL
    //! in production. Change a number here only when the TS golden changes.
    use super::*;

    fn inputs(
        miles: &[(&str, f64)],
        gallons: &[(&str, f64)],
        rates: &[(&str, f64, Option<f64>)],
    ) -> IftaInputs {
        IftaInputs {
            miles_by_jurisdiction: miles.iter().map(|(j, m)| (j.to_string(), *m)).collect(),
            gallons_by_jurisdiction: gallons.iter().map(|(j, g)| (j.to_string(), *g)).collect(),
            rates: rates
                .iter()
                .map(|(j, r, s)| {
                    (
                        j.to_string(),
                        RateEntry {
                            rate: *r,
                            surcharge_rate: *s,
                        },
                    )
                })
                .collect(),
        }
    }

    fn row<'a>(result: &'a IftaResult, jurisdiction: &str) -> &'a IftaReportRow {
        result
            .rows
            .iter()
            .find(|r| r.jurisdiction == jurisdiction)
            .unwrap_or_else(|| panic!("missing row {jurisdiction}"))
    }

    /// ifta.test.ts "IFTA golden fixture (hand-computed, surcharge state included)"
    #[test]
    fn golden_fixture_surcharge_quarter() {
        let result = compute_ifta(&inputs(
            &[("WA", 4000.0), ("ID", 1000.0), ("IN", 2000.0)],
            &[("WA", 600.0), ("ID", 100.0), ("IN", 300.0)],
            &[
                ("WA", 0.494, None),
                ("ID", 0.33, None),
                ("IN", 0.55, Some(0.11)),
            ],
        ));

        assert_eq!(result.fleet_miles, 7000.0);
        assert_eq!(result.fleet_gallons, 1000.0);
        assert_eq!(result.mpg, 7.0);

        let wa = row(&result, "WA");
        assert_eq!(wa.tax_cents, -1411);
        assert_eq!(wa.surcharge_cents, 0);

        assert_eq!(row(&result, "ID").tax_cents, 1414);

        let indiana = row(&result, "IN");
        assert_eq!(indiana.tax_cents, -786);
        assert_eq!(indiana.surcharge_cents, 3143);
        assert_eq!(indiana.net_cents, 2357);

        assert_eq!(result.net_tax_cents, 2360); // $23.60 due
        assert!(result.missing_rates.is_empty());
    }

    /// ifta.test.ts "flags jurisdictions traveled without a rate on file"
    #[test]
    fn missing_rates_flagged() {
        let result = compute_ifta(&inputs(
            &[("WA", 100.0), ("MT", 50.0)],
            &[("WA", 20.0)],
            &[("WA", 0.494, None)],
        ));
        assert_eq!(result.missing_rates, vec!["MT".to_string()]);
        assert_eq!(row(&result, "MT").net_cents, 0);
    }

    /// ifta.test.ts "flags purchases-only jurisdictions without a rate on file"
    #[test]
    fn missing_rates_flagged_for_purchases_only() {
        let result = compute_ifta(&inputs(
            &[("WA", 100.0)],
            &[("WA", 20.0), ("CA", 30.0)],
            &[("WA", 0.494, None)],
        ));
        assert_eq!(result.missing_rates, vec!["CA".to_string()]);
        assert_eq!(row(&result, "CA").net_cents, 0);
    }

    /// fuel-use.test.ts reefer-exemption golden: correctly classified reefer
    /// gallons (absent from tax-paid) vs the bug where they leak in as tractor.
    #[test]
    fn reefer_exemption_parity() {
        let miles = [("WA", 9000.0), ("OR", 4500.0)];
        let rates = [("WA", 0.494, None), ("OR", 0.0, None)];

        // Correct: 13,500 mi ÷ 1,800 gal = 7.5 MPG; WA credit == taxable → $0.00.
        let correct = compute_ifta(&inputs(&miles, &[("WA", 1200.0), ("OR", 600.0)], &rates));
        assert_eq!(correct.mpg, 7.5);
        assert_eq!(correct.fleet_gallons, 1800.0);
        assert_eq!(row(&correct, "WA").net_cents, 0);

        // Buggy: reefer gallons counted → 2,040 gal; WA owes $4.94 that isn't real.
        let buggy = compute_ifta(&inputs(&miles, &[("WA", 1350.0), ("OR", 690.0)], &rates));
        assert_eq!(buggy.fleet_gallons, 2040.0);
        assert_eq!(row(&buggy, "WA").net_cents, 494);
        assert!(buggy.mpg < correct.mpg);
    }

    /// No gallons at all: MPG 0, nothing taxable, nothing owed (no divide-by-zero).
    #[test]
    fn zero_gallons_zero_mpg() {
        let result = compute_ifta(&inputs(&[("WA", 500.0)], &[], &[("WA", 0.494, None)]));
        assert_eq!(result.mpg, 0.0);
        assert_eq!(row(&result, "WA").taxable_gallons, 0.0);
        assert_eq!(result.net_tax_cents, 0);
    }

    /// The exact camelCase JSON the TS gateway (sidecars.ts) sends must parse,
    /// and the reply must serialize with the field names IftaResult uses in TS.
    #[test]
    fn json_contract_matches_ts_gateway() {
        let body = r#"{
            "milesByJurisdiction": {"WA": 4000, "ID": 1000, "IN": 2000},
            "gallonsByJurisdiction": {"WA": 600, "ID": 100, "IN": 300},
            "rates": {
                "WA": {"rate": 0.494},
                "ID": {"rate": 0.33},
                "IN": {"rate": 0.55, "surchargeRate": 0.11}
            }
        }"#;
        let parsed: IftaInputs = serde_json::from_str(body).expect("gateway JSON must parse");
        let result = compute_ifta(&parsed);
        assert_eq!(result.net_tax_cents, 2360);

        let json = serde_json::to_string(&result).expect("must serialize");
        for key in [
            "fleetMiles",
            "fleetGallons",
            "mpg",
            "taxableGallons",
            "taxPaidGallons",
            "surchargeCents",
            "netCents",
            "netTaxCents",
            "missingRates",
        ] {
            assert!(json.contains(key), "missing camelCase key {key} in {json}");
        }
    }
}
