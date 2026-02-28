# Guia de Testes - OneSignal Migration

## 📋 Visão Geral

Este documento detalha todos os testes necessários para validar a migração do Expo Notifications para OneSignal.

## 🧪 Testes Unitários

### Backend

#### Arquivo: `backend/src/services/__tests__/oneSignalService.test.js`

```javascript
import oneSignalService from '../oneSignalService';

describe('OneSignalService', () => {
  describe('createOrUpdateUser', () => {
    test('deve criar usuário com external_id', async () => {
      const result = await oneSignalService.createOrUpdateUser({
        external_id: 'test123',
        email: 'test@example.com'
      });

      expect(result.success).toBe(true);
      expect(result.external_id).toBe('test123');
    });

    test('deve falhar sem external_id', async () => {
      const result = await oneSignalService.createOrUpdateUser({
        email: 'test@example.com'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('external_id');
    });
  });

  describe('sendToUser', () => {
    test('deve enviar notificação com dados mínimos', async () => {
      const result = await oneSignalService.sendToUser({
        external_id: 'test123',
        title: 'Test',
        message: 'Test message'
      });

      expect(result.success).toBe(true);
      expect(result.notification_id).toBeDefined();
    });

    test('deve enviar notificação com imagem', async () => {
      const result = await oneSignalService.sendToUser({
        external_id: 'test123',
        title: 'Test',
        message: 'Test message',
        image: 'https://example.com/image.jpg'
      });

      expect(result.success).toBe(true);
    });

    test('deve enviar notificação com botões', async () => {
      const result = await oneSignalService.sendToUser({
        external_id: 'test123',
        title: 'Test',
        message: 'Test message',
        buttons: [
          { id: 'btn1', text: 'Ver Mais' },
          { id: 'btn2', text: 'Ignorar' }
        ]
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendToMultiple', () => {
    test('deve enviar para múltiplos usuários', async () => {
      const result = await oneSignalService.sendToMultiple(
        ['user1', 'user2', 'user3'],
        {
          title: 'Batch Test',
          message: 'Batch message'
        }
      );

      expect(result.success).toBe(true);
      expect(result.total_sent).toBeGreaterThan(0);
    });

    test('deve processar em batches grandes', async () => {
      const users = Array.from({ length: 3000 }, (_, i) => `user${i}`);
      
      const result = await oneSignalService.sendToMultiple(users, {
        title: 'Large Batch',
        message: 'Large batch message'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('notifyNewCoupon', () => {
    test('deve enviar notificação de cupom', async () => {
      const users = [{ id: 1 }, { id: 2 }];
      const coupon = {
        id: 123,
        code: 'TEST10',
        discount_value: 10,
        discount_type: 'percentage'
      };

      const result = await oneSignalService.notifyNewCoupon(users, coupon);

      expect(result.success).toBe(true);
      expect(result.total_sent).toBe(2);
    });
  });
});
```

### App Mobile

#### Arquivo: `app/src/stores/__tests__/oneSignalStore.test.js`

```javascript
import { renderHook, act } from '@testing-library/react-hooks';
import { useOneSignalStore } from '../oneSignalStore';

describe('OneSignalStore', () => {
  test('deve inicializar corretamente', async () => {
    const { result } = renderHook(() => useOneSignalStore());

    await act(async () => {
      await result.current.initialize();
    });

    expect(result.current.isInitialized).toBe(true);
  });

  test('deve registrar usuário', async () => {
    const { result } = renderHook(() => useOneSignalStore());

    await act(async () => {
      await result.current.registerUser('123');
    });

    expect(result.current.userId).toBe('123');
  });

  test('deve definir tags', async () => {
    const { result } = renderHook(() => useOneSignalStore());

    await act(async () => {
      await result.current.setUserTags({
        category: 'electronics',
        vip: 'true'
      });
    });

    // Verificar se não houve erro
    expect(result.current.isInitialized).toBeDefined();
  });
});
```

## 🔄 Testes de Integração

### Teste 1: Fluxo Completo de Registro

**Objetivo**: Validar que um novo usuário consegue se registrar e receber notificações

**Passos**:
1. Instalar app em device limpo
2. Criar nova conta
3. Aceitar permissões de notificação
4. Verificar no OneSignal Dashboard se o device apareceu
5. Enviar notificação de teste
6. Verificar recebimento

**Critérios de Sucesso**:
- ✅ Device aparece no OneSignal Dashboard
- ✅ External ID está correto
- ✅ Notificação é recebida
- ✅ Notificação pode ser aberta

### Teste 2: Fluxo de Notificação de Cupom

**Objetivo**: Validar que notificações de cupom funcionam end-to-end

**Passos**:
1. Criar novo cupom no admin panel
2. Publicar cupom
3. Verificar logs do backend
4. Verificar recebimento no app
5. Clicar na notificação
6. Verificar navegação para tela de cupom

**Critérios de Sucesso**:
- ✅ Notificação é enviada automaticamente
- ✅ Notificação contém dados corretos
- ✅ Imagem é exibida (se aplicável)
- ✅ Navegação funciona corretamente
- ✅ Dados do cupom são carregados

### Teste 3: Segmentação de Usuários

**Objetivo**: Validar que segmentação funciona corretamente

**Passos**:
1. Criar 2 usuários com tags diferentes:
   - User A: `{ category: 'electronics' }`
   - User B: `{ category: 'fashion' }`
2. Enviar notificação apenas para `category: 'electronics'`
3. Verificar recebimento

**Critérios de Sucesso**:
- ✅ Apenas User A recebe notificação
- ✅ User B não recebe notificação

### Teste 4: Migração de Usuário Existente

**Objetivo**: Validar que usuários com tokens Expo são migrados corretamente

**Passos**:
1. Criar usuário com token Expo no banco
2. Executar migração para este usuário
3. Verificar no OneSignal Dashboard
4. Enviar notificação
5. Verificar recebimento

**Critérios de Sucesso**:
- ✅ Usuário aparece no OneSignal
- ✅ External ID está correto
- ✅ Tags foram migradas
- ✅ Notificação é recebida

## 📱 Testes Manuais

### Cenário 1: App em Foreground

**Passos**:
1. Abrir app
2. Navegar para qualquer tela
3. Enviar notificação
4. Verificar exibição

**Esperado**:
- Notificação aparece como banner/toast
- Som é reproduzido
- Badge é atualizado (iOS)

### Cenário 2: App em Background

**Passos**:
1. Abrir app
2. Minimizar app (Home button)
3. Enviar notificação
4. Verificar na central de notificações

**Esperado**:
- Notificação aparece na central
- Som é reproduzido
- Vibração ocorre
- Badge é atualizado (iOS)

### Cenário 3: App Fechado

**Passos**:
1. Fechar app completamente
2. Enviar notificação
3. Verificar na central de notificações
4. Clicar na notificação

**Esperado**:
- Notificação aparece na central
- App abre ao clicar
- Navegação funciona
- Dados são carregados

### Cenário 4: Deep Linking

**Passos**:
1. Enviar notificação com dados:
   ```json
   {
     "type": "new_coupon",
     "couponId": "123",
     "screen": "CouponDetails"
   }
   ```
2. Clicar na notificação
3. Verificar navegação

**Esperado**:
- App abre na tela CouponDetails
- Cupom 123 é carregado
- Dados são exibidos corretamente

### Cenário 5: Notificação com Imagem

**Passos**:
1. Enviar notificação com imagem
2. Verificar exibição

**Esperado**:
- Imagem é baixada
- Imagem é exibida na notificação
- Imagem tem qualidade adequada

### Cenário 6: Notificação com Botões

**Passos**:
1. Enviar notificação com botões de ação
2. Expandir notificação
3. Clicar em botão

**Esperado**:
- Botões são exibidos
- Ação do botão é executada
- App responde corretamente

### Cenário 7: Múltiplas Notificações

**Passos**:
1. Enviar 5 notificações rapidamente
2. Verificar central de notificações

**Esperado**:
- Todas as 5 notificações aparecem
- Notificações são agrupadas (se configurado)
- Badge mostra número correto (iOS)

### Cenário 8: Permissões Negadas

**Passos**:
1. Negar permissões de notificação
2. Tentar enviar notificação
3. Verificar comportamento

**Esperado**:
- Notificação não é recebida
- App não trava
- Logs indicam permissão negada

## 🔍 Testes de Performance

### Teste 1: Latência de Envio

**Objetivo**: Medir tempo entre envio e recebimento

**Método**:
1. Enviar 100 notificações
2. Medir tempo de cada uma
3. Calcular média, mediana, p95, p99

**Meta**:
- Média: < 3 segundos
- P95: < 5 segundos
- P99: < 10 segundos

### Teste 2: Envio em Massa

**Objetivo**: Validar envio para muitos usuários

**Método**:
1. Enviar notificação para 10.000 usuários
2. Monitorar taxa de sucesso
3. Monitorar tempo total

**Meta**:
- Taxa de sucesso: > 95%
- Tempo total: < 5 minutos
- Sem erros de timeout

### Teste 3: Carga no Backend

**Objetivo**: Validar que backend suporta carga

**Método**:
1. Simular 1000 requisições/minuto
2. Monitorar CPU, memória, latência
3. Verificar erros

**Meta**:
- CPU: < 70%
- Memória: < 80%
- Latência: < 500ms
- Taxa de erro: < 1%

## 🔐 Testes de Segurança

### Teste 1: Validação de Credenciais

**Passos**:
1. Tentar enviar notificação sem API Key
2. Tentar enviar com API Key inválida
3. Verificar resposta

**Esperado**:
- Requisição é rejeitada
- Erro apropriado é retornado
- Logs registram tentativa

### Teste 2: Validação de Dados

**Passos**:
1. Tentar enviar notificação com dados maliciosos:
   - XSS: `<script>alert('xss')</script>`
   - SQL Injection: `'; DROP TABLE users; --`
2. Verificar sanitização

**Esperado**:
- Dados são sanitizados
- Notificação é enviada com segurança
- Nenhum código é executado

### Teste 3: Rate Limiting

**Passos**:
1. Enviar 1000 requisições rapidamente
2. Verificar rate limiting

**Esperado**:
- Requisições são limitadas
- Erro 429 é retornado
- Sistema permanece estável

## 📊 Testes de Monitoramento

### Teste 1: Logs

**Verificar**:
- ✅ Logs de inicialização
- ✅ Logs de envio
- ✅ Logs de erro
- ✅ Logs de migração

### Teste 2: Métricas

**Verificar no OneSignal Dashboard**:
- ✅ Total de devices
- ✅ Taxa de entrega
- ✅ Taxa de abertura
- ✅ Taxa de conversão

### Teste 3: Alertas

**Configurar alertas para**:
- Taxa de erro > 5%
- Taxa de entrega < 90%
- Latência > 10 segundos

## ✅ Checklist de Testes

### Testes Unitários
- [ ] Backend: oneSignalService
- [ ] Backend: oneSignalMigration
- [ ] Backend: pushNotificationWrapper
- [ ] App: oneSignalStore

### Testes de Integração
- [ ] Fluxo de registro
- [ ] Fluxo de notificação de cupom
- [ ] Segmentação de usuários
- [ ] Migração de usuário existente

### Testes Manuais
- [ ] App em foreground
- [ ] App em background
- [ ] App fechado
- [ ] Deep linking
- [ ] Notificação com imagem
- [ ] Notificação com botões
- [ ] Múltiplas notificações
- [ ] Permissões negadas

### Testes de Performance
- [ ] Latência de envio
- [ ] Envio em massa
- [ ] Carga no backend

### Testes de Segurança
- [ ] Validação de credenciais
- [ ] Validação de dados
- [ ] Rate limiting

### Testes de Monitoramento
- [ ] Logs
- [ ] Métricas
- [ ] Alertas

---

**Última atualização**: 2026-02-27
**Versão**: 1.0
