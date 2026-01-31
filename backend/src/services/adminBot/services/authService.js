import supabase from '../../../config/database.js';
import { adminMainMenu } from '../menus/mainMenu.js';
import logger from '../../../config/logger.js';
import { comparePassword } from '../../../utils/helpers.js';

class AuthService {

    /**
     * Iniciar fluxo de login (pedir email)
     */
    async startLogin(ctx) {
        if (this.isAuthenticated(ctx)) {
            return ctx.reply('✅ Você já está logado!', { reply_markup: adminMainMenu });
        }

        await ctx.reply('🔒 *Login Administrativo*\n\nPor favor, digite seu *email* cadastrado no sistema:', { parse_mode: 'Markdown' });
        ctx.session.step = 'AWAITING_EMAIL';
    }

    /**
     * Processar email recebido
     * @param {Object} ctx Contexto do Grammy
     * @param {String} email Email recebido
     */
    async handleEmail(ctx, email) {
        const cleanEmail = email.trim().toLowerCase();

        // Validar formato
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            await ctx.reply('❌ Email inválido. Tente novamente ou use /login.');
            return;
        }

        // Buscar usuário e hash da senha
        logger.info(`[AuthDebug] Buscando usuário com email: '${cleanEmail}'`);
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name, password_hash')
            .eq('email', cleanEmail)
            .maybeSingle();

        if (error) {
            logger.error(`[AuthDebug] Erro ao buscar usuário: ${JSON.stringify(error)}`);
            await ctx.reply('❌ Erro no sistema ao buscar usuário.');
            return;
        } else {
            logger.info(`[AuthDebug] Resultado busca: ${user ? 'Encontrado' : 'NÃO Encontrado'}`);
        }

        if (!user) {
            await ctx.reply('❌ Email não encontrado no sistema.');
            return;
        }

        // Armazenar usuário temporariamente na sessão
        ctx.session.tempUser = user;

        // Pedir senha
        await ctx.reply(
            '🔑 *Digite sua senha:*',
            { parse_mode: 'Markdown' }
        );
        ctx.session.step = 'AWAITING_PASSWORD';
    }

    /**
     * Processar senha
     * @param {Object} ctx Contexto do Grammy
     * @param {String} password Senha recebida
     */
    async handlePassword(ctx, password) {
        const user = ctx.session.tempUser;
        const inputPassword = password.trim();

        if (!user) {
            await ctx.reply('❌ Sessão expirada. Comece novamente com /login.');
            ctx.session.step = 'IDLE';
            return;
        }

        // Verificar senha
        const isValid = await comparePassword(inputPassword, user.password_hash);

        if (!isValid) {
            logger.warn(`[Auth] Falha de login para ${user.email} (senha incorreta)`);
            await ctx.reply('❌ Senha incorreta. Tente novamente ou use /login para reiniciar.');
            // Não muda o step, permite tentar de novo ou reiniciar
            return;
        }

        // Login sucesso
        logger.info(`[Auth] Login sucesso para ${user.email}`);

        // Registrar sessão final
        ctx.session.user = {
            id: user.id,
            email: user.email,
            name: user.name
        };
        ctx.session.isAuthenticated = true;
        ctx.session.step = 'IDLE';
        delete ctx.session.tempUser;

        // Limpar mensagem da senha para segurança (se possível)
        try {
            await ctx.deleteMessage(ctx.message.message_id).catch(() => { });
        } catch (e) {
            // Ignorar erro ao deletar
        }

        // Salvar vínculo telegram (opcional, mas bom manter)
        try {
            await supabase.from('telegram_user_links').upsert({
                user_id: user.id,
                telegram_user_id: String(ctx.from.id),
                telegram_username: ctx.from.username,
                linked_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        } catch (linkError) {
            logger.warn('Erro ao vincular telegram (não crítico):', linkError);
        }

        await ctx.reply(
            `✅ *Admin Logado!*\n\nBem-vindo ${user.name || 'Admin'} ao Painel Administrativo.`,
            {
                parse_mode: 'Markdown',
                reply_markup: adminMainMenu
            }
        );
    }

    /**
     * Middleware de proteção de rotas
     */
    isAuthenticated(ctx) {
        return !!ctx.session?.isAuthenticated;
    }
}

export default new AuthService();
