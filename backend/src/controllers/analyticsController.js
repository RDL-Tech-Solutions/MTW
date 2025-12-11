import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import User from '../models/User.js';
import ClickTracking from '../models/ClickTracking.js';
import { successResponse } from '../utils/helpers.js';
import supabase from '../config/database.js';

class AnalyticsController {
  // Dashboard geral
  static async dashboard(req, res, next) {
    try {
      const { days = 30 } = req.query;

      // Estatísticas gerais
      const [
        totalProducts,
        totalCoupons,
        totalUsers,
        clickStats
      ] = await Promise.all([
        Product.count(),
        Coupon.countActive(),
        supabase.from('users').select('*', { count: 'exact', head: true }).then(r => r.count),
        ClickTracking.getStats(parseInt(days))
      ]);

      // Produtos mais clicados
      const mostClicked = await ClickTracking.getMostClicked(10, parseInt(days));

      // Cupons mais usados
      const mostUsedCoupons = await Coupon.findMostUsed(10);

      const dashboard = {
        overview: {
          total_products: totalProducts,
          total_coupons: totalCoupons,
          total_users: totalUsers,
          ...clickStats
        },
        most_clicked_products: mostClicked,
        most_used_coupons: mostUsedCoupons
      };

      res.json(successResponse(dashboard));
    } catch (error) {
      next(error);
    }
  }

  // Estatísticas de cliques
  static async clicks(req, res, next) {
    try {
      const { days = 30 } = req.query;
      const stats = await ClickTracking.getStats(parseInt(days));
      res.json(successResponse(stats));
    } catch (error) {
      next(error);
    }
  }

  // Taxa de conversão
  static async conversions(req, res, next) {
    try {
      const { product_id } = req.query;

      if (product_id) {
        const rate = await ClickTracking.getConversionRate(product_id);
        return res.json(successResponse({ conversion_rate: rate }));
      }

      const stats = await ClickTracking.getStats(30);
      res.json(successResponse(stats));
    } catch (error) {
      next(error);
    }
  }

  // Produtos mais acessados
  static async topProducts(req, res, next) {
    try {
      const { limit = 10, days = 30 } = req.query;
      const products = await ClickTracking.getMostClicked(
        parseInt(limit),
        parseInt(days)
      );
      res.json(successResponse(products));
    } catch (error) {
      next(error);
    }
  }

  // Cupons mais usados
  static async topCoupons(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const coupons = await Coupon.findMostUsed(parseInt(limit));
      res.json(successResponse(coupons));
    } catch (error) {
      next(error);
    }
  }
}

export default AnalyticsController;
