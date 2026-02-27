import Coupon from '../../../models/Coupon.js';
import logger from '../../../config/logger.js';
import notificationDispatcher from '../../bots/notificationDispatcher.js';

/**
 * Handler para gerenciamento de cupons no WhatsApp Web
 * Permite listar e marcar cupons como esgotados
 */

/**
 * Listar cupons ativos
 */
export const listActiveCoupons = async (client, msg) => {
  try {
    await msg.reply('⏳ Buscando cupons ativos...');

    const result = await Coupon.findActive({ page: 1, limit: 10 });
    const coupons = result.coupons || [];

    if (coupons.length === 0) {
      await msg.reply('ℹ️ Nenhum cupom ativo encontrado.');
      return { step: 'IDLE' };
    }

    let message = `📋 *Cupons Ativos* (${result.total} total)\n\n`;
    message += `Mostrando ${coupons.length} cupons:\n\n`;

    coupons.forEach((coupon, index) => {
      const platformName = getPlatformName(coupon.platform);
      const discountText = coupon.discount_type === 'percentage'
        ? `${coupon.discount_value}% OFF`
        : `R$ ${coupon.discount_value} OFF`;

      message += `${index + 1}. 🎫 *${coupon.code}*\n`;
      message += `   🏪 ${platformName} | 🏷️ ${discountText}\n`;
      if (coupon.valid_until) {
        message += `   📅 Válido até: ${new Date(coupon.valid_until).toLocaleDateString('pt-BR')}\n`;
      }
      message += `\n`;
    });

    if (result.total > 10) {
      message += `\nℹ️ Mostrando apenas os 10 primeiros cupons.\n`;
      message += `Total de cupons ativos: ${result.total}\n\n`;
    }

    message += `\n👇 *Ações:*\n`;
    message += `Digite o número do cupom para ver opções\n`;
    message += `Ou digite "0" para cancelar`;

    await msg.reply(message);

    return {
      step: 'COUPON_SELECT',
      data: { coupons }
    };
  } catch (error) {
    logger.error(`Erro ao listar cupons ativos: ${error.message}`);
    await msg.reply('❌ Erro ao buscar cupons. Tente novamente.');
    return { step: 'IDLE' };
  }
};

/**
 * Selecionar cupom
 */
export const selectCoupon = async (client, msg, userState, body) => {
  try {
    const selection = parseInt(body);

    if (selection === 0) {
      await msg.reply('❌ Operação cancelada.');
      return { step: 'IDLE' };
    }

    const coupons = userState.data?.coupons || [];

    if (isNaN(selection) || selection < 1 || selection > coupons.length) {
      await msg.reply('❌ Número inválido. Digite um número da lista ou "0" para cancelar.');
      return userState;
    }

    const coupon = coupons[selection - 1];
    const platformName = getPlatformName(coupon.platform);
    const discountText = coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}% OFF`
      : `R$ ${coupon.discount_value} OFF`;

    const minPurchase = coupon.min_purchase > 0
      ? `\n💰 Compra mínima: R$ ${coupon.min_purchase.toFixed(2)}`
      : '';

    const validUntil = coupon.valid_until
      ? `\n📅 Válido até: ${new Date(coupon.valid_until).toLocaleDateString('pt-BR')}`
      : '';

    let message = `📋 *Detalhes do Cupom*\n\n`;
    message += `🎫 *Código:* ${coupon.code}\n`;
    message += `🏪 *Loja:* ${platformName}\n`;
    message += `🏷️ *Desconto:* ${discountText}`;
    message += minPurchase;
    message += validUntil;
    message += `\n\n${coupon.description || 'Sem descrição'}\n\n`;
    message += `👇 *Ações:*\n`;
    message += `1️⃣ 🚫 *Marcar como Esgotado*\n`;
    message += `2️⃣ 📊 *Ver Mais Detalhes*\n`;
    message += `0️⃣ *Voltar*`;

    await msg.reply(message);

    return {
      step: 'COUPON_ACTION',
      data: { coupon }
    };
  } catch (error) {
    logger.error(`Erro ao selecionar cupom: ${error.message}`);
    await msg.reply('❌ Erro ao processar. Tente novamente.');
    return { step: 'IDLE' };
  }
};

/**
 * Executar ação no cupom
 */
export const executeCouponAction = async (client, msg, userState, body) => {
  try {
    const action = body.trim();
    const coupon = userState.data?.coupon;

    if (!coupon) {
      await msg.reply('❌ Cupom não encontrado. Tente novamente.');
      return { step: 'IDLE' };
    }

    if (action === '0') {
      await msg.reply('🔙 Voltando...');
      return await listActiveCoupons(client, msg);
    }

    if (action === '1') {
      // Marcar como esgotado
      return await confirmOutOfStock(client, msg, coupon);
    }

    if (action === '2') {
      // Ver mais detalhes
      return await showCouponDetails(client, msg, coupon);
    }

    await msg.reply('❌ Opção inválida. Digite 1, 2 ou 0.');
    return userState;
  } catch (error) {
    logger.error(`Erro ao executar ação: ${error.message}`);
    await msg.reply('❌ Erro ao processar. Tente novamente.');
    return { step: 'IDLE' };
  }
};

/**
 * Confirmar marcação como esgotado
 */
async function confirmOutOfStock(client, msg, coupon) {
  const platformName = getPlatformName(coupon.platform);

  let message = `⚠️ *Confirmar Ação*\n\n`;
  message += `Você está prestes a marcar este cupom como esgotado:\n\n`;
  message += `🎫 *Código:* ${coupon.code}\n`;
  message += `🏪 *Loja:* ${platformName}\n\n`;
  message += `Todos os canais que receberam este cupom serão notificados.\n\n`;
  message += `👇 *Deseja continuar?*\n`;
  message += `1️⃣ *Sim, Marcar como Esgotado*\n`;
  message += `0️⃣ *Cancelar*`;

  await msg.reply(message);

  return {
    step: 'COUPON_CONFIRM_OUTOFSTOCK',
    data: { coupon }
  };
}

/**
 * Marcar cupom como esgotado (confirmado)
 */
export const markCouponAsOutOfStock = async (client, msg, userState, body) => {
  try {
    const action = body.trim();
    const coupon = userState.data?.coupon;

    if (!coupon) {
      await msg.reply('❌ Cupom não encontrado. Tente novamente.');
      return { step: 'IDLE' };
    }

    if (action === '0') {
      await msg.reply('❌ Operação cancelada.');
      return { step: 'IDLE' };
    }

    if (action !== '1') {
      await msg.reply('❌ Opção inválida. Digite 1 para confirmar ou 0 para cancelar.');
      return userState;
    }

    await msg.reply('⏳ Marcando cupom como esgotado e notificando canais...');

    // Marcar como esgotado
    await Coupon.markAsOutOfStock(coupon.id);

    // Buscar canais que receberam o cupom
    const channels = await Coupon.getChannelsWithCoupon(coupon.id);

    logger.info(`📋 Encontrados ${channels.length} canais para notificar`);

    // Notificar canais
    let notificationResult = { total: { sent: 0, failed: 0 } };
    if (channels.length > 0) {
      try {
        notificationResult = await notificationDispatcher.notifyCouponOutOfStock(coupon, channels);
      } catch (notifyError) {
        logger.error(`Erro ao notificar canais: ${notifyError.message}`);
      }
    }

    const platformName = getPlatformName(coupon.platform);
    let successMessage = `✅ *Cupom Marcado como Esgotado*\n\n`;
    successMessage += `🎫 *Código:* ${coupon.code}\n`;
    successMessage += `🏪 *Loja:* ${platformName}\n\n`;
    successMessage += `📊 *Notificações Enviadas:*\n`;
    successMessage += `✅ Enviadas: ${notificationResult.total.sent}\n`;
    successMessage += `❌ Falharam: ${notificationResult.total.failed}\n\n`;
    successMessage += `O cupom não aparecerá mais como ativo no app.`;

    await msg.reply(successMessage);

    logger.info(`✅ Cupom ${coupon.code} marcado como esgotado via WhatsApp Web`);

    return { step: 'IDLE' };
  } catch (error) {
    logger.error(`Erro ao marcar cupom como esgotado: ${error.message}`);
    await msg.reply('❌ Erro ao marcar cupom como esgotado. Tente novamente.');
    return { step: 'IDLE' };
  }
};

/**
 * Mostrar detalhes completos do cupom
 */
async function showCouponDetails(client, msg, coupon) {
  const platformName = getPlatformName(coupon.platform);
  const discountText = coupon.discount_type === 'percentage'
    ? `${coupon.discount_value}% OFF`
    : `R$ ${coupon.discount_value} OFF`;

  let details = `📋 *Detalhes Completos do Cupom*\n\n`;
  details += `🎫 *Código:* ${coupon.code}\n`;
  details += `🏪 *Loja:* ${platformName}\n`;
  details += `🏷️ *Desconto:* ${discountText}\n`;
  details += `💰 *Compra mínima:* R$ ${(coupon.min_purchase || 0).toFixed(2)}\n`;
  details += `📅 *Válido de:* ${new Date(coupon.valid_from).toLocaleDateString('pt-BR')}\n`;
  details += `📅 *Válido até:* ${coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString('pt-BR') : 'Sem data'}\n`;
  details += `👥 *Usos:* ${coupon.current_uses || 0}${coupon.max_uses ? ` / ${coupon.max_uses}` : ''}\n`;
  details += `🎯 *Aplicabilidade:* ${coupon.is_general ? 'Todos os produtos' : 'Produtos selecionados'}\n`;
  details += `⭐ *Exclusivo:* ${coupon.is_exclusive ? 'Sim' : 'Não'}\n`;
  details += `📊 *Status:* ${coupon.is_out_of_stock ? '🚫 Esgotado' : '✅ Ativo'}\n\n`;
  details += `${coupon.description || 'Sem descrição'}\n\n`;
  details += `👇 *Ações:*\n`;
  details += `1️⃣ 🚫 *Marcar como Esgotado*\n`;
  details += `0️⃣ *Voltar*`;

  await msg.reply(details);

  return {
    step: 'COUPON_ACTION',
    data: { coupon }
  };
}

/**
 * Obter nome da plataforma
 */
function getPlatformName(platform) {
  const names = {
    'mercadolivre': 'Mercado Livre',
    'shopee': 'Shopee',
    'amazon': 'Amazon',
    'aliexpress': 'AliExpress',
    'kabum': 'Kabum',
    'magazineluiza': 'Magazine Luiza',
    'pichau': 'Pichau',
    'general': 'Geral'
  };
  return names[platform?.toLowerCase()] || platform || 'Loja';
}


/**
 * Handler principal do fluxo de gerenciamento de cupons
 * Coordena as diferentes etapas do fluxo
 */
export const handleCouponManagementFlow = async (msg, body, interaction) => {
  try {
    const step = interaction.step;

    // Step 1: Seleção do cupom
    if (step === 'COUPON_SELECT') {
      return await selectCoupon(null, msg, interaction, body);
    }

    // Step 2: Ação no cupom
    if (step === 'COUPON_ACTION') {
      return await executeCouponAction(null, msg, interaction, body);
    }

    // Step 3: Confirmação de marcar como esgotado
    if (step === 'COUPON_CONFIRM_OUTOFSTOCK') {
      return await markCouponAsOutOfStock(null, msg, interaction, body);
    }

    // Step desconhecido
    logger.warn(`Step desconhecido no fluxo de cupons: ${step}`);
    return { step: 'IDLE' };

  } catch (error) {
    logger.error(`Erro no fluxo de gerenciamento de cupons: ${error.message}`);
    await msg.reply('❌ Erro ao processar. Tente novamente.');
    return { step: 'IDLE' };
  }
};
