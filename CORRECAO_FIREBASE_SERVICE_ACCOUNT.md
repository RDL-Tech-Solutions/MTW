# Correção: Firebase Service Account Path

## PROBLEMA

O log mostra:
```
⚠️ FCM: Service account não encontrado (./firebase-service-account.json), tentando Application Default Credentials
✅ Firebase Admin (FCM) inicializado com sucesso
```

Isso significa que o Firebase está usando **Application Default Credentials** em vez do arquivo `firebase-service-account.json`.

## CAUSA

A variável de ambiente `FIREBASE_SERVICE_ACCOUNT_PATH` está configurada com caminho relativo:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

Mas o caminho relativo depende do **diretório de execução** do processo, que pode variar.

## SOLUÇÃO

### Opção 1: Usar Caminho Absoluto (Recomendado)

Edite `backend/.env`:

```env
# Windows
FIREBASE_SERVICE_ACCOUNT_PATH=C:/dev/MTW/backend/firebase-service-account.json

# Linux/Mac
FIREBASE_SERVICE_ACCOUNT_PATH=/home/user/MTW/backend/firebase-service-account.json
```

### Opção 2: Remover a Variável (Usar Padrão)

Remova ou comente a linha no `backend/.env`:

```env
# FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

O código vai usar o caminho padrão:
```javascript
path.resolve(__dirname, '../../firebase-service-account.json')
```

Que resolve para: `backend/firebase-service-account.json`

### Opção 3: Usar Caminho Relativo ao Backend

Edite `backend/.env`:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=backend/firebase-service-account.json
```

E execute sempre a partir da raiz do projeto.

## VERIFICAÇÃO

Após aplicar a solução, reinicie o backend e verifique o log:

### ✅ Sucesso (esperado):
```
✅ FCM: Service account carregado de C:/dev/MTW/backend/firebase-service-account.json
✅ Firebase Admin (FCM) inicializado com sucesso
```

### ❌ Falha (atual):
```
⚠️ FCM: Service account não encontrado (./firebase-service-account.json)
   Tentando Application Default Credentials...
✅ Firebase Admin (FCM) inicializado com sucesso
```

## IMPACTO

### Com Application Default Credentials ⚠️

- ✅ Funciona em ambiente de desenvolvimento (se configurado)
- ✅ Funciona em Google Cloud Platform (GCP)
- ❌ Pode não funcionar em outros ambientes
- ❌ Menos controle sobre as credenciais

### Com Service Account File ✅

- ✅ Funciona em qualquer ambiente
- ✅ Controle total sobre as credenciais
- ✅ Mais fácil de debugar
- ✅ Recomendado para produção

## TESTE

Após corrigir, teste o envio de notificações:

```bash
cd backend
node scripts/test-all-notifications-user.js
```

Deve mostrar:
```
✅ FCM: Service account carregado de [CAMINHO]
✅ Firebase Admin (FCM) inicializado com sucesso
📤 FCM: Enviando notificação...
✅ FCM: Notificação enviada. Message ID: ...
```

## RECOMENDAÇÃO

**Use a Opção 2** (remover a variável) se:
- Você sempre executa o backend a partir do diretório `backend/`
- Quer simplicidade

**Use a Opção 1** (caminho absoluto) se:
- Você executa o backend de diferentes diretórios
- Quer garantia máxima de que vai funcionar
- Está em produção

## CÓDIGO MELHORADO

Já apliquei uma melhoria no `fcmService.js` que mostra mais detalhes no log:

```javascript
try {
    // Verificar se arquivo existe antes de tentar carregar
    const fs = await import('fs');
    if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(`Arquivo não encontrado: ${serviceAccountPath}`);
    }

    const require = createRequire(import.meta.url);
    const serviceAccount = require(serviceAccountPath);
    credential = admin.credential.cert(serviceAccount);
    logger.info(`✅ FCM: Service account carregado de ${serviceAccountPath}`);
} catch (fileError) {
    logger.warn(`⚠️ FCM: Service account não encontrado (${serviceAccountPath})`);
    logger.warn(`   Erro: ${fileError.message}`);
    logger.warn(`   Tentando Application Default Credentials...`);
    credential = admin.credential.applicationDefault();
}
```

Agora o log mostrará o erro exato se o arquivo não for encontrado.

## PRÓXIMOS PASSOS

1. Escolha uma das opções acima
2. Edite `backend/.env`
3. Reinicie o backend
4. Verifique o log
5. Teste notificações

---

**Data**: 2026-03-04  
**Status**: Solução documentada
