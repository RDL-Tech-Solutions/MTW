
# Kill process on port 3000 (Backend default?)
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "Killing process on port 3000 (PID: $($port3000.OwningProcess))"
    Stop-Process -Id $port3000.OwningProcess -Force -ErrorAction SilentlyContinue
}

# Kill process on port 3001 (Backend alternative?)
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port3001) {
    Write-Host "Killing process on port 3001 (PID: $($port3001.OwningProcess))"
    Stop-Process -Id $port3001.OwningProcess -Force -ErrorAction SilentlyContinue
}

# Kill process on port 5173 (Vite)
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($port5173) {
    Write-Host "Killing process on port 5173 (PID: $($port5173.OwningProcess))"
    Stop-Process -Id $port5173.OwningProcess -Force -ErrorAction SilentlyContinue
}

# Start Backend
Write-Host "Starting Backend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'backend'; npm run dev" -WorkingDirectory "c:\Users\RDL Tech Solutions\Documents\RDL\Projetos\MTW"

# Start Frontend
Write-Host "Starting Admin Panel..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'admin-panel'; npm run dev" -WorkingDirectory "c:\Users\RDL Tech Solutions\Documents\RDL\Projetos\MTW"

Write-Host "Done."
