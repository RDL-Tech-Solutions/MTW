import User from '../src/models/User.js';
import supabase from '../src/config/database.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { hashPassword } from '../src/utils/helpers.js';

// Configurar dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const createAdmin = async () => {
    const email = 'robertosshbrasil@gmail.com';
    const password = 'roberto10';
    const name = 'Roberto Admin';

    try {
        console.log(`🔍 Verificando usuário ${email}...`);

        // Verificar se usuário existe
        const existingUser = await User.findByEmail(email);

        if (existingUser) {
            console.log('✏️  Usuário existe. Atualizando senha e permissões...');
            const hashedPassword = await hashPassword(password);

            await supabase
                .from('users')
                .update({
                    password: hashedPassword,      // Compatibilidade
                    password_hash: hashedPassword, // Novo padrão
                    role: 'admin',
                    is_vip: true,
                    updated_at: new Date()
                })
                .eq('id', existingUser.id);

            console.log('✅ Usuário atualizado com sucesso!');
        } else {
            console.log('➕ Criando novo usuário admin...');
            await User.create({
                name,
                email,
                password,
                role: 'admin',
                is_vip: true
            });
            console.log('✅ Usuário criado com sucesso!');
        }
    } catch (error) {
        console.error('❌ Erro ao criar/atualizar admin:', error);
    } finally {
        process.exit(0);
    }
};

createAdmin();
