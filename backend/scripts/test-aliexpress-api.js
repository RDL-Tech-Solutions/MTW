import axios from 'axios';
import crypto from 'crypto';
import AppSettings from '../src/models/AppSettings.js';
import logger from '../src/config/logger.js';

/**
 * Script de teste para API do AliExpress
 * Testa diferentes métodos e palavras-chave para identificar problemas
 */

class AliExpressTester {
  constructor() {
    this.defaultBaseUrl = 'https://api-sg.aliexpress.com/rest';
  }

  /**
   * Gerar assinatura para API AliExpress
   */
  generateSignature(method, params, appSecret) {
    const paramsWithoutSign = { ...params };
    delete paramsWithoutSign.sign;
    
    const sortedKeys = Object.keys(paramsWithoutSign).sort();
    const concatenatedParams = sortedKeys
      .map(key => `${key}${paramsWithoutSign[key]}`)
      .join('');
    
    const stringToSign = `${method}${concatenatedParams}`;
    
    return crypto
      .createHmac('sha256', appSecret)
      .update(stringToSign)
      .digest('hex')
      .toUpperCase();
  }

  /**
   * Fazer requisição para API AliExpress
   */
  async makeRequest(method, params = {}) {
    try {
      const config = await AppSettings.getAliExpressConfig();

      if (!config.appKey || !config.appSecret) {
        throw new Error('AliExpress não configurado - configure App Key e App Secret em /settings');
      }

      // Timestamp no formato requerido pela API AliExpress: milissegundos desde epoch
      const timestamp = Date.now();
      
      const requestParams = {
        app_key: config.appKey,
        method,
        timestamp,
        sign_method: 'sha256',
        format: 'json',
        v: '2.0',
        ...params
      };

      const sign = this.generateSignature(method, requestParams, config.appSecret);
      requestParams.sign = sign;

      const baseUrl = config.apiUrl || this.defaultBaseUrl;
      
      console.log(`\n📡 Fazendo requisição:`);
      console.log(`   Método: ${method}`);
      console.log(`   URL: ${baseUrl}`);
      console.log(`   Parâmetros: ${JSON.stringify({ ...requestParams, sign: '***' }, null, 2)}`);
      
      const response = await axios.get(baseUrl, {
        params: requestParams,
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        console.error(`\n❌ Erro HTTP: ${error.response.status}`);
        console.error(`   Resposta: ${JSON.stringify(error.response.data, null, 2)}`);
      } else if (error.request) {
        console.error(`\n❌ Timeout ou erro de rede`);
      } else {
        console.error(`\n❌ Erro: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Testar método hotproduct.query
   */
  async testHotProductQuery(keyword) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Testando: aliexpress.affiliate.hotproduct.query`);
    console.log(`   Palavra-chave: "${keyword}"`);
    console.log(`${'='.repeat(60)}`);

    try {
      const response = await this.makeRequest('aliexpress.affiliate.hotproduct.query', {
        keywords: keyword,
        page_size: 10,
        page_no: 1,
        sort: 'SALE_PRICE_ASC',
        ship_to_country: 'BR',
        target_currency: 'BRL',
        target_language: 'PT'
      });

      console.log(`\n✅ Resposta recebida:`);
      console.log(JSON.stringify(response, null, 2));

      // Tentar extrair produtos
      let products = null;
      if (response && response.aliexpress_affiliate_hotproduct_query_response) {
        const respResult = response.aliexpress_affiliate_hotproduct_query_response.resp_result;
        if (respResult) {
          if (respResult.result && respResult.result.products) {
            products = respResult.result.products;
          } else if (respResult.products) {
            products = respResult.products;
          } else if (respResult.result && Array.isArray(respResult.result)) {
            products = respResult.result;
          }
        }
      }

      if (products && Array.isArray(products) && products.length > 0) {
        console.log(`\n✅ ${products.length} produtos encontrados!`);
        console.log(`\n📦 Primeiro produto:`);
        console.log(JSON.stringify(products[0], null, 2));
        return true;
      } else {
        console.log(`\n⚠️ Nenhum produto encontrado na resposta`);
        return false;
      }
    } catch (error) {
      console.error(`\n❌ Erro no teste: ${error.message}`);
      return false;
    }
  }

  /**
   * Testar método product.query
   */
  async testProductQuery(keyword) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Testando: aliexpress.affiliate.product.query`);
    console.log(`   Palavra-chave: "${keyword}"`);
    console.log(`${'='.repeat(60)}`);

    try {
      const response = await this.makeRequest('aliexpress.affiliate.product.query', {
        keywords: keyword,
        page_size: 10,
        page_no: 1,
        sort: 'SALE_PRICE_ASC',
        ship_to_country: 'BR',
        target_currency: 'BRL',
        target_language: 'PT'
      });

      console.log(`\n✅ Resposta recebida:`);
      console.log(JSON.stringify(response, null, 2));

      // Tentar extrair produtos
      let products = null;
      if (response && response.aliexpress_affiliate_product_query_response) {
        const respResult = response.aliexpress_affiliate_product_query_response.resp_result;
        if (respResult) {
          if (respResult.result && respResult.result.products) {
            products = respResult.result.products;
          } else if (respResult.products) {
            products = respResult.products;
          }
        }
      }

      if (products && Array.isArray(products) && products.length > 0) {
        console.log(`\n✅ ${products.length} produtos encontrados!`);
        console.log(`\n📦 Primeiro produto:`);
        console.log(JSON.stringify(products[0], null, 2));
        return true;
      } else {
        console.log(`\n⚠️ Nenhum produto encontrado na resposta`);
        return false;
      }
    } catch (error) {
      console.error(`\n❌ Erro no teste: ${error.message}`);
      return false;
    }
  }

  /**
   * Testar sem palavras-chave (buscar produtos em destaque)
   */
  async testWithoutKeywords() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Testando: aliexpress.affiliate.hotproduct.query (sem keywords)`);
    console.log(`${'='.repeat(60)}`);

    try {
      const response = await this.makeRequest('aliexpress.affiliate.hotproduct.query', {
        page_size: 10,
        page_no: 1,
        sort: 'SALE_PRICE_ASC',
        ship_to_country: 'BR',
        target_currency: 'BRL',
        target_language: 'PT'
      });

      console.log(`\n✅ Resposta recebida:`);
      console.log(JSON.stringify(response, null, 2));

      let products = null;
      if (response && response.aliexpress_affiliate_hotproduct_query_response) {
        const respResult = response.aliexpress_affiliate_hotproduct_query_response.resp_result;
        if (respResult && respResult.result && respResult.result.products) {
          products = respResult.result.products;
        }
      }

      if (products && Array.isArray(products) && products.length > 0) {
        console.log(`\n✅ ${products.length} produtos encontrados!`);
        return true;
      } else {
        console.log(`\n⚠️ Nenhum produto encontrado na resposta`);
        return false;
      }
    } catch (error) {
      console.error(`\n❌ Erro no teste: ${error.message}`);
      return false;
    }
  }

  /**
   * Testar com diferentes parâmetros
   */
  async testWithDifferentParams(keyword) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Testando com parâmetros diferentes`);
    console.log(`   Palavra-chave: "${keyword}"`);
    console.log(`${'='.repeat(60)}`);

    const testCases = [
      {
        name: 'Teste 1: Parâmetros mínimos',
        params: {
          keywords: keyword,
          page_size: 10
        }
      },
      {
        name: 'Teste 2: Com ship_to_country',
        params: {
          keywords: keyword,
          page_size: 10,
          ship_to_country: 'BR'
        }
      },
      {
        name: 'Teste 3: Com currency e language',
        params: {
          keywords: keyword,
          page_size: 10,
          target_currency: 'BRL',
          target_language: 'PT'
        }
      },
      {
        name: 'Teste 4: Com sort',
        params: {
          keywords: keyword,
          page_size: 10,
          sort: 'SALE_PRICE_ASC'
        }
      },
      {
        name: 'Teste 5: Todos os parâmetros',
        params: {
          keywords: keyword,
          page_size: 10,
          page_no: 1,
          sort: 'SALE_PRICE_ASC',
          ship_to_country: 'BR',
          target_currency: 'BRL',
          target_language: 'PT'
        }
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n${'-'.repeat(60)}`);
      console.log(`📋 ${testCase.name}`);
      console.log(`${'-'.repeat(60)}`);

      try {
        const response = await this.makeRequest('aliexpress.affiliate.hotproduct.query', testCase.params);
        
        // Verificar se tem produtos
        let hasProducts = false;
        if (response && response.aliexpress_affiliate_hotproduct_query_response) {
          const respResult = response.aliexpress_affiliate_hotproduct_query_response.resp_result;
          if (respResult && respResult.result && respResult.result.products) {
            const products = respResult.result.products;
            if (Array.isArray(products) && products.length > 0) {
              hasProducts = true;
              console.log(`   ✅ ${products.length} produtos encontrados`);
            }
          }
        }

        if (!hasProducts) {
          console.log(`   ⚠️ Nenhum produto encontrado`);
          if (response.error_response) {
            console.log(`   ❌ Erro: ${JSON.stringify(response.error_response)}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`);
      }
    }
  }

  /**
   * Executar todos os testes
   */
  async runAllTests() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 INICIANDO TESTES DA API ALIEXPRESS`);
    console.log(`${'='.repeat(60)}`);

    // Verificar configuração
    const config = await AppSettings.getAliExpressConfig();
    console.log(`\n📋 Configuração:`);
    console.log(`   App Key: ${config.appKey ? `${config.appKey.substring(0, 4)}...` : 'NÃO CONFIGURADO'}`);
    console.log(`   App Secret: ${config.appSecret ? '✅ Configurado' : 'NÃO CONFIGURADO'}`);
    console.log(`   Tracking ID: ${config.trackingId || 'NÃO CONFIGURADO'}`);
    console.log(`   API URL: ${config.apiUrl || this.defaultBaseUrl}`);

    if (!config.appKey || !config.appSecret) {
      console.error(`\n❌ AliExpress não está configurado! Configure em /settings`);
      return;
    }

    // Palavras-chave para testar
    const keywords = [
      'bluetooth',
      'headphone',
      'smartwatch',
      'phone',
      'laptop',
      'mouse',
      'keyboard',
      'camera',
      'speaker',
      'charger'
    ];

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 TESTE 1: Buscar sem palavras-chave (produtos em destaque)`);
    console.log(`${'='.repeat(60)}`);
    await this.testWithoutKeywords();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 TESTE 2: Testar com diferentes parâmetros`);
    console.log(`${'='.repeat(60)}`);
    await this.testWithDifferentParams('bluetooth');

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 TESTE 3: Testar método hotproduct.query com várias palavras-chave`);
    console.log(`${'='.repeat(60)}`);
    let successCount = 0;
    for (const keyword of keywords.slice(0, 3)) {
      const success = await this.testHotProductQuery(keyword);
      if (success) successCount++;
      // Aguardar um pouco entre requisições
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 TESTE 4: Testar método product.query`);
    console.log(`${'='.repeat(60)}`);
    await this.testProductQuery('bluetooth');

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 RESUMO DOS TESTES`);
    console.log(`${'='.repeat(60)}`);
    console.log(`   Testes com sucesso: ${successCount}/3`);
    console.log(`\n✅ Testes concluídos!`);
  }
}

// Executar testes
const tester = new AliExpressTester();
tester.runAllTests().catch(error => {
  console.error(`\n❌ Erro fatal: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
