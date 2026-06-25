$ports = 3000, 3001, 3002
foreach ($port in $ports) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Start-Sleep -Seconds 2

if (Test-Path .next) {
  Remove-Item -Recurse -Force .next
}

npm run dev
