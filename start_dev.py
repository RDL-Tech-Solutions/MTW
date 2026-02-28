#!/usr/bin/env python3
"""
Wrapper Python para executar o script PowerShell de gerenciamento de servidores
Este script simplesmente inicia o start_dev.ps1 no PowerShell
"""

import subprocess
import sys
import os
from pathlib import Path

def check_powershell():
    """Verifica se o PowerShell está disponível no sistema"""
    try:
        result = subprocess.run(
            ["powershell.exe", "-Command", "Write-Host 'OK'"],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        return False

def main():
    # Diretório do script
    script_dir = Path(__file__).parent.absolute()
    ps1_script = script_dir / "start_dev.ps1"
    
    print("=" * 70)
    print("  🚀 Gerenciador de Servidores - PreçoCerto Dev")
    print("=" * 70)
    print()
    
    # Verificar se o PowerShell está disponível
    print("🔍 Verificando PowerShell...")
    if not check_powershell():
        print("❌ ERRO: PowerShell não encontrado ou não está funcionando corretamente")
        print("   Este script requer PowerShell para funcionar.")
        print()
        input("Pressione Enter para sair...")
        sys.exit(1)
    print("✅ PowerShell encontrado")
    print()
    
    # Verificar se o script PowerShell existe
    print(f"🔍 Verificando script: {ps1_script.name}")
    if not ps1_script.exists():
        print(f"❌ ERRO: Script PowerShell não encontrado: {ps1_script}")
        print(f"   Certifique-se de que o arquivo 'start_dev.ps1' existe no diretório do projeto.")
        print()
        input("Pressione Enter para sair...")
        sys.exit(1)
    print(f"✅ Script encontrado: {ps1_script}")
    print()
    
    # Verificar diretórios do projeto
    backend_dir = script_dir / "backend"
    admin_dir = script_dir / "admin-panel"
    
    print("🔍 Verificando estrutura do projeto...")
    if not backend_dir.exists():
        print(f"⚠️  AVISO: Diretório 'backend' não encontrado")
    else:
        print(f"✅ Backend: {backend_dir}")
    
    if not admin_dir.exists():
        print(f"⚠️  AVISO: Diretório 'admin-panel' não encontrado")
    else:
        print(f"✅ Admin Panel: {admin_dir}")
    print()
    
    print("🚀 Iniciando Gerenciador de Servidores...")
    print(f"   Executando: {ps1_script.name}")
    print()
    print("=" * 70)
    print()
    
    try:
        # Executar o script PowerShell
        result = subprocess.run(
            [
                "powershell.exe",
                "-ExecutionPolicy", "Bypass",
                "-NoProfile",
                "-File", str(ps1_script)
            ],
            cwd=str(script_dir),
            check=False  # Não lançar exceção em caso de erro
        )
        
        # Verificar código de saída
        if result.returncode != 0 and result.returncode != 1:
            print()
            print(f"⚠️  O script terminou com código de saída: {result.returncode}")
            
    except subprocess.CalledProcessError as e:
        print()
        print(f"❌ Erro ao executar o script PowerShell: {e}")
        print(f"   Código de saída: {e.returncode}")
        input("\nPressione Enter para sair...")
        sys.exit(1)
        
    except KeyboardInterrupt:
        print("\n")
        print("⚠️  Execução interrompida pelo usuário (Ctrl+C)")
        print()
        sys.exit(0)
        
    except FileNotFoundError:
        print()
        print("❌ Erro: PowerShell não encontrado no sistema")
        print("   Certifique-se de que o PowerShell está instalado e no PATH")
        input("\nPressione Enter para sair...")
        sys.exit(1)
        
    except Exception as e:
        print()
        print(f"❌ Erro inesperado: {type(e).__name__}: {e}")
        input("\nPressione Enter para sair...")
        sys.exit(1)

if __name__ == "__main__":
    main()
