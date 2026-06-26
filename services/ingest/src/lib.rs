//! Telematics / ELD ingestion — streaming service stub.

pub async fn ingest_eld_stub(_payload: &[u8]) -> Result<(), &'static str> {
    Ok(())
}
