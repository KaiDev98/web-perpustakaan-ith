$ErrorActionPreference = 'Stop'
$backendRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$securePassword = $null
$passwordPtr = [IntPtr]::Zero
try {
  $email = Read-Host 'Email SUPERADMIN lokal'
  $displayName = Read-Host 'Nama tampilan SUPERADMIN'
  $securePassword = Read-Host 'Password SUPERADMIN (minimal 16 karakter)' -AsSecureString
  $passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $env:BOOTSTRAP_ONLY = 'SUPERADMIN'
  $env:BOOTSTRAP_SUPERADMIN_EMAIL = $email
  $env:BOOTSTRAP_SUPERADMIN_NAME = $displayName
  $env:BOOTSTRAP_SUPERADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
  Push-Location -LiteralPath $backendRoot
  try {
    & npm run admin:bootstrap
    if ($LASTEXITCODE -ne 0) { throw 'Bootstrap SUPERADMIN gagal. Periksa input dan koneksi database.' }
    & node scripts/verify-superadmin.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Akun dibuat, tetapi verifikasi login lokal gagal.' }
  } finally { Pop-Location }
} finally {
  if ($passwordPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr) }
  Remove-Item Env:BOOTSTRAP_ONLY,Env:BOOTSTRAP_SUPERADMIN_EMAIL,Env:BOOTSTRAP_SUPERADMIN_NAME,Env:BOOTSTRAP_SUPERADMIN_PASSWORD -ErrorAction SilentlyContinue
  $securePassword = $null
}
