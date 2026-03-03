# 🔥 Instalação Firebase Admin SDK

## ❌ Problema

O servidor está apresentando o erro:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'firebase-admin'
```

## ✅ Solução

### 1. Instalar firebase-admin no Servidor

```bash
cd /root/MTW/backend
npm install firebase-admin
```

### 2. Verificar Instalação

```bash
npm list firebase-admin
```

Deve mostrar:
```
backend@1.0.0 /root/MTW/backend
└── firebase-admin@13.7.0
```

### 3. Configurar Service Account

```bash
# Criar arquivo de configuração
nano /root/MTW/backend/firebase-service-account.json
```

Cole o conteúdo do Service Account JSON baixado do Firebase Console.

**Ou** use variáveis de ambiente (mais seguro):

```bash
# Editar .env
nano /root/MTW/backend/.env
```

Adicione:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=/root/MTW/backend/firebase-service-account.json
```

### 4. Reiniciar Servidor

```bash
pm2 restart backend
pm2 logs backend
```

## 📋 Checklist

- [ ] firebase-admin instalado
- [ ] firebase-service-account.json configurado
- [ ] FIREBASE_SERVICE_ACCOUNT_PATH no .env
- [ ] Servidor reiniciado
- [ ] Logs verificados (sem erros)

## 🧪 Testar

```bash
cd /root/MTW/backend
npm run test:push
```

Deve mostrar:
```
✅ Firebase Admin (FCM) inicializado com sucesso
```

## 🔐 Segurança

**IMPORTANTE**: Adicione ao .gitignore:
```
firebase-service-account.json
```

Nunca commite o arquivo de service account!

---

**Data**: 2026-03-03
**Status**: ⚠️ Ação Necessária
