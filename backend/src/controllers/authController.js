import User from '../models/User.js';
import {
  comparePassword,
  generateToken,
  generateRefreshToken,
  verifyToken,
  successResponse,
  errorResponse
} from '../utils/helpers.js';
import { ERROR_MESSAGES, ERROR_CODES } from '../config/constants.js';
import logger from '../config/logger.js';

class AuthController {
  // Registrar novo usuário
  static async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      // Verificar se usuário já existe
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json(
          errorResponse(ERROR_MESSAGES.USER_EXISTS, ERROR_CODES.USER_EXISTS)
        );
      }

      // Criar usuário
      const user = await User.create({ name, email, password });

      // Gerar tokens
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ id: user.id });

      logger.info(`Novo usuário registrado: ${email}`);

      res.status(201).json(
        successResponse(
          {
            user,
            token,
            refreshToken
          },
          'Usuário criado com sucesso'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Login
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Buscar usuário
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json(
          errorResponse(ERROR_MESSAGES.INVALID_CREDENTIALS, ERROR_CODES.INVALID_CREDENTIALS)
        );
      }

      // Log de debug para diagnóstico
      logger.info(`[LOGIN DEBUG] Email: ${email}`);
      logger.info(`[LOGIN DEBUG] Usuário encontrado: ${!!user}`);

      if (user) {
        logger.info(`[LOGIN DEBUG] ID do Usuário: ${user.id}`);
        logger.info(`[LOGIN DEBUG] Hash no banco: ${user.password_hash ? user.password_hash.substring(0, 15) + '...' : 'Ausente'}`);
        // DEBUG EXTREMO: Logar senha recebida (tamanho e chars)
        logger.info(`[LOGIN DEBUG] Senha recebida: "${password}" (Len: ${password.length})`);

        // Teste de comparação manual
        const isMatchNow = await comparePassword(password, user.password_hash || user.password);
        logger.info(`[LOGIN DEBUG] Comparação direta (bcrypt): ${isMatchNow}`);
      }

      // Verificar senha (tentar password_hash primeiro, depois password)
      const passwordToCompare = user.password_hash || user.password;
      if (!passwordToCompare) {
        logger.error(`Usuário ${email} não tem senha configurada`);
        return res.status(401).json(
          errorResponse(ERROR_MESSAGES.INVALID_CREDENTIALS, ERROR_CODES.INVALID_CREDENTIALS)
        );
      }

      const isValidPassword = await comparePassword(password, passwordToCompare);
      logger.info(`[LOGIN DEBUG] Senha válida: ${isValidPassword}`);

      if (!isValidPassword) {
        logger.warn(`Tentativa de login falhou para: ${email}`);
        return res.status(401).json(
          errorResponse(ERROR_MESSAGES.INVALID_CREDENTIALS, ERROR_CODES.INVALID_CREDENTIALS)
        );
      }

      // Remover senhas do retorno
      delete user.password;
      delete user.password_hash;

      // Gerar tokens
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ id: user.id });

      logger.info(`Login realizado: ${email}`);

      res.json(
        successResponse(
          {
            user,
            token,
            refreshToken
          },
          'Login realizado com sucesso'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Refresh token
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json(
          errorResponse(ERROR_MESSAGES.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED)
        );
      }

      // Verificar refresh token
      const decoded = verifyToken(refreshToken, true);

      // Buscar usuário
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json(
          errorResponse(ERROR_MESSAGES.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED)
        );
      }

      // Gerar novos tokens
      const newToken = generateToken({ id: user.id, email: user.email, role: user.role });
      const newRefreshToken = generateRefreshToken({ id: user.id });

      res.json(
        successResponse(
          {
            token: newToken,
            refreshToken: newRefreshToken
          },
          'Token atualizado com sucesso'
        )
      );
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json(
          errorResponse(ERROR_MESSAGES.EXPIRED_TOKEN, ERROR_CODES.EXPIRED_TOKEN)
        );
      }
      next(error);
    }
  }

  // Obter dados do usuário autenticado
  static async me(req, res, next) {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json(
          errorResponse(ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.NOT_FOUND)
        );
      }

      delete user.password;

      res.json(
        successResponse(user)
      );
    } catch (error) {
      next(error);
    }
  }

  // Atualizar perfil
  static async updateProfile(req, res, next) {
    try {
      const { name, email } = req.body;
      const updates = {};

      if (name) updates.name = name;
      if (email) {
        // Verificar se email já está em uso
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json(
            errorResponse(ERROR_MESSAGES.USER_EXISTS, ERROR_CODES.USER_EXISTS)
          );
        }
        updates.email = email;
      }

      const user = await User.update(req.user.id, updates);

      logger.info(`Perfil atualizado: ${user.email}`);

      res.json(
        successResponse(user, 'Perfil atualizado com sucesso')
      );
    } catch (error) {
      next(error);
    }
  }

  // Alterar senha
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      // Buscar usuário com senha
      const user = await User.findById(req.user.id);

      // Verificar senha atual
      const isValidPassword = await comparePassword(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json(
          errorResponse('Senha atual incorreta', ERROR_CODES.INVALID_CREDENTIALS)
        );
      }

      // Atualizar senha
      const { hashPassword } = await import('../utils/helpers.js');
      const hashedPassword = await hashPassword(newPassword);
      await User.update(req.user.id, { 
        password: hashedPassword,
        password_hash: hashedPassword // Salvar em ambos os campos para compatibilidade
      });

      logger.info(`Senha alterada: ${user.email}`);

      res.json(
        successResponse(null, 'Senha alterada com sucesso')
      );
    } catch (error) {
      next(error);
    }
  }

  // Registrar push token
  static async registerPushToken(req, res, next) {
    try {
      const { push_token } = req.body;

      await User.updatePushToken(req.user.id, push_token);

      logger.info(`Push token registrado para usuário: ${req.user.id}`);

      res.json(
        successResponse(null, 'Push token registrado com sucesso')
      );
    } catch (error) {
      next(error);
    }
  }

  // Login/Registro com Google (usando ID Token)
  static async googleAuth(req, res, next) {
    try {
      const { idToken } = req.body;

      logger.info('📱 [Google Auth] Solicitação de autenticação');

      if (!idToken) {
        logger.error('❌ [Google Auth] Token não fornecido');
        return res.status(400).json(
          errorResponse('Token do Google é obrigatório', 'MISSING_TOKEN')
        );
      }

      // Verificar token com Google
      const { verifyGoogleToken } = await import('../services/googleAuth.js');
      const googleUser = await verifyGoogleToken(idToken);

      logger.info('👤 [Google Auth] Dados do usuário extraídos');
      logger.info(`   Email: ${googleUser.email}`);
      logger.info(`   Name: ${googleUser.name}`);

      // Buscar ou criar usuário
      logger.info('🔍 [Google Auth] Buscando usuário...');
      let user = await User.findByProviderId('google', googleUser.providerId);

      if (!user) {
        logger.info('   Não encontrado por provider_id, buscando por email...');
        user = await User.findByEmail(googleUser.email);
      }

      if (user) {
        logger.info(`✅ [Google Auth] Usuário encontrado: ${user.id}`);
        // Usuário existe - atualizar dados
        const updates = {};
        if (!user.provider || user.provider !== 'google') {
          updates.provider = 'google';
          updates.provider_id = googleUser.providerId;
        }
        if (googleUser.picture && user.avatar_url !== googleUser.picture) {
          updates.avatar_url = googleUser.picture;
        }
        if (googleUser.name && user.name !== googleUser.name) {
          updates.name = googleUser.name;
        }

        if (Object.keys(updates).length > 0) {
          logger.info('   Atualizando dados do usuário...');
          await User.update(user.id, updates);
          user = await User.findById(user.id);
        }
      } else {
        logger.info('   Usuário não existe, criando novo...');
        // Criar novo usuário
        user = await User.create({
          name: googleUser.name,
          email: googleUser.email,
          provider: 'google',
          provider_id: googleUser.providerId,
          avatar_url: googleUser.picture,
          password: null, // Login social não precisa de senha
        });
        logger.info(`✅ [Google Auth] Novo usuário criado: ${user.id}`);
      }

      // Remover senhas do retorno
      delete user.password;
      delete user.password_hash;

      // Gerar tokens JWT
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ id: user.id });

      logger.info(`✅ [Google Auth] Login concluído: ${user.email}`);

      res.json(
        successResponse(
          {
            user,
            token,
            refreshToken
          },
          'Login com Google realizado com sucesso'
        )
      );
    } catch (error) {
      logger.error(`❌ [Google Auth] Erro: ${error.message}`);
      next(error);
    }
  }

  // Obter URL de autenticação OAuth
  static async getOAuthUrl(req, res, next) {
    try {
      const { provider, redirect_url } = req.body;

      logger.info('📱 [OAuth] Solicitação de URL de autenticação');
      logger.info(`   Provider: ${provider}`);
      logger.info(`   Redirect URL: ${redirect_url}`);

      if (!provider || provider !== 'google') {
        logger.error('❌ [OAuth] Provider inválido');
        return res.status(400).json(
          errorResponse('Provider inválido. Use "google"', 'INVALID_PROVIDER')
        );
      }

      const { getOAuthUrl } = await import('../services/supabaseAuth.js');
      const oauthUrl = await getOAuthUrl(provider, redirect_url || req.headers.origin);

      logger.info('✅ [OAuth] URL gerada com sucesso');

      res.json(
        successResponse({ url: oauthUrl }, 'URL de autenticação gerada')
      );
    } catch (error) {
      logger.error(`❌ [OAuth] Erro ao gerar URL: ${error.message}`);
      next(error);
    }
  }

  // Trocar código por sessão e autenticar
  static async socialAuthCallback(req, res, next) {
    try {
      // Aceitar tanto GET (web redirect) quanto POST (mobile)
      const code = req.query.code || req.body.code;
      const provider = req.query.provider || req.body.provider;
      const redirectUrl = req.body.redirect_url || req.headers.origin || 'http://localhost:8081';

      logger.info('🔄 [OAuth Callback] Processando callback');
      logger.info(`   Method: ${req.method}`);
      logger.info(`   Provider: ${provider}`);
      logger.info(`   Code: ${code ? code.substring(0, 20) + '...' : 'AUSENTE'}`);
      logger.info(`   Redirect URL: ${redirectUrl}`);

      if (!code) {
        logger.error('❌ [OAuth Callback] Código não fornecido');
        return res.status(400).json(
          errorResponse('Código de autorização não fornecido', 'MISSING_CODE')
        );
      }

      // Trocar código por sessão Supabase
      logger.info('🔄 [OAuth Callback] Trocando código por sessão...');
      const { exchangeCodeForSession } = await import('../services/supabaseAuth.js');
      const sessionData = await exchangeCodeForSession(code);

      logger.info('📦 [OAuth Callback] Dados da sessão recebidos');
      logger.info(`   Session exists: ${!!sessionData.session}`);
      logger.info(`   User exists: ${!!sessionData.user}`);

      if (!sessionData.session || !sessionData.user) {
        logger.error('❌ [OAuth Callback] Sessão ou usuário ausente');
        return res.status(400).json(
          errorResponse('Falha ao obter sessão do Supabase', 'SESSION_ERROR')
        );
      }

      const { user: supabaseUser } = sessionData.session;

      // Extrair dados do usuário
      const authProvider = provider || supabaseUser.app_metadata?.provider || 'unknown';
      const providerId = supabaseUser.id;
      const email = supabaseUser.email;
      const userMetadata = supabaseUser.user_metadata || {};
      const name = userMetadata.full_name || userMetadata.name || userMetadata.display_name || email?.split('@')[0] || 'Usuário';
      const avatarUrl = userMetadata.avatar_url || userMetadata.picture || userMetadata.photo_url;

      logger.info('👤 [OAuth Callback] Dados do usuário extraídos');
      logger.info(`   Provider: ${authProvider}`);
      logger.info(`   Provider ID: ${providerId}`);
      logger.info(`   Email: ${email}`);
      logger.info(`   Name: ${name}`);

      if (!email) {
        logger.error('❌ [OAuth Callback] Email não encontrado');
        return res.status(400).json(
          errorResponse('Email não encontrado na sessão', 'MISSING_EMAIL')
        );
      }

      // Buscar ou criar usuário
      logger.info('🔍 [OAuth Callback] Buscando usuário...');
      let user = await User.findByProviderId(authProvider, providerId);

      if (!user) {
        logger.info('   Não encontrado por provider_id, buscando por email...');
        user = await User.findByEmail(email);
      }

      if (user) {
        logger.info(`✅ [OAuth Callback] Usuário encontrado: ${user.id}`);
        // Usuário existe - atualizar dados
        const updates = {};
        if (!user.provider || user.provider !== authProvider) {
          updates.provider = authProvider;
          updates.provider_id = providerId;
        }
        if (avatarUrl && user.avatar_url !== avatarUrl) {
          updates.avatar_url = avatarUrl;
        }
        if (name && user.name !== name) {
          updates.name = name;
        }

        if (Object.keys(updates).length > 0) {
          logger.info('   Atualizando dados do usuário...');
          await User.update(user.id, updates);
          user = await User.findById(user.id);
        }
      } else {
        logger.info('   Usuário não existe, criando novo...');
        // Criar novo usuário
        user = await User.create({
          name,
          email,
          provider: authProvider,
          provider_id: providerId,
          avatar_url: avatarUrl,
          password: null, // Login social não precisa de senha
        });
        logger.info(`✅ [OAuth Callback] Novo usuário criado: ${user.id}`);
      }

      // Remover senhas do retorno
      delete user.password;
      delete user.password_hash;

      // Gerar tokens JWT
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ id: user.id });

      logger.info(`Login social realizado: ${email} via ${authProvider}`);

      // Se for GET (web), redirecionar. Se for POST (mobile), retornar JSON
      if (req.method === 'GET') {
        const finalRedirectUrl = `${redirectUrl}?token=${token}&refreshToken=${refreshToken}`;
        res.redirect(finalRedirectUrl);
      } else {
        res.json(
          successResponse(
            {
              user,
              token,
              refreshToken
            },
            `Login com ${authProvider} realizado com sucesso`
          )
        );
      }
    } catch (error) {
      logger.error(`Erro no callback OAuth: ${error.message}`);
      next(error);
    }
  }

  // Login/Registro com autenticação social (dados diretos - para mobile)
  static async socialAuth(req, res, next) {
    try {
      const { provider, provider_id, email, name, avatar_url, supabase_token } = req.body;

      if (!provider || !provider_id || !email) {
        return res.status(400).json(
          errorResponse('Dados de autenticação social incompletos', 'INVALID_SOCIAL_DATA')
        );
      }

      // Primeiro, tentar buscar por provider_id
      let user = await User.findByProviderId(provider, provider_id);

      // Se não encontrou, buscar por email
      if (!user) {
        user = await User.findByEmail(email);
      }

      if (user) {
        // Usuário existe - fazer login
        // Atualizar dados se necessário
        const updates = {};
        if (!user.provider || user.provider !== provider) {
          updates.provider = provider;
          updates.provider_id = provider_id;
        }
        if (avatar_url && user.avatar_url !== avatar_url) {
          updates.avatar_url = avatar_url;
        }
        if (name && user.name !== name) {
          updates.name = name;
        }

        if (Object.keys(updates).length > 0) {
          await User.update(user.id, updates);
          user = await User.findById(user.id);
        }
      } else {
        // Criar novo usuário
        user = await User.create({
          name: name || email.split('@')[0],
          email,
          provider,
          provider_id,
          avatar_url,
          // Não precisa de senha para login social
          password: null,
        });
      }

      // Remover senhas do retorno
      delete user.password;
      delete user.password_hash;

      // Gerar tokens JWT
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ id: user.id });

      logger.info(`Login social realizado: ${email} via ${provider}`);

      res.json(
        successResponse(
          {
            user,
            token,
            refreshToken
          },
          `Login com ${provider} realizado com sucesso`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Callback do Mercado Livre OAuth (para obter tokens)
  static async meliCallback(req, res, next) {
    try {
      const { code, error: oauthError } = req.query;

      if (oauthError) {
        return res.status(400).send(`
          <html>
            <head>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  max-width: 800px;
                  margin: 50px auto;
                  padding: 20px;
                  background: #f5f5f5;
                }
                .error {
                  background: #f8d7da;
                  border: 1px solid #f5c6cb;
                  color: #721c24;
                  padding: 20px;
                  border-radius: 5px;
                }
              </style>
            </head>
            <body>
              <div class="error">
                <h1>❌ Erro na Autorização</h1>
                <p>${oauthError}</p>
                <p>Feche esta janela e tente novamente.</p>
              </div>
            </body>
          </html>
        `);
      }

      if (!code) {
        return res.status(400).send(`
          <html>
            <head>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  max-width: 800px;
                  margin: 50px auto;
                  padding: 20px;
                  background: #f5f5f5;
                }
                .error {
                  background: #f8d7da;
                  border: 1px solid #f5c6cb;
                  color: #721c24;
                  padding: 20px;
                  border-radius: 5px;
                }
              </style>
            </head>
            <body>
              <div class="error">
                <h1>❌ Erro</h1>
                <p>Code não recebido. Tente novamente.</p>
              </div>
            </body>
          </html>
        `);
      }

      // Retornar código via query string para o script processar
      // O script vai fazer a troca do code por tokens
      // Também enviar para o opener (admin panel) via postMessage
      res.send(`
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f5f5;
              }
              .success {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
                padding: 20px;
                border-radius: 5px;
                margin-bottom: 20px;
              }
              .info {
                background: #d1ecf1;
                border: 1px solid #bee5eb;
                color: #0c5460;
                padding: 15px;
                border-radius: 5px;
                margin-top: 20px;
              }
              h1 { color: #155724; }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>✅ Código Recebido!</h1>
              <p>O código de autorização foi recebido com sucesso.</p>
              <p>Esta janela será fechada automaticamente...</p>
            </div>
            <div class="info">
              <p><strong>Aguarde enquanto processamos...</strong></p>
            </div>
            <script>
              // Enviar código para o opener (admin panel) via postMessage
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'meli_code', 
                  code: '${code}' 
                }, '*');
                
                // Fechar janela após um breve delay
                setTimeout(() => {
                  window.close();
                }, 1000);
              } else {
                // Se não houver opener, mostrar código para copiar manualmente
                document.querySelector('.info').innerHTML = 
                  '<p><strong>Código:</strong> <code>${code}</code></p>' +
                  '<p>Copie este código e cole no campo de código de autorização.</p>';
              }
            </script>
          </body>
        </html>
      `);

      // Log para o script capturar
      logger.info(`✅ MELI_CALLBACK_CODE: ${code}`);
    } catch (error) {
      logger.error(`Erro no callback do Mercado Livre: ${error.message}`);
      next(error);
    }
  }

  // Solicitar recuperação de senha (envia código de 6 dígitos)
  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      logger.info(`📧 Solicitação de recuperação de senha para: ${email}`);

      if (!email || !email.trim()) {
        return res.status(400).json(
          errorResponse('Email é obrigatório')
        );
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json(
          errorResponse('Email inválido')
        );
      }

      // Buscar usuário
      let user;
      try {
        user = await User.findByEmail(email);
      } catch (dbError) {
        logger.error(`❌ Erro ao buscar usuário no banco: ${dbError.message}`);
        return res.status(500).json(
          errorResponse('Erro no banco de dados. Tente novamente mais tarde.')
        );
      }

      if (!user) {
        logger.info(`⚠️ Email não encontrado: ${email}`);
        // Por segurança, não revelar se o email existe ou não
        return res.json(
          successResponse(null, 'Se o email existir, você receberá um código de verificação')
        );
      }

      logger.info(`✅ Usuário encontrado: ${user.id}`);

      // Gerar código de 6 dígitos
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

      logger.info(`🔑 Código gerado para ${email}: ${verificationCode}`);

      // Salvar código no banco
      try {
        await User.update(user.id, {
          verification_code: verificationCode,
          verification_code_expiry: codeExpiry.toISOString(),
        });
        logger.info(`✅ Código salvo no banco para ${email}`);
      } catch (updateError) {
        logger.error(`❌ Erro ao salvar código no banco: ${updateError.message}`);
        return res.status(500).json(
          errorResponse('Erro ao processar solicitação. Tente novamente mais tarde.')
        );
      }

      // Enviar email com código
      try {
        const emailServiceWrapper = (await import('../services/emailServiceWrapper.js')).default;
        const emailResult = await emailServiceWrapper.sendPasswordResetEmail(email, verificationCode, user.name);

        if (!emailResult.success) {
          logger.error(`❌ Erro ao enviar email de recuperação para ${email}: ${emailResult.error}`);
          return res.status(500).json(
            errorResponse('Erro ao enviar email. Tente novamente mais tarde.')
          );
        }

        logger.info(`✅ Email com código enviado para: ${email}`);
      } catch (emailError) {
        logger.error(`❌ Exceção ao enviar email: ${emailError.message}`);
        // Mesmo com erro no email, não revelar se o usuário existe
      }

      res.json(
        successResponse(null, 'Se o email existir, você receberá um código de verificação')
      );
    } catch (error) {
      logger.error(`❌ Erro geral em forgotPassword: ${error.message}`);
      next(error);
    }
  }

  // Verificar código de recuperação
  static async verifyResetCode(req, res, next) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json(
          errorResponse('Email e código são obrigatórios')
        );
      }

      // Buscar usuário com código válido
      const supabase = (await import('../config/database.js')).default;
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('verification_code', code)
        .gt('verification_code_expiry', new Date().toISOString())
        .limit(1);

      if (error || !users || users.length === 0) {
        logger.warn(`❌ Código inválido ou expirado para: ${email}`);
        return res.status(400).json(
          errorResponse('Código inválido ou expirado')
        );
      }

      logger.info(`✅ Código verificado com sucesso para: ${email}`);

      res.json(
        successResponse({ valid: true }, 'Código verificado com sucesso')
      );
    } catch (error) {
      logger.error(`❌ Erro ao verificar código: ${error.message}`);
      next(error);
    }
  }

  // Redefinir senha com código
  static async resetPassword(req, res, next) {
    try {
      const { email, code, newPassword } = req.body;

      if (!email || !code || !newPassword) {
        return res.status(400).json(
          errorResponse('Email, código e nova senha são obrigatórios')
        );
      }

      // Validar senha
      if (newPassword.length < 6) {
        return res.status(400).json(
          errorResponse('A senha deve ter no mínimo 6 caracteres')
        );
      }

      // Buscar usuário com código válido
      const supabase = (await import('../config/database.js')).default;
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('verification_code', code)
        .gt('verification_code_expiry', new Date().toISOString())
        .limit(1);

      if (error || !users || users.length === 0) {
        logger.warn(`❌ Código inválido ou expirado para: ${email}`);
        return res.status(400).json(
          errorResponse('Código inválido ou expirado')
        );
      }

      const user = users[0];

      // Atualizar senha e limpar código
      const { hashPassword } = await import('../utils/helpers.js');
      const hashedPassword = await hashPassword(newPassword);
      
      await User.update(user.id, {
        password: hashedPassword,
        password_hash: hashedPassword, // Salvar em ambos os campos para compatibilidade
        verification_code: null,
        verification_code_expiry: null,
      });

      // Enviar email de confirmação
      const emailServiceWrapper = (await import('../services/emailServiceWrapper.js')).default;
      await emailServiceWrapper.sendPasswordChangedEmail(user.email, user.name);

      logger.info(`✅ Senha redefinida com sucesso para: ${user.email}`);

      res.json(
        successResponse(null, 'Senha redefinida com sucesso')
      );
    } catch (error) {
      logger.error(`❌ Erro ao redefinir senha: ${error.message}`);
      next(error);
    }
  }
}

export default AuthController;
