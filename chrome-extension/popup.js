// ============================================
// ELEMENTOS DOM
// ============================================
const apiUrlInput = document.getElementById('api-url');
const apiTokenInput = document.getElementById('api-token');
const saveConfigBtn = document.getElementById('save-config');
const captureBtn = document.getElementById('capture-btn');
const batchCaptureBtn = document.getElementById('batch-capture-btn');
const statusDiv = document.getElementById('status');

// Seções
const configSection = document.getElementById('config-section');
const captureSection = document.getElementById('capture-section');
const editSection = document.getElementById('edit-section');

// Campos de edição
const editTitle = document.getElementById('edit-title');
const editDescription = document.getElementById('edit-description');
const editPrice = document.getElementById('edit-price');
const editOriginalPrice = document.getElementById('edit-original-price');
const editAffiliateLink = document.getElementById('edit-affiliate-link');
const editCategory = document.getElementById('edit-category');
const editCoupon = document.getElementById('edit-coupon');
const editImage = document.getElementById('edit-image');
const imagePreview = document.getElementById('image-preview');
const previewImg = document.getElementById('preview-img');
const pasteLinkBtn = document.getElementById('paste-link-btn');

// Botões de ação
const savePendingBtn = document.getElementById('save-pending-btn');
const saveOnlyBtn = document.getElementById('save-only-btn');
const savePublishBtn = document.getElementById('save-publish-btn');
const saveScheduleBtn = document.getElementById('save-schedule-btn');
const cancelBtn = document.getElementById('cancel-btn');

// ============================================
// ESTADO GLOBAL
// ============================================
let capturedData = null;
let categories = [];
let config = { apiUrl: '', apiToken: '' };

// ============================================
// INICIALIZAÇÃO
// ============================================
(async function init() {
  // Carregar configurações
  const result = await chrome.storage.sync.get(['apiUrl', 'apiToken']);
  if (result.apiUrl) {
    apiUrlInput.value = result.apiUrl;
    config.apiUrl = result.apiUrl;
  }
  if (result.apiToken) {
    apiTokenInput.value = result.apiToken;
    config.apiToken = result.apiToken;
  }

  // Carregar categorias se configurado
  if (config.apiUrl && config.apiToken) {
    await loadCategories();
  }

  // NOVO: Restaurar dados capturados se existirem
  await restoreCapturedData();
})();

// ============================================
// RESTAURAR DADOS CAPTURADOS
// ============================================
async function restoreCapturedData() {
  try {
    const result = await chrome.storage.local.get(['capturedProduct']);
    
    if (result.capturedProduct) {
      console.log('📦 Restaurando dados capturados...');
      
      capturedData = result.capturedProduct;
      
      // Preencher formulário
      editTitle.value = capturedData.title || '';
      editDescription.value = capturedData.description || '';
      editPrice.value = capturedData.price || '';
      editOriginalPrice.value = capturedData.originalPrice || capturedData.price || '';
      editAffiliateLink.value = capturedData.affiliateLink || '';
      editImage.value = capturedData.imageUrl || '';
      
      // Carregar cupons da plataforma
      if (capturedData.platform) {
        await loadCouponsByPlatform(capturedData.platform);
      }
      
      // Restaurar cupom selecionado se houver
      if (capturedData.couponId) {
        editCoupon.value = capturedData.couponId;
      }
      
      // Mostrar preview da imagem se houver
      if (capturedData.imageUrl) {
        previewImg.src = capturedData.imageUrl;
        imagePreview.classList.remove('hidden');
      }
      
      // Mostrar seção de edição
      captureSection.classList.add('hidden');
      editSection.classList.remove('hidden');
      
      showStatus('📦 Dados restaurados! Continue editando.', 'success');
      
      console.log('✅ Dados restaurados com sucesso');
    }
  } catch (error) {
    console.error('❌ Erro ao restaurar dados:', error);
  }
}

// ============================================
// SALVAR DADOS CAPTURADOS (para persistência)
// ============================================
async function saveCapturedData(data) {
  try {
    await chrome.storage.local.set({ capturedProduct: data });
    console.log('💾 Dados salvos para persistência');
  } catch (error) {
    console.error('❌ Erro ao salvar dados:', error);
  }
}

// ============================================
// LIMPAR DADOS SALVOS
// ============================================
async function clearCapturedData() {
  try {
    await chrome.storage.local.remove(['capturedProduct']);
    console.log('🗑️ Dados capturados limpos');
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error);
  }
}

// ============================================
// CARREGAR CATEGORIAS
// ============================================
async function loadCategories() {
  try {
    console.log('📂 Carregando categorias...');
    
    const response = await fetch(`${config.apiUrl}/api/categories`, {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao carregar categorias: ${response.status}`);
    }

    const result = await response.json();
    categories = result.data || [];

    console.log(`✅ ${categories.length} categorias carregadas`);

    // Preencher select
    editCategory.innerHTML = '<option value="">🤖 IA vai definir automaticamente</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = `${cat.icon || '📦'} ${cat.name}`;
      editCategory.appendChild(option);
    });

  } catch (error) {
    console.error('❌ Erro ao carregar categorias:', error);
    // Não bloquear a extensão se falhar
  }
}

// ============================================
// CARREGAR CUPONS POR PLATAFORMA
// ============================================
async function loadCouponsByPlatform(platform) {
  try {
    console.log(`🎟️ Carregando cupons para plataforma: ${platform}`);
    
    // VERIFICAR CONFIGURAÇÃO
    if (!config.apiUrl || !config.apiToken) {
      console.error('❌ Configuração não encontrada! Configure a API primeiro.');
      console.log('   config.apiUrl:', config.apiUrl);
      console.log('   config.apiToken:', config.apiToken ? 'Definido' : 'Não definido');
      editCoupon.innerHTML = '<option value="">Configure a API primeiro</option>';
      return [];
    }
    
    // Normalizar nome da plataforma para o formato do backend
    const platformMap = {
      'Mercado Livre': 'mercadolivre',
      'Amazon': 'amazon',
      'Shopee': 'shopee',
      'AliExpress': 'aliexpress',
      'Kabum': 'kabum',
      'Pichau': 'pichau',
      'Magazine Luiza': 'magazineluiza',
      'Americanas': 'americanas',
      'Casas Bahia': 'casasbahia',
      'Extra': 'extra',
      'Ponto Frio': 'pontofrio'
    };
    
    const normalizedPlatform = platformMap[platform] || platform.toLowerCase().replace(/\s+/g, '');
    
    console.log(`   Plataforma normalizada: ${normalizedPlatform}`);
    console.log(`   URL da requisição: ${config.apiUrl}/api/coupons?platform=${normalizedPlatform}&status=active`);
    
    const response = await fetch(`${config.apiUrl}/api/coupons?platform=${normalizedPlatform}&status=active`, {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`
      }
    });

    console.log(`   Status da resposta: ${response.status}`);

    if (!response.ok) {
      console.warn(`⚠️ Erro ao carregar cupons: ${response.status}`);
      const errorText = await response.text();
      console.warn(`   Resposta do servidor: ${errorText.substring(0, 200)}`);
      editCoupon.innerHTML = '<option value="">Erro ao carregar cupons</option>';
      return [];
    }

    const result = await response.json();
    console.log(`   Resposta completa:`, result);
    
    const coupons = result.data?.coupons || result.data || [];

    console.log(`✅ ${coupons.length} cupons encontrados para ${platform}`);
    
    if (coupons.length > 0) {
      console.log(`   Primeiro cupom:`, coupons[0]);
    }

    // Preencher select
    editCoupon.innerHTML = '<option value="">Nenhum cupom</option>';
    
    coupons.forEach(coupon => {
      const option = document.createElement('option');
      option.value = coupon.id;
      option.textContent = `${coupon.code} - ${coupon.title}`;
      option.dataset.couponId = coupon.id;
      option.dataset.couponCode = coupon.code;
      editCoupon.appendChild(option);
    });
    
    console.log(`   Select atualizado com ${editCoupon.options.length - 1} cupons`);
    
    return coupons;

  } catch (error) {
    console.error('❌ Erro ao carregar cupons:', error);
    console.error('   Stack:', error.stack);
    // Limpar select em caso de erro
    editCoupon.innerHTML = '<option value="">Nenhum cupom disponível</option>';
    return [];
  }
}

// ============================================
// SALVAR CONFIGURAÇÃO
// ============================================
saveConfigBtn.addEventListener('click', async () => {
  const apiUrl = apiUrlInput.value.trim();
  const apiToken = apiTokenInput.value.trim();

  if (!apiUrl || !apiToken) {
    showStatus('Por favor, preencha todos os campos', 'error');
    return;
  }

  // Validar URL
  try {
    new URL(apiUrl);
  } catch {
    showStatus('URL da API inválida', 'error');
    return;
  }

  // Salvar
  await chrome.storage.sync.set({ apiUrl, apiToken });
  config.apiUrl = apiUrl;
  config.apiToken = apiToken;

  showStatus('✅ Configuração salva com sucesso!', 'success');

  // Carregar categorias
  await loadCategories();
});

// ============================================
// CAPTURAR PRODUTO
// ============================================
captureBtn.addEventListener('click', async () => {
  try {
    captureBtn.disabled = true;
    showStatus('📦 Capturando produto...', 'loading');

    // Verificar configuração
    if (!config.apiUrl || !config.apiToken) {
      showStatus('⚠️ Configure a API primeiro!', 'error');
      captureBtn.disabled = false;
      return;
    }

    // Obter aba ativa
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Executar script de captura na página
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractProductData
    });

    const productData = results[0].result;

    if (!productData || !productData.title) {
      showStatus('❌ Não foi possível extrair dados do produto', 'error');
      captureBtn.disabled = false;
      return;
    }

    console.log('📦 Dados capturados:', productData);

    // Armazenar dados capturados
    capturedData = productData;

    // NOVO: Salvar dados para persistência
    await saveCapturedData(productData);

    // Preencher formulário de edição
    editTitle.value = productData.title || '';
    editDescription.value = productData.description || '';
    editPrice.value = productData.price || '';
    editOriginalPrice.value = productData.originalPrice || productData.price || '';
    editAffiliateLink.value = productData.affiliateLink || productData.sourceUrl || '';
    editImage.value = productData.imageUrl || '';
    
    // NOVO: Carregar cupons da plataforma
    if (productData.platform) {
      await loadCouponsByPlatform(productData.platform);
    }
    
    // Restaurar cupom selecionado se houver
    if (productData.couponId) {
      editCoupon.value = productData.couponId;
    }

    // Mostrar preview da imagem se houver
    if (productData.imageUrl) {
      previewImg.src = productData.imageUrl;
      imagePreview.classList.remove('hidden');
    }

    // Esconder seção de captura e mostrar edição
    captureSection.classList.add('hidden');
    editSection.classList.remove('hidden');

    showStatus('✅ Produto capturado! Edite os dados e escolha uma ação.', 'success');

  } catch (error) {
    console.error('❌ Erro ao capturar produto:', error);
    showStatus(`❌ Erro: ${error.message}`, 'error');
  } finally {
    captureBtn.disabled = false;
  }
});

// ============================================
// CAPTURAR EM LOTE
// ============================================
// BOTÃO: CAPTURA EM LOTE
// ============================================
batchCaptureBtn.addEventListener('click', async () => {
  try {
    batchCaptureBtn.disabled = true;
    captureBtn.disabled = true;
    showStatus('📦 Capturando produtos em lote...', 'loading');

    // Verificar configuração
    if (!config.apiUrl || !config.apiToken) {
      showStatus('⚠️ Configure a API primeiro!', 'error');
      batchCaptureBtn.disabled = false;
      captureBtn.disabled = false;
      return;
    }

    // Obter aba ativa
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Executar script de captura em lote na página
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractAllProductsFromPage
    });

    const productsData = results[0].result;

    if (!productsData || productsData.length === 0) {
      showStatus('❌ Nenhum produto encontrado na página', 'error');
      batchCaptureBtn.disabled = false;
      captureBtn.disabled = false;
      return;
    }

    console.log(`📦 ${productsData.length} produtos encontrados`);
    
    // NOVO: Enviar para background service worker
    showStatus(`🚀 Iniciando captura de ${productsData.length} produtos em background...`, 'loading');
    
    chrome.runtime.sendMessage({
      action: 'startBatchCapture',
      products: productsData,
      config: config
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Erro ao enviar para background:', chrome.runtime.lastError);
        showStatus('❌ Erro ao iniciar captura em background', 'error');
        batchCaptureBtn.disabled = false;
        captureBtn.disabled = false;
        return;
      }
      
      // Mostrar mensagem de sucesso
      showStatus(`✅ Captura em background iniciada! Você pode fechar esta janela. Você será notificado quando concluir.`, 'success');
      
      // Reabilitar botões após 2 segundos
      setTimeout(() => {
        batchCaptureBtn.disabled = false;
        captureBtn.disabled = false;
      }, 2000);
    });

  } catch (error) {
    console.error('❌ Erro na captura em lote:', error);
    showStatus(`❌ Erro: ${error.message}`, 'error');
    batchCaptureBtn.disabled = false;
    captureBtn.disabled = false;
  }
});

// ============================================
// BOTÃO: COLAR LINK DE AFILIADO
// ============================================
pasteLinkBtn.addEventListener('click', async () => {
  try {
    // Ler da área de transferência
    const text = await navigator.clipboard.readText();
    
    if (text && text.trim()) {
      // Validar se é uma URL
      try {
        new URL(text.trim());
        editAffiliateLink.value = text.trim();
        showStatus('✅ Link colado com sucesso!', 'success');
        console.log('📋 Link colado:', text.substring(0, 50) + '...');
      } catch {
        showStatus('⚠️ Texto colado não é uma URL válida', 'error');
      }
    } else {
      showStatus('⚠️ Área de transferência vazia', 'error');
    }
  } catch (error) {
    console.error('❌ Erro ao colar:', error);
    showStatus('❌ Erro ao acessar área de transferência', 'error');
  }
});

// ============================================
// PREVIEW DE IMAGEM AO EDITAR URL
// ============================================
editImage.addEventListener('input', () => {
  const imageUrl = editImage.value.trim();
  
  if (imageUrl && imageUrl.startsWith('http')) {
    previewImg.src = imageUrl;
    imagePreview.classList.remove('hidden');
    
    // Esconder se falhar ao carregar
    previewImg.onerror = () => {
      imagePreview.classList.add('hidden');
    };
  } else {
    imagePreview.classList.add('hidden');
  }
  
  // NOVO: Salvar alteração automaticamente
  updateCapturedData();
});

// ============================================
// SALVAR ALTERAÇÕES AUTOMATICAMENTE
// ============================================
function updateCapturedData() {
  if (!capturedData) return;
  
  // Atualizar dados capturados com valores atuais do formulário
  capturedData.title = editTitle.value.trim();
  capturedData.description = editDescription.value.trim();
  capturedData.price = parseFloat(editPrice.value) || 0;
  capturedData.originalPrice = parseFloat(editOriginalPrice.value) || parseFloat(editPrice.value) || 0;
  capturedData.affiliateLink = editAffiliateLink.value.trim();
  capturedData.imageUrl = editImage.value.trim();
  
  // Salvar ID do cupom selecionado
  capturedData.couponId = editCoupon.value || null;
  
  // Salvar para persistência
  saveCapturedData(capturedData);
  
  console.log('💾 Alterações salvas automaticamente');
}

// Adicionar listeners para todos os campos
editTitle.addEventListener('input', updateCapturedData);
editDescription.addEventListener('input', updateCapturedData);
editPrice.addEventListener('input', updateCapturedData);
editOriginalPrice.addEventListener('input', updateCapturedData);
editAffiliateLink.addEventListener('input', updateCapturedData);
editCoupon.addEventListener('change', updateCapturedData); // change ao invés de input para select
// editImage já tem listener acima

// ============================================
// BOTÃO: SALVAR PENDENTE
// ============================================
savePendingBtn.addEventListener('click', async () => {
  await saveProduct('pending');
});

// ============================================
// BOTÃO: SALVAR (APP)
// ============================================
saveOnlyBtn.addEventListener('click', async () => {
  await saveProduct('save-only');
});

// ============================================
// BOTÃO: SALVAR E PUBLICAR
// ============================================
savePublishBtn.addEventListener('click', async () => {
  await saveProduct('publish');
});

// ============================================
// BOTÃO: IA AGENDAR
// ============================================
saveScheduleBtn.addEventListener('click', async () => {
  await saveProduct('schedule');
});

// ============================================
// FUNÇÃO PRINCIPAL: SALVAR PRODUTO
// ============================================
async function saveProduct(action) {
  try {
    // Desabilitar todos os botões
    disableActionButtons(true);
    
    const actionLabels = {
      'pending': '⏸️ Salvando como pendente...',
      'save-only': '💾 Salvando no app...',
      'publish': '🚀 Salvando e publicando...',
      'schedule': '🤖 Agendando com IA...'
    };
    
    showStatus(actionLabels[action] || 'Processando...', 'loading');

    // Coletar dados do formulário
    const productData = {
      title: editTitle.value.trim(),
      description: editDescription.value.trim(),
      price: parseFloat(editPrice.value) || 0,
      originalPrice: parseFloat(editOriginalPrice.value) || parseFloat(editPrice.value) || 0,
      imageUrl: editImage.value.trim(),
      affiliateLink: editAffiliateLink.value.trim(),
      coupon_id: editCoupon.value || null,  // CORRIGIDO: coupon_id ao invés de couponId
      platform: capturedData.platform || 'other',
      sourceUrl: capturedData.sourceUrl || editAffiliateLink.value.trim(),
      capturedAt: new Date().toISOString()
    };

    // Validações
    if (!productData.title) {
      showStatus('❌ Título é obrigatório', 'error');
      disableActionButtons(false);
      return;
    }

    if (!productData.price || productData.price === 0) {
      showStatus('❌ Preço é obrigatório e deve ser maior que zero', 'error');
      disableActionButtons(false);
      editPrice.focus();
      return;
    }

    if (!productData.affiliateLink) {
      showStatus('❌ Link de afiliado é obrigatório', 'error');
      disableActionButtons(false);
      return;
    }

    console.log('📤 Enviando produto:', productData);
    console.log('🎯 Ação:', action);

    // AÇÃO 1: SALVAR PENDENTE
    if (action === 'pending') {
      const response = await fetch(`${config.apiUrl}/api/products/pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`
        },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Erro ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Produto salvo como pendente:', result);
      
      showStatus('✅ Produto salvo como pendente! Aguardando aprovação no painel.', 'success');
      
      // NOVO: Limpar dados salvos após sucesso
      await clearCapturedData();
      
      setTimeout(() => resetForm(), 2000);
    }

    // AÇÃO 2: SALVAR (APP) - Sem publicar nos canais
    else if (action === 'save-only') {
      // Primeiro salvar como pendente
      const pendingResponse = await fetch(`${config.apiUrl}/api/products/pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`
        },
        body: JSON.stringify(productData)
      });

      if (!pendingResponse.ok) {
        throw new Error(`Erro ao criar produto: ${pendingResponse.status}`);
      }

      const pendingResult = await pendingResponse.json();
      const productId = pendingResult.data.id;

      console.log('✅ Produto criado:', productId);

      // Aprovar sem publicar
      const categoryId = editCategory.value || null;
      
      const approveResponse = await fetch(`${config.apiUrl}/api/products/pending/${productId}/approve-only`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`
        },
        body: JSON.stringify({
          affiliate_link: productData.affiliateLink,
          category_id: categoryId,
          current_price: productData.price,
          old_price: productData.originalPrice
        })
      });

      if (!approveResponse.ok) {
        throw new Error(`Erro ao aprovar produto: ${approveResponse.status}`);
      }

      console.log('✅ Produto aprovado (não publicado)');
      
      showStatus('✅ Produto salvo no app! Não foi publicado nos canais.', 'success');
      
      // NOVO: Limpar dados salvos após sucesso
      await clearCapturedData();
      
      setTimeout(() => resetForm(), 2000);
    }

    // AÇÃO 3: SALVAR E PUBLICAR
    else if (action === 'publish') {
      // Primeiro salvar como pendente
      const pendingResponse = await fetch(`${config.apiUrl}/api/products/pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`
        },
        body: JSON.stringify(productData)
      });

      if (!pendingResponse.ok) {
        throw new Error(`Erro ao criar produto: ${pendingResponse.status}`);
      }

      const pendingResult = await pendingResponse.json();
      const productId = pendingResult.data.id;

      console.log('✅ Produto criado:', productId);

      // Aprovar e publicar
      const categoryId = editCategory.value || null;
      
      const approveResponse = await fetch(`${config.apiUrl}/api/products/pending/${productId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`
        },
        body: JSON.stringify({
          affiliate_link: productData.affiliateLink,
          category_id: categoryId,
          current_price: productData.price,
          old_price: productData.originalPrice
        })
      });

      if (!approveResponse.ok) {
        throw new Error(`Erro ao publicar produto: ${approveResponse.status}`);
      }

      console.log('✅ Produto publicado');
      
      showStatus('✅ Produto publicado com sucesso em todos os canais!', 'success');
      
      // NOVO: Limpar dados salvos após sucesso
      await clearCapturedData();
      
      setTimeout(() => resetForm(), 2000);
    }

    // AÇÃO 4: IA AGENDAR
    else if (action === 'schedule') {
      // Primeiro salvar como pendente
      const pendingResponse = await fetch(`${config.apiUrl}/api/products/pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`
        },
        body: JSON.stringify(productData)
      });

      if (!pendingResponse.ok) {
        throw new Error(`Erro ao criar produto: ${pendingResponse.status}`);
      }

      const pendingResult = await pendingResponse.json();
      const productId = pendingResult.data.id;

      console.log('✅ Produto criado:', productId);

      // Aprovar e agendar com IA
      const categoryId = editCategory.value || null;
      
      const scheduleResponse = await fetch(`${config.apiUrl}/api/products/pending/${productId}/approve-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`
        },
        body: JSON.stringify({
          affiliate_link: productData.affiliateLink,
          category_id: categoryId,
          current_price: productData.price,
          old_price: productData.originalPrice
        })
      });

      if (!scheduleResponse.ok) {
        throw new Error(`Erro ao agendar produto: ${scheduleResponse.status}`);
      }

      console.log('✅ Produto agendado com IA');
      
      showStatus('✅ Produto agendado! A IA definiu o melhor horário para publicação.', 'success');
      
      // NOVO: Limpar dados salvos após sucesso
      await clearCapturedData();
      
      setTimeout(() => resetForm(), 2000);
    }

  } catch (error) {
    console.error('❌ Erro ao salvar produto:', error);
    showStatus(`❌ Erro: ${error.message}`, 'error');
    disableActionButtons(false);
  }
}

// ============================================
// BOTÃO: CANCELAR
// ============================================
cancelBtn.addEventListener('click', () => {
  resetForm();
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function disableActionButtons(disabled) {
  savePendingBtn.disabled = disabled;
  saveOnlyBtn.disabled = disabled;
  savePublishBtn.disabled = disabled;
  saveScheduleBtn.disabled = disabled;
  cancelBtn.disabled = disabled;
}

function resetForm() {
  // Limpar dados
  capturedData = null;
  
  // NOVO: Limpar dados salvos
  clearCapturedData();
  
  // Limpar campos
  editTitle.value = '';
  editDescription.value = '';
  editPrice.value = '';
  editOriginalPrice.value = '';
  editAffiliateLink.value = '';
  editCategory.value = '';
  editCoupon.value = '';
  editImage.value = '';
  imagePreview.classList.add('hidden');
  
  // Mostrar seção de captura
  editSection.classList.add('hidden');
  captureSection.classList.remove('hidden');
  
  // Limpar status
  statusDiv.classList.add('hidden');
  
  // Reabilitar botões
  disableActionButtons(false);
}

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');

  if (type === 'success') {
    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 3000);
  }
}

// ============================================
// FUNÇÃO DE EXTRAÇÃO (executada na página)
// ============================================

function extractProductData() {
  const url = window.location.href;
  const domain = window.location.hostname;

  console.log('🔍 Iniciando extração de dados...');
  console.log('URL:', url);
  console.log('Domain:', domain);

  // Detectar plataforma
  let platform = 'other';
  if (domain.includes('amazon')) platform = 'Amazon';
  else if (domain.includes('aliexpress')) platform = 'AliExpress';
  else if (domain.includes('shopee')) platform = 'Shopee';
  else if (domain.includes('mercadolivre') || domain.includes('mercadolibre')) platform = 'Mercado Livre';
  else if (domain.includes('kabum')) platform = 'Kabum';
  else if (domain.includes('pichau')) platform = 'Pichau';
  else if (domain.includes('magazineluiza') || domain.includes('magazinevoce')) platform = 'Magazine Luiza';
  else if (domain.includes('americanas')) platform = 'Americanas';
  else if (domain.includes('casasbahia')) platform = 'Casas Bahia';
  else if (domain.includes('extra')) platform = 'Extra';
  else if (domain.includes('pontofrio')) platform = 'Ponto Frio';

  console.log('📦 Plataforma detectada:', platform);

  // Extrair título
  const titleSelectors = [
    // Kabum - CAPTURA INDIVIDUAL (PRIORIDADE MÁXIMA)
    'h1.text-sm.desktop\\:text-xl',
    'h1[class*="text-black-800"][class*="font-bold"]',
    
    // AliExpress - CAPTURA INDIVIDUAL
    'h1[data-pl="product-title"]',
    
    // AliExpress - SSR e Immersive Mode
    'h1[class*="Title"]',
    'h3[class*="multi--title"]',
    'h3[class*="search-card-item"]',
    '.search-card-item h3',
    '.product-snippet h3',
    '[class*="product-title-text"]',
    'div[class*="Title--title"] h1',
    
    'h1',
    '[data-testid="product-title"]',
    '.product-title',
    '#productTitle',
    '.ui-pdp-title',
    '[class*="product-name"]',
    '[class*="ProductTitle"]',
    '[class*="product-title"]',
    '[itemprop="name"]'
  ];

  let title = null;
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      title = element.textContent.trim();
      console.log(`✅ Título encontrado: ${selector}`);
      break;
    }
  }

  if (!title) {
    title = document.title.split('|')[0].split('-')[0].trim();
    console.log('⚠️ Usando título da página');
  }

  // Extrair descrição
  const descriptionSelectors = [
    '[data-testid="product-description"]',
    '.product-description',
    '#productDescription',
    '.ui-pdp-description',
    '[class*="description"]',
    '[itemprop="description"]',
    'meta[name="description"]'
  ];

  let description = '';
  for (const selector of descriptionSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      description = element.textContent?.trim() || element.content || '';
      if (description) {
        console.log(`✅ Descrição encontrada: ${selector}`);
        break;
      }
    }
  }

  // Extrair preço com lógica otimizada para Amazon e outras plataformas
  let price = null;
  let priceInteger = null;
  let priceCents = null;
  
  // ESTRATÉGIA 1: Amazon - Preço offscreen (mais confiável)
  const amazonOffscreenSelectors = [
    '.a-price .a-offscreen',
    'span.a-price span.a-offscreen',
    '.a-price-whole + .a-price-fraction'
  ];
  
  for (const selector of amazonOffscreenSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      // Verificar se não está dentro de preço riscado
      if (element.closest('span.a-text-price, [data-a-strike="true"]')) {
        console.log(`⏭️ Ignorando preço offscreen riscado: ${element.textContent.trim()}`);
        continue;
      }
      
      let priceText = element.textContent.replace(/[^\d,.-]/g, '').trim();
      
      // Normalizar formato
      if (priceText.includes('.') && priceText.includes(',')) {
        priceText = priceText.replace(/\./g, '').replace(',', '.');
      } else if (priceText.includes(',')) {
        priceText = priceText.replace(',', '.');
      }
      
      let priceValue = parseFloat(priceText);
      
      if (!isNaN(priceValue) && priceValue > 0) {
        price = priceValue;
        console.log(`✅ Preço Amazon (offscreen): R$ ${price.toFixed(2)} (${selector})`);
        break;
      }
    }
  }
  
  // ESTRATÉGIA 2: Amazon - Preço inteiro + fração separados
  if (!price) {
    const wholeElement = document.querySelector('.a-price-whole');
    const fractionElement = document.querySelector('.a-price-fraction');
    
    if (wholeElement) {
      // Verificar se não está dentro de preço riscado
      if (!wholeElement.closest('span.a-text-price, [data-a-strike="true"]')) {
        const wholeText = wholeElement.textContent.replace(/[^\d]/g, '').trim();
        const fractionText = fractionElement ? fractionElement.textContent.replace(/[^\d]/g, '').trim() : '00';
        
        if (wholeText) {
          priceInteger = parseInt(wholeText);
          priceCents = fractionText ? parseInt(fractionText) : 0;
          
          if (priceInteger > 0) {
            price = priceInteger + (priceCents / 100);
            console.log(`✅ Preço Amazon (whole+fraction): R$ ${price.toFixed(2)}`);
          }
        }
      }
    }
  }
  
  // ESTRATÉGIA 3: Mercado Livre - Preço inteiro e centavos separados
  if (!price) {
    const integerSelectors = [
      '.andes-money-amount__fraction',
      '.price-tag-fraction'
    ];
    
    const centsSelectors = [
      '.andes-money-amount__cents',
      '.price-tag-cents'
    ];
    
    for (const intSel of integerSelectors) {
      const integerEl = document.querySelector(intSel);
      if (integerEl) {
        // Ignorar elementos dentro de preço riscado
        if (integerEl.closest('s, del, strike, .andes-money-amount--previous')) {
          console.log(`⏭️ Ignorando preço riscado: ${integerEl.textContent}`);
          continue;
        }
        
        const intText = integerEl.textContent.replace(/[^\d]/g, '').trim();
        if (intText) {
          priceInteger = parseInt(intText);
          
          // Buscar centavos no mesmo container
          const container = integerEl.closest('.andes-money-amount, .price-tag, .a-price');
          if (container) {
            for (const centSel of centsSelectors) {
              const centsEl = container.querySelector(centSel);
              if (centsEl) {
                const centsText = centsEl.textContent.replace(/[^\d]/g, '').trim();
                if (centsText) {
                  priceCents = parseInt(centsText);
                  break;
                }
              }
            }
          }
          
          // Montar preço completo
          if (priceInteger > 0) {
            price = priceInteger + (priceCents ? priceCents / 100 : 0);
            console.log(`✅ Preço (separado): R$ ${price.toFixed(2)}`);
            break;
          }
        }
      }
    }
  }
  
  // ESTRATÉGIA 4: Kabum - Captura Individual
  if (!price) {
    const kabumPriceSelectors = [
      'h4.text-4xl.text-secondary-500',
      'h4[class*="text-secondary-500"][class*="font-bold"]',
      'h4[class*="text-4xl"]'
    ];
    
    for (const selector of kabumPriceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        let priceText = element.textContent.replace(/[^\d,.-]/g, '').trim();
        
        // Normalizar formato
        if (priceText.includes('.') && priceText.includes(',')) {
          priceText = priceText.replace(/\./g, '').replace(',', '.');
        } else if (priceText.includes(',')) {
          priceText = priceText.replace(',', '.');
        }
        
        let priceValue = parseFloat(priceText);
        
        if (!isNaN(priceValue) && priceValue > 0) {
          price = priceValue;
          console.log(`✅ Preço Kabum (individual): R$ ${price.toFixed(2)} (${selector})`);
          break;
        }
      }
    }
  }
  
  // ESTRATÉGIA 5: AliExpress - Captura Individual
  if (!price) {
    const aliexpressPriceSelectors = [
      '.price-default--current--F8OlYIo',
      'span.price-default--current',
      '[class*="price-default--current"]',
      'span[class*="--current--"]'
    ];
    
    for (const selector of aliexpressPriceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        let priceText = element.textContent.replace(/[^\d,.-]/g, '').trim();
        
        // Normalizar formato
        if (priceText.includes('.') && priceText.includes(',')) {
          priceText = priceText.replace(/\./g, '').replace(',', '.');
        } else if (priceText.includes(',')) {
          priceText = priceText.replace(',', '.');
        }
        
        let priceValue = parseFloat(priceText);
        
        if (!isNaN(priceValue) && priceValue > 0) {
          price = priceValue;
          console.log(`✅ Preço AliExpress (individual): R$ ${price.toFixed(2)} (${selector})`);
          break;
        }
      }
    }
  }
  
  // ESTRATÉGIA 6: Magazine Luiza - Captura Individual
  if (!price) {
    const magazinePriceSelectors = [
      'p[data-testid="price-value"]',
      '[data-testid="price-value"]',
      'div[data-testid="product-price"] p[data-testid="price-value"]',
      '.sc-dcJsrY.hsCKLu.sc-cXPBUD.kYFKbo'
    ];
    
    for (const selector of magazinePriceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        let priceText = element.textContent.replace(/[^\d,.-]/g, '').trim();
        
        // Normalizar formato
        if (priceText.includes('.') && priceText.includes(',')) {
          priceText = priceText.replace(/\./g, '').replace(',', '.');
        } else if (priceText.includes(',')) {
          priceText = priceText.replace(',', '.');
        }
        
        let priceValue = parseFloat(priceText);
        
        if (!isNaN(priceValue) && priceValue > 0) {
          price = priceValue;
          console.log(`✅ Preço Magazine Luiza (individual): R$ ${price.toFixed(2)} (${selector})`);
          break;
        }
      }
    }
  }
  
  // ESTRATÉGIA 7: Seletores genéricos
  if (!price) {
    const priceSelectors = [
      '[itemprop="price"]',
      '[data-testid="price"]',
      '.price',
      '.product-price',
      '[class*="price-current"]',
      '[class*="current-price"]',
      '[class*="sale-price"]',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.ui-pdp-price__second-line .price-tag-fraction',
      '[data-testid="price-value"]',
      '.sales-price'
    ];

    for (const selector of priceSelectors) {
      const elements = document.querySelectorAll(selector);
      
      for (const element of elements) {
        if (!element) continue;
        
        // CRÍTICO: Ignorar elementos dentro de preço riscado
        if (element.closest('s, del, strike, .a-text-price, span.a-text-price, [data-a-strike="true"], [class*="old-price"], [class*="original-price"]')) {
          console.log(`⏭️ Ignorando preço riscado: ${element.textContent.trim()}`);
          continue;
        }
        
        let priceText = element.textContent || element.getAttribute('content') || '';
        priceText = priceText.replace(/[^\d,.-]/g, '').trim();
        
        if (!priceText) continue;
        
        // Normalizar formato
        if (priceText.includes('.') && priceText.includes(',')) {
          priceText = priceText.replace(/\./g, '').replace(',', '.');
        } else if (priceText.includes(',')) {
          priceText = priceText.replace(',', '.');
        }
        
        let priceValue = parseFloat(priceText);
        
        if (!isNaN(priceValue) && priceValue > 0) {
          if (!price || priceValue < price) {
            price = priceValue;
            console.log(`✅ Preço encontrado: R$ ${price.toFixed(2)} (${selector})`);
          }
        }
      }
      
      if (price) break;
    }
  }

  // Extrair preço original (antes do desconto)
  let originalPrice = null;
  
  // ESTRATÉGIA 1: Amazon - Preço riscado com offscreen
  const amazonOldPriceSelectors = [
    'span.a-text-price .a-offscreen',
    '.a-price[data-a-strike="true"] .a-offscreen',
    'span.a-price.a-text-price .a-offscreen'
  ];
  
  for (const selector of amazonOldPriceSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      let oldPriceText = element.textContent.replace(/[^\d,.-]/g, '').trim();
      
      // Normalizar formato
      if (oldPriceText.includes('.') && oldPriceText.includes(',')) {
        oldPriceText = oldPriceText.replace(/\./g, '').replace(',', '.');
      } else if (oldPriceText.includes(',')) {
        oldPriceText = oldPriceText.replace(',', '.');
      }
      
      let oldPriceValue = parseFloat(oldPriceText);
      
      if (!isNaN(oldPriceValue) && oldPriceValue > 0 && oldPriceValue > (price || 0)) {
        originalPrice = oldPriceValue;
        console.log(`✅ Preço original Amazon: R$ ${originalPrice.toFixed(2)} (desconto: ${((1 - price/originalPrice) * 100).toFixed(0)}%)`);
        break;
      }
    }
  }
  
  // ESTRATÉGIA 2: Kabum - Captura Individual
  if (!originalPrice) {
    const kabumOldPriceSelectors = [
      'span.text-black-600.line-through',
      'span[class*="line-through"][class*="text-black-600"]',
      'span.line-through'
    ];
    
    for (const selector of kabumOldPriceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        let oldPriceText = element.textContent.replace(/[^\d,.-]/g, '').trim();
        
        // Normalizar formato
        if (oldPriceText.includes('.') && oldPriceText.includes(',')) {
          oldPriceText = oldPriceText.replace(/\./g, '').replace(',', '.');
        } else if (oldPriceText.includes(',')) {
          oldPriceText = oldPriceText.replace(',', '.');
        }
        
        let oldPriceValue = parseFloat(oldPriceText);
        
        if (!isNaN(oldPriceValue) && oldPriceValue > 0 && oldPriceValue > (price || 0)) {
          originalPrice = oldPriceValue;
          console.log(`✅ Preço original Kabum (individual): R$ ${originalPrice.toFixed(2)} (desconto: ${((1 - price/originalPrice) * 100).toFixed(0)}%)`);
          break;
        }
      }
    }
  }
  
  // ESTRATÉGIA 3: AliExpress - Captura Individual
  if (!originalPrice) {
    const aliexpressOldPriceSelectors = [
      '.price-default--original--CWcHOit',
      'span.price-default--original',
      '[class*="price-default--original"]',
      'span[class*="--original--"]'
    ];
    
    for (const selector of aliexpressOldPriceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        let oldPriceText = element.textContent.replace(/[^\d,.-]/g, '').trim();
        
        // Normalizar formato
        if (oldPriceText.includes('.') && oldPriceText.includes(',')) {
          oldPriceText = oldPriceText.replace(/\./g, '').replace(',', '.');
        } else if (oldPriceText.includes(',')) {
          oldPriceText = oldPriceText.replace(',', '.');
        }
        
        let oldPriceValue = parseFloat(oldPriceText);
        
        if (!isNaN(oldPriceValue) && oldPriceValue > 0 && oldPriceValue > (price || 0)) {
          originalPrice = oldPriceValue;
          console.log(`✅ Preço original AliExpress (individual): R$ ${originalPrice.toFixed(2)} (desconto: ${((1 - price/originalPrice) * 100).toFixed(0)}%)`);
          break;
        }
      }
    }
  }
  
  // ESTRATÉGIA 4: Magazine Luiza - Captura Individual
  if (!originalPrice) {
    const magazineOldPriceSelectors = [
      'p[data-testid="price-original"]',
      '[data-testid="price-original"]',
      'div[data-testid="product-price"] p[data-testid="price-original"]',
      '.sc-dcJsrY.cHdUaZ.sc-cezyBN.kwGnVt'
    ];
    
    for (const selector of magazineOldPriceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        let oldPriceText = element.textContent.replace(/[^\d,.-]/g, '').trim();
        
        // Normalizar formato
        if (oldPriceText.includes('.') && oldPriceText.includes(',')) {
          oldPriceText = oldPriceText.replace(/\./g, '').replace(',', '.');
        } else if (oldPriceText.includes(',')) {
          oldPriceText = oldPriceText.replace(',', '.');
        }
        
        let oldPriceValue = parseFloat(oldPriceText);
        
        if (!isNaN(oldPriceValue) && oldPriceValue > 0 && oldPriceValue > (price || 0)) {
          originalPrice = oldPriceValue;
          console.log(`✅ Preço original Magazine Luiza (individual): R$ ${originalPrice.toFixed(2)} (desconto: ${((1 - price/originalPrice) * 100).toFixed(0)}%)`);
          break;
        }
      }
    }
  }
  
  // ESTRATÉGIA 5: Seletores genéricos de preço antigo
  if (!originalPrice) {
    const oldPriceSelectors = [
      '.a-text-price',
      'span.a-text-price',
      '[class*="old-price"]',
      '[class*="original-price"]',
      '[class*="price-old"]',
      '.ui-pdp-price__original-value',
      '.andes-money-amount--previous',
      '[data-testid="original-price"]',
      's .andes-money-amount',
      'del[class*="price"]'
    ];

    for (const selector of oldPriceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        let oldPriceText = element.textContent.replace(/[^\d,.-]/g, '').trim();
        
        // Normalizar formato
        if (oldPriceText.includes('.') && oldPriceText.includes(',')) {
          oldPriceText = oldPriceText.replace(/\./g, '').replace(',', '.');
        } else if (oldPriceText.includes(',')) {
          oldPriceText = oldPriceText.replace(',', '.');
        }
        
        let oldPriceValue = parseFloat(oldPriceText);
        
        if (!isNaN(oldPriceValue) && oldPriceValue > 0 && oldPriceValue > (price || 0)) {
          originalPrice = oldPriceValue;
          console.log(`✅ Preço original: R$ ${originalPrice.toFixed(2)} (desconto: ${((1 - price/originalPrice) * 100).toFixed(0)}%)`);
          break;
        }
      }
    }
  }

  // Se não encontrou preço original válido, usar o preço atual
  if (!originalPrice && price) {
    originalPrice = price;
    console.log(`ℹ️ Produto sem desconto, usando preço atual como original`);
  }

  // Extrair imagem principal do produto
  let imageUrl = null;
  
  // ESTRATÉGIA 1: Buscar atributos de alta resolução PRIMEIRO
  const mainImageSelectors = [
    // Mercado Livre
    '#ui-pdp-image',
    '.ui-pdp-image img',
    'img.ui-pdp-image',
    'figure.ui-pdp-gallery__figure img',
    
    // Amazon
    '#landingImage',
    '#imgBlkFront',
    '#main-image',
    'img[data-old-hires]',
    'img.a-dynamic-image',
    
    // Shopee
    'div[class*="product-image"] img',
    'div[class*="ProductImage"] img',
    
    // AliExpress
    'img.magnifier-image',
    'img[class*="ImageView"]',
    
    // Magazine Luiza
    '[data-testid="product-image"]',
    'img[data-testid="product-image"]',
    
    // Genéricos
    '[itemprop="image"]',
    'img[itemprop="image"]',
    '.product-image img',
    '.gallery-image img',
    '[class*="ProductImage"] img',
    '[class*="product-image"] img',
    '[class*="main-image"] img',
    'img[alt*="product"]',
    'img[alt*="produto"]'
  ];

  for (const selector of mainImageSelectors) {
    const imgElement = document.querySelector(selector);
    if (imgElement) {
      // PRIORIDADE 1: Atributos de alta resolução
      let highResUrl = imgElement.getAttribute('data-zoom-image') ||
                       imgElement.getAttribute('data-old-hires') ||
                       imgElement.getAttribute('data-large-image') ||
                       imgElement.getAttribute('data-zoom') ||
                       imgElement.dataset.zoom;
      
      if (highResUrl && highResUrl.startsWith('http')) {
        imageUrl = highResUrl;
        console.log(`✅ Imagem alta resolução encontrada: ${selector} (data-zoom/hires)`);
        break;
      }
      
      // PRIORIDADE 2: src ou data-src
      imageUrl = imgElement.src || 
                 imgElement.dataset.src || 
                 imgElement.getAttribute('data-src');
      
      if (imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('data:image')) {
        // Validar tamanho mínimo (se já carregou)
        if (imgElement.complete && (imgElement.naturalWidth < 200 || imgElement.naturalHeight < 200)) {
          console.log(`⚠️ Imagem muito pequena (${imgElement.naturalWidth}x${imgElement.naturalHeight}), continuando busca...`);
          imageUrl = null;
          continue;
        }
        
        // Validar que não é thumbnail
        if (!imageUrl.includes('thumbnail') && !imageUrl.includes('thumb') && !imageUrl.includes('_tn')) {
          console.log(`✅ Imagem principal encontrada: ${selector}`);
          break;
        } else {
          console.log(`⚠️ URL parece ser thumbnail, continuando busca...`);
          imageUrl = null;
        }
      }
    }
  }

  // ESTRATÉGIA 2: Buscar imagem grande em galeria
  if (!imageUrl) {
    const gallerySelectors = [
      '.gallery img',
      '.product-gallery img',
      '[class*="gallery"] img',
      '[class*="Gallery"] img',
      'figure img'
    ];
    
    for (const selector of gallerySelectors) {
      const imgElement = document.querySelector(selector);
      if (imgElement) {
        // Tentar atributos de alta resolução primeiro
        imageUrl = imgElement.getAttribute('data-zoom-image') ||
                   imgElement.getAttribute('data-old-hires') ||
                   imgElement.src || 
                   imgElement.dataset.src;
                   
        if (imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('data:image')) {
          // Validar tamanho se já carregou
          if (imgElement.complete && (imgElement.naturalWidth < 200 || imgElement.naturalHeight < 200)) {
            imageUrl = null;
            continue;
          }
          console.log(`✅ Imagem de galeria encontrada: ${selector}`);
          break;
        }
      }
    }
  }

  // ESTRATÉGIA 3: Buscar primeira imagem grande (>= 400px para garantir qualidade)
  if (!imageUrl) {
    const images = Array.from(document.querySelectorAll('img'));
    const largeImage = images.find(img => 
      img.naturalWidth >= 400 && 
      img.naturalHeight >= 400 && 
      img.src.startsWith('http') &&
      !img.src.includes('data:image') &&
      !img.src.includes('thumbnail') &&
      !img.src.includes('thumb') &&
      !img.src.includes('_tn') &&
      !img.src.includes('icon') &&
      !img.src.includes('logo')
    );
    if (largeImage) {
      imageUrl = largeImage.src;
      console.log(`✅ Imagem grande encontrada (${largeImage.naturalWidth}x${largeImage.naturalHeight})`);
    }
  }
  
  // ESTRATÉGIA 4: Fallback - primeira imagem >= 300px
  if (!imageUrl) {
    const images = Array.from(document.querySelectorAll('img'));
    const mediumImage = images.find(img => 
      img.naturalWidth >= 300 && 
      img.naturalHeight >= 300 && 
      img.src.startsWith('http') &&
      !img.src.includes('data:image') &&
      !img.src.includes('thumbnail') &&
      !img.src.includes('thumb')
    );
    if (mediumImage) {
      imageUrl = mediumImage.src;
      console.log(`✅ Imagem encontrada (${mediumImage.naturalWidth}x${mediumImage.naturalHeight})`);
    }
  }

  console.log('📊 Extração concluída');
  if (imageUrl) {
    console.log(`🖼️ URL final da imagem: ${imageUrl.substring(0, 100)}...`);
  } else {
    console.warn('⚠️ Nenhuma imagem encontrada');
  }

  return {
    title: title || 'Produto sem título',
    description: description.substring(0, 500),
    price: price,
    originalPrice: originalPrice || price,
    imageUrl: imageUrl,
    affiliateLink: url,
    platform: platform,
    sourceUrl: url,
    capturedAt: new Date().toISOString()
  };
}

// ============================================
// FUNÇÃO DE EXTRAÇÃO EM LOTE (executada na página)
// ============================================
function extractAllProductsFromPage() {
  console.log('🔍 Iniciando captura em lote...');
  
  const url = window.location.href;
  const domain = window.location.hostname;
  
  // Detectar plataforma
  let platform = 'other';
  if (domain.includes('amazon')) platform = 'Amazon';
  else if (domain.includes('aliexpress')) platform = 'AliExpress';
  else if (domain.includes('shopee')) platform = 'Shopee';
  else if (domain.includes('mercadolivre') || domain.includes('mercadolibre')) platform = 'Mercado Livre';
  else if (domain.includes('kabum')) platform = 'Kabum';
  else if (domain.includes('pichau')) platform = 'Pichau';
  else if (domain.includes('magazineluiza') || domain.includes('magazinevoce')) platform = 'Magazine Luiza';
  else if (domain.includes('americanas')) platform = 'Americanas';
  else if (domain.includes('casasbahia')) platform = 'Casas Bahia';
  else if (domain.includes('extra')) platform = 'Extra';
  else if (domain.includes('pontofrio')) platform = 'Ponto Frio';

  console.log('📦 Plataforma:', platform);
  console.log('🔍 Buscando produtos na página...');

  // Seletores atualizados para encontrar cards/itens de produtos
  const productSelectors = [
    // Mercado Livre - Ofertas (Poly Cards - PRIORIDADE)
    '.poly-card',
    '.poly-component',
    '.promotion-item',
    '[class*="poly-card"]',
    '[class*="promotion-item"]',
    
    // Mercado Livre - Busca/Lista
    'li.ui-search-layout__item',
    'li[class*="ui-search"]',
    'div[class*="ui-search-result"]',
    'ol.ui-search-layout li',
    '.ui-search-result',
    '.ui-search-layout__item',
    
    // Amazon - Deals/Ofertas (PRIORIDADE MÁXIMA)
    '.GridItem-module__container_PW2gdkwTj1GQzdwJjejN',  // Grid Item container
    '[data-testid^="B0"][class*="GridItem"]',            // Grid items com ASIN
    '.dcl-product-wrapper',                               // DCL carousel products
    '.dcl-carousel .a-carousel-card',                     // Carousel cards
    '[data-testid="product-card"]',                       // Product cards
    
    // Amazon - Busca/Resultados
    '[data-component-type="s-search-result"]',
    '.s-result-item[data-asin]',
    'div[data-component-type="s-search-result"]',
    
    // Amazon - Best Sellers
    '.p13n-sc-uncoverable-faceout',
    '.zg-item-immersion',
    '[class*="zg-grid-general-faceout"]',
    '.a-carousel-card',
    
    // Amazon - Deals/Ofertas (fallback)
    '[data-deal-id]',
    '.DealCard',
    '[class*="DealContent"]',
    
    // Amazon - Grid/Cards
    '.sg-col-inner',
    '.s-card-container',
    
    // Shopee - EXPANDIDO
    '.shopee-search-item-result__item',
    'div[data-sqe="item"]',
    '[data-sqe="item"]',
    '.col-xs-2-4.shopee-search-item-result__item',
    'a[data-sqe="link"]',
    'div.shopee-search-item-result__item',
    '[class*="shopee-search-item-result"]',
    'div[class*="item-card-special"]',
    '[data-testid="searchProductItem"]',
    
    // AliExpress - PRIORIDADE MÁXIMA (Nova estrutura)
    'a.productContainer',                                    // Container principal
    '[class*="normalRow"] a.productContainer',               // Rows normais
    '[class*="pcAnimationRow"] a.productContainer',          // Rows com animação
    'a[href*="aliexpress.com/item/"]',                       // Links de produtos
    
    // AliExpress - SSR (fallback)
    '.list--gallery--C2f2tvm',
    '.product-snippet',
    '[class*="product-card"]',
    
    // AliExpress - Immersive Mode (fallback)
    '.search-card-item',
    '[class*="search-card"]',
    
    // Kabum
    '.productCard',
    '[class*="sc-"][class*="ProductCard"]',
    'article.productCard',
    'main [class*="productCard"]',
    
    // Pichau - ATUALIZADO (baseado em estrutura real)
    'div.MuiPaper-root.MuiCard-root[class*="product_item"]',
    'div[class*="mui-"][class*="product_item"]',
    'div.MuiCard-root',
    '[class*="MuiGrid-root"][class*="MuiGrid-item"]',
    'div[class*="jss"]',
    'a[href*="/produto/"]',
    
    // Magazine Luiza
    '[data-testid="product-card"]',
    '.sc-fHxwqH',
    '[data-testid*="product"]',
    
    // Americanas
    '.product-grid-item',
    '.src__Col-sc',
    '[data-testid*="product"]',
    
    // Genérico (última tentativa)
    'article[class*="product"]',
    'div[class*="product-card"]',
    'div[class*="product-item"]',
    'li[class*="product"]',
    '[data-product-id]'
  ];

  let productElements = [];
  let usedSelector = '';
  
  // Tentar cada seletor até encontrar produtos
  for (const selector of productSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        productElements = Array.from(elements);
        usedSelector = selector;
        console.log(`✅ Encontrados ${elements.length} produtos com seletor: ${selector}`);
        break;
      }
    } catch (e) {
      console.warn(`⚠️ Erro ao testar seletor ${selector}:`, e);
    }
  }

  // Se não encontrou, tentar abordagem alternativa
  if (productElements.length === 0) {
    console.warn('⚠️ Nenhum produto encontrado com seletores conhecidos');
    console.log('🔍 Tentando abordagem alternativa...');
    
    // Buscar por links que parecem ser de produtos
    const allLinks = document.querySelectorAll('a[href]');
    const productLinks = Array.from(allLinks).filter(link => {
      const href = link.href;
      return (
        (href.includes('/p/') || 
         href.includes('/produto') || 
         href.includes('/item') || 
         href.includes('dp/')) &&
        link.querySelector('img') && // Tem imagem
        link.textContent.trim().length > 10 // Tem texto
      );
    });
    
    if (productLinks.length > 0) {
      // Pegar o elemento pai de cada link (geralmente o card do produto)
      productElements = productLinks.map(link => {
        let parent = link.parentElement;
        // Subir até encontrar um elemento que pareça ser o card completo
        for (let i = 0; i < 5; i++) {
          if (!parent) break;
          if (parent.querySelector('img') && parent.querySelector('[class*="price"]')) {
            return parent;
          }
          parent = parent.parentElement;
        }
        return link.parentElement || link;
      });
      
      console.log(`✅ Encontrados ${productElements.length} produtos com abordagem alternativa`);
      usedSelector = 'abordagem alternativa (links com imagens)';
    }
  }

  if (productElements.length === 0) {
    console.error('❌ Nenhum produto encontrado na página');
    console.log('💡 Dica: Role a página para baixo e aguarde os produtos carregarem');
    return [];
  }

  console.log(`📦 Processando ${productElements.length} produtos...`);
  console.log(`🔧 Seletor usado: ${usedSelector}`);

  const products = [];
  
  productElements.forEach((element, index) => {
    try {
      // Extrair título com mais opções
      const titleSelectors = [
        // Magazine Luiza - PRIORIDADE MÁXIMA
        'h2[data-testid="product-title"]',
        '[data-testid="product-title"]',
        'h2[class*="bohfAy"]',
        'h2[font-size="1,1,1"][font-weight="regular"]',
        
        // Amazon - ProductCard Module (PRIORIDADE MÁXIMA - Grid Items)
        '.ProductCard-module__card p[id*="title"] span.a-truncate-full.a-offscreen',
        '.ProductCard-module__card span.a-truncate-full.a-offscreen',
        '.ProductCard-module__card .a-truncate-full.a-offscreen',
        '.ProductCard-module__title p[id*="title"] span.a-truncate-full',
        '.ProductCard-module__title span.a-truncate-full',
        'p[id*="title"].ProductCard-module__title span.a-truncate-full',
        '[class*="ProductCard"] p[id*="title"] span',
        
        // Amazon - DCL Product Wrapper (PRIORIDADE ALTA - Carousel)
        '.dcl-product-wrapper [data-testid="product-card-title"]',
        '.dcl-product-wrapper p[id*="title"] span.a-truncate-full.a-offscreen',
        '.dcl-product-wrapper span.a-truncate-full.a-offscreen',
        '.dcl-product-wrapper .a-truncate-full.a-offscreen',
        '.dcl-product-wrapper p[id*="title"]',
        '.dcl-product-wrapper h2 span',
        '.dcl-product-wrapper [class*="title"]',
        '.dcl-product-label span',
        '.dcl-truncate span',
        
        // Amazon - Título Completo (PRIORIDADE MÉDIA)
        'p[id*="title"] span.a-truncate-full.a-offscreen',
        'p[id*="title"] .a-truncate-full.a-offscreen',
        '.a-truncate span.a-truncate-full.a-offscreen',
        'span.a-truncate-full.a-offscreen',
        '.a-truncate-full.a-offscreen',
        '.a-truncate .a-truncate-full',
        
        // Amazon - Deals/Ofertas
        '[data-deal-id] p[id*="title"] span.a-truncate-full',
        '[data-deal-id] .a-truncate-full.a-offscreen',
        '.DealCard p[id*="title"] span.a-truncate-full',
        
        // Amazon - Carousel Cards
        '.a-carousel-card span.a-truncate-full.a-offscreen',
        '.a-carousel-card p[id*="title"] span.a-truncate-full',
        
        // Amazon - Título em atributo (fallback - mas NÃO pegar truncate-cut)
        'p[id*="title"]:not(:has(.a-truncate-cut))',
        '[class*="ProductCard"] p[class*="title"]:not(:has(.a-truncate-cut))',
        
        // AliExpress - PRIORIDADE MÁXIMA (Nova estrutura)
        '.AIC-ATM-container span.AIC-ATM-multiLine span[style*="font-weight: 600"]',
        '.AIC-ATM-container .AIC-TA-multi-icon-title',
        '[id*="info_container"] .AIC-ATM-container span[style*="font-weight: 600"]',
        '.AIC-ATM-multiLine span[style*="font-weight: 600"]',
        'span.AIC-TA-multi-icon-title',
        
        // AliExpress - SSR e Immersive Mode (fallback)
        'h1[class*="Title"]',
        'h1[data-pl="product-title"]',
        'h3[class*="multi--title"]',
        'h3[class*="search-card-item"]',
        '.search-card-item h3',
        '.product-snippet h3',
        '[class*="product-title-text"]',
        'div[class*="Title--title"] h1',
        'a[class*="multi--titleText"]',
        
        // Mercado Livre - Ofertas (PRIORIDADE)
        '.poly-component__title',
        '.poly-component__title-link',
        '.promotion-item__title',
        '[class*="poly-component__title"]',
        '[class*="promotion-item__title"]',
        
        // Amazon - Específicos por tipo de página
        'h2 .a-link-normal .a-text-normal',
        'h2 .a-link-normal span.a-text-normal',
        'h2 a span.a-text-normal',
        
        // Amazon - Best Sellers
        '.p13n-sc-truncate',
        '.zg-item a[href*="/dp/"] span',
        '[class*="p13n"] a span',
        
        // Amazon - Deals
        '.DealText span',
        '[data-deal-id] span[class*="title"]',
        
        // Amazon - Classes de tamanho (NÃO usar truncate-cut)
        '.a-size-base-plus.a-text-normal:not(.a-truncate-cut)',
        '.a-size-medium.a-text-normal:not(.a-truncate-cut)',
        'h2 span.a-size-base-plus:not(.a-truncate-cut)',
        'h2 span.a-size-medium:not(.a-truncate-cut)',
        '.s-line-clamp-2 span:not(.a-truncate-cut)',
        
        // AliExpress - Immersive
        '.search-card-info h3',
        '.product-title',
        '[class*="product-title"]',
        
        // Shopee - PRIORIDADE (mais específicos primeiro)
        'div[data-sqe="name"]',
        '[data-sqe="name"]',
        '.shopee-search-item-result__item div[data-sqe="name"]',
        'a[data-sqe="link"] > div:first-child > div:last-child',
        'div.ie3A+V',
        '[class*="line-clamp-2"]:not([class*="price"]):not([class*="truncate"])',
        
        // Pichau - ATUALIZADO (baseado em estrutura real)
        'h2.MuiTypography-root.MuiTypography-h6[class*="product_info_title"]',
        'h2[class*="mui-"][class*="product_info_title"]',
        'h2.MuiTypography-h6',
        'h2[class*="jss"]',
        'h2[class*="MuiTypography"]',
        'a[href*="/produto/"] h2',
        
        // Kabum - PRIORIDADE MÁXIMA
        'span[class*="nameCard"]',
        'span.nameCard',
        '.sc-d79c9c3f-0.nlmfp.sc-27518a44-9.cqJZxw.nameCard',
        '[class*="sc-"][class*="nameCard"]',
        'article.productCard span[class*="nameCard"]',
        
        // Kabum - Fallback
        '[class*="sc-"][class*="Title"]',
        'h2[class*="sc-"]',
        'h3[class*="sc-"]',
        
        // Genéricos
        'h2', 'h3', 'h4',
        '.ui-search-item__title',
        '.poly-component__title',
        '.ui-search-item__group__element',
        '[class*="title"]',
        '[class*="name"]',
        '[class*="product-name"]',
        'a[title]'
        // REMOVIDO: 'a' - Seletor genérico demais, captura links de navegação
      ];
      
      let title = null;
      let titleSelectorUsed = null;
      
      for (const sel of titleSelectors) {
        const titleEl = element.querySelector(sel);
        if (titleEl) {
          let candidateTitle = titleEl.textContent?.trim() || titleEl.getAttribute('title') || titleEl.getAttribute('aria-label');
          
          // Validar comprimento mínimo (títulos de produtos têm pelo menos 15 caracteres)
          if (candidateTitle && candidateTitle.length >= 15) {
            // Rejeitar se parece ser um preço
            const isPricePattern = /^[R$\s]*\d+[.,]\d{2}$/i.test(candidateTitle.trim()) || // R$ 99,90
                                   /^\d+[.,]\d{2}$/i.test(candidateTitle.trim()) ||        // 99,90
                                   /^[R$\s]*\d{1,3}(\.\d{3})*[.,]\d{2}$/i.test(candidateTitle.trim()); // R$ 1.234,56
            
            // Rejeitar se termina com "…" (truncado)
            const isTruncated = candidateTitle.endsWith('…') || candidateTitle.endsWith('...');
            
            // Rejeitar se contém muito texto de badge/desconto (ex: "27% offSemana do ConsumidorR$ 5.499,00...")
            const hasBadgePattern = /\d+%\s*off/i.test(candidateTitle) && /R\$\s*\d/.test(candidateTitle);
            
            // Rejeitar se é apenas uma categoria/navegação (palavras únicas curtas)
            const isSingleWord = candidateTitle.split(/\s+/).length <= 2 && candidateTitle.length < 20;
            
            if (!isPricePattern && !isTruncated && !hasBadgePattern && !isSingleWord) {
              title = candidateTitle;
              titleSelectorUsed = sel;
              console.log(`✅ [${index + 1}] Título encontrado: ${title.substring(0, 50)}... [${sel}]`);
              break;
            } else if (isTruncated) {
              console.log(`⚠️ [${index + 1}] Seletor ${sel} retornou título truncado: "${candidateTitle.substring(0, 50)}..."`);
            } else if (hasBadgePattern) {
              console.log(`⚠️ [${index + 1}] Seletor ${sel} retornou badge+preço: "${candidateTitle.substring(0, 50)}..."`);
            } else if (isSingleWord) {
              console.log(`⚠️ [${index + 1}] Seletor ${sel} retornou categoria/navegação: "${candidateTitle}"`);
            } else {
              console.log(`⚠️ [${index + 1}] Seletor ${sel} retornou preço: "${candidateTitle}"`);
            }
          } else if (candidateTitle) {
            console.log(`⚠️ [${index + 1}] Seletor ${sel} retornou texto muito curto (< 15 chars): "${candidateTitle}"`);
          }
        }
      }

      if (!title) {
        console.warn(`⚠️ [${index + 1}] Título não encontrado, pulando produto...`);
        console.log(`   HTML do elemento:`, element.outerHTML.substring(0, 300));
        return;
      }

      // Limpar título (remover caracteres especiais excessivos)
      title = title.replace(/\s+/g, ' ').trim();
      if (title.length > 200) {
        title = title.substring(0, 200);
      }

      // Extrair preço com lógica otimizada para Mercado Livre e outras plataformas
      let price = null;
      let priceInteger = null;
      let priceCents = null;
      
      // ESTRATÉGIA 1: Preço inteiro e centavos separados (Mercado Livre, Amazon)
      const integerSelectors = [
        '.poly-price__current .andes-money-amount__fraction', // PRIORIDADE: Preço atual do Mercado Livre
        '.andes-money-amount__fraction',
        '.price-tag-fraction', 
        '.a-price-whole'
      ];
      
      const centsSelectors = [
        '.andes-money-amount__cents',
        '.price-tag-cents',
        '.a-price-fraction'
      ];
      
      for (const intSel of integerSelectors) {
        const integerEl = element.querySelector(intSel);
        if (integerEl) {
          // CRÍTICO: Ignorar elementos dentro de preço riscado (preço original, não atual)
          if (integerEl.closest('s, del, strike, .andes-money-amount--previous')) {
            console.log(`⏭️ [${index + 1}] Ignorando preço riscado: ${integerEl.textContent}`);
            continue;
          }
          
          const intText = integerEl.textContent.replace(/[^\d]/g, '').trim();
          if (intText) {
            priceInteger = parseInt(intText);
            
            // Buscar centavos no mesmo container
            const container = integerEl.closest('.andes-money-amount, .price-tag, .a-price');
            if (container) {
              for (const centSel of centsSelectors) {
                const centsEl = container.querySelector(centSel);
                if (centsEl) {
                  const centsText = centsEl.textContent.replace(/[^\d]/g, '').trim();
                  if (centsText) {
                    priceCents = parseInt(centsText);
                    break;
                  }
                }
              }
            }
            
            // Montar preço completo
            if (priceInteger > 0) {
              price = priceInteger + (priceCents ? priceCents / 100 : 0);
              console.log(`💰 [${index + 1}] Preço (separado): R$ ${price.toFixed(2)}`);
              break;
            }
          }
        }
      }
      
      // ESTRATÉGIA 2: Magazine Luiza - Preço completo
      if (!price) {
        const magazinePriceSelectors = [
          'p[data-testid="price-value"]',
          '[data-testid="price-value"]',
          'div[data-testid="price-default"] p[data-testid="price-value"]',
          '.sc-dcJsrY.hsCKLu.sc-cXPBUD.kYFKbo'
        ];
        
        for (const selector of magazinePriceSelectors) {
          const priceEl = element.querySelector(selector);
          if (priceEl) {
            let priceText = priceEl.textContent.replace(/[^\d,.-]/g, '').trim();
            
            // Normalizar formato
            if (priceText.includes('.') && priceText.includes(',')) {
              priceText = priceText.replace(/\./g, '').replace(',', '.');
            } else if (priceText.includes(',')) {
              priceText = priceText.replace(',', '.');
            }
            
            let priceValue = parseFloat(priceText);
            
            if (!isNaN(priceValue) && priceValue > 0) {
              price = priceValue;
              console.log(`💰 [${index + 1}] Preço Magazine Luiza: R$ ${price.toFixed(2)} (${selector})`);
              break;
            }
          }
        }
      }
      
      // ESTRATÉGIA 3: Preço completo em um único elemento
      if (!price) {
        const priceSelectors = [
          // AliExpress - PRIORIDADE MÁXIMA (Nova estrutura)
          '.AIC4-PI-price-text',
          'span.AIC4-PI-price-text',
          '.aec-text.AIC4-PI-price-text',
          '[class*="AIC4-PI-price-text"]',
          
          // Mercado Livre - Ofertas (PRIORIDADE)
          '.poly-price .andes-money-amount__fraction',
          '.promotion-item__price',
          '.price-tag-fraction',
          
          // Amazon - Preço offscreen (mais confiável)
          '.a-price .a-offscreen',
          'span.a-offscreen',
          
          // Amazon - Best Sellers
          '.p13n-sc-price',
          '[class*="zg-price"]',
          
          // Amazon - Deals
          '.DealPrice',
          '[data-deal-id] .a-price',
          
          // AliExpress - Immersive (fallback)
          '.search-card-price',
          '[class*="search-card-price"]',
          
          // Shopee - PRIORIDADE
          'span[class*="truncate"][class*="text"]',
          'div[class*="truncate"] span',
          '[data-sqe="item"] span[class*="truncate"]',
          '.shopee-search-item-result__item span[class*="text"]',
          'div.vioxXd',
          'span.ZEgDH9',
          
          // Pichau - ATUALIZADO (baseado em estrutura real)
          'div[class*="mui-"][class*="price_vista"]',
          'div.mui-12athy2-price_vista',
          'div[class*="price_total"]',
          'div.mui-10zdolh-price_total',
          'div[class*="jss"][class*="price"]',
          '[class*="MuiTypography"][class*="price"]',
          'div[class*="jss"] strong',
          
          // Kabum - PRIORIDADE MÁXIMA
          'span.sc-57f0fd6e-2.cPTxjl.priceCard',
          'span[class*="priceCard"]',
          '.sc-57f0fd6e-2.cPTxjl',
          'span[class*="sc-57f0fd6e-2"]',
          
          // Kabum - Fallback
          '[class*="priceCard"]',
          'span[class*="sc-"][class*="price"]',
          
          // Outros sites
          '.andes-money-amount',
          '.poly-price__current',
          '.poly-component__price',
          '.price-tag',
          '[class*="price-current"]',
          '[class*="price-value"]',
          '[data-testid="price"]',
          'span[class*="price"]',
          '[itemprop="price"]'
        ];
        
        for (const sel of priceSelectors) {
          const priceElements = element.querySelectorAll(sel);
          
          for (const priceEl of priceElements) {
            if (!priceEl) continue;
            
            // Pular elementos de centavos isolados
            if (priceEl.classList.contains('andes-money-amount__cents') ||
                priceEl.classList.contains('price-tag-cents') ||
                priceEl.classList.contains('a-price-fraction')) {
              continue;
            }
            
            let priceText = priceEl.textContent || priceEl.getAttribute('content') || '';
            
            // Limpar mantendo apenas números, vírgula e ponto
            priceText = priceText.replace(/[^\d,.-]/g, '').trim();
            
            if (!priceText || priceText.length < 2) continue;
            
            // Normalizar formato para decimal
            // 1.234,56 (BR) -> 1234.56
            if (priceText.includes('.') && priceText.includes(',')) {
              priceText = priceText.replace(/\./g, '').replace(',', '.');
            }
            // 1,234.56 (US) -> 1234.56
            else if (priceText.match(/,\d{3}/)) {
              priceText = priceText.replace(/,/g, '');
            }
            // 1234,56 (BR) -> 1234.56
            else if (priceText.includes(',')) {
              priceText = priceText.replace(',', '.');
            }
            
            const priceValue = parseFloat(priceText);
            
            // Validar: preço razoável entre R$ 1 e R$ 999.999
            if (!isNaN(priceValue) && priceValue >= 1 && priceValue < 1000000) {
              price = priceValue;
              console.log(`💰 [${index + 1}] Preço (completo): R$ ${price.toFixed(2)} (${sel})`);
              break;
            }
          }
          
          if (price) break;
        }
      }
      
      // ESTRATÉGIA 3: Buscar por padrão de texto (último recurso)
      if (!price) {
        const allText = element.textContent;
        const pricePatterns = [
          /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/,  // R$ 1.234,56
          /(\d{1,3}(?:\.\d{3})*,\d{2})/,        // 1.234,56
          /R\$\s*(\d+,\d{2})/,                   // R$ 123,45
          /(\d+,\d{2})/                          // 123,45
        ];
        
        for (const pattern of pricePatterns) {
          const match = allText.match(pattern);
          if (match) {
            let priceText = match[1].replace(/\./g, '').replace(',', '.');
            let priceValue = parseFloat(priceText);
            
            if (!isNaN(priceValue) && priceValue >= 1 && priceValue < 1000000) {
              price = priceValue;
              console.log(`💰 [${index + 1}] Preço (regex): R$ ${price.toFixed(2)}`);
              break;
            }
          }
        }
      }
      
      // Log se não encontrou preço
      if (!price) {
        console.warn(`⚠️ [${index + 1}] Preço não encontrado para: ${title.substring(0, 40)}...`);
      }

      // Extrair imagem com estratégia otimizada
      let imageUrl = null;
      
      // ESTRATÉGIA 1: Buscar imagens específicas de produto
      const specificImgSelectors = [
        // Kabum - PRIORIDADE MÁXIMA
        'img.imageCard',
        'img[class*="imageCard"]',
        'article.productCard img.imageCard',
        'article[class*="productCard"] img',
        'img[class*="sc-"][class*="Image"]',
        
        // Pichau - ATUALIZADO (baseado em estrutura real)
        'img[class*="mui-"][class*="media"]',
        'img.mui-rfxowm-media',
        'div[class*="mediaWrapper"] img',
        'div[class*="mui-"][class*="mediaWrapper"] img',
        'a[href*="/produto/"] img',
        'img[class*="jss"]',
        'img[class*="MuiCardMedia"]',
        
        // Kabum (fallback genérico)
        'img[class*="imageCard"]',
        'img[class*="sc-"][class*="Image"]',
        
        // Mercado Livre
        'img.ui-search-result-image__element',
        'img.poly-component__picture',
        'img[class*="ui-search-result-image"]',
        'img[class*="poly-component"]',
        
        // Amazon
        'img.s-image',
        'img[data-image-index="0"]',
        'img[class*="product-image"]',
        
        // Shopee - EXPANDIDO
        'img[class*="shopee-search-item-result__image"]',
        'a[data-sqe="link"] img',
        'div[data-sqe="item"] img',
        'img.Jz8eQh',
        'img[class*="_1NoI8_"]',
        
        // AliExpress - PRIORIDADE MÁXIMA (Nova estrutura)
        '.AIC-MI-img',
        'img.AIC-MI-img',
        '.aec-image-.AIC-MI-img',
        '[class*="AIC-MI-img"]',
        '.AIC-MI-container img',
        
        // AliExpress - SSR/Immersive (fallback)
        'img[class*="product-img"]',
        'img[class*="search-card-image"]',
        
        // Magazine Luiza
        'img[data-testid="product-image"]',
        
        // Genéricos
        'img[itemprop="image"]',
        'img[alt*="product"]',
        'img[alt*="produto"]'
      ];
      
      for (const sel of specificImgSelectors) {
        const imgEl = element.querySelector(sel);
        if (imgEl) {
          imageUrl = imgEl.src || 
                     imgEl.dataset.src || 
                     imgEl.getAttribute('data-src') ||
                     imgEl.getAttribute('data-lazy') ||
                     imgEl.getAttribute('data-original') ||
                     imgEl.getAttribute('srcset')?.split(' ')[0];
          
          if (imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('data:image')) {
            // Validar se não é placeholder
            if (!imageUrl.includes('placeholder') && 
                !imageUrl.includes('loading') &&
                !imageUrl.includes('spinner') &&
                !imageUrl.includes('blank')) {
              console.log(`🖼️ [${index + 1}] Imagem encontrada (específica): ${sel}`);
              break;
            }
          }
        }
      }
      
      // ESTRATÉGIA 2: Buscar qualquer imagem com atributos de lazy loading
      if (!imageUrl) {
        const lazyImgSelectors = [
          'img[data-src*="http"]',
          'img[data-lazy*="http"]',
          'img[data-original*="http"]',
          'img[loading="lazy"]',
          'img[data-srcset]'
        ];
        
        for (const sel of lazyImgSelectors) {
          const imgEl = element.querySelector(sel);
          if (imgEl) {
            imageUrl = imgEl.dataset.src || 
                       imgEl.getAttribute('data-src') ||
                       imgEl.getAttribute('data-lazy') ||
                       imgEl.getAttribute('data-original') ||
                       imgEl.getAttribute('data-srcset')?.split(' ')[0] ||
                       imgEl.src;
            
            if (imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('data:image')) {
              if (!imageUrl.includes('placeholder') && !imageUrl.includes('loading')) {
                console.log(`🖼️ [${index + 1}] Imagem encontrada (lazy): ${sel}`);
                break;
              }
            }
          }
        }
      }
      
      // ESTRATÉGIA 3: Buscar primeira imagem válida no elemento
      if (!imageUrl) {
        const allImages = element.querySelectorAll('img');
        
        for (const img of allImages) {
          const possibleUrls = [
            img.src,
            img.dataset.src,
            img.getAttribute('data-src'),
            img.getAttribute('data-lazy'),
            img.getAttribute('data-original'),
            img.getAttribute('srcset')?.split(' ')[0]
          ];
          
          for (const url of possibleUrls) {
            if (url && url.startsWith('http') && !url.includes('data:image')) {
              // Validar tamanho mínimo (evitar ícones pequenos)
              if (img.naturalWidth >= 100 || img.width >= 100 || !img.complete) {
                // Validar que não é placeholder
                if (!url.includes('placeholder') && 
                    !url.includes('loading') &&
                    !url.includes('spinner') &&
                    !url.includes('blank') &&
                    !url.includes('icon') &&
                    !url.includes('logo')) {
                  imageUrl = url;
                  console.log(`🖼️ [${index + 1}] Imagem encontrada (primeira válida)`);
                  break;
                }
              }
            }
          }
          
          if (imageUrl) break;
        }
      }
      
      // ESTRATÉGIA 4: Buscar em background-image (CSS)
      if (!imageUrl) {
        const elementsWithBg = element.querySelectorAll('[style*="background-image"]');
        
        for (const el of elementsWithBg) {
          const style = el.style.backgroundImage;
          const match = style.match(/url\(['"]?(https?:\/\/[^'"]+)['"]?\)/);
          
          if (match && match[1]) {
            const url = match[1];
            if (!url.includes('placeholder') && !url.includes('loading')) {
              imageUrl = url;
              console.log(`🖼️ [${index + 1}] Imagem encontrada (background-image)`);
              break;
            }
          }
        }
      }
      
      // Log se não encontrou imagem
      if (!imageUrl) {
        console.warn(`⚠️ [${index + 1}] Imagem não encontrada para: ${title.substring(0, 40)}...`);
      }

      // Extrair preço original (antes do desconto)
      let originalPrice = null;
      let foundOldPriceElement = false;
      
      const originalPriceSelectors = [
        // Magazine Luiza - PRIORIDADE MÁXIMA
        'p[data-testid="price-original"]',
        '[data-testid="price-original"]',
        'div[data-testid="price-default"] p[data-testid="price-original"]',
        '.sc-dcJsrY.lmAmKF.sc-cezyBN.fATncB',
        'p[font-size="0,1"][color="text.scratched"]',
        
        // Kabum - PRIORIDADE MÁXIMA
        'span.sc-57f0fd6e-1.OButL.oldPriceCard',
        'span[class*="oldPriceCard"]',
        '.sc-57f0fd6e-1.OButL',
        'span[class*="sc-57f0fd6e-1"]',
        'article.productCard span[class*="oldPrice"]',
        'article[class*="productCard"] span[class*="oldPrice"]',
        
        // AliExpress - PRIORIDADE MÁXIMA (Nova estrutura)
        '.AIC4-PI-ori-price-text',
        'span.AIC4-PI-ori-price-text',
        '.aec-text.AIC4-PI-ori-price-text',
        '[class*="AIC4-PI-ori-price-text"]',
        
        // Mercado Livre - Ofertas (Poly Cards) - PRIORIDADE
        's.andes-money-amount--previous',                     // Tag <s> com classe (CORRETO!)
        '.poly-component__price s.andes-money-amount',        // <s> dentro do container de preço
        's .andes-money-amount',                              // Qualquer <s> com andes-money-amount
        '.poly-component .andes-money-amount--previous',      // Com escopo
        '[class*="poly"] .andes-money-amount--previous',      // Wildcard
        
        // Mercado Livre - Geral
        '.andes-money-amount--previous',                      // Sem escopo
        '.price-tag-text-sr-only',
        's .andes-money-amount',                              // Tag <s> com container
        '[class*="price-old"]',
        
        // Amazon
        '.a-text-price .a-offscreen',
        '.a-price[data-a-strike="true"] .a-offscreen',
        'span.a-text-price',
        '.a-price.a-text-price',
        
        // AliExpress
        '.product-price-original',
        '[class*="original-price"]',
        '[class*="originalPrice"]',
        'del[class*="price"]',
        
        // Kabum
        '[class*="oldPrice"]',
        '[class*="priceOld"]',
        'span[class*="sc-"][class*="old"]',
        
        // Pichau - ATUALIZADO (baseado em estrutura real)
        'div[class*="mui-"][class*="price_from"] span[class*="strikeThrough"]',
        'span[class*="mui-"][class*="strikeThrough"]',
        'div[class*="price_from"] span',
        'div[class*="jss"] s',
        '[class*="MuiTypography"] s',
        's[class*="price"]',
        
        // Shopee
        '.shopee-price__original',
        '[class*="original-price"]',
        'div[class*="old-price"]',
        'span[class*="old-price"]',
        
        // Magazine Luiza
        '[data-testid="price-original"]',
        'del[class*="price"]',
        
        // Genéricos (mais específicos primeiro)
        's .andes-money-amount',
        'del .andes-money-amount',
        'strike .andes-money-amount',
        's[class*="price"]',
        'del[class*="price"]',
        'strike[class*="price"]',
        's',
        'del',
        'strike',
        '[class*="old-price"]',
        '[class*="price-old"]',
        '[class*="original-price"]',
        '[class*="was-price"]',
        '[class*="before-price"]'
      ];
      
      for (const sel of originalPriceSelectors) {
        const oldPriceEl = element.querySelector(sel);
        if (oldPriceEl) {
          foundOldPriceElement = true;
          
          // Para Mercado Livre, tentar buscar inteiro + centavos separadamente
          if (sel.includes('andes-money-amount')) {
            const integerEl = oldPriceEl.querySelector('.andes-money-amount__fraction');
            const centsEl = oldPriceEl.querySelector('.andes-money-amount__cents');
            
            if (integerEl) {
              const intText = integerEl.textContent.replace(/[^\d]/g, '').trim();
              const centsText = centsEl ? centsEl.textContent.replace(/[^\d]/g, '').trim() : '00';
              
              if (intText) {
                const intValue = parseInt(intText);
                const centsValue = centsText ? parseInt(centsText) : 0;
                const oldPriceValue = intValue + (centsValue / 100);
                
                if (!isNaN(oldPriceValue) && oldPriceValue >= 1 && oldPriceValue < 1000000) {
                  if (price && oldPriceValue > price) {
                    originalPrice = oldPriceValue;
                    console.log(`💵 [${index + 1}] Preço original: R$ ${originalPrice.toFixed(2)} (desconto: ${((1 - price/originalPrice) * 100).toFixed(0)}%) [${sel}]`);
                    break;
                  } else if (oldPriceValue <= price) {
                    console.log(`⚠️ [${index + 1}] Preço original encontrado mas inválido: R$ ${oldPriceValue.toFixed(2)} <= R$ ${price?.toFixed(2) || 0} [${sel}]`);
                  }
                }
                continue;
              }
            }
          }
          
          // Método padrão para outras plataformas
          let oldPriceText = oldPriceEl.textContent || oldPriceEl.getAttribute('content') || '';
          
          // Limpar mantendo apenas números, vírgula e ponto
          oldPriceText = oldPriceText.replace(/[^\d,.-]/g, '').trim();
          
          if (!oldPriceText || oldPriceText.length < 2) continue;
          
          // Normalizar formato para decimal
          if (oldPriceText.includes('.') && oldPriceText.includes(',')) {
            oldPriceText = oldPriceText.replace(/\./g, '').replace(',', '.');
          } else if (oldPriceText.match(/,\d{3}/)) {
            oldPriceText = oldPriceText.replace(/,/g, '');
          } else if (oldPriceText.includes(',')) {
            oldPriceText = oldPriceText.replace(',', '.');
          }
          
          const oldPriceValue = parseFloat(oldPriceText);
          
          // Validar: preço razoável e maior que o preço atual
          if (!isNaN(oldPriceValue) && oldPriceValue >= 1 && oldPriceValue < 1000000) {
            // Validar que o preço original é maior que o preço com desconto
            if (price && oldPriceValue > price) {
              originalPrice = oldPriceValue;
              console.log(`💵 [${index + 1}] Preço original: R$ ${originalPrice.toFixed(2)} (desconto: ${((1 - price/originalPrice) * 100).toFixed(0)}%) [${sel}]`);
              break;
            } else if (oldPriceValue <= price) {
              console.log(`⚠️ [${index + 1}] Preço original encontrado mas inválido: R$ ${oldPriceValue.toFixed(2)} <= R$ ${price?.toFixed(2) || 0} [${sel}]`);
            }
          }
        }
      }
      
      // Log se não encontrou preço original
      if (!foundOldPriceElement) {
        console.log(`ℹ️ [${index + 1}] Nenhum elemento de preço original encontrado (produto sem desconto)`);
      }
      
      // Se não encontrou preço original válido, usar o preço atual
      if (!originalPrice || originalPrice <= (price || 0)) {
        originalPrice = price;
      }

      // Extrair link do produto com mais opções
      const linkSelectors = [
        'a[href*="/p/"]',
        'a[href*="/produto"]',
        'a[href*="/item"]',
        'a[href*="dp/"]',
        'a[href*="MLU"]',
        'a[href*="MLB"]',
        'a[href]'
      ];

      let productLink = null;
      for (const sel of linkSelectors) {
        const linkEl = element.querySelector(sel);
        if (linkEl && linkEl.href) {
          productLink = linkEl.href;
          // Verificar se é um link válido de produto
          if (productLink.startsWith('http') && 
              !productLink.includes('javascript:') &&
              !productLink.includes('#')) {
            break;
          }
        }
      }

      // Se não encontrou link, tentar pegar do elemento pai (Magazine Luiza)
      if (!productLink || !productLink.startsWith('http')) {
        const parentLink = element.closest('a[href]');
        if (parentLink && parentLink.href) {
          productLink = parentLink.href;
        }
      }

      // Se ainda não encontrou link ou é relativo, construir URL completa
      if (!productLink || !productLink.startsWith('http')) {
        const relativeUrl = element.querySelector('a[href]')?.getAttribute('href');
        if (relativeUrl) {
          // Construir URL absoluta
          productLink = new URL(relativeUrl, window.location.origin).href;
        } else {
          // Fallback: usar URL da página
          productLink = url;
        }
      }

      // Se não encontrou link, usar URL da página
      if (!productLink) {
        productLink = url;
      }

      // Criar objeto do produto
      const product = {
        title: title,
        description: `Produto capturado em lote de ${platform}`,
        price: price || 0,
        originalPrice: originalPrice || price || 0,
        imageUrl: imageUrl || '',
        affiliateLink: productLink,
        platform: platform,
        sourceUrl: productLink,
        capturedAt: new Date().toISOString()
      };

      products.push(product);
      
      // Log a cada 10 produtos
      if ((index + 1) % 10 === 0) {
        console.log(`📦 Processados ${index + 1}/${productElements.length} produtos...`);
      }

    } catch (error) {
      console.error(`❌ Erro ao processar produto ${index + 1}:`, error);
    }
  });

  console.log(`✅ Captura concluída: ${products.length} produtos extraídos de ${productElements.length} elementos`);
  
  if (products.length === 0) {
    console.error('❌ Nenhum produto válido foi extraído');
    console.log('💡 Possíveis causas:');
    console.log('   - Produtos ainda não carregaram (aguarde e tente novamente)');
    console.log('   - Estrutura da página mudou');
    console.log('   - Site usa carregamento dinâmico (role a página)');
  }
  
  return products;
}

