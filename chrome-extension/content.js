// Script de conteúdo que roda em todas as páginas
// Pode ser usado para adicionar funcionalidades extras no futuro

console.log('Extensão Captura de Produtos carregada');

// Listener para mensagens do popup ou background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ status: 'ok' });
  }
  return true;
});
