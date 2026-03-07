// Service Worker para a extensão
console.log('Background service worker iniciado');

// Estado da captura em lote
let batchCaptureState = {
  isRunning: false,
  total: 0,
  current: 0,
  success: 0,
  errors: 0
};

// Listener para instalação
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extensão instalada pela primeira vez');
    // Abrir página de configuração
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html')
    });
  } else if (details.reason === 'update') {
    console.log('Extensão atualizada');
  }
});

// Listener para clique no ícone da extensão
chrome.action.onClicked.addListener((tab) => {
  console.log('Ícone da extensão clicado na aba:', tab.id);
});

// Listener para mensagens
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Mensagem recebida:', request);
  
  if (request.action === 'captureProduct') {
    // Lógica adicional se necessário
    sendResponse({ success: true });
  }
  
  // NOVO: Processar captura em lote em background
  if (request.action === 'startBatchCapture') {
    startBatchCapture(request.products, request.config)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Mantém o canal aberto para resposta assíncrona
  }
  
  // NOVO: Obter status da captura em lote
  if (request.action === 'getBatchCaptureStatus') {
    sendResponse(batchCaptureState);
    return true;
  }
  
  return true;
});

/**
 * Processar captura em lote em background
 */
async function startBatchCapture(products, config) {
  if (batchCaptureState.isRunning) {
    return { success: false, error: 'Captura em lote já está em execução' };
  }

  // Inicializar estado
  batchCaptureState = {
    isRunning: true,
    total: products.length,
    current: 0,
    success: 0,
    errors: 0
  };

  console.log(`📦 Iniciando captura em lote de ${products.length} produtos em background`);

  // Processar produtos
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    batchCaptureState.current = i + 1;

    try {
      console.log(`📤 [${i + 1}/${products.length}] Enviando: ${product.title?.substring(0, 50)}...`);

      const response = await fetch(`${config.apiUrl}/api/products/pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`
        },
        body: JSON.stringify(product)
      });

      if (response.ok) {
        batchCaptureState.success++;
        console.log(`✅ [${i + 1}/${products.length}] Produto enviado`);
      } else {
        batchCaptureState.errors++;
        console.error(`❌ [${i + 1}/${products.length}] Erro ${response.status}`);
      }

      // Pequeno delay para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      batchCaptureState.errors++;
      console.error(`❌ [${i + 1}/${products.length}] Erro:`, error);
    }
  }

  // Finalizar
  batchCaptureState.isRunning = false;
  
  const result = {
    success: true,
    total: batchCaptureState.total,
    successCount: batchCaptureState.success,
    errorCount: batchCaptureState.errors
  };

  console.log(`✅ Captura em lote concluída:`, result);

  // Enviar notificação
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Captura em Lote Concluída',
    message: `${batchCaptureState.success} produtos capturados com sucesso!${batchCaptureState.errors > 0 ? ` (${batchCaptureState.errors} falharam)` : ''}`,
    priority: 2
  });

  return result;
}

