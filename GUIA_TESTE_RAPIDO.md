# ⚡ GUIA DE TESTE RÁPIDO - MTW PROMO

## 🎯 Objetivo
Testar todas as funcionalidades do projeto em **15 minutos**.

---

## ✅ Pré-requisitos

- [x] Backend rodando (porta 3000)
- [x] Expo rodando (mobile-app)
- [x] Expo Go instalado no celular

---

## 📱 TESTE 1: Mobile App (5 min)

### 1. Abrir o App
1. Abra o **Expo Go** no celular
2. Escaneie o QR code do terminal
3. Aguarde o app carregar

### 2. Testar Login
- Email: `admin@mtwpromo.com`
- Senha: `admin123`
- ✅ Deve entrar no app

### 3. Testar Navegação
- ✅ Home - Ver lista de produtos
- ✅ Categorias - Ver grid de categorias
- ✅ Favoritos - Ver lista vazia
- ✅ Perfil - Ver dados do usuário

### 4. Testar Funcionalidades
- ✅ Buscar produto na Home
- ✅ Clicar em um produto
- ✅ Adicionar aos favoritos (coração)
- ✅ Ir para Favoritos - ver produto salvo
- ✅ Remover dos favoritos
- ✅ Fazer logout

**Resultado esperado**: Tudo funciona! ✅

---

## 💻 TESTE 2: Admin Panel (5 min)

### 1. Abrir Admin
1. Acesse: http://localhost:5174
2. Login: `admin@mtwpromo.com` / `admin123`

### 2. Testar Dashboard
- ✅ Ver estatísticas
- ✅ Ver gráficos
- ✅ Ver produtos mais clicados

### 3. Testar Produtos
- ✅ Clicar em "Produtos"
- ✅ Ver lista de produtos
- ✅ Buscar produto
- ✅ Clicar em "Novo Produto"
- ✅ Preencher formulário
- ✅ Salvar (deve aparecer notificação)

### 4. Testar Outras Páginas
- ✅ Cupons - ver lista
- ✅ Categorias - ver lista
- ✅ Usuários - ver lista
- ✅ Analytics - ver métricas
- ✅ Bots - ver configurações

**Resultado esperado**: Tudo funciona! ✅

---

## 🔌 TESTE 3: API (3 min)

### 1. Testar Endpoints

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mtwpromo.com","password":"admin123"}'
```
✅ Deve retornar token

#### Listar Produtos
```bash
curl http://localhost:3000/api/products
```
✅ Deve retornar array de produtos

#### Listar Categorias
```bash
curl http://localhost:3000/api/categories
```
✅ Deve retornar array de categorias

**Resultado esperado**: API responde! ✅

---

## 🤖 TESTE 4: Bots (2 min - Opcional)

### WhatsApp Bot
1. Abra Admin Panel > Bots
2. Veja configurações do WhatsApp
3. (Opcional) Envie mensagem de teste

### Telegram Bot
1. Abra Admin Panel > Bots
2. Veja configurações do Telegram
3. (Opcional) Envie mensagem de teste

**Resultado esperado**: Configurações visíveis! ✅

---

## 📊 Checklist Final

### Backend
- [x] Servidor rodando
- [x] Supabase conectado
- [x] Redis conectado
- [x] API respondendo

### Admin Panel
- [x] Login funciona
- [x] Dashboard carrega
- [x] CRUD funciona
- [x] Notificações aparecem

### Mobile App
- [x] Login funciona
- [x] Navegação funciona
- [x] Produtos aparecem
- [x] Favoritos funcionam
- [x] Busca funciona

---

## 🎯 Testes Específicos

### Teste de Favoritos (Mobile)
1. Login no app
2. Ir para Home
3. Clicar no coração de um produto
4. Ir para aba Favoritos
5. Verificar se produto aparece
6. Clicar no coração novamente
7. Verificar se produto sumiu

**Status**: ✅ Deve funcionar

### Teste de Busca (Mobile)
1. Ir para Home
2. Digitar no campo de busca
3. Ver produtos filtrados
4. Limpar busca (X)
5. Ver todos os produtos novamente

**Status**: ✅ Deve funcionar

### Teste de CRUD (Admin)
1. Ir para Produtos
2. Clicar "Novo Produto"
3. Preencher formulário
4. Salvar
5. Ver produto na lista
6. Editar produto
7. Deletar produto

**Status**: ✅ Deve funcionar

---

## 🐛 Problemas Comuns

### Mobile não conecta
**Solução**: 
- Verifique se está na mesma WiFi
- Verifique IP no app.json
- Reinicie o Expo

### Admin não loga
**Solução**:
- Execute: `database/FINAL-create-admin.sql`
- Verifique backend rodando
- Limpe cache do navegador

### API retorna 500
**Solução**:
- Verifique Supabase conectado
- Verifique Redis rodando
- Veja logs do backend

---

## ⏱️ Tempo Estimado

| Teste | Tempo |
|-------|-------|
| Mobile App | 5 min |
| Admin Panel | 5 min |
| API | 3 min |
| Bots | 2 min |
| **TOTAL** | **15 min** |

---

## ✅ Resultado Esperado

Após 15 minutos você deve ter testado:
- ✅ Login em 2 plataformas
- ✅ Navegação completa
- ✅ CRUD de produtos
- ✅ Sistema de favoritos
- ✅ Busca de produtos
- ✅ API funcionando
- ✅ Bots configurados

---

## 🎉 Sucesso!

Se todos os testes passaram, você tem:
- ✅ Backend 100% funcional
- ✅ Admin Panel 100% funcional
- ✅ Mobile App 95% funcional
- ✅ Projeto pronto para uso!

---

## 📝 Próximos Passos

1. Adicionar mais produtos de teste
2. Testar com usuários reais
3. Implementar push notifications
4. Fazer build para produção
5. Deploy e publicação

---

**Bons testes!** 🚀
