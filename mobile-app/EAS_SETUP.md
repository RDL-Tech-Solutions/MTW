# Configuração do EAS (Expo Application Services)

## Por que configurar o EAS?

O EAS garante que:
- Seu projeto seja assinado corretamente durante o desenvolvimento
- Os dados sejam isolados e seguros
- Não haja perda de dados entre execuções
- O projeto seja identificado corretamente no Expo Go

## Passos para Configurar

### 1. Instalar o EAS CLI (se ainda não tiver)

```bash
npm install -g eas-cli
```

### 2. Fazer login no Expo

```bash
eas login
```

Ou se já tiver uma conta:
```bash
npx expo login
```

### 3. Configurar o projeto no EAS

```bash
cd mobile-app
eas init
```

Este comando irá:
- Criar o projeto no EAS
- Gerar um `projectId` único
- Atualizar automaticamente o `app.json` com o `projectId` correto

### 4. Verificar a configuração

Após executar `eas init`, o `app.json` será atualizado automaticamente com o `projectId` real.

### 5. Iniciar o app

```bash
npm start
```

Agora o Expo Go deve conseguir assinar o projeto corretamente.

## Solução de Problemas

### Se ainda aparecer o aviso de assinatura:

1. **Verificar se está logado:**
   ```bash
   eas whoami
   ```

2. **Verificar o projectId no app.json:**
   - Deve ter um ID no formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Não deve ser `"your-project-id"`

3. **Reconfigurar o projeto:**
   ```bash
   eas init --force
   ```

### Desenvolvimento Offline

Se você estiver desenvolvendo offline, o EAS não conseguirá assinar o projeto. Isso é normal e o app ainda funcionará, mas:
- Pode haver perda de dados entre execuções
- Um ícone aparecerá no menu do desenvolvedor

Para resolver, conecte-se à internet e execute `eas init` novamente.

## Arquivos Criados

- `eas.json` - Configuração do EAS para builds e submissões
- Este arquivo (`EAS_SETUP.md`) - Documentação

## Próximos Passos

Após configurar o EAS, você pode:
- Fazer builds de desenvolvimento: `eas build --profile development`
- Fazer builds de preview: `eas build --profile preview`
- Fazer builds de produção: `eas build --profile production`

