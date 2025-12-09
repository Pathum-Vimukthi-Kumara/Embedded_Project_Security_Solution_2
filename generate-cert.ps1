# Quick SSL Certificate Generator
Write-Host "Generating SSL certificate..." -ForegroundColor Cyan

# Create certificate
$cert = New-SelfSignedCertificate -DnsName "localhost", "127.0.0.1", "192.168.8.101" -CertStoreLocation cert:\CurrentUser\My -NotAfter (Get-Date).AddYears(1)

# Export PFX
$pwd = ConvertTo-SecureString -String "password" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath server.pfx -Password $pwd | Out-Null

# Export certificate
$certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
$certPem = "-----BEGIN CERTIFICATE-----`n"
$certPem += [System.Convert]::ToBase64String($certBytes, 'InsertLineBreaks')
$certPem += "`n-----END CERTIFICATE-----"
$certPem | Out-File -FilePath server-cert.pem -Encoding ascii

# Export private key
$rsaKey = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
$keyBytes = $rsaKey.ExportRSAPrivateKey()
$keyPem = "-----BEGIN RSA PRIVATE KEY-----`n"
$keyPem += [System.Convert]::ToBase64String($keyBytes, 'InsertLineBreaks')
$keyPem += "`n-----END RSA PRIVATE KEY-----"
$keyPem | Out-File -FilePath server-key.pem -Encoding ascii

# Cleanup
Remove-Item "cert:\CurrentUser\My\$($cert.Thumbprint)"

Write-Host "✅ Certificate files generated:" -ForegroundColor Green
Write-Host "   - server-cert.pem" -ForegroundColor White
Write-Host "   - server-key.pem" -ForegroundColor White  
Write-Host "   - server.pfx" -ForegroundColor White
Write-Host ""
Write-Host "Now restart the server: npm start" -ForegroundColor Cyan
