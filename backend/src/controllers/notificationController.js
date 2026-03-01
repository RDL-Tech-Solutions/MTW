import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import logger from '../config/logger.js';
import oneSignalService from '../services/oneSignalService.js';

class NotificationController {
  static async list(req, res, next) {
    try {
      const result = await Notification.findByUser(req.user.id, req.query);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const notification = await Notification.markAsRead(id);
      logger.info('Notificação lida: ' + id);
      res.json(successResponse(notification, 'Notificação marcada como lida'));
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req, res, next) {
    try {
      await Notification.markAllAsRead(req.user.id);
      logger.info('Todas notificações lidas: usuário ' + req.user.id);
      res.json(successResponse(null, 'Todas notificações marcadas como lidas'));
    } catch (error) {
      next(error);
    }
  }

  static async countUnread(req, res, next) {
    try {
      const count = await Notification.countUnread(req.user.id);
      res.json(successResponse({ count }));
    } catch (error) {
      next(error);
    }
  }

  static async registerToken(req, res, next) {
    try {
      logger.warn('DEPRECATED: Endpoint /register-token chamado. OneSignal gerencia tokens automaticamente.');
      logger.info('Push token Expo (ignorado): usuário ' + req.user.id);
      res.json(successResponse(null, 'Token recebido (OneSignal gerencia automaticamente)'));
    } catch (error) {
      next(error);
    }
  }

  static async stats(req, res, next) {
    try {
      const stats = await Notification.getStats();
      res.json(successResponse(stats));
    } catch (error) {
      next(error);
    }
  }

  static async testPush(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json(errorResponse('Usuário não encontrado'));
      }
      logger.info('Testando push notification OneSignal para usuário ' + user.id + ' (' + user.email + ')');
      const result = await oneSignalService.sendToUser({
        external_id: user.id.toString(),
        title: 'Teste de Notificação',
        message: 'Esta é uma notificação de teste do PreçoCerto! Se você recebeu isso, as notificações push estão funcionando perfeitamente!',
        data: { type: 'test', screen: 'Home', timestamp: new Date().toISOString() },
        priority: 'high'
      });
      if (result.success) {
        logger.info('Notificação de teste enviada com sucesso!');
        res.json(successResponse({ sent: true, notificationId: result.notification_id, recipients: result.recipients, user: { id: user.id, email: user.email, name: user.name } }, 'Notificação de teste enviada com sucesso! Verifique seu dispositivo móvel.'));
      } else {
        logger.error('Falha ao enviar notificação de teste: ' + (result.error || 'Erro desconhecido'));
        res.status(500).json(errorResponse(result.error || 'Falha ao enviar notificação. Verifique os logs do servidor.'));
      }
    } catch (error) {
      logger.error('Erro ao testar push notification: ' + error.message);
      next(error);
    }
  }
}

export default NotificationController;
