# Script para remover variáveis migradas para o Admin Panel do arquivo .env
# Execute: .\scripts\cleanup-env.ps1

$envFile = Join-Path $PSScriptRoot "..\.env"
$envExampleFile = Join-Path $PSScriptRoot "..\.env.example"

# Variáveis que devem ser removidas (migradas para Admin Panel)
$variablesToRemove = @(
    "MELI_CLIENT_ID",
    "MELI_CLIENT_SECRET",
    "MELI_ACCESS_TOKEN",
    "MELI_REFRESH_TOKEN",
    "MELI_REDIRECT_URI",
    "MELI_AFFILIATE_CODE",
    "MELI_AFFILIATE_TAG",
    "SHOPEE_PARTNER_ID",
    "SHOPEE_PARTNER_KEY",
    "AMAZON_ACCESS_KEY",
    "AMAZON_SECRET_KEY",
    "AMAZON_PARTNER_TAG",
    "AMAZON_MARKETPLACE",
    "EXPO_ACCESS_TOKEN",
    "TELEGRAM_RATE_LIMIT_DELAY",
    "TELEGRAM_MAX_RETRIES",
    "TELEGRAM_RECONNECT_DELAY",
    "BACKEND_URL",
    "BACKEND_API_KEY",
    "PYTHON_PATH",
    "ALIEXPRESS_API_URL"
)

function Remove-VariablesFromFile {
    param(
        [string]$FilePath,
        [string[]]$Variables
    )
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "[AVISO] Arquivo nao encontrado: $FilePath" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "[PROCESSANDO] $FilePath" -ForegroundColor Cyan
    
    $content = Get-Content $FilePath -Raw
    $originalContent = $content
    $removedCount = 0
    
    foreach ($var in $Variables) {
        # Remove linhas que começam com a variável (com ou sem espaços)
        $pattern = "(?m)^\s*$var\s*=.*$"
        if ($content -match $pattern) {
            $content = $content -replace $pattern, ""
            $removedCount++
            Write-Host "  [OK] Removido: $var" -ForegroundColor Green
        }
    }
    
    # Remove linhas vazias duplicadas
    $content = $content -replace "(?m)^\s*$\r?\n", "`r`n"
    $content = $content -replace "(?m)(\r?\n){3,}", "`r`n`r`n"
    
    if ($removedCount -gt 0) {
        # Criar backup
        $backupFile = "$FilePath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $FilePath $backupFile
        Write-Host "  [BACKUP] Backup criado: $backupFile" -ForegroundColor Yellow
        
        # Salvar arquivo limpo
        Set-Content -Path $FilePath -Value $content -NoNewline
        Write-Host "  [OK] Arquivo atualizado! ($removedCount variaveis removidas)" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  [INFO] Nenhuma variavel migrada encontrada neste arquivo." -ForegroundColor Gray
        return $false
    }
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Limpando variaveis migradas para o Admin Panel..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Processar .env
$envChanged = Remove-VariablesFromFile -FilePath $envFile -Variables $variablesToRemove

Write-Host ""

# Processar .env.example
$exampleChanged = Remove-VariablesFromFile -FilePath $envExampleFile -Variables $variablesToRemove

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[OK] Limpeza concluida!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "  1. Configure as APIs atraves do Painel Admin em /settings"
Write-Host "  2. Verifique se o backup foi criado (se necessario)"
Write-Host "  3. Teste o sistema para garantir que tudo funciona"
Write-Host ""
Write-Host "[NOTA] As variaveis removidas ainda funcionam como FALLBACK" -ForegroundColor Yellow
Write-Host "       se nao estiverem configuradas no Admin Panel." -ForegroundColor Yellow
Write-Host ""

