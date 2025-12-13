import BotMessageTemplate from '../models/BotMessageTemplate.js';
import logger from '../config/logger.js';

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

      const templates = await BotMessageTemplate.findAll(filters);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error(`Erro ao listar templates: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar templates',
        error: error.message
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

      const validTypes = ['new_promotion', 'new_coupon', 'expired_coupon'];
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

      // Validar template_type se fornecido
      if (updates.template_type) {
        const validTypes = ['new_promotion', 'new_coupon', 'expired_coupon'];
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
          'affiliate_link',
          'coupon_section'
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

      const availableVars = variables[template_type] || [];

      res.json({
        success: true,
        data: {
          template_type,
          variables: availableVars,
          description: this.getVariablesDescription(template_type)
        }
      });
    } catch (error) {
      logger.error(`Erro ao obter variáveis: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter variáveis',
        error: error.message
      });
    }
  }

  /**
   * Descrição das variáveis
   */
  getVariablesDescription(templateType) {
    const descriptions = {
      new_promotion: {
        product_name: 'Nome do produto',
        current_price: 'Preço atual formatado (R$ X,XX)',
        old_price: 'Preço antigo formatado com riscado (~R$ X,XX~)',
        discount_percentage: 'Percentual de desconto',
        platform_name: 'Nome da plataforma (Shopee, Mercado Livre)',
        affiliate_link: 'Link de afiliado do produto',
        coupon_section: 'Seção completa do cupom (se houver) - inclui código, desconto, validade'
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

    return descriptions[templateType] || {};
  }
}

export default new BotTemplateController();

