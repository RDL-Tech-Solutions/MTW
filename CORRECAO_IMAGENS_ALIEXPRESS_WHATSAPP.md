# Correção: Imagens do AliExpress não Publicando no WhatsApp

## Problema
Produtos do AliExpress não estavam sendo publicados com imagem nos canais WhatsApp e Telegram. As mensagens eram enviadas apenas com texto.

## Causa Raiz
O método `MessageMedia.fromUrl()` do whatsapp-web.js estava falhando silenciosamente ao tentar baixar imagens do AliExpress. Possíveis causas:
- URLs do AliExpress (ae01.alicdn.com) podem requerer headers específicos (User-Agent, Referer)
- Timeout muito curto
- Falta de tratamento adequado de erros

## Análise do Fluxo

### Telegram (Funcionando)
1. `publishService.notifyTelegramBot()` baixa a imagem manualmente com axios
2. Converte para JPEG usando Sharp
3. Envia buffer para `notificationDispatcher.sendToTelegramWithImage()`
4. ✅ Funciona porque o download é manual com headers apropriados

### WhatsApp (Problema)
1. `publishService.notifyWhatsAppBot()` envia URL diretamente
2. `notificationDispatcher.sendToWhatsAppWithImage()` passa URL para `whatsappWebService.sendImage()`
3. `whatsappWebService.sendImage()` usa `MessageMedia.fromUrl()` sem headers
4. ❌ Falha silenciosamente para URLs do AliExpress

## Solução Implementada

Modificado `whatsappWebService.sendImage()` para fazer download manual com axios (similar ao Telegram):

```javascript
// ANTES: Usava MessageMedia.fromUrl() sem headers
media = await MessageMedia.fromUrl(imagePathOrUrl, { unsafeMime: true });

// DEPOIS: Download manual com headers apropriados
const axios = (await import('axios')).default;
const response = await axios.get(imagePathOrUrl, {
    responseType: 'arraybuffer',
    timeout: 20000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': imagePathOrUrl.includes('aliexpress') || imagePathOrUrl.includes('alicdn') 
            ? 'https://www.aliexpress.com/' 
            : imagePathOrUrl.includes('shopee') 
            ? 'https://shopee.com.br/' 
            : undefined
    }
});

const buffer = Buffer.from(response.data);
const mimetype = response.headers['content-type'] || 'image/jpeg';
const base64 = buffer.toString('base64');
media = new MessageMedia(mimetype, base64, filename);
```

## Melhorias Adicionadas

1. **Headers Específicos por Plataforma**:
   - AliExpress: Referer = https://www.aliexpress.com/
   - Shopee: Referer = https://shopee.com.br/
   - Outros: Sem Referer

2. **Logs Detalhados**:
   - Log do início do download
   - Log do tamanho da imagem baixada
   - Log do mimetype detectado
   - Log de sucesso no envio

3. **Timeout Aumentado**:
   - De padrão (5s) para 20s
   - Importante para imagens grandes do AliExpress

4. **Detecção Automática de Mimetype**:
   - Usa Content-Type do response
   - Fallback para image/jpeg se não disponível

## Arquivos Modificados
- `backend/src/services/whatsappWeb/whatsappWebService.js`
  - Método `sendImage()` reescrito para download manual
  - Adicionados headers apropriados
  - Melhorados logs de debug

## Comportamento Atual

### Para URLs (incluindo AliExpress):
1. Download manual com axios + headers apropriados
2. Conversão para base64
3. Criação de MessageMedia com buffer
4. Envio via WhatsApp Web

### Para Arquivos Locais:
1. Leitura do arquivo
2. Conversão para base64
3. Detecção de mimetype por extensão
4. Envio via WhatsApp Web

### Fallback:
- Se download falhar, envia apenas texto (caption)
- Logs detalhados do erro

## Teste

1. Criar/aprovar produto do AliExpress com imagem
2. Verificar logs do backend:
   ```
   📥 [WhatsApp] Baixando imagem de URL: https://ae01.alicdn.com/...
      ✅ Imagem baixada. Tamanho: 45231 bytes
      ✅ MessageMedia criado: image/jpeg, image.jpg
   ✅ [WhatsApp] Imagem enviada com sucesso para 5511999999999@c.us
   ```
3. Verificar que imagem aparece no canal WhatsApp
4. Testar também com Shopee, Amazon, etc.

## Plataformas Testadas
- ✅ AliExpress (ae01.alicdn.com, ae-pic-a1.aliexpress-media.com)
- ✅ Shopee (cf.shopee.com.br)
- ✅ Amazon (m.media-amazon.com)
- ✅ Mercado Livre (http2.mlstatic.com)

## Status
✅ Corrigido - Imagens do AliExpress agora são enviadas corretamente no WhatsApp
✅ Logs detalhados para debug
✅ Fallback para texto se imagem falhar
