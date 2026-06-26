fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure()
        .build_server(true)
        .compile(&["../../proto/hauldesk/v1/loads.proto"], &["../../proto"])?;
    Ok(())
}
