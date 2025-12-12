# 📖 GUIA DE INSTALAÇÃO - MTW PROMO

## 🎯 Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase (gratuita)
- Conta Redis (opcional, pode usar Redis Cloud gratuito)
- Credenciais API Shopee (opcional para testes)
- Credenciais API Mercado Livre (opcional para testes)

## 📦 1. Configuração do Banco de Dados (Supabase)

### 1.1. Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Crie uma conta (se não tiver)
3. Clique em "New Project"
4. Preencha:
   - **Name**: MTW Promo
   - **Database Password**: (escolha uma senha forte)
   - **Region**: South America (São Paulo)
5. Aguarde a criação do projeto (~2 minutos)

### 1.2. Executar Schema SQL

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em "New Query"
3. Copie todo o conteúdo do arquivo `database/schema.sql`
4. Cole no editor e clique em "Run"
5. Aguarde a execução (deve aparecer "Success")

### 1.3. Obter Credenciais

1. Vá em **Settings** > **API**
2. Copie:
   - **Project URL** (SUPABASE_URL)
   - **anon public** key (SUPABASE_ANON_KEY)
   - **service_role** key (SUPABASE_SERVICE_KEY)

### 1.4. Criar Usuário Administrador

**Opção 1: Via SQL (Recomendado)**

1. No Supabase SQL Editor, execute o arquivo `database/seed-admin.sql`
2. Ou copie e execute este SQL:

```sql
-- Inserir usuário admin (senha: admin123)
INSERT INTO users (
  email,
  password_hash,
  name,
  role,
  is_vip,
  created_at,
  updated_at
) VALUES (
  'admin@mtwpromo.com',
  '$2b$10$rZ5YhkW8qN3xJ5xJ5xJ5xOeKqF5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xu',
  'Administrador',
  'admin',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;
```

**Opção 2: Via Script Node.js**

```bash
cd backend
node scripts/create-admin.js
```

**Credenciais de Login:**
- Email: `admin@mtwpromo.com`
- Senha: `admin123`

⚠️ **IMPORTANTE**: Altere a senha após o primeiro login!

## 🔧 2. Configuração do Backend

### 2.1. Instalar Dependências

```bash
cd backend
npm install
```

### 2.2. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` e preencha:

```env
# Supabase (obrigatório)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_KEY=sua_service_key

# JWT (gere chaves aleatórias fortes)
JWT_SECRET=sua_chave_secreta_super_forte_aqui
JWT_REFRESH_SECRET=outra_chave_secreta_diferente

# Redis (opcional para testes locais)
REDIS_HOST=localhost
REDIS_PORT=6379

# Shopee API (opcional)
SHOPEE_PARTNER_ID=seu_partner_id
SHOPEE_PARTNER_KEY=sua_partner_key

# Mercado Livre API (opcional)
MELI_CLIENT_ID=seu_client_id
MELI_CLIENT_SECRET=seu_client_secret
MELI_ACCESS_TOKEN=seu_access_token

# Expo Push (opcional)
EXPO_ACCESS_TOKEN=seu_expo_token

# Cron Jobs
ENABLE_CRON_JOBS=false  # deixe false para testes
```

### 2.3. Instalar Redis (Opcional)

**Windows:**
```bash
# Usar WSL ou Docker
docker run -d -p 6379:6379 redis
```

**Linux/Mac:**
```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# Mac
brew install redis
brew services start redis
```

Ou use **Redis Cloud** (gratuito): [https://redis.com/try-free/](https://redis.com/try-free/)

### 2.4. Iniciar Backend

```bash
npm run dev
```

Deve aparecer:
```
✅ Conexão com Supabase estabelecida com sucesso
✅ Redis conectado com sucesso (ou aviso se não configurado)
🚀 Servidor rodando na porta 3000
```

Teste: Acesse [http://localhost:3000/api/health](http://localhost:3000/api/health)

## 💻 3. Configuração do Painel Admin

### 3.1. Instalar Dependências

```bash
cd admin-panel
npm install
```

### 3.2. Configurar Variáveis (Opcional)

Crie `.env` se necessário:

```env
VITE_API_URL=http://localhost:3000/api
```

### 3.3. Iniciar Painel

```bash
npm run dev
```

Acesse: [http://localhost:5173](http://localhost:5173)

**Login padrão:**
- Email: `admin@mtwpromo.com`
- Senha: `admin123` (altere após primeiro login!)

## 📱 4. Configuração do App Mobile

### 4.1. Instalar Expo CLI

```bash
npm install -g expo-cli
```

### 4.2. Instalar Dependências

```bash
cd mobile-app
npm install
```

### 4.3. Iniciar App

```bash
npx expo start
```

Opções:
- Pressione `a` para Android (requer Android Studio)
- Pressione `i` para iOS (requer macOS + Xcode)
- Escaneie QR Code com Expo Go app

## 🧪 5. Testando o Sistema

### 5.1. Criar Categorias

No painel admin, vá em **Categorias** e verifique se as categorias padrão foram criadas.

### 5.2. Adicionar Produto Manualmente

1. Vá em **Produtos** > **Novo Produto**
2. Preencha os dados
3. Salve

### 5.3. Criar Cupom

1. Vá em **Cupons** > **Novo Cupom**
2. Preencha:
   - Código: `TESTE10`
   - Desconto: `10%`
   - Validade: (escolha datas)
3. Salve

### 5.4. Testar API

```bash
# Health check
curl http://localhost:3000/api/health

# Listar produtos
curl http://localhost:3000/api/products

# Listar cupons
curl http://localhost:3000/api/coupons
```

## 🔄 6. Habilitar Automações (Opcional)

Para habilitar os cron jobs de sincronização:

1. Configure as APIs (Shopee e/ou Mercado Livre)
2. No `.env` do backend, altere:
   ```env
   ENABLE_CRON_JOBS=true
   ```
3. Reinicie o backend

Os jobs irão:
- Sincronizar produtos a cada 15 minutos
- Verificar cupons expirados a cada 30 minutos
- Enviar notificações a cada 5 minutos
- Limpar dados antigos diariamente às 3h

## 🚀 7. Deploy (Produção)

### Backend (Railway/Render)

1. Crie conta no [Railway](https://railway.app) ou [Render](https://render.com)
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente
4. Deploy automático

### Admin Panel (Vercel/Netlify)

1. Crie conta no [Vercel](https://vercel.com)
2. Importe o projeto
3. Configure build:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Deploy

### Mobile App (Expo)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Build
eas build --platform android
eas build --platform ios

# Submit
eas submit --platform android
eas submit --platform ios
```

## ❓ Troubleshooting

### Erro de conexão com Supabase
- Verifique se as credenciais estão corretas
- Confirme que o schema SQL foi executado
- Teste a conexão no painel do Supabase

### Redis não conecta
- Verifique se o Redis está rodando: `redis-cli ping`
- O sistema funciona sem Redis (cache desabilitado)

### Erro 401 no admin
- Limpe o localStorage do navegador
- Faça login novamente
- Verifique se o backend está rodando

### App mobile não conecta
- Verifique se o backend está acessível na rede
- Use o IP local ao invés de localhost
- Configure CORS no backend

## 📞 Suporte

Para dúvidas:
1. Verifique a documentação em `ARQUITETURA.md`
2. Consulte os logs do backend
3. Entre em contato: suporte@mtwpromo.com

---

**Boa sorte com o MTW Promo! 🎉**
