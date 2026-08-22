# Run once on the server PC as Administrator (right-click PowerShell -> Run as administrator).
#
# Creates a local Certificate Authority + an HTTPS certificate for your app name
# (default agstudio.com), then exports two files:
#   deploy\ca.cer        -> install on ALL 3 PCs (browsers will trust https://agstudio.com)
#   deploy\agstudio.pfx  -> the server uses this (path goes in backend\.env)
#
# No internet needed. Windows has everything built in.
param(
  [string]$OutputDir = "$PSScriptRoot\..\deploy",
  [string]$DnsName = "agstudio.com",
  [string]$PfxPassword = "studio123"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$caName = "AG Studio Local CA"
$existingCa = Get-ChildItem Cert:\LocalMachine\My |
  Where-Object { $_.Subject -eq "CN=$caName" } |
  Select-Object -First 1

if (-not $existingCa) {
  Write-Host "Creating local CA..."
  $existingCa = New-SelfSignedCertificate `
    -Subject "CN=$caName" `
    -CertStoreLocation Cert:\LocalMachine\My `
    -KeyExportPolicy Exportable `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -Type Custom `
    -KeyUsage CertSign, CRLSign, DigitalSignature `
    -TextExtension @("2.5.29.19={critical}{text}ca=TRUE&pathlength=3") `
    -NotAfter (Get-Date).AddYears(10)
} else {
  Write-Host "Reusing existing local CA."
}

Write-Host "Creating HTTPS certificate for $DnsName..."
$leaf = New-SelfSignedCertificate `
  -Subject "CN=$DnsName" `
  -DnsName $DnsName `
  -CertStoreLocation Cert:\LocalMachine\My `
  -Signer $existingCa `
  -KeyExportPolicy Exportable `
  -KeyAlgorithm RSA `
  -KeyLength 2048 `
  -Type Custom `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1") `
  -NotAfter (Get-Date).AddYears(5)

Export-Certificate -Cert $existingCa -FilePath (Join-Path $OutputDir "ca.cer") -Type CERT | Out-Null
$pwd = ConvertTo-SecureString $PfxPassword -Force -AsPlainText
Export-PfxCertificate -Cert $leaf -FilePath (Join-Path $OutputDir "agstudio.pfx") -Password $pwd | Out-Null

Write-Host ""
Write-Host "Done. Files written to:"
Write-Host "  CA  : $OutputDir\ca.cer"
Write-Host "  PKCS: $OutputDir\agstudio.pfx   (PFX password: $PfxPassword)"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1) Copy ca.cer to all 3 PCs, right-click -> Install Certificate ->"
Write-Host "     Local Machine -> Trusted Root Certification Authorities."
Write-Host "  2) Add to each PC's hosts file (C:\Windows\System32\drivers\etc\hosts):"
Write-Host "     <server-ip> $DnsName"
