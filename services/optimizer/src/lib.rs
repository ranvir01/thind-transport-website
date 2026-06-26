//! Routing, ETA, and IFTA compute — called from Go over gRPC.

pub fn estimate_eta_stub(load_ref: &str) -> Option<u32> {
    let _ = load_ref;
    None
}

pub fn calc_ifta_stub(_carrier_id: &str, _quarter: &str) -> Vec<String> {
    vec![]
}
