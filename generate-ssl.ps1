# Generate SSL Certificate for HTTPS
Write-Host "Generating SSL Certificate for HTTPS..." -ForegroundColor Cyan
Write-Host ""

# Check if OpenSSL is installed
$opensslPath = Get-Command openssl -ErrorAction SilentlyContinue

if (-not $opensslPath) {
    Write-Host "OpenSSL not found. Generating certificate using PowerShell..." -ForegroundColor Yellow
    Write-Host ""
    
    # Create self-signed certificate using PowerShell
    $cert = New-SelfSignedCertificate `
        -Subject "CN=localhost" `
        -DnsName "localhost", "127.0.0.1", "192.168.8.101" `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -NotBefore (Get-Date) `
        -NotAfter (Get-Date).AddYears(1) `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -FriendlyName "Voice Control Server" `
        -HashAlgorithm SHA256 `
        -KeyUsage DigitalSignature, KeyEncipherment `
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")
    
    # Export certificate
    $certPath = Join-Path $PSScriptRoot "server-cert.pem"
    $keyPath = Join-Path $PSScriptRoot "server-key.pem"
    $pfxPath = Join-Path $PSScriptRoot "server.pfx"
    
    # Export as PFX (with no password)
    $pwd = ConvertTo-SecureString -String "" -Force -AsPlainText
    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pwd | Out-Null
    
    # Convert PFX to PEM format
    $certContent = [System.Convert]::ToBase64String($cert.Export('Cert'))
    "-----BEGIN CERTIFICATE-----" | Out-File -FilePath $certPath -Encoding ASCII
    for ($i = 0; $i -lt $certContent.Length; $i += 64) {
        $certContent.Substring($i, [Math]::Min(64, $certContent.Length - $i)) | Out-File -FilePath $certPath -Append -Encoding ASCII
    }
    "-----END CERTIFICATE-----" | Out-File -FilePath $certPath -Append -Encoding ASCII
    
    Write-Host "✓ SSL certificates created successfully!" -ForegroundColor Green
    Write-Host "  - server-cert.pem" -ForegroundColor Green
    Write-Host "  - server.pfx" -ForegroundColor Green
    Write-Host ""
    
} else {
    Write-Host "Using OpenSSL to generate certificates..." -ForegroundColor Yellow
    
    # Generate certificate with OpenSSL
    $certPath = Join-Path $PSScriptRoot "server-cert.pem"
    $keyPath = Join-Path $PSScriptRoot "server-key.pem"
    
    & openssl req -x509 -newkey rsa:4096 -keyout $keyPath -out $certPath -days 365 -nodes `
        -subj "/C=US/ST=State/L=City/O=VoiceControl/CN=localhost" `
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:192.168.8.101"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ SSL certificates created successfully!" -ForegroundColor Green
        Write-Host "  - server-cert.pem" -ForegroundColor Green
        Write-Host "  - server-key.pem" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "✗ Failed to create certificates" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. The server will automatically use HTTPS if certificates exist" -ForegroundColor White
Write-Host "2. Start server: " -ForegroundColor White -NoNewline
Write-Host "npm start" -ForegroundColor Yellow
Write-Host "3. Access: " -ForegroundColor White -NoNewline
Write-Host "https://192.168.8.101:10000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: You'll see a security warning in browser." -ForegroundColor Yellow
Write-Host "      Click 'Advanced' and 'Proceed to site'" -ForegroundColor Yellow
Write-Host ""
