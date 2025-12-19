import BotMessageTemplate from '../models/BotMessageTemplate.js';
import logger from '../config/logger.js';
import templateGenerator from '../ai/templateGenerator.js';

class BotTemplateController {
  /**
   * Listar todos os templates
   * GET /api/bots/templates
   */
  async list(req, res) {
    try {
      const { template_type, platform, is_active } = req.query;
      
      const filters = {};
      if (template_type) filters.template_type = template_type;
      if (platform) filters.platform = platform;
      if (is_active !== undefined) filters.is_active = is_active === 'true';

      logger.info(`📋 Buscando templates com filtros: ${JSON.stringify(filters)}`);

      const templates = await BotMessageTemplate.findAll(filters);

      logger.info(`✅ ${templates.length} templates encontrados`);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error(`❌ Erro ao listar templates: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar templates',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Buscar template por ID
   * GET /api/bots/templates/:id
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const template = await BotMessageTemplate.findById(id);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template não encontrado'
        });
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error(`Erro ao buscar template: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar template',
        error: error.message
      });
    }
  }

  /**
   * Criar novo template
   * POST /api/bots/templates
   */
  async create(req, res) {
    try {
      const {
        template_type,
        platform = 'all',
        template,
        description,
        available_variables = [],
        is_active = true
      } = req.body;

      // Validações
      if (!template_type || !template) {
        return res.status(400).json({
          success: false,
          message: 'template_type e template são obrigatórios'
        });
      }

      const validTypes = ['new_promotion', 'promotion_with_coupon', 'new_coupon', 'expired_coupon'];
      if (!validTypes.includes(template_type)) {
        return res.status(400).json({
          success: false,
          message: `template_type deve ser um de: ${validTypes.join(', ')}`
        });
      }

      const newTemplate = await BotMessageTemplate.create({
        template_type,
        platform,
        template,
        description,
        available_variables,
        is_active
      });

      logger.info(`✅ Template criado: ${template_type} para ${platform}`);

      res.status(201).json({
        success: true,
        message: 'Template criado com sucesso',
        data: newTemplate
      });
    } catch (error) {
      logger.error(`Erro ao criar template: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar template',
        error: error.message
      });
    }
  }

  /**
   * Atualizar template
   * PUT /api/bots/templates/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Verificar se o template existe e se é do sistema
      const template = await BotMessageTemplate.findById(id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template não encontrado'
        });
      }

      // Para templates do sistema, permitir apenas atualizar alguns campos
      if (template.is_system) {
        // Campos permitidos para templates do sistema
        const allowedFields = ['is_active', 'description'];
        const restrictedFields = Object.keys(updates).filter(field => !allowedFields.includes(field));
        
        if (restrictedFields.length > 0) {
          return res.status(403).json({
            success: false,
            message: `Templates padrão do sistema não podem ter os seguintes campos alterados: ${restrictedFields.join(', ')}. Apenas 'is_active' e 'description' podem ser modificados.`,
            is_system: true,
            restricted_fields: restrictedFields,
            allowed_fields: allowedFields
          });
        }
      }

      // Validar template_type se fornecido
      if (updates.template_type) {
        const validTypes = ['new_promotion', 'promotion_with_coupon', 'new_coupon', 'expired_coupon'];
        if (!validTypes.includes(updates.template_type)) {
          return res.status(400).json({
            success: false,
            message: `template_type deve ser um de: ${validTypes.join(', ')}`
          });
        }
      }

      const updatedTemplate = await BotMessageTemplate.update(id, updates);

      logger.info(`✅ Template atualizado: ${id}`);

      res.json({
        success: true,
        message: 'Template atualizado com sucesso',
        data: updatedTemplate
      });
    } catch (error) {
      logger.error(`Erro ao atualizar template: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar template',
        error: error.message
      });
    }
  }

  /**
   * Deletar template
   * DELETE /api/bots/templates/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar se o template existe e se é do sistema
      const template = await BotMessageTemplate.findById(id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template não encontrado'
        });
      }

      // Não permitir deletar templates do sistema
      if (template.is_system) {
        return res.status(403).json({
          success: false,
          message: 'Não é possível deletar templates padrão do sistema. Estes templates são fixos e não podem ser removidos.',
          is_system: true
        });
      }

      await BotMessageTemplate.delete(id);

      logger.info(`✅ Template deletado: ${id}`);

      res.json({
        success: true,
        message: 'Template deletado com sucesso'
      });
    } catch (error) {
      logger.error(`Erro ao deletar template: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar template',
        error: error.message
      });
    }
  }

  /**
   * Criar templates padrão
   * POST /api/bots/templates/create-defaults
   */
  async createDefaults(req, res) {
    try {
      const defaultTemplates = [
        // Modelos para Nova Promoção (SEM CUPOM)
        {
          template_type: 'new_promotion',
          platform: 'all',
          template: '🔥 **PROMOÇÃO IMPERDÍVEL!**\n\n📦 {product_name}\n\n💰 **{current_price}**{old_price}\n🏷️ **{discount_percentage}% OFF**\n\n🛒 {platform_name}\n\n🔗 {affiliate_link}\n\n⚡ Corre que está acabando!',
          description: 'Modelo Padrão 1: Simples e Direto - Todas as plataformas (SEM CUPOM)',
          is_active: true,
          available_variables: ['product_name', 'current_price', 'old_price', 'discount_percentage', 'platform_name', 'affiliate_link']
        },
        {
          template_type: 'new_promotion',
          platform: 'all',
          template: '🎯 **OFERTA ESPECIAL ENCONTRADA!**\n\n━━━━━━━━━━━━━━━━━━━━\n📦 **PRODUTO**\n{product_name}\n━━━━━━━━━━━━━━━━━━━━\n\n💰 **PREÇO ATUAL:** {current_price}{old_price}\n🎁 **DESCONTO:** {discount_percentage}% OFF\n\n🏪 **LOJA:** {platform_name}\n\n🔗 **COMPRAR AGORA:**\n{affiliate_link}\n\n⏰ **Oferta limitada! Não perca!**',
          description: 'Modelo Padrão 2: Detalhado e Informativo - Todas as plataformas (SEM CUPOM)',
          is_active: false,
          available_variables: ['product_name', 'current_price', 'old_price', 'discount_percentage', 'platform_name', 'affiliate_link']
        },
        {
          template_type: 'new_promotion',
          platform: 'all',
          template: '⚡ **ALERTA DE OFERTA!** ⚡\n\n🎁 {product_name}\n\n💸 De {old_price} por apenas **{current_price}**\n🔥 **ECONOMIZE {discount_percentage}%!**\n\n🛒 {platform_name}\n🔗 {affiliate_link}\n\n⏰ **ÚLTIMAS HORAS! Aproveite agora!**',
          description: 'Modelo Padrão 3: Urgente e Ação - Todas as plataformas (SEM CUPOM)',
          is_active: false,
          available_variables: ['product_name', 'current_price', 'old_price', 'discount_percentage', 'platform_name', 'affiliate_link']
        },
        // Modelos para Promoção COM CUPOM
        {
          template_type: 'promotion_with_coupon',
          platform: 'all',
          template: '🔥 **PROMOÇÃO + CUPOM!**\n\n📦 {product_name}\n\n💰 **Preço:** {original_price}\n🎟️ **Com Cupom:** {final_price}\n{old_price}\n🏷️ **{discount_percentage}% OFF**\n\n{coupon_section}\n\n🛒 {platform_name}\n\n🔗 {affiliate_link}\n\n⚡ Economia dupla! Corre que está acabando!',
          description: 'Modelo Padrão 1: Promoção com Cupom - Simples e Direto',
          is_active: true,
          available_variables: ['product_name', 'current_price', 'original_price', 'final_price', 'old_price', 'discount_percentage', 'platform_name', 'coupon_section', 'coupon_code', 'coupon_discount', 'affiliate_link']
        },
        {
          template_type: 'promotion_with_coupon',
          platform: 'all',
          template: '🎯 **OFERTA ESPECIAL + CUPOM!**\n\n━━━━━━━━━━━━━━━━━━━━\n📦 **PRODUTO**\n{product_name}\n━━━━━━━━━━━━━━━━━━━━\n\n💰 **PREÇO ORIGINAL:** {original_price}\n🎟️ **PREÇO COM CUPOM:** {final_price}\n{old_price}\n🎁 **DESCONTO DO PRODUTO:** {discount_percentage}% OFF\n\n{coupon_section}\n\n🏪 **LOJA:** {platform_name}\n\n🔗 **COMPRAR AGORA:**\n{affiliate_link}\n\n⏰ **Oferta limitada! Não perca!**',
          description: 'Modelo Padrão 2: Promoção com Cupom - Detalhado',
          is_active: false,
          available_variables: ['product_name', 'current_price', 'original_price', 'final_price', 'old_price', 'discount_percentage', 'platform_name', 'coupon_section', 'coupon_code', 'coupon_discount', 'affiliate_link']
        },
        {
          template_type: 'promotion_with_coupon',
          platform: 'all',
          template: '⚡ **ECONOMIA DUPLA!** ⚡\n\n🎁 {product_name}\n\n💸 De {old_price}\n💰 Por {original_price}\n🎟️ **COM CUPOM: {final_price}**\n🔥 **ECONOMIZE {discount_percentage}% + CUPOM!**\n\n{coupon_section}\n\n🛒 {platform_name}\n🔗 {affiliate_link}\n\n⏰ **ÚLTIMA CHANCE! Use o cupom agora!**',
          description: 'Modelo Padrão 3: Promoção com Cupom - Urgente',
          is_active: false,
          available_variables: ['product_name', 'current_price', 'original_price', 'final_price', 'old_price', 'discount_percentage', 'platform_name', 'coupon_section', 'coupon_code', 'coupon_discount', 'affiliate_link']
        },
        // Modelos para Novo Cupom
        {
          template_type: 'new_coupon',
          platform: 'all',
          template: '🎟️ **NOVO CUPOM DISPONÍVEL!**\n\n🏪 {platform_name}\n\n💬 **CÓDIGO:**\n`{coupon_code}`\n\n💰 **DESCONTO:** {discount_value} OFF\n📅 **VÁLIDO ATÉ:** {valid_until}\n{min_purchase}\n\n📝 {coupon_title}\n{coupon_description}\n\n🔗 {affiliate_link}\n\n⚡ Use agora e economize!',
          description: 'Modelo Padrão 1: Simples e Direto - Todas as plataformas',
          is_active: true,
          available_variables: ['platform_name', 'coupon_code', 'discount_value', 'valid_until', 'min_purchase', 'coupon_title', 'coupon_description', 'affiliate_link']
        },
        {
          template_type: 'new_coupon',
          platform: 'all',
          template: '🎁 **CUPOM DE DESCONTO ATIVO!**\n\n━━━━━━━━━━━━━━━━━━━━\n🏪 **PLATAFORMA:** {platform_name}\n━━━━━━━━━━━━━━━━━━━━\n\n💬 **COPIE O CÓDIGO:**\n`{coupon_code}`\n\n💰 **VALOR DO DESCONTO:** {discount_value} OFF\n📅 **VALIDADE:** {valid_until}\n{min_purchase}\n\n📋 **DETALHES:**\n{coupon_title}\n{coupon_description}\n\n🔗 **LINK PARA USAR:**\n{affiliate_link}\n\n✅ **Cupom pronto para uso!**',
          description: 'Modelo Padrão 2: Detalhado e Informativo - Todas as plataformas',
          is_active: false,
          available_variables: ['platform_name', 'coupon_code', 'discount_value', 'valid_until', 'min_purchase', 'coupon_title', 'coupon_description', 'affiliate_link']
        },
        {
          template_type: 'new_coupon',
          platform: 'all',
          template: '⚡ **CUPOM LIBERADO!** ⚡\n\n🎟️ **CÓDIGO EXCLUSIVO:**\n`{coupon_code}`\n\n🏪 {platform_name}\n💰 {discount_value} OFF\n📅 Válido até {valid_until}\n{min_purchase}\n\n{coupon_title}\n{coupon_description}\n\n🔗 {affiliate_link}\n\n⏰ **Use antes que expire!**',
          description: 'Modelo Padrão 3: Urgente e Ação - Todas as plataformas',
          is_active: false,
          available_variables: ['platform_name', 'coupon_code', 'discount_value', 'valid_until', 'min_purchase', 'coupon_title', 'coupon_description', 'affiliate_link']
        },
        // Modelos para Cupom Expirado
        {
          template_type: 'expired_coupon',
          platform: 'all',
          template: '⚠️ **CUPOM EXPIROU**\n\n🏪 {platform_name}\n💬 Código: `{coupon_code}`\n📅 Expirado em: {expired_date}\n\n😔 Este cupom não está mais disponível.\n🔔 Fique atento às próximas promoções!',
          description: 'Modelo Padrão 1: Simples e Direto - Todas as plataformas',
          is_active: true,
          available_variables: ['platform_name', 'coupon_code', 'expired_date']
        },
        {
          template_type: 'expired_coupon',
          platform: 'all',
          template: '📢 **AVISO: CUPOM EXPIRADO**\n\n━━━━━━━━━━━━━━━━━━━━\n🏪 **Plataforma:** {platform_name}\n💬 **Código:** `{coupon_code}`\n📅 **Data de Expiração:** {expired_date}\n━━━━━━━━━━━━━━━━━━━━\n\nℹ️ Este cupom de desconto não está mais válido.\n\n🔔 **Não se preocupe!** Novos cupons são adicionados regularmente. Fique de olho!',
          description: 'Modelo Padrão 2: Informativo - Todas as plataformas',
          is_active: false,
          available_variables: ['platform_name', 'coupon_code', 'expired_date']
        },
        {
          template_type: 'expired_coupon',
          platform: 'all',
          template: '⏰ **CUPOM EXPIRADO**\n\n🏪 {platform_name}\n💬 `{coupon_code}`\n📅 {expired_date}\n\n😢 Infelizmente este cupom expirou.\n\n✨ Mas não desanime! Novas oportunidades estão chegando. Continue acompanhando para não perder as próximas ofertas! 🎁',
          description: 'Modelo Padrão 3: Motivacional - Todas as plataformas',
          is_active: false,
          available_variables: ['platform_name', 'coupon_code', 'expired_date']
        }
      ];

      const created = [];
      const errors = [];

      for (const templateData of defaultTemplates) {
        try {
          // Marcar apenas os 3 templates padrão ativos (Modelo Padrão 1) como sistema
          const isSystemTemplate = templateData.is_active === true && 
                                   templateData.description?.includes('Modelo Padrão 1');
          
          const template = await BotMessageTemplate.create({
            ...templateData,
            is_system: isSystemTemplate
          });
          created.push(template);
        } catch (error) {
          errors.push({
            template: templateData.description,
            error: error.message
          });
        }
      }

      logger.info(`✅ Templates padrão criados: ${created.length} sucesso, ${errors.length} erros`);

      res.json({
        success: true,
        message: `Templates padrão criados: ${created.length} sucesso, ${errors.length} erros`,
        data: {
          created: created.length,
          errors: errors.length,
          details: {
            created: created.map(t => ({ id: t.id, description: t.description })),
            errors
          }
        }
      });
    } catch (error) {
      logger.error(`Erro ao criar templates padrão: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar templates padrão',
        error: error.message
      });
    }
  }

  /**
   * Duplicar template
   * POST /api/bots/templates/:id/duplicate
   */
  async duplicate(req, res) {
    try {
      const { id } = req.params;
      const { platform, is_active } = req.body;

      const original = await BotMessageTemplate.findById(id);
      
      if (!original) {
        return res.status(404).json({
          success: false,
          message: 'Template não encontrado'
        });
      }

      const newTemplate = await BotMessageTemplate.create({
        template_type: original.template_type,
        platform: platform || original.platform,
        template: original.template,
        description: `${original.description || 'Template'} (Cópia)`,
        available_variables: original.available_variables || [],
        is_active: is_active !== undefined ? is_active : false
      });

      logger.info(`✅ Template duplicado: ${id} -> ${newTemplate.id}`);

      res.json({
        success: true,
        message: 'Template duplicado com sucesso',
        data: newTemplate
      });
    } catch (error) {
      logger.error(`Erro ao duplicar template: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao duplicar template',
        error: error.message
      });
    }
  }

  /**
   * Obter variáveis disponíveis para um tipo de template
   * GET /api/bots/templates/variables/:template_type
   */
  async getVariables(req, res) {
    try {
      const { template_type } = req.params;

      const variables = {
        new_promotion: [
          'product_name',
          'current_price',
          'old_price',
          'discount_percentage',
          'platform_name',
          'affiliate_link'
        ],
        promotion_with_coupon: [
          'product_name',
          'current_price',
          'original_price',
          'final_price',
          'old_price',
          'discount_percentage',
          'platform_name',
          'affiliate_link',
          'coupon_section',
          'coupon_code',
          'coupon_discount',
          'price_with_coupon'
        ],
        new_coupon: [
          'platform_name',
          'coupon_code',
          'discount_value',
          'valid_until',
          'min_purchase',
          'coupon_title',
          'coupon_description',
          'affiliate_link'
        ],
        expired_coupon: [
          'platform_name',
          'coupon_code',
          'expired_date'
        ]
      };

      const descriptions = {
        new_promotion: {
          product_name: 'Nome do produto',
          current_price: 'Preço atual formatado (R$ X,XX)',
          old_price: 'Preço antigo formatado com riscado (~~R$ X,XX~~)',
          discount_percentage: 'Percentual de desconto',
          platform_name: 'Nome da plataforma (Shopee, Mercado Livre)',
          affiliate_link: 'Link de afiliado do produto'
        },
        promotion_with_coupon: {
          product_name: 'Nome do produto',
          current_price: 'Preço final com cupom aplicado (R$ X,XX)',
          original_price: 'Preço antes do cupom (R$ X,XX)',
          final_price: 'Preço final com cupom (R$ X,XX)',
          old_price: 'Preço antigo formatado com riscado (~~R$ X,XX~~)',
          discount_percentage: 'Percentual de desconto do produto',
          platform_name: 'Nome da plataforma (Shopee, Mercado Livre)',
          affiliate_link: 'Link de afiliado do produto',
          coupon_section: 'Seção completa do cupom - inclui código, desconto, validade',
          coupon_code: 'Código do cupom',
          coupon_discount: 'Desconto do cupom (ex: 10% OFF)',
          price_with_coupon: 'Preço final com cupom formatado'
        },
        new_coupon: {
          platform_name: 'Nome da plataforma',
          coupon_code: 'Código do cupom (entre crases para fácil cópia)',
          discount_value: 'Valor do desconto formatado',
          valid_until: 'Data de validade formatada',
          min_purchase: 'Compra mínima (se houver)',
          coupon_title: 'Título do cupom',
          coupon_description: 'Descrição do cupom',
          affiliate_link: 'Link de afiliado'
        },
        expired_coupon: {
          platform_name: 'Nome da plataforma',
          coupon_code: 'Código do cupom expirado',
          expired_date: 'Data de expiração formatada'
        }
      };

      const availableVars = variables[template_type] || [];
      const description = descriptions[template_type] || {};

      res.json({
        success: true,
        data: {
          template_type,
          variables: availableVars,
          description: description
        }
      });
    } catch (error) {
      logger.error(`Erro ao obter variáveis: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter variáveis',
        error: error.message
      });
    }
  }

  /**
   * Gerar template usando IA
   * POST /api/bots/templates/generate
   */
  async generateWithAI(req, res) {
    try {
      const {
        template_type,
        platform = 'all',
        description = ''
      } = req.body;

      // Validar tipo
      const validTypes = ['new_promotion', 'promotion_with_coupon', 'new_coupon', 'expired_coupon'];
      if (!template_type || !validTypes.includes(template_type)) {
        return res.status(400).json({
          success: false,
          message: `template_type deve ser um de: ${validTypes.join(', ')}`
        });
      }

      // Obter variáveis disponíveis (usar mesma lógica do getVariables)
      const variables = {
        new_promotion: [
          'product_name',
          'current_price',
          'old_price',
          'discount_percentage',
          'platform_name',
          'affiliate_link'
        ],
        promotion_with_coupon: [
          'product_name',
          'current_price',
          'original_price',
          'final_price',
          'old_price',
          'discount_percentage',
          'platform_name',
          'affiliate_link',
          'coupon_section',
          'coupon_code',
          'coupon_discount',
          'price_with_coupon'
        ],
        new_coupon: [
          'platform_name',
          'coupon_code',
          'discount_value',
          'valid_until',
          'min_purchase',
          'coupon_title',
          'coupon_description',
          'affiliate_link'
        ],
        expired_coupon: [
          'platform_name',
          'coupon_code',
          'expired_date'
        ]
      };

      const descriptions = {
        new_promotion: {
          product_name: 'Nome do produto',
          current_price: 'Preço atual formatado (R$ X,XX)',
          old_price: 'Preço antigo formatado com riscado (~~R$ X,XX~~)',
          discount_percentage: 'Percentual de desconto',
          platform_name: 'Nome da plataforma (Shopee, Mercado Livre)',
          affiliate_link: 'Link de afiliado do produto'
        },
        promotion_with_coupon: {
          product_name: 'Nome do produto',
          current_price: 'Preço final com cupom aplicado (R$ X,XX)',
          original_price: 'Preço antes do cupom (R$ X,XX)',
          final_price: 'Preço final com cupom (R$ X,XX)',
          old_price: 'Preço antigo formatado com riscado (~~R$ X,XX~~)',
          discount_percentage: 'Percentual de desconto do produto',
          platform_name: 'Nome da plataforma (Shopee, Mercado Livre)',
          affiliate_link: 'Link de afiliado do produto',
          coupon_section: 'Seção completa do cupom - inclui código, desconto, validade',
          coupon_code: 'Código do cupom',
          coupon_discount: 'Desconto do cupom (ex: 10% OFF)',
          price_with_coupon: 'Preço final com cupom formatado'
        },
        new_coupon: {
          platform_name: 'Nome da plataforma',
          coupon_code: 'Código do cupom (entre crases para fácil cópia)',
          discount_value: 'Valor do desconto formatado',
          valid_until: 'Data de validade formatada',
          min_purchase: 'Compra mínima (se houver)',
          coupon_title: 'Título do cupom',
          coupon_description: 'Descrição do cupom',
          affiliate_link: 'Link de afiliado'
        },
        expired_coupon: {
          platform_name: 'Nome da plataforma',
          coupon_code: 'Código do cupom expirado',
          expired_date: 'Data de expiração formatada'
        }
      };

      const availableVars = variables[template_type] || [];
      const varDescriptions = descriptions[template_type] || {};

      const availableVariables = availableVars.map(varName => ({
        name: varName,
        description: varDescriptions[varName] || varName
      }));

      logger.info(`🤖 Gerando template via IA: ${template_type} para ${platform}`);

      // Gerar template usando IA
      const generatedTemplate = await templateGenerator.generateTemplate(
        template_type,
        platform,
        availableVariables,
        description
      );

      res.json({
        success: true,
        message: 'Template gerado com sucesso',
        data: {
          template: generatedTemplate,
          template_type,
          platform
        }
      });

    } catch (error) {
      logger.error(`Erro ao gerar template com IA: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao gerar template com IA',
        error: error.message
      });
    }
  }
}

export default new BotTemplateController();

