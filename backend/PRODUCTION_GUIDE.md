# Guia de Deploy em Produção (Backend)

Este guia descreve os passos necessários para colocar o backend do PreçoCerto/MTW em produção.

## 1. Pré-requisitos do Servidor

Certifique-se de que o servidor possui:
- **Node.js**: Versão 18 ou superior.
- **NPM**: Gerenciador de pacotes.
- **PM2**: Gerenciador de processos (instale globalmente: `npm install -g pm2`).
- **PostgreSQL**: Banco de dados (se não usar Supabase externo).
- **Redis**: Para cache e controle de taxa.

## 2. Configuração do Ambiente

1. Clone o repositório no servidor.
2. Navegue até a pasta `backend`.
3. Instale as dependências:
   ```bash
   npm install --production
   ```
4. Crie o arquivo `.env` de produção:
   ```bash
   cp .env.example .env
   ```
5. Edite o arquivo `.env` com as credenciais reais de produção:
   - Defina `NODE_ENV=production`
   - Configure o `SUPABASE_URL` e chaves corretas.
   - Configure `CORS_ORIGIN` com os domínios do frontend (ex: `https://app.mtwpromo.com`).
   - Configure a conexão com o **Redis**.

## 3. Banco de Dados

1. Execute as migrações para garantir que o schema está atualizado:
   ```bash
   npm run db:migrate
   ```
2. Se for a primeira instalação, talvez seja necessário rodar seeds (cuidado para não sobrescrever dados existentes):
   - Verifique scripts na pasta `scripts/` ou `database/`.

## 4. Iniciando a Aplicação

Utilizamos o PM2 para gerenciar a aplicação em produção.

### Iniciar
```bash
npm run start:prod
```
Isso executará o comando `pm2 start ecosystem.config.cjs --env production`.

### Outros Comandos
- **Parar**: `npm run stop:prod`
- **Recarregar**: `npm run reload:prod` (Zero downtime reload)
- **Monitorar**: `npm run monitor:prod`
- **Ver logs**: `pm2 logs`

## 5. Configuração de Proxy Reverso (Nginx)

Recomenda-se usar Nginx como proxy reverso para manusear SSL e encaminhar tráfego para a porta 3000.

Exemplo de configuração `/etc/nginx/sites-available/mtw-backend`:

```nginx
server {
    listen 80;
    server_name api.mtwpromo.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 6. SSL (HTTPS)

Use o Certbot para configurar HTTPS gratuito:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.mtwpromo.com
```

## 7. Verificação de Saúde

Após iniciar, verifique se a API está respondendo:

```bash
curl http://localhost:3000/
# ou
curl https://api.mtwpromo.com/
```

Deverá retornar um JSON com status de sucesso.
