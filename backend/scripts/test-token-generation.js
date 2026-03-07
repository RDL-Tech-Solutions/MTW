#!/usr/bin/env node

/**
 * Script para testar a geração de token JWT
 * Uso: node backend/scripts/test-token-generation.js
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '../.env') });

console.log('\n🔐 Teste de Geração de Token JWT\n');
console.log('═'.repeat(60));

// Verificar se JWT_SECRET existe
if (!process.env.JWT_SECRET) {
  console.log('\n❌ ERRO: JWT_SECRET não encontrado no .env');
  console.log('\n💡 Adicione JWT_SECRET no arquivo backend/.env');
  console.log('   Exemplo: JWT_SECRET=seu_secret_aqui');
  process.exit(1);
}

console.log('\n✅ JWT_SECRET encontrado');
console.log(`   Tamanho: ${process.env.JWT_SECRET.length} caracteres`);

// Dados de exemplo para o token
const payload = {
  id: 1,
  email: 'admin@exemplo.com',
  role: 'admin'
};

console.log('\n📦 Payload do Token:');
console.log(JSON.stringify(payload, null, 2));

// Gerar token
try {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
  
  console.log('\n✅ Token Gerado com Sucesso!');
  console.log('\n🔑 Token JWT:');
  console.log('─'.repeat(60));
  console.log(token);
  console.log('─'.repeat(60));
  
  // Decodificar token para mostrar informações
  const decoded = jwt.decode(token, { complete: true });
  
  console.log('\n📋 Informações do Token:');
  console.log(`   Algoritmo: ${decoded.header.alg}`);
  console.log(`   Tipo: ${decoded.header.typ}`);
  console.log(`   ID do Usuário: ${decoded.payload.id}`);
  console.log(`   Email: ${decoded.payload.email}`);
  console.log(`   Role: ${decoded.payload.role}`);
  console.log(`   Emitido em: ${new Date(decoded.payload.iat * 1000).toLocaleString('pt-BR')}`);
  console.log(`   Expira em: ${new Date(decoded.payload.exp * 1000).toLocaleString('pt-BR')}`);
  
  const daysUntilExpiry = Math.floor((decoded.payload.exp - decoded.payload.iat) / 86400);
  console.log(`   Validade: ${daysUntilExpiry} dias`);
  
  // Verificar token
  console.log('\n🔍 Verificando Token...');
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  console.log('✅ Token verificado com sucesso!');
  console.log(`   Dados verificados: ${JSON.stringify(verified, null, 2)}`);
  
  console.log('\n═'.repeat(60));
  console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
  console.log('\n📝 Resumo:');
  console.log('   - JWT_SECRET está configurado corretamente');
  console.log('   - Token foi gerado com sucesso');
  console.log('   - Token foi verificado com sucesso');
  console.log('   - Validade: 30 dias');
  console.log('\n💡 Este é o mesmo processo usado no login do backend');
  console.log('   Quando você faz login, um token assim é gerado e retornado');
  console.log('\n');
  
} catch (error) {
  console.log('\n❌ ERRO ao gerar/verificar token:');
  console.log(`   ${error.message}`);
  console.log('\n💡 Verifique se JWT_SECRET está configurado corretamente');
  process.exit(1);
}
