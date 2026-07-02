//! HaulDesk compute sidecar — IFTA penny math and other correctness-critical work.
//! Mirrors `src/lib/hub/ifta-core.ts` until golden-fixture parity is verified.
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

/// Port of `computeIfta` in `src/lib/hub/ifta-core.ts` (stub — verify against golden fixtures).
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
            if miles > 0.0 {
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
        source: "rust-compute-stub",
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