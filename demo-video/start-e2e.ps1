# Runs the production build against the LOCAL e2e database.
# Outgoing mail goes to the local mail catcher (mail-sink.mjs on port 2525), never to a real SMTP server.
$env:DATABASE_URL = "postgresql://e2e:e2e_local_only@localhost:55432/rms_e2e"
$env:DIRECT_URL = $env:DATABASE_URL
$env:NEXTAUTH_URL = "http://rms.localhost:3001"
$env:AUTH_URL = "http://rms.localhost:3001"
$env:AUTH_TRUST_HOST = "true"
$env:SMTP_HOST = "127.0.0.1"
$env:SMTP_PORT = "2525"
$env:SMTP_SECURE = "false"
$env:SMTP_USER = ""
$env:SMTP_PASS = ""
$env:SMTP_FROM = "demo@rms.localhost"
Set-Location (Split-Path $PSScriptRoot -Parent)
npx next start -p 3001
