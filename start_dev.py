#!/usr/bin/env python3
"""
Wrapper Python para executar o script PowerShell de gerenciamento de servidores
Este script simplesmente inicia o start_dev.ps1 no PowerShell
"""

import subprocess
import sys
import os
from pathlib import Path

def main():
    # Diretório do script
    script_dir = Path(__file__).parent.absolute()
    ps1_script = script_dir / "start_dev.ps1"
    
    # Verificar se o script PowerShell existe
    if not ps1_script.exists():
        print(f"❌ ERRO: Script PowerShell não encontrado: {ps1_script}")
        print(f"   Certifique-se de que o arquivo 'start_dev.ps1' existe no diretório do projeto.")
        input("\nPressione Enter para sair...")
        sys.exit(1)
    
    print("🚀 Iniciando Gerenciador de Servidores...")
    print(f"   Executando: {ps1_script}")
    print()
    
    try:
        # Executar o script PowerShell
        subprocess.run(
            ["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", str(ps1_script)],
            cwd=str(script_dir),
            check=True
        )
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Erro ao executar o script PowerShell: {e}")
        input("\nPressione Enter para sair...")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Execução interrompida pelo usuário.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Erro inesperado: {e}")
        input("\nPressione Enter para sair...")
        sys.exit(1)

if __name__ == "__main__":
    main()
