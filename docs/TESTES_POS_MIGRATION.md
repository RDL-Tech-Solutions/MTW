# ✅ Guia de Testes Pós-Migration

## 📅 Data: 13/12/2024

---

## 🎯 Objetivo

Verificar se todas as funcionalidades implementadas estão funcionando corretamente após a execução da migration.

---

## ✅ Checklist de Verificação

### 1. Database - Verificar Estrutura

Execute no Supabase SQL Editor para verificar:

```sql
-- Verificar campos da tabela categories
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- Verificar se os campos foram adicionados
-- Deve retornar: slug, description, icon, is_active

-- Verificar índice único de slug
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'categories' AND indexname = 'categories_slug_unique';

-- Verificar se click_tracking existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'click_tracking'
);

-- Verificar categorias com slugs gerados
SELECT id, name, slug, icon, is_active
FROM categories
LIMIT 10;
```

**Resultado Esperado:**
- ✅ Campos `slug`, `description`, `icon`, `is_active` existem
- ✅ Índice único `categories_slug_unique` criado
- ✅ Tabela `click_tracking` existe
- ✅ Categorias existentes têm slugs gerados

---

### 2. Backend - Testar Endpoints

#### 2.1 Usuários

```bash
# Listar usuários (requer autenticação admin)
GET /api/users
GET /api/users?page=1&limit=20&search=teste

# Estatísticas
GET /api/users/stats

# Criar usuário
POST /api/users
{
  "name": "Teste User",
  "email": "teste@exemplo.com",
  "password": "senha123",
  "role": "user",
  "is_vip": false
}

# Atualizar VIP
PATCH /api/users/{id}/vip
{
  "is_vip": true
}

# Atualizar Role
PATCH /api/users/{id}/role
{
  "role": "admin"
}
```

**Resultado Esperado:**
- ✅ Listagem funciona com paginação
- ✅ Busca funciona
- ✅ Criação de usuário funciona
- ✅ Atualização de VIP funciona
- ✅ Atualização de role funciona
- ✅ Estatísticas retornam dados corretos

#### 2.2 Analytics

```bash
# Dashboard
GET /api/analytics/dashboard

# Analytics detalhado
GET /api/analytics/detailed?period=7days
GET /api/analytics/detailed?period=30days
GET /api/analytics/detailed?period=90days

# Top produtos
GET /api/analytics/top-products?limit=10&days=30

# Top cupons
GET /api/analytics/top-coupons?limit=10
```

**Resultado Esperado:**
- ✅ Dashboard retorna dados
- ✅ Analytics detalhado retorna dados por período
- ✅ Gráficos têm dados
- ✅ Top produtos e cupons funcionam

#### 2.3 Categorias

```bash
# Listar categorias
GET /api/categories

# Criar categoria (sem slug - deve gerar automaticamente)
POST /api/categories
{
  "name": "Teste Categoria",
  "description": "Descrição de teste",
  "icon": "🧪",
  "is_active": true
}

# Criar categoria (com slug)
POST /api/categories
{
  "name": "Outra Categoria",
  "slug": "outra-categoria",
  "description": "Outra descrição",
  "icon": "📦",
  "is_active": true
}

# Atualizar categoria
PUT /api/categories/{id}
{
  "name": "Categoria Atualizada",
  "description": "Nova descrição"
}
```

**Resultado Esperado:**
- ✅ Listagem funciona
- ✅ Criação sem slug gera slug automaticamente
- ✅ Criação com slug funciona
- ✅ Slug único é validado
- ✅ Atualização funciona

---

### 3. Painel Admin - Testar Interface

#### 3.1 Usuários

1. **Acessar:** `/users`
2. **Verificar:**
   - ✅ Cards de estatísticas aparecem
   - ✅ Lista de usuários carrega
   - ✅ Paginação funciona
   - ✅ Busca funciona
   - ✅ Botão "Novo Usuário" abre modal
   - ✅ Criar usuário funciona
   - ✅ Editar usuário funciona
   - ✅ Deletar usuário funciona
   - ✅ Toggle VIP funciona
   - ✅ Toggle Admin funciona

#### 3.2 Analytics

1. **Acessar:** `/analytics`
2. **Verificar:**
   - ✅ Cards de métricas aparecem
   - ✅ Gráficos são renderizados
   - ✅ Filtro de período funciona (7, 30, 90 dias)
   - ✅ Top produtos aparece
   - ✅ Dados são atualizados ao mudar período

#### 3.3 Categorias

1. **Acessar:** `/categories`
2. **Verificar:**
   - ✅ Lista de categorias aparece
   - ✅ Ícones emoji são exibidos
   - ✅ Contagem de produtos aparece
   - ✅ Busca funciona
   - ✅ Botão "Nova Categoria" abre modal
   - ✅ Criar categoria funciona
   - ✅ Slug é gerado automaticamente se não fornecido
   - ✅ Editar categoria funciona
   - ✅ Deletar categoria funciona
   - ✅ Campo `is_active` funciona

---

### 4. Mobile App - Testar Categorias

1. **Abrir app**
2. **Navegar para:** Categorias
3. **Verificar:**
   - ✅ Lista de categorias carrega
   - ✅ Ícones emoji são exibidos (se disponível)
   - ✅ Descrições são exibidas (se disponível)
   - ✅ Contagem de produtos aparece
   - ✅ Toque em categoria navega para produtos
   - ✅ Loading state funciona
   - ✅ Empty state funciona

---

## 🐛 Problemas Comuns e Soluções

### Problema 1: Slug duplicado ao criar categoria

**Sintoma:** Erro "Slug já existe"

**Solução:**
- O sistema deve gerar slug automaticamente
- Se fornecer slug manualmente, use um único
- Verifique se há categorias com slugs duplicados no banco

### Problema 2: Analytics não retorna dados

**Sintoma:** Gráficos vazios ou erro

**Solução:**
- Verifique se a tabela `click_tracking` existe
- Verifique se há dados de cliques registrados
- O sistema usa estimativas se não houver dados reais

### Problema 3: Usuários não aparecem

**Sintoma:** Lista vazia ou erro

**Solução:**
- Verifique autenticação (deve ser admin)
- Verifique se há usuários no banco
- Verifique permissões da rota

### Problema 4: Categorias sem ícones no mobile

**Sintoma:** Ícones padrão aparecem

**Solução:**
- Verifique se as categorias têm campo `icon` preenchido
- O app usa ícone padrão se não houver emoji
- Atualize categorias com ícones emoji

---

## ✅ Checklist Final

- [ ] Database: Campos adicionados corretamente
- [ ] Database: Índices criados
- [ ] Database: Slugs gerados para categorias existentes
- [ ] Backend: Endpoints de usuários funcionam
- [ ] Backend: Endpoints de analytics funcionam
- [ ] Backend: Endpoints de categorias funcionam
- [ ] Admin Panel: Página de usuários funciona
- [ ] Admin Panel: Página de analytics funciona
- [ ] Admin Panel: Página de categorias funciona
- [ ] Mobile App: Categorias funcionam
- [ ] Testes: Todas as funcionalidades testadas

---

## 📝 Notas

- Se encontrar algum problema, verifique os logs do backend
- Verifique se todas as dependências estão instaladas
- Reinicie o backend após a migration
- Limpe o cache do Redis se necessário

---

**Status**: ✅ Migration executada  
**Próximo passo**: Testar todas as funcionalidades

