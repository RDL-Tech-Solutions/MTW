import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import logger from '../config/logger.js';

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  logger.warn('⚠️ Google OAuth não configurado. Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET');
}

const client = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
  ? new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
  : null;

/**
 * Verificar token ID do Google
 * @param {string} idToken - Token ID retornado pelo Google
 * @returns {Promise<Object>} Dados do usuário
 */
export async function verifyGoogleToken(idToken) {
  if (!client) {
    throw new Error('Google OAuth não configurado');
  }

  try {
    logger.info('🔐 [Google Auth] Verificando token ID...');
    
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    logger.info('✅ [Google Auth] Token verificado com sucesso');
    logger.info(`   User ID: ${payload.sub}`);
    logger.info(`   Email: ${payload.email}`);

    return {
      providerId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      emailVerified: payload.email_verified,
    };
  } catch (error) {
    logger.error(`❌ [Google Auth] Erro ao verificar token: ${error.message}`);
    throw new Error('Token do Google inválido');
  }
}

export default {
  verifyGoogleToken,
};
