# Script PowerShell para testar o backend MTW Promo
# Execute: .\test-backend.ps1

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🧪 TESTE DO BACKEND MTW PROMO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$API_URL = "http://localhost:3000"

# Função para testar endpoint
function Test-Endpoint {
    param(
        [string]$Endpoint,
        [string]$Name
    )
    
    try {
        $response = Invoke-WebRequest -Uri "$API_URL$Endpoint" -Method Get -TimeoutSec 5 -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $Name`: OK" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️  $Name`: Status $($response.StatusCode)" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        if ($_.Exception.Message -match "Unable to connect") {
            Write-Host "❌ $Name`: Servidor não está rodando" -ForegroundColor Red
            Write-Host "   Execute: npm run dev" -ForegroundColor Yellow
        } else {
            Write-Host "❌ $Name`: $($_.Exception.Message)" -ForegroundColor Red
        }
        return $false
    }
}

Write-Host "🔍 Testando API em: $API_URL`n" -ForegroundColor Cyan

# Testes
$tests = @(
    @{Endpoint = "/"; Name = "Rota raiz"},
    @{Endpoint = "/api/health"; Name = "Health check"}
)

$allPassed = $true
foreach ($test in $tests) {
    $result = Test-Endpoint -Endpoint $test.Endpoint -Name $test.Name
    if (-not $result) {
        $allPassed = $false
    }
    Start-Sleep -Milliseconds 500
}

Write-Host "`n========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "✅ TODOS OS TESTES PASSARAM!" -ForegroundColor Green
    Write-Host "`n🎉 Backend está funcionando corretamente!" -ForegroundColor Green
} else {
    Write-Host "❌ ALGUNS TESTES FALHARAM" -ForegroundColor Red
    Write-Host "`n💡 Verifique se:" -ForegroundColor Yellow
    Write-Host "   1. O servidor está rodando (npm run dev)" -ForegroundColor Yellow
    Write-Host "   2. As variáveis de ambiente estão configuradas" -ForegroundColor Yellow
    Write-Host "   3. O banco de dados está acessível" -ForegroundColor Yellow
}
Write-Host "========================================`n" -ForegroundColor Cyan
