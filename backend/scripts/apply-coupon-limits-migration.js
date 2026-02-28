#!/usr/bin/env node

/**
 * Script para aplicar migration de limites de cupons
 * Adiciona campos min_purchase e max_discount_value para todas as plataformas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Iniciando migration de limites de cupons...\n');

  try {
    // Ler arquivo SQL
    const migrationPath = join(__dirname, '../database/migrations/add_coupon_purchase_limits.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Arquivo de migration carregado');
    console.log('📝 Executando SQL...\n');

    // Executar migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Tentar executar diretamente se RPC não existir
      console.log('⚠️  RPC exec_sql não disponível, tentando executar diretamente...\n');
      
      // Dividir em comandos individuais
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      for (const command of commands) {
        if (command.includes('DO $$')) {
          // Executar bloco DO
          console.log('📝 Executando bloco DO...');
          const { error: doError } = await supabase.rpc('exec_sql', { sql: command + ';' });
          if (doError) {
            console.error('❌ Erro ao executar bloco DO:', doError.message);
            throw doError;
          }
        } else if (command.includes('CREATE INDEX')) {
          // Executar CREATE INDEX
          console.log('📝 Criando índice...');
          const { error: indexError } = await supabase.rpc('exec_sql', { sql: command + ';' });
          if (indexError && !indexError.message.includes('already exists')) {
            console.error('❌ Erro ao criar índice:', indexError.message);
            throw indexError;
          }
        } else if (command.includes('COMMENT ON')) {
          // Executar COMMENT
          console.log('📝 Adicionando comentário...');
          const { error: commentError } = await supabase.rpc('exec_sql', { sql: command + ';' });
          if (commentError) {
            console.warn('⚠️  Aviso ao adicionar comentário:', commentError.message);
          }
        }
      }
    }

    console.log('✅ Migration executada com sucesso!\n');

    // Verificar se as colunas foram criadas
    console.log('🔍 Verificando estrutura da tabela...\n');

    const { data: columns, error: columnsError } = await supabase
      .from('coupons')
      .select('*')
      .limit(1);

    if (columnsError) {
      console.error('❌ Erro ao verificar colunas:', columnsError.message);
    } else {
      const sampleCoupon = columns[0] || {};
      const hasMinPurchase = 'min_purchase' in sampleCoupon;
      const hasMaxDiscount = 'max_discount_value' in sampleCoupon;

      console.log('📊 Estrutura da tabela coupons:');
      console.log(`   ✓ min_purchase: ${hasMinPurchase ? '✅ Presente' : '❌ Ausente'}`);
      console.log(`   ✓ max_discount_value: ${hasMaxDiscount ? '✅ Presente' : '❌ Ausente'}`);
      console.log('');

      if (hasMinPurchase && hasMaxDiscount) {
        console.log('🎉 Migration aplicada com sucesso!');
        console.log('');
        console.log('📝 Próximos passos:');
        console.log('   1. Os campos min_purchase e max_discount_value agora estão disponíveis');
        console.log('   2. Todos os cupons existentes têm min_purchase = 0 por padrão');
        console.log('   3. O admin panel já está configurado para usar esses campos');
        console.log('   4. O app mobile já exibe essas informações');
        console.log('');
      } else {
        console.log('⚠️  Aviso: Alguns campos podem não ter sido criados corretamente');
        console.log('   Verifique manualmente no Supabase Dashboard');
      }
    }

    // Estatísticas
    const { count, error: countError } = await supabase
      .from('coupons')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`📊 Total de cupons no banco: ${count}`);
    }

  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error.message);
    console.error('');
    console.error('💡 Solução alternativa:');
    console.error('   1. Acesse o Supabase Dashboard');
    console.error('   2. Vá em SQL Editor');
    console.error('   3. Execute o conteúdo do arquivo:');
    console.error('      backend/database/migrations/add_coupon_purchase_limits.sql');
    console.error('');
    process.exit(1);
  }
}

// Executar
applyMigration()
  .then(() => {
    console.log('');
    console.log('✨ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
