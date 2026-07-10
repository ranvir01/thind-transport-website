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

/// f64::round IS round-half-away-from-zero, and unlike the `(x + 0.5).floor()`
/// idiom it never misrounds near-tie floats (0.49999999999999994 + 0.5 == 1.0
/// exactly in f64) — keeping it bit-for-bit with the TS gateway's
/// `Math.sign(v) * Math.round(Math.abs(v))` (src/lib/hub/rounding.ts).
fn round_half_away_from_zero(x: f64) -> i64 {
    x.round() as i64
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
fn secret_matches_header(sent: Option<&str>, secret: &str) -> bool {
    let sent = sent.unwrap_or_default();
    sent.len() == secret.len()
        && sent
            .bytes()
            .zip(secret.bytes())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
            == 0
}

fn header_value<'a>(request: &'a tiny_http::Request, name: &str) -> Option<&'a str> {
    request
        .headers()
        .iter()
        .find(|h| h.field.as_str().as_str().eq_ignore_ascii_case(name))
        .map(|h| h.value.as_str())
}

/// Auth-gate + route dispatch, decoupled from the live `tiny_http::Request` so
/// the handler wiring below is unit-tested as built (mirrors newMux() in the
/// Go worker's main_test.go: main and the tests share this exact logic).
fn handle(method: &Method, path: &str, secret_header: Option<&str>, body: &str, secret: &str) -> (u16, String) {
    // /health stays open for load-balancer checks; work endpoints are gated.
    if path != "/health" && !secret.is_empty() && !secret_matches_header(secret_header, secret) {
        return (401, r#"{"error":"unauthorized"}"#.to_string());
    }

    match (method, path) {
        (Method::Get, "/health") => (
            200,
            r#"{"service":"hauldesk-compute","status":"ok"}"#.to_string(),
        ),
        (Method::Post, "/ifta/summary") => match serde_json::from_str::<IftaInputs>(body) {
            Ok(inputs) => {
                let result = compute_ifta(&inputs);
                match serde_json::to_string(&result) {
                    Ok(json) => (200, json),
                    Err(_) => (500, r#"{"error":"encode failed"}"#.to_string()),
                }
            }
            Err(_) => (400, r#"{"error":"invalid ifta inputs"}"#.to_string()),
        },
        _ => (404, r#"{"error":"not found"}"#.to_string()),
    }
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
        let secret_header = header_value(&request, "x-hauldesk-secret").map(|s| s.to_string());

        let mut body = String::new();
        if method == Method::Post && request.as_reader().read_to_string(&mut body).is_err() {
            let _ = request.respond(json_response(400, r#"{"error":"bad request"}"#));
            continue;
        }

        let (status, resp_body) = handle(&method, &path, secret_header.as_deref(), &body, &secret);
        let _ = request.respond(json_response(status, &resp_body));
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

    // Auth-middleware suite (parity with the Go worker's TestHealthOpenWithSecretSet
    // / TestSecretGate): health stays open, work endpoints 401 without/with-wrong
    // header and 200 with the matching one.
    #[test]
    fn health_open_with_secret_set() {
        let (status, body) = handle(&Method::Get, "/health", None, "", "s3cret");
        assert_eq!(status, 200);
        assert!(body.contains("\"status\":\"ok\""));
    }

    #[test]
    fn secret_gate_401_without_header() {
        let (status, _) = handle(&Method::Post, "/ifta/summary", None, "{}", "s3cret");
        assert_eq!(status, 401);
    }

    #[test]
    fn secret_gate_401_with_wrong_header() {
        let (status, _) = handle(&Method::Post, "/ifta/summary", Some("wrong"), "{}", "s3cret");
        assert_eq!(status, 401);
    }

    #[test]
    fn secret_gate_200_with_matching_header() {
        let body = r#"{"milesByJurisdiction":{},"gallonsByJurisdiction":{},"rates":{}}"#;
        let (status, _) = handle(&Method::Post, "/ifta/summary", Some("s3cret"), body, "s3cret");
        assert_eq!(status, 200);
    }

    #[test]
    fn secret_gate_open_when_secret_unset() {
        let body = r#"{"milesByJurisdiction":{},"gallonsByJurisdiction":{},"rates":{}}"#;
        let (status, _) = handle(&Method::Post, "/ifta/summary", None, body, "");
        assert_eq!(status, 200);
    }

    #[test]
    fn unknown_path_is_404() {
        let (status, _) = handle(&Method::Get, "/nope", Some("s3cret"), "", "s3cret");
        assert_eq!(status, 404);
    }

    #[test]
    fn malformed_ifta_body_is_400() {
        let (status, _) = handle(&Method::Post, "/ifta/summary", Some("s3cret"), "{not json", "s3cret");
        assert_eq!(status, 400);
    }

    /// money.test.ts "rounds half away from zero" golden, plus the near-tie
    /// floats where `(x + 0.5).floor()` diverges from JS Math.round:
    /// 0.49999999999999994 + 0.5 == 1.0 exactly in f64, so the old idiom
    /// returned ±1 for a value strictly below the half-cent boundary.
    #[test]
    fn round_half_away_from_zero_matches_ts_money_rounding() {
        assert_eq!(round_half_away_from_zero(11110.5), 11111);
        assert_eq!(round_half_away_from_zero(-11110.5), -11111);
        assert_eq!(round_half_away_from_zero(785.714), 786);
        assert_eq!(round_half_away_from_zero(-785.714), -786);
        assert_eq!(round_half_away_from_zero(0.0), 0);
        // Largest f64 strictly below 0.5 — must round to 0, as in TS.
        assert_eq!(round_half_away_from_zero(0.499_999_999_999_999_94), 0);
        assert_eq!(round_half_away_from_zero(-0.499_999_999_999_999_94), 0);
    }

    #[test]
    fn secret_matches_header_rejects_length_mismatch_and_wrong_bytes() {
        assert!(secret_matches_header(Some("s3cret"), "s3cret"));
        assert!(!secret_matches_header(Some("s3cre"), "s3cret"));
        assert!(!secret_matches_header(Some("wrong!"), "s3cret"));
        assert!(!secret_matches_header(None, "s3cret"));
        assert!(secret_matches_header(None, ""));
    }
}
