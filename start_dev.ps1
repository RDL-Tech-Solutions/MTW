# ============================================================================
# Script de Gerenciamento de Servidores - PreçoCerto Dev
# ============================================================================
# Funcionalidades:
# - Iniciar/Parar/Reiniciar servidores Backend e Admin Panel
# - Monitorar logs em tempo real
# - Verificar status dos servidores
# - Abrir painel admin no navegador
# ============================================================================

# Variáveis globais
$Global:BackendProcess = $null
$Global:AdminProcess = $null
$Global:ProjectRoot = $PSScriptRoot

# Funcao para exibir cabecalho
function Show-Header {
    param([string]$Title)
    Clear-Host
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Magenta
    Write-Host "  $Title" -ForegroundColor Magenta
    Write-Host "======================================================================" -ForegroundColor Magenta
}

# Função para timestamp
function Get-TimeStamp {
    return Get-Date -Format "HH:mm:ss"
}

# Função para verificar se porta está em uso
function Test-PortInUse {
    param([int]$Port)
    
    $connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $Port }
    return $connections.Count -gt 0
}

# Funcao para matar processos Node.js
function Stop-NodeProcesses {
    Write-Host ""
    Write-Host "[$(Get-TimeStamp)] [*] Verificando processos Node.js existentes..." -ForegroundColor Yellow
    
    $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
    
    if ($nodeProcesses) {
        Write-Host "[$(Get-TimeStamp)]    [!] Processos Node.js encontrados. Encerrando..." -ForegroundColor Yellow
        foreach ($proc in $nodeProcesses) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            }
            catch {
                Write-Host "[$(Get-TimeStamp)]    [!] Aviso: Nao foi possivel encerrar processo $($proc.Id)" -ForegroundColor Yellow
            }
        }
        Start-Sleep -Seconds 2
        Write-Host "[$(Get-TimeStamp)]    [OK] Processos Node.js encerrados" -ForegroundColor Green
    }
    else {
        Write-Host "[$(Get-TimeStamp)]    [OK] Nenhum processo Node.js em execucao" -ForegroundColor Green
    }
}

# Função para obter status dos servidores
function Get-ServerStatus {
    $backendRunning = Test-PortInUse -Port 3000
    $adminRunning = Test-PortInUse -Port 5173
    
    return @{
        Backend  = if ($backendRunning) { "[ONLINE]" } else { "[OFFLINE]" }
        Admin    = if ($adminRunning) { "[ONLINE]" } else { "[OFFLINE]" }
        Port3000 = if ($backendRunning) { "[EM USO]" } else { "[LIVRE]" }
        Port5173 = if ($adminRunning) { "[EM USO]" } else { "[LIVRE]" }
    }
}

# Funcao para iniciar servidores
function Start-Servers {
    Write-Host ""
    Write-Host "[$(Get-TimeStamp)] [>>] Iniciando Servidores..." -ForegroundColor Cyan
    
    # Verificar diretorios
    $backendDir = Join-Path $Global:ProjectRoot "backend"
    $adminDir = Join-Path $Global:ProjectRoot "admin-panel"
    
    if (-not (Test-Path $backendDir)) {
        Write-Host "[$(Get-TimeStamp)] [X] ERRO: Diretorio backend nao encontrado: $backendDir" -ForegroundColor Red
        return $false
    }
    
    if (-not (Test-Path $adminDir)) {
        Write-Host "[$(Get-TimeStamp)] [X] ERRO: Diretorio admin-panel nao encontrado: $adminDir" -ForegroundColor Red
        return $false
    }
    
    # Verificar se node_modules existem
    $backendNodeModules = Join-Path $backendDir "node_modules"
    $adminNodeModules = Join-Path $adminDir "node_modules"
    
    if (-not (Test-Path $backendNodeModules)) {
        Write-Host "[$(Get-TimeStamp)] [!] AVISO: node_modules nao encontrado no backend" -ForegroundColor Yellow
        Write-Host "[$(Get-TimeStamp)]    Execute 'npm install' no diretorio backend primeiro" -ForegroundColor Yellow
        return $false
    }
    
    if (-not (Test-Path $adminNodeModules)) {
        Write-Host "[$(Get-TimeStamp)] [!] AVISO: node_modules nao encontrado no admin-panel" -ForegroundColor Yellow
        Write-Host "[$(Get-TimeStamp)]    Execute 'npm install' no diretorio admin-panel primeiro" -ForegroundColor Yellow
        return $false
    }
    
    # Matar processos Node existentes
    Stop-NodeProcesses
    
    # Iniciar Backend em nova janela do PowerShell
    Write-Host ""
    Write-Host "[$(Get-TimeStamp)] [BACKEND] Iniciando Backend..." -ForegroundColor Blue
    Write-Host "   Diretorio: $backendDir" -ForegroundColor Cyan
    
    try {
        $backendTitle = "Backend Server - PreçoCerto (Porta 3000)"
        $Global:BackendProcess = Start-Process -FilePath "powershell.exe" `
            -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle='$backendTitle'; cd '$backendDir'; Write-Host '[>>] Backend Server - PreçoCerto' -ForegroundColor Green; Write-Host '    Porta: 3000' -ForegroundColor Cyan; Write-Host ''; npm run dev" `
            -PassThru `
            -WindowStyle Normal
        
        Write-Host "[$(Get-TimeStamp)]    [OK] Backend iniciado! (PID: $($Global:BackendProcess.Id))" -ForegroundColor Green
    }
    catch {
        Write-Host "[$(Get-TimeStamp)]    [X] Erro ao iniciar backend: $_" -ForegroundColor Red
        return $false
    }
    
    Start-Sleep -Seconds 2
    
    # Iniciar Admin Panel em nova janela do PowerShell
    Write-Host ""
    Write-Host "[$(Get-TimeStamp)] [ADMIN] Iniciando Admin Panel..." -ForegroundColor Blue
    Write-Host "   Diretorio: $adminDir" -ForegroundColor Cyan
    
    try {
        $adminTitle = "Admin Panel - PreçoCerto (Porta 5173)"
        $Global:AdminProcess = Start-Process -FilePath "powershell.exe" `
            -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle='$adminTitle'; cd '$adminDir'; Write-Host '[>>] Admin Panel - PreçoCerto' -ForegroundColor Green; Write-Host '    Porta: 5173' -ForegroundColor Cyan; Write-Host '    URL: http://localhost:5173' -ForegroundColor Blue; Write-Host ''; npm run dev" `
            -PassThru `
            -WindowStyle Normal
        
        Write-Host "[$(Get-TimeStamp)]    [OK] Admin Panel iniciado! (PID: $($Global:AdminProcess.Id))" -ForegroundColor Green
    }
    catch {
        Write-Host "[$(Get-TimeStamp)]    [X] Erro ao iniciar admin panel: $_" -ForegroundColor Red
        return $false
    }
    
    # Aguardar servidores iniciarem
    Write-Host ""
    Write-Host "[$(Get-TimeStamp)] [WAIT] Aguardando servidores iniciarem..." -ForegroundColor Yellow
    
    $maxWait = 30
    $waited = 0
    $backendReady = $false
    $adminReady = $false
    
    while ($waited -lt $maxWait -and (-not $backendReady -or -not $adminReady)) {
        Start-Sleep -Seconds 1
        $waited++
        
        if (-not $backendReady) {
            $backendReady = Test-PortInUse -Port 3000
            if ($backendReady) {
                Write-Host "[$(Get-TimeStamp)]    [OK] Backend pronto! (${waited}s)" -ForegroundColor Green
            }
        }
        
        if (-not $adminReady) {
            $adminReady = Test-PortInUse -Port 5173
            if ($adminReady) {
                Write-Host "[$(Get-TimeStamp)]    [OK] Admin Panel pronto! (${waited}s)" -ForegroundColor Green
            }
        }
        
        if ($waited -eq 10 -and (-not $backendReady -or -not $adminReady)) {
            Write-Host "[$(Get-TimeStamp)]    [*] Ainda aguardando..." -ForegroundColor Yellow
        }
    }
    
    if (-not $backendReady -or -not $adminReady) {
        Write-Host "[$(Get-TimeStamp)]    [!] AVISO: Servidores demoraram mais que o esperado" -ForegroundColor Yellow
        if (-not $backendReady) {
            Write-Host "[$(Get-TimeStamp)]       Backend nao respondeu na porta 3000" -ForegroundColor Yellow
        }
        if (-not $adminReady) {
            Write-Host "[$(Get-TimeStamp)]       Admin Panel nao respondeu na porta 5173" -ForegroundColor Yellow
        }
    }
    
    # Abrir navegador
    Write-Host ""
    Write-Host "[$(Get-TimeStamp)] [WEB] Abrindo Admin Panel no navegador..." -ForegroundColor Blue
    try {
        Start-Process "http://localhost:5173"
        Write-Host "[$(Get-TimeStamp)]    [OK] Navegador aberto" -ForegroundColor Green
    }
    catch {
        Write-Host "[$(Get-TimeStamp)]    [!] Nao foi possivel abrir o navegador automaticamente" -ForegroundColor Yellow
        Write-Host "[$(Get-TimeStamp)]    Acesse manualmente: http://localhost:5173" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "[$(Get-TimeStamp)] [OK] Servidores iniciados!" -ForegroundColor Green
    Write-Host "[$(Get-TimeStamp)]    Backend:     http://localhost:3000" -ForegroundColor Cyan
    Write-Host "[$(Get-TimeStamp)]    Admin Panel: http://localhost:5173" -ForegroundColor Cyan
    
    return $true
}

# Funcao para parar servidores
function Stop-Servers {
    Write-Host ""
    Write-Host "[$(Get-TimeStamp)] [STOP] Parando servidores..." -ForegroundColor Yellow
    
    $stopped = $false
    
    # Parar Backend
    if ($Global:BackendProcess -and -not $Global:BackendProcess.HasExited) {
        Write-Host "[$(Get-TimeStamp)]    Parando Backend (PID: $($Global:BackendProcess.Id))..." -ForegroundColor Yellow
        try {
            Stop-Process -Id $Global:BackendProcess.Id -Force -ErrorAction Stop
            Write-Host "[$(Get-TimeStamp)]    [OK] Backend parado" -ForegroundColor Green
            $stopped = $true
        }
        catch {
            Write-Host "[$(Get-TimeStamp)]    [!] Processo Backend ja foi encerrado" -ForegroundColor Yellow
        }
    }
    
    # Parar Admin Panel
    if ($Global:AdminProcess -and -not $Global:AdminProcess.HasExited) {
        Write-Host "[$(Get-TimeStamp)]    Parando Admin Panel (PID: $($Global:AdminProcess.Id))..." -ForegroundColor Yellow
        try {
            Stop-Process -Id $Global:AdminProcess.Id -Force -ErrorAction Stop
            Write-Host "[$(Get-TimeStamp)]    [OK] Admin Panel parado" -ForegroundColor Green
            $stopped = $true
        }
        catch {
            Write-Host "[$(Get-TimeStamp)]    [!] Processo Admin Panel ja foi encerrado" -ForegroundColor Yellow
        }
    }
    
    # Matar todos processos Node para garantir
    Stop-NodeProcesses
    
    if (-not $stopped) {
        Write-Host "[$(Get-TimeStamp)]    [!] Nenhum servidor estava em execucao" -ForegroundColor Yellow
    }
    
    $Global:BackendProcess = $null
    $Global:AdminProcess = $null
}

# Funcao para reiniciar servidores
function Restart-Servers {
    Write-Host ""
    Write-Host "[$(Get-TimeStamp)] [RESTART] Reiniciando servidores..." -ForegroundColor Cyan
    Stop-Servers
    Start-Sleep -Seconds 2
    return Start-Servers
}

# Funcao para mostrar status detalhado
function Show-Status {
    $status = Get-ServerStatus
    
    Show-Header "[STATUS] Status dos Servidores - $(Get-TimeStamp)"
    
    Write-Host ""
    Write-Host "  Backend (Porta 3000):      $($status.Backend)" -ForegroundColor White
    Write-Host "  Admin Panel (Porta 5173):  $($status.Admin)" -ForegroundColor White
    Write-Host ""
    Write-Host "  Porta 3000:                $($status.Port3000)" -ForegroundColor White
    Write-Host "  Porta 5173:                $($status.Port5173)" -ForegroundColor White
    
    if ($Global:BackendProcess -and -not $Global:BackendProcess.HasExited) {
        Write-Host ""
        Write-Host "  Backend PID:               $($Global:BackendProcess.Id)" -ForegroundColor Cyan
    }
    
    if ($Global:AdminProcess -and -not $Global:AdminProcess.HasExited) {
        Write-Host "  Admin Panel PID:           $($Global:AdminProcess.Id)" -ForegroundColor Cyan
    }
    
    Write-Host ""
}

# Funcao para visualizar logs em tempo real
function Show-Logs {
    $logFile = Join-Path $Global:ProjectRoot "backend\logs\app.log"
    
    Show-Header "[LOGS] Logs em Tempo Real"
    Write-Host ""
    Write-Host "  Pressione Ctrl+C para voltar ao menu" -ForegroundColor Yellow
    Write-Host "  Arquivo: $logFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "----------------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host ""
    
    if (-not (Test-Path $logFile)) {
        Write-Host "  [!] Arquivo de log nao encontrado: $logFile" -ForegroundColor Yellow
        Write-Host "  Os logs apareceram quando o backend iniciar e criar o arquivo." -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Pressione Enter para voltar ao menu"
        return
    }
    
    # Usar Get-Content com -Wait para logs em tempo real
    try {
        Get-Content $logFile -Wait -Tail 50 | ForEach-Object {
            $line = $_
            if ($line -match 'error|ERROR|ERRO') {
                Write-Host $line -ForegroundColor Red
            }
            elseif ($line -match 'warn|WARNING|AVISO') {
                Write-Host $line -ForegroundColor Yellow
            }
            elseif ($line -match 'info|INFO') {
                Write-Host $line -ForegroundColor Blue
            }
            elseif ($line -match 'success|SUCCESS|SUCESSO') {
                Write-Host $line -ForegroundColor Green
            }
            else {
                Write-Host $line
            }
        }
    }
    catch {
        Write-Host ""
        Write-Host "  Saindo do visualizador de logs..." -ForegroundColor Yellow
    }
}

# Funcao para instalar dependencias
function Install-Dependencies {
    Show-Header "[NPM] Instalando Dependencias"
    
    $backendDir = Join-Path $Global:ProjectRoot "backend"
    $adminDir = Join-Path $Global:ProjectRoot "admin-panel"
    
    Write-Host ""
    Write-Host "[$(Get-TimeStamp)] [NPM] Verificando e instalando dependencias..." -ForegroundColor Cyan
    Write-Host ""
    
    # Backend
    Write-Host "[$(Get-TimeStamp)] [BACKEND] Instalando dependencias do Backend..." -ForegroundColor Blue
    Write-Host "   Diretorio: $backendDir" -ForegroundColor Cyan
    
    if (Test-Path $backendDir) {
        try {
            Push-Location $backendDir
            Write-Host ""
            npm install
            Write-Host ""
            Write-Host "[$(Get-TimeStamp)]    [OK] Dependencias do Backend instaladas!" -ForegroundColor Green
            Pop-Location
        }
        catch {
            Write-Host "[$(Get-TimeStamp)]    [X] Erro ao instalar dependencias do Backend: $_" -ForegroundColor Red
            Pop-Location
        }
    }
    else {
        Write-Host "[$(Get-TimeStamp)]    [X] Diretorio backend nao encontrado" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # Admin Panel
    Write-Host "[$(Get-TimeStamp)] [ADMIN] Instalando dependencias do Admin Panel..." -ForegroundColor Blue
    Write-Host "   Diretorio: $adminDir" -ForegroundColor Cyan
    
    if (Test-Path $adminDir) {
        try {
            Push-Location $adminDir
            Write-Host ""
            npm install
            Write-Host ""
            Write-Host "[$(Get-TimeStamp)]    [OK] Dependencias do Admin Panel instaladas!" -ForegroundColor Green
            Pop-Location
        }
        catch {
            Write-Host "[$(Get-TimeStamp)]    [X] Erro ao instalar dependencias do Admin Panel: $_" -ForegroundColor Red
            Pop-Location
        }
    }
    else {
        Write-Host "[$(Get-TimeStamp)]    [X] Diretorio admin-panel nao encontrado" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "[$(Get-TimeStamp)] [OK] Instalacao de dependencias concluida!" -ForegroundColor Green
}

# Funcao para abrir navegador
function Open-Browser {
    Write-Host ""
    Write-Host "[$(Get-TimeStamp)] [WEB] Abrindo Admin Panel no navegador..." -ForegroundColor Blue
    Write-Host "[$(Get-TimeStamp)]    URL: http://localhost:5173" -ForegroundColor Cyan
    
    try {
        Start-Process "http://localhost:5173"
        Write-Host "[$(Get-TimeStamp)]    [OK] Navegador aberto" -ForegroundColor Green
    }
    catch {
        Write-Host "[$(Get-TimeStamp)]    [!] Erro ao abrir navegador: $_" -ForegroundColor Yellow
        Write-Host "[$(Get-TimeStamp)]    Acesse manualmente: http://localhost:5173" -ForegroundColor Cyan
    }
}

# Função para countdown automático
function Start-AutoReturn {
    param([int]$Seconds = 3)
    
    Write-Host ""
    Write-Host -NoNewline "  Voltando ao menu em " -ForegroundColor Cyan
    for ($i = $Seconds; $i -gt 0; $i--) {
        Write-Host -NoNewline "$i... " -ForegroundColor Yellow
        Start-Sleep -Seconds 1
    }
    Write-Host ""
}

# Funcao para mostrar menu
function Show-Menu {
    $status = Get-ServerStatus
    
    Show-Header "[>>] Gerenciador de Servidores - PreçoCerto Dev"
    
    Write-Host ""
    Write-Host "  Status: Backend $($status.Backend) | Admin Panel $($status.Admin)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "----------------------------------------------------------------------" -ForegroundColor White
    Write-Host "  [1] Iniciar Servidores" -ForegroundColor Green
    Write-Host "  [2] Parar Servidores" -ForegroundColor Red
    Write-Host "  [3] Reiniciar Servidores" -ForegroundColor Yellow
    Write-Host "  [4] Ver Status Detalhado" -ForegroundColor Blue
    Write-Host "  [5] Visualizar Logs em Tempo Real" -ForegroundColor Cyan
    Write-Host "  [6] Abrir Admin Panel no Navegador" -ForegroundColor Blue
    Write-Host "  [7] Limpar Console" -ForegroundColor Magenta
    Write-Host "  [8] Verificar Dependencias (npm install)" -ForegroundColor Yellow
    Write-Host "  [0] Sair (e parar servidores)" -ForegroundColor Red
    Write-Host "----------------------------------------------------------------------" -ForegroundColor White
    Write-Host ""
}

# Loop principal do menu
function Start-Menu {
    while ($true) {
        Show-Menu
        
        $choice = Read-Host "  Escolha uma opção"
        
        switch ($choice) {
            "1" {
                Start-Servers
                Start-AutoReturn -Seconds 3
            }
            "2" {
                Stop-Servers
                Start-AutoReturn -Seconds 3
            }
            "3" {
                Restart-Servers
                Start-AutoReturn -Seconds 3
            }
            "4" {
                Show-Status
                Start-AutoReturn -Seconds 5
            }
            "5" {
                Show-Logs
            }
            "6" {
                Open-Browser
                Start-AutoReturn -Seconds 2
            }
            "7" {
                Clear-Host
            }
            "8" {
                Install-Dependencies
                Start-AutoReturn -Seconds 3
            }
            "0" {
                Write-Host ""
                Write-Host "  [EXIT] Encerrando e parando servidores..." -ForegroundColor Yellow
                Stop-Servers
                Write-Host ""
                Write-Host "  Ate logo!" -ForegroundColor Cyan
                Write-Host ""
                break
            }
            default {
                Write-Host ""
                Write-Host "  [X] Opcao invalida! Tente novamente." -ForegroundColor Red
                Start-Sleep -Seconds 2
            }
        }
    }
}

# Iniciar o menu
try {
    Start-Menu
}
catch {
    Write-Host ""
    Write-Host "  [!] Erro critico: $_" -ForegroundColor Red
    Stop-Servers
    Write-Host ""
    Read-Host "Pressione Enter para sair"
}
