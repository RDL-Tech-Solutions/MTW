import Coupon from '../../../models/Coupon.js';
import logger from '../../../config/logger.js';
import { InlineKeyboard } from 'grammy';
import notificationDispatcher from '../../bots/notificationDispatcher.js';

/**
 * Handler para gerenciamento de cupons
 * Permite listar e marcar cupons como esgotados
 */

/**
 * Listar cupons ativos
 */
export const listActiveCoupons = async (ctx) => {
  try {
    await ctx.reply('⏳ Buscando cupons ativos...');

    const result = await Coupon.findActive({ page: 1, limit: 10 });
    const coupons = result.coupons || [];

    if (coupons.length === 0) {
      return await ctx.reply('ℹ️ Nenhum cupom ativo encontrado.');
    }

    await ctx.reply(
      `📋 *Cupons Ativos* (${result.total} total)\n\n` +
      `Mostrando ${coupons.length} cupons:`,
      { parse_mode: 'Markdown' }
    );

    // Enviar cada cupom com botões de ação
    for (const coupon of coupons) {
      await sendCouponCard(ctx, coupon);
    }

    if (result.total > 10) {
      await ctx.reply(
        `ℹ️ Mostrando apenas os 10 primeiros cupons.\n` +
        `Total de cupons ativos: ${result.total}`
      );
    }
  } catch (error) {
    logger.error(`Erro ao listar cupons ativos: ${error.message}`);
    await ctx.reply('❌ Erro ao buscar cupons. Tente novamente.');
  }
};

/**
 * Enviar card de cupom com botões de ação
 */
async function sendCouponCard(ctx, coupon) {
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

  const message =
    `🎫 *${coupon.code}*\n` +
    `🏪 ${platformName}\n` +
    `🏷️ ${discountText}` +
    minPurchase +
    validUntil +
    `\n\n${coupon.description || 'Sem descrição'}`;

  const keyboard = new InlineKeyboard()
    .text('🚫 Marcar como Esgotado', `coupon_outofstock:${coupon.id}`)
    .text('📊 Ver Detalhes', `coupon_details:${coupon.id}`);

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Confirmar marcação de cupom como esgotado
 */
export const confirmOutOfStock = async (ctx) => {
  try {
    // Extrair couponId do callback data
    const data = ctx.callbackQuery?.data || '';
    const couponId = data.split(':')[1];

    if (!couponId) {
      await ctx.answerCallbackQuery({
        text: '❌ ID do cupom não encontrado',
        show_alert: true
      });
      return;
    }

    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return await ctx.answerCallbackQuery({
        text: '❌ Cupom não encontrado',
        show_alert: true
      });
    }

    if (coupon.is_out_of_stock) {
      return await ctx.answerCallbackQuery({
        text: '⚠️ Este cupom já está marcado como esgotado',
        show_alert: true
      });
    }

    const platformName = getPlatformName(coupon.platform);
    const message =
      `⚠️ *Confirmar Ação*\n\n` +
      `Você está prestes a marcar este cupom como esgotado:\n\n` +
      `🎫 *Código:* ${coupon.code}\n` +
      `🏪 *Loja:* ${platformName}\n\n` +
      `Todos os canais que receberam este cupom serão notificados.\n\n` +
      `Deseja continuar?`;

    const keyboard = new InlineKeyboard()
      .text('✅ Sim, Marcar como Esgotado', `coupon_confirm_outofstock:${couponId}`)
      .row()
      .text('❌ Cancelar', `coupon_cancel`);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error(`Erro ao confirmar esgotamento: ${error.message}`);
    await ctx.answerCallbackQuery({
      text: '❌ Erro ao processar. Tente novamente.',
      show_alert: true
    });
  }
};

/**
 * Marcar cupom como esgotado (confirmado)
 */
export const markCouponAsOutOfStock = async (ctx) => {
  try {
    // Extrair couponId do callback data
    const data = ctx.callbackQuery?.data || '';
    const couponId = data.split(':')[1];

    if (!couponId) {
      await ctx.answerCallbackQuery({
        text: '❌ ID do cupom não encontrado',
        show_alert: true
      });
      return;
    }

    await ctx.answerCallbackQuery({
      text: '⏳ Processando...'
    });

    await ctx.editMessageText('⏳ Marcando cupom como esgotado e notificando canais...');

    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return await ctx.editMessageText('❌ Cupom não encontrado.');
    }

    // Marcar como esgotado
    await Coupon.markAsOutOfStock(couponId);

    // Buscar canais que receberam o cupom
    const channels = await Coupon.getChannelsWithCoupon(couponId);

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
    const successMessage =
      `✅ *Cupom Marcado como Esgotado*\n\n` +
      `🎫 *Código:* ${coupon.code}\n` +
      `🏪 *Loja:* ${platformName}\n\n` +
      `📊 *Notificações Enviadas:*\n` +
      `✅ Enviadas: ${notificationResult.total.sent}\n` +
      `❌ Falharam: ${notificationResult.total.failed}\n\n` +
      `O cupom não aparecerá mais como ativo no app.`;

    await ctx.editMessageText(successMessage, { parse_mode: 'Markdown' });

    logger.info(`✅ Cupom ${coupon.code} marcado como esgotado via bot Telegram`);
  } catch (error) {
    logger.error(`Erro ao marcar cupom como esgotado: ${error.message}`);
    await ctx.editMessageText('❌ Erro ao marcar cupom como esgotado. Tente novamente.');
  }
};

/**
 * Cancelar ação
 */
export const cancelAction = async (ctx) => {
  await ctx.editMessageText('❌ Ação cancelada.');
  await ctx.answerCallbackQuery();
};

/**
 * Ver detalhes do cupom
 */
export const showCouponDetails = async (ctx) => {
  try {
    const couponId = ctx.match[1];
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return await ctx.answerCallbackQuery({
        text: '❌ Cupom não encontrado',
        show_alert: true
      });
    }

    const platformName = getPlatformName(coupon.platform);
    const discountText = coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}% OFF`
      : `R$ ${coupon.discount_value} OFF`;

    const details =
      `📋 *Detalhes do Cupom*\n\n` +
      `🎫 *Código:* ${coupon.code}\n` +
      `🏪 *Loja:* ${platformName}\n` +
      `🏷️ *Desconto:* ${discountText}\n` +
      `💰 *Compra mínima:* R$ ${(coupon.min_purchase || 0).toFixed(2)}\n` +
      `📅 *Válido de:* ${new Date(coupon.valid_from).toLocaleDateString('pt-BR')}\n` +
      `📅 *Válido até:* ${coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString('pt-BR') : 'Sem data'}\n` +
      `👥 *Usos:* ${coupon.current_uses || 0}${coupon.max_uses ? ` / ${coupon.max_uses}` : ''}\n` +
      `🎯 *Aplicabilidade:* ${coupon.is_general === false ? 'Produtos selecionados' : 'Todos os produtos'}\n` +
      `⭐ *Exclusivo:* ${coupon.is_exclusive ? 'Sim' : 'Não'}\n` +
      `📊 *Status:* ${coupon.is_out_of_stock ? '🚫 Esgotado' : '✅ Ativo'}\n\n` +
      `${coupon.description || 'Sem descrição'}`;

    const keyboard = new InlineKeyboard()
      .text('🔙 Voltar', `coupon_back:${couponId}`);

    if (!coupon.is_out_of_stock) {
      keyboard.row().text('🚫 Marcar como Esgotado', `coupon_outofstock:${couponId}`);
    }

    await ctx.editMessageText(details, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error(`Erro ao mostrar detalhes: ${error.message}`);
    await ctx.answerCallbackQuery({
      text: '❌ Erro ao carregar detalhes',
      show_alert: true
    });
  }
};

/**
 * Voltar para card do cupom
 */
export const backToCouponCard = async (ctx) => {
  try {
    const couponId = ctx.match[1];
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return await ctx.answerCallbackQuery({
        text: '❌ Cupom não encontrado',
        show_alert: true
      });
    }

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

    const message =
      `🎫 *${coupon.code}*\n` +
      `🏪 ${platformName}\n` +
      `🏷️ ${discountText}` +
      minPurchase +
      validUntil +
      `\n\n${coupon.description || 'Sem descrição'}`;

    const keyboard = new InlineKeyboard()
      .text('🚫 Marcar como Esgotado', `coupon_outofstock:${coupon.id}`)
      .text('📊 Ver Detalhes', `coupon_details:${coupon.id}`);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error(`Erro ao voltar: ${error.message}`);
    await ctx.answerCallbackQuery({
      text: '❌ Erro ao voltar',
      show_alert: true
    });
  }
};

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

