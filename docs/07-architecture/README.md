# 🏗️ Arquitetura do Sistema

Visão geral da arquitetura do MTW Promo.

## 📊 Diagrama de Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Mobile App │────▶│  Backend API│────▶│  Supabase   │
│  (Expo)     │     │  (Node.js)  │     │  (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
                            │
                            │
                    ┌───────┴───────┐
                    │               │
            ┌───────▼──────┐ ┌──────▼──────┐
            │ Admin Panel  │ │   Redis     │
            │  (React)     │ │  (Cache)    │
            └──────────────┘ └─────────────┘
```

## 🏗️ Componentes Principais

### 1. Backend API
- **Tecnologia**: Node.js + Express
- **Banco**: PostgreSQL (Supabase)
- **Cache**: Redis (opcional)
- **Autenticação**: JWT

### 2. Admin Panel
- **Tecnologia**: React + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Estado**: Zustand

### 3. Mobile App
- **Tecnologia**: React Native + Expo
- **Navegação**: React Navigation
- **Estado**: Zustand

## 🔄 Fluxo de Dados

### Autenticação
1. Usuário faz login
2. Backend valida credenciais
3. Backend retorna JWT token
4. Cliente armazena token
5. Token enviado em requisições

### Produtos
1. Cliente solicita produtos
2. Backend consulta banco
3. Backend retorna dados
4. Cliente exibe produtos

### Cupons
1. Sistema captura cupons (cron)
2. Cupons salvos no banco
3. Cliente solicita cupons
4. Backend retorna cupons ativos

## 🔐 Segurança

- **JWT** para autenticação
- **Row Level Security (RLS)** no Supabase
- **Rate Limiting** nas APIs
- **CORS** configurado
- **Helmet.js** para headers de segurança

## 📚 Mais Detalhes

- [Backend Architecture](./backend.md)
- [Database Schema](./database.md)
- [Security](./security.md)

---

**Voltar**: [Índice](../README.md)



