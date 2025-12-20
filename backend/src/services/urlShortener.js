import axios from 'axios';
import logger from '../config/logger.js';

class UrlShortener {
  /**
   * Encurtar URL usando a API do encurtador.dev
   * @param {string} url - URL a ser encurtada
   * @returns {Promise<string>} - URL encurtada
   */
  async shorten(url) {
    try {
      if (!url || !url.trim()) {
        throw new Error('URL não fornecida');
      }

      // Validar se é uma URL válida
      let urlToShorten = url.trim();
      
      try {
        // Tentar criar objeto URL para validar
        const urlObj = new URL(urlToShorten);
        
        // IMPORTANTE: Remover fragmento (#) da URL antes de encurtar
        // Algumas APIs não aceitam fragmentos
        if (urlObj.hash) {
          logger.info(`   ⚠️ URL contém fragmento (#), removendo antes de encurtar`);
          logger.info(`   Fragmento removido: ${urlObj.hash}`);
          urlObj.hash = '';
          urlToShorten = urlObj.toString();
        }
        
        logger.info(`   URL validada e preparada: ${urlToShorten.substring(0, 100)}...`);
      } catch (e) {
        logger.error(`   ❌ URL inválida: ${e.message}`);
        throw new Error(`URL inválida: ${e.message}`);
      }

      // Verificar se a API está configurada (opcional - a API é pública)
      // Mas podemos verificar se há alguma configuração especial no futuro
      const apiUrl = process.env.ENCURTADOR_API_URL || 'https://api.encurtador.dev/encurtamentos';

      logger.info(`🔗 Encurtando URL: ${urlToShorten.substring(0, 80)}...`);
      logger.info(`   Tamanho da URL: ${urlToShorten.length} caracteres`);

      const response = await axios.post(
        apiUrl,
        { url: urlToShorten },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000 // Aumentar timeout para URLs longas
        }
      );

      logger.info(`📦 Resposta da API recebida:`);
      logger.info(`   Status: ${response.status}`);
      logger.info(`   Headers: ${JSON.stringify(response.headers)}`);
      logger.info(`   Data completa: ${JSON.stringify(response.data, null, 2)}`);
      logger.info(`   Tipo de response.data: ${typeof response.data}`);
      
      // Verificar diferentes formatos de resposta
      let shortUrl = null;
      if (response.data) {
        logger.info(`🔍 Analisando resposta da API...`);
        
        // Formato esperado: { urlEncurtada: "..." }
        if (response.data.urlEncurtada) {
          shortUrl = response.data.urlEncurtada;
          logger.info(`   ✅ Encontrado urlEncurtada: ${shortUrl}`);
        }
        // Formato alternativo: { url: "..." }
        else if (response.data.url) {
          shortUrl = response.data.url;
          logger.info(`   ✅ Encontrado url: ${shortUrl}`);
        }
        // Formato alternativo: string direta
        else if (typeof response.data === 'string') {
          shortUrl = response.data;
          logger.info(`   ✅ Resposta é string direta: ${shortUrl}`);
        }
        // Formato alternativo: { data: { urlEncurtada: "..." } }
        else if (response.data.data && response.data.data.urlEncurtada) {
          shortUrl = response.data.data.urlEncurtada;
          logger.info(`   ✅ Encontrado data.urlEncurtada: ${shortUrl}`);
        }
        else {
          logger.warn(`   ⚠️ Nenhum formato conhecido encontrado na resposta`);
          logger.warn(`   Chaves disponíveis: ${Object.keys(response.data).join(', ')}`);
        }
      } else {
        logger.error(`   ❌ response.data é null ou undefined`);
      }
      
      // Validar e normalizar URL encurtada
      if (shortUrl) {
        logger.info(`🔗 URL extraída da resposta: ${shortUrl}`);
        logger.info(`   Comparando com original: ${url.trim()}`);
        logger.info(`   São iguais: ${shortUrl === url.trim() ? 'SIM ⚠️' : 'NÃO ✅'}`);
        
        // Se a URL retornada é igual à original, a API não encurtou
        if (shortUrl === url.trim() || shortUrl === url) {
          logger.warn(`⚠️ API retornou URL original (não encurtou). Isso pode indicar:`);
          logger.warn(`   1. URL muito longa ou complexa`);
          logger.warn(`   2. API não suporta este tipo de URL`);
          logger.warn(`   3. Limite de requisições atingido`);
          throw new Error('API retornou URL original (não encurtou)');
        }
        
        // Se a URL não começa com http/https, adicionar https://
        if (!shortUrl.startsWith('http://') && !shortUrl.startsWith('https://')) {
          shortUrl = `https://${shortUrl}`;
          logger.info(`   URL normalizada (adicionado https://): ${shortUrl}`);
        }
        
        // Validar se é uma URL válida
        try {
          new URL(shortUrl);
          logger.info(`✅ URL encurtada com sucesso: ${shortUrl}`);
          logger.info(`   Original tinha ${url.length} caracteres`);
          logger.info(`   Encurtada tem ${shortUrl.length} caracteres`);
          return shortUrl;
        } catch (e) {
          logger.error(`❌ URL encurtada não é válida: ${shortUrl}`);
          logger.error(`   Erro de validação: ${e.message}`);
          throw new Error('URL encurtada não é válida');
        }
      } else {
        logger.error(`❌ Resposta da API não contém URL encurtada.`);
        logger.error(`   Resposta completa: ${JSON.stringify(response.data, null, 2)}`);
        throw new Error('Resposta da API não contém urlEncurtada');
      }
    } catch (error) {
      logger.error(`❌ Erro ao encurtar URL: ${error.message}`);
      
      if (error.response) {
        logger.error(`   Status: ${error.response.status}`);
        logger.error(`   Data: ${JSON.stringify(error.response.data)}`);
      }
      
      // Se falhar, retornar a URL original
      logger.warn(`⚠️ Retornando URL original devido ao erro`);
      return url;
    }
  }

  /**
   * Verificar se o serviço está disponível
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const testUrl = 'https://google.com';
      const shortUrl = await this.shorten(testUrl);
      return shortUrl && shortUrl !== testUrl && shortUrl.startsWith('http');
    } catch (error) {
      logger.warn(`⚠️ Serviço de encurtamento não disponível: ${error.message}`);
      return false;
    }
  }
}

export default new UrlShortener();
