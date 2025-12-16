#!/bin/bash
# Script para remover variáveis migradas para o Admin Panel do arquivo .env
# Execute: bash scripts/cleanup-env.sh

ENV_FILE=".env"
ENV_EXAMPLE_FILE=".env.example"

# Variáveis que devem ser removidas (migradas para Admin Panel)
VARIABLES_TO_REMOVE=(
    "MELI_CLIENT_ID"
    "MELI_CLIENT_SECRET"
    "MELI_ACCESS_TOKEN"
    "MELI_REFRESH_TOKEN"
    "MELI_REDIRECT_URI"
    "MELI_AFFILIATE_CODE"
    "MELI_AFFILIATE_TAG"
    "SHOPEE_PARTNER_ID"
    "SHOPEE_PARTNER_KEY"
    "AMAZON_ACCESS_KEY"
    "AMAZON_SECRET_KEY"
    "AMAZON_PARTNER_TAG"
    "AMAZON_MARKETPLACE"
    "EXPO_ACCESS_TOKEN"
    "TELEGRAM_RATE_LIMIT_DELAY"
    "TELEGRAM_MAX_RETRIES"
    "TELEGRAM_RECONNECT_DELAY"
    "BACKEND_URL"
    "BACKEND_API_KEY"
    "PYTHON_PATH"
    "ALIEXPRESS_API_URL"
)

remove_variables_from_file() {
    local file_path="$1"
    
    if [ ! -f "$file_path" ]; then
        echo "⚠️  Arquivo não encontrado: $file_path"
        return 1
    fi
    
    echo "📝 Processando: $file_path"
    
    local removed_count=0
    local temp_file=$(mktemp)
    
    # Criar backup
    local backup_file="${file_path}.backup.$(date +%Y%m%d-%H%M%S)"
    cp "$file_path" "$backup_file"
    echo "  💾 Backup criado: $backup_file"
    
    # Processar arquivo linha por linha
    while IFS= read -r line; do
        local should_remove=false
        
        for var in "${VARIABLES_TO_REMOVE[@]}"; do
            # Verificar se a linha começa com a variável
            if [[ "$line" =~ ^[[:space:]]*${var}[[:space:]]*= ]]; then
                should_remove=true
                removed_count=$((removed_count + 1))
                echo "  ✅ Removido: $var"
                break
            fi
        done
        
        # Adicionar linha apenas se não deve ser removida
        if [ "$should_remove" = false ]; then
            echo "$line" >> "$temp_file"
        fi
    done < "$file_path"
    
    # Remover linhas vazias duplicadas
    sed -i '/^[[:space:]]*$/d' "$temp_file"
    sed -i ':a;N;$!ba;s/\n\n\n\+/\n\n/g' "$temp_file"
    
    if [ $removed_count -gt 0 ]; then
        mv "$temp_file" "$file_path"
        echo "  ✅ Arquivo atualizado! ($removed_count variáveis removidas)"
        return 0
    else
        rm "$temp_file"
        echo "  ℹ️  Nenhuma variável migrada encontrada neste arquivo."
        return 1
    fi
}

echo "🧹 Limpando variáveis migradas para o Admin Panel..."
echo ""

# Processar .env
remove_variables_from_file "$ENV_FILE"

echo ""

# Processar .env.example
remove_variables_from_file "$ENV_EXAMPLE_FILE"

echo ""
echo "============================================================"
echo "✅ Limpeza concluída!"
echo ""
echo "📌 Próximos passos:"
echo "  1. Configure as APIs através do Painel Admin em /settings"
echo "  2. Verifique se o backup foi criado (se necessário)"
echo "  3. Teste o sistema para garantir que tudo funciona"
echo ""
echo "⚠️  NOTA: As variáveis removidas ainda funcionam como FALLBACK"
echo "   se não estiverem configuradas no Admin Panel."
echo ""



