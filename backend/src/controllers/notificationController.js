import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import logger from '../config/logger.js';
import fcmService from '../services/fcmService.js';

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
      const { token } = req.body;
      if (!token) {
        return res.status(400).json(errorResponse('token é obrigatório'));
      }
      await User.update(req.user.id, { fcm_token: token });
      logger.info('FCM token registrado para usuário ' + req.user.id);
      res.json(successResponse(null, 'FCM token registrado com sucesso'));
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
      if (!user.fcm_token) {
        return res.status(400).json(errorResponse('Usuário não tem FCM token. Abra o app para registrar o token.'));
      }
      logger.info('Testando push notification FCM para usuário ' + user.id + ' (' + user.email + ')');
      const result = await fcmService.sendToUser({
        fcm_token: user.fcm_token,
        title: 'Teste de Notificação',
        message: 'Esta é uma notificação de teste do PreçoCerto! Se você recebeu isso, as notificações push estão funcionando perfeitamente!',
        data: { type: 'test', screen: 'Home', timestamp: new Date().toISOString() },
        priority: 'high'
      });
      if (result.success) {
        logger.info('Notificação de teste FCM enviada com sucesso!');
        res.json(successResponse({ sent: true, message_id: result.message_id, user: { id: user.id, email: user.email, name: user.name } }, 'Notificação de teste enviada com sucesso! Verifique seu dispositivo móvel.'));
      } else {
        logger.error('Falha ao enviar notificação de teste FCM: ' + (result.error || 'Erro desconhecido'));
        res.status(500).json(errorResponse(result.error || 'Falha ao enviar notificação. Verifique os logs do servidor.'));
      }
    } catch (error) {
      logger.error('Erro ao testar push notification FCM: ' + error.message);
      next(error);
    }
  }
}

export default NotificationController;
