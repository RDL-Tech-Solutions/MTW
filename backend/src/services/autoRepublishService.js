/**
 * Serviço de Republicação Automática com IA
 * Analisa produtos aprovados e agenda republicações estratégicas
 */
import logger from '../config/logger.js';
import openrouterClient from '../ai/openrouterClient.js';
import Product from '../models/Product.js';
import ScheduledPost from '../models/ScheduledPost.js';
import AppSettings from '../models/AppSettings.js';

class AutoRepublishService {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
  }

  /**
   * Verificar se o serviço está ativo nas configurações
   */
  async isEnabled() {
    try {
      const settings = await AppSettings.get();
      return settings.auto_republish_enabled === true;
    } catch (error) {
      logger.error(`Erro ao verificar configuração de auto-republicação: ${error.message}`);
      return false;
    }
  }

  /**
   * Ativar/Desativar republicação automática
   */
  async setEnabled(enabled) {
    try {
      await AppSettings.update({ auto_republish_enabled: enabled });
      logger.info(`✅ Republicação automática ${enabled ? 'ATIVADA' : 'DESATIVADA'}`);
      return { success: true, enabled };
    } catch (error) {
      logger.error(`Erro ao atualizar configuração: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analisar produtos aprovados e criar estratégia de republicação
   */
  async analyzeAndSchedule() {
    if (this.isRunning) {
      logger.warn('⚠️ Republicação automática já está em execução');
      return { success: false, message: 'Já está em execução' };
    }

    const enabled = await this.isEnabled();
    if (!enabled) {
      logger.warn('⚠️ Republicação automática está desativada');
      return { success: false, message: 'Serviço desativado' };
    }

    this.isRunning = true;
    this.lastRun = new Date();

    try {
      logger.info('🤖 Iniciando análise de produtos para republicação automática...');

      // Buscar produtos aprovados
      const approvedProducts = await this.getApprovedProducts();

      if (approvedProducts.length === 0) {
        logger.info('ℹ️ Nenhum produto aprovado encontrado para republicação');
        return { success: true, scheduled: 0, message: 'Nenhum produto para republicar' };
      }

      logger.info(`📊 Encontrados ${approvedProducts.length} produtos aprovados`);

      // Analisar produtos com IA
      const strategy = await this.createRepublishStrategy(approvedProducts);

      // Agendar publicações baseado na estratégia da IA
      const scheduled = await this.scheduleRepublications(strategy);

      logger.info(`✅ Republicação automática concluída: ${scheduled} produtos agendados`);

      return {
        success: true,
        scheduled,
        message: `${scheduled} produtos agendados para republicação`,
        strategy: strategy.summary
      };

    } catch (error) {
      logger.error(`❌ Erro na republicação automática: ${error.message}`);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Buscar produtos aprovados que podem ser republicados
   */
  async getApprovedProducts() {
    try {
      const { supabase } = await import('../config/database.js');

      // 1) Buscar os 30 produtos mais recentes
      const { data: recentData, error: recentError } = await supabase
        .from('products')
        .select(`
          *,
          categories!products_category_id_fkey(id, name, icon),
          coupons!products_coupon_id_fkey(id, code, discount_value, discount_type, platform)
        `)
        .eq('status', 'approved')
        .eq('stock_available', true)
        .order('created_at', { ascending: false })
        .limit(30);

      if (recentError) throw recentError;

      // 2) Buscar os 30 produtos mais antigos com melhor offer_score
      const { data: topScoredData, error: topScoredError } = await supabase
        .from('products')
        .select(`
          *,
          categories!products_category_id_fkey(id, name, icon),
          coupons!products_coupon_id_fkey(id, code, discount_value, discount_type, platform)
        `)
        .eq('status', 'approved')
        .eq('stock_available', true)
        .gte('offer_score', 50) // apenas com score razoável
        .order('offer_score', { ascending: false })
        .order('created_at', { ascending: true }) // prioriza mais antigos para republicar
        .limit(30);

      if (topScoredError) throw topScoredError;

      // 3) Mesclar e remover duplicados
      const mergedMap = new Map();
      [...(recentData || []), ...(topScoredData || [])].forEach(p => {
        // Mapear categories para category para manter compatibilidade
        if (p.categories && !p.category) {
          p.category = p.categories;
        }
        // Mapear coupons para coupon para manter compatibilidade
        if (p.coupons && !p.coupon) {
          p.coupon = p.coupons;
        }
        mergedMap.set(p.id, p);
      });
      const mergedData = Array.from(mergedMap.values());

      // Filtrar produtos que não têm agendamento pendente
      const productsWithoutSchedule = [];
      for (const product of mergedData) {
        const hasPending = await this.hasScheduledPost(product.id);
        if (!hasPending) {
          productsWithoutSchedule.push(product);
        }
      }

      return productsWithoutSchedule;
    } catch (error) {
      logger.error(`Erro ao buscar produtos aprovados: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verificar se produto já tem agendamento pendente
   */
  async hasScheduledPost(productId) {
    try {
      const { supabase } = await import('../config/database.js');

      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('id')
        .eq('product_id', productId)
        .eq('status', 'pending')
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      logger.error(`Erro ao verificar agendamento: ${error.message}`);
      return false;
    }
  }

  /**
   * Criar estratégia de republicação usando IA
   */
  async createRepublishStrategy(products) {
    try {
      logger.info('🤖 Solicitando estratégia de republicação à IA...');

      // Preparar dados dos produtos para a IA
      const productsData = products.map(p => ({
        id: p.id,
        name: p.name,
        platform: p.platform,
        current_price: p.current_price,
        old_price: p.old_price,
        discount_percentage: p.discount_percentage,
        offer_score: p.offer_score,
        category: p.category?.name || 'Sem categoria',
        has_coupon: !!p.coupon_id,
        created_at: p.created_at
      }));

      const currentHour = new Date().getHours() - 3; // Estimativa simples GMT-3 para informar a IA

      const prompt = `Você é um especialista em marketing digital e estratégia de publicação de ofertas.

Analise os seguintes produtos aprovados e crie uma estratégia de republicação inteligente.
Existem até 60 produtos na lista, mas VOCÊ DEVE SELECIONAR NO MÁXIMO OS 35 MELHORES.

PRODUTOS:
${JSON.stringify(productsData, null, 2)}

REGRAS IMPORTANTES:
1. Selecione NO MÁXIMO 35 PRODUTOS para a estratégia.
2. Distribua as publicações ao longo dos próximos 7 dias (inclusive a data de hoje).
3. Priorize produtos com maior desconto e melhor offer_score.
4. Evite publicar produtos similares no mesmo dia.
5. Considere horários de pico: 10h-12h, 14h-16h, 19h-21h (horário de Brasília).
   NOTA MENTAL: Considerando que o horário atual aproximado é ${currentHour}h, NÃO agende horários anteriores ao longo do dia 0.
6. Produtos com cupom devem ter prioridade máxima.
7. Não agende mais de 5 produtos por dia.
8. Espaçe as publicações em pelo menos 2 horas e categorias similares em dias diferentes.

RESPONDA APENAS COM JSON no seguinte formato:
{
  "summary": "Breve resumo da estratégia (1-2 frases)",
  "schedule": [
    {
      "product_id": "id do produto",
      "scheduled_date": "YYYY-MM-DD",
      "scheduled_time": "HH:MM",
      "priority": "high|medium|low",
      "reason": "Breve explicação da escolha"
    }
  ]
}`;

      const aiResponse = await openrouterClient.makeRequest(prompt);

      if (!aiResponse || !aiResponse.schedule || !Array.isArray(aiResponse.schedule)) {
        throw new Error('Resposta da IA inválida');
      }

      logger.info(`✅ Estratégia criada: ${aiResponse.schedule.length} produtos agendados`);
      logger.info(`📝 Resumo: ${aiResponse.summary}`);

      return aiResponse;

    } catch (error) {
      logger.error(`Erro ao criar estratégia com IA: ${error.message}`);

      // Fallback: criar estratégia simples sem IA
      logger.info('⚠️ Usando estratégia de fallback (sem IA)');
      return this.createFallbackStrategy(products);
    }
  }

  /**
   * Estratégia de fallback caso a IA falhe
   */
  createFallbackStrategy(products) {
    const schedule = [];
    const now = new Date();

    // Ordenar por offer_score e discount_percentage
    const sortedProducts = products.sort((a, b) => {
      const scoreA = (a.offer_score || 0) + (a.discount_percentage || 0);
      const scoreB = (b.offer_score || 0) + (b.discount_percentage || 0);
      return scoreB - scoreA;
    });

    // Distribuir ao longo de 7 dias, máximo 5 por dia
    const maxPerDay = 5;
    let currentDay = 0;
    let countToday = 0;

    // Pegar a hora local real no Brasil como base de partida para hoje
    const spTimeFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false });
    const localHourToday = parseInt(spTimeFormatter.format(now));

    // Para hoje, agendar apenas horas futuras
    let currentHour = Math.max(10, localHourToday + 1);
    if (currentHour > 20) {
      // Já passou das 20h, joga pro dia seguinte
      currentDay = 1;
      currentHour = 10;
    }

    for (const product of sortedProducts.slice(0, 35)) { // Máximo 35 produtos (5 por dia x 7 dias)
      if (countToday >= maxPerDay) {
        currentDay++;
        countToday = 0;
        currentHour = 10;
      }

      // Adicionar offset em dias respeitando timezone
      const scheduledDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      scheduledDate.setDate(scheduledDate.getDate() + currentDay);

      // Formatar dateStr de forma segura local e nao usando toISOString (que usa GMT 0 e pode voltar um dia atras na noite)
      const year = scheduledDate.getFullYear();
      const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
      const day = String(scheduledDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const timeStr = `${currentHour.toString().padStart(2, '0')}:00`;

      schedule.push({
        product_id: product.id,
        scheduled_date: dateStr,
        scheduled_time: timeStr,
        priority: product.offer_score > 70 ? 'high' : product.offer_score > 50 ? 'medium' : 'low',
        reason: 'Estratégia automática de distribuição'
      });

      countToday++;
      currentHour += 2; // Espaçar 2 horas
      if (currentHour > 20) currentHour = 10; // Resetar para 10h
    }

    return {
      summary: `Estratégia automática: ${schedule.length} produtos distribuídos em ${Math.ceil(schedule.length / maxPerDay)} dias`,
      schedule
    };
  }

  /**
   * Agendar republicações baseado na estratégia
   */
  async scheduleRepublications(strategy) {
    let scheduled = 0;

    for (const item of strategy.schedule) {
      try {
        // Combinar data e hora
        const scheduledAt = new Date(`${item.scheduled_date}T${item.scheduled_time}:00-03:00`);

        // Verificar se a data é futura
        if (scheduledAt <= new Date()) {
          logger.warn(`⚠️ Data de agendamento no passado para produto ${item.product_id}, pulando...`);
          continue;
        }

        // Buscar produto
        const product = await Product.findById(item.product_id);
        if (!product) {
          logger.warn(`⚠️ Produto ${item.product_id} não encontrado`);
          continue;
        }

        // Criar agendamento
        await ScheduledPost.create({
          product_id: product.id,
          platform: product.platform,
          scheduled_at: scheduledAt.toISOString(),
          status: 'pending',
          metadata: {
            auto_republish: true,
            priority: item.priority,
            reason: item.reason
          }
        });

        logger.info(`✅ Produto "${product.name}" agendado para ${item.scheduled_date} ${item.scheduled_time} (${item.priority})`);
        scheduled++;

      } catch (error) {
        logger.error(`Erro ao agendar produto ${item.product_id}: ${error.message}`);
      }
    }

    return scheduled;
  }

  /**
   * Obter status do serviço
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun
    };
  }
}

export default new AutoRepublishService();
