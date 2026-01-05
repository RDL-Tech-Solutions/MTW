import User from '../src/models/User.js';
import supabase from '../src/config/database.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcryptjs';

// Configurar dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const resetPassword = async () => {
    const email = 'robertosshbrasil@gmail.com';
    const password = 'roberto10';

    try {
        console.log(`🔍 Resetando senha para ${email}...`);

        // Gerar hash novo e fresco
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log('🔑 Novo hash gerado:', hashedPassword);

        // Verificar antes de salvar
        const check = await bcrypt.compare(password, hashedPassword);
        console.log('✅ Verificação pré-save:', check);

        if (!check) {
            throw new Error('Erro catastrófico: Hash gerado não bate com a senha!');
        }

        // Buscar ID
        const { data: user } = await supabase.from('users').select('id').eq('email', email).single();

        if (!user) {
            console.error('❌ Usuário não encontrado!');
            process.exit(1);
        }

        // Update direto via Supabase query para garantir
        const { error } = await supabase
            .from('users')
            .update({
                password: hashedPassword,
                password_hash: hashedPassword,
                updated_at: new Date()
            })
            .eq('id', user.id);

        if (error) throw error;

        console.log('✅ Senha atualizada no banco com sucesso!');

        // Verificação final (opcional, só pra garantir que o banco persistiu o que enviamos)
        const { data: updatedUser } = await supabase.from('users').select('password_hash').eq('id', user.id).single();
        console.log('Confirmando hash salvo:', updatedUser.password_hash);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        process.exit(0);
    }
};

resetPassword();
