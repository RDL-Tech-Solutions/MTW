import supabase from '../config/database.js';
import logger from '../config/logger.js';

class AppCard {
    // Criar novo card
    static async create(cardData) {
        const { data, error } = await supabase
            .from('app_cards')
            .insert([cardData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Buscar todos os cards (admin)
    static async findAll() {
        const { data, error } = await supabase
            .from('app_cards')
            .select('*')
            .order('position', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    // Buscar apenas cards ativos (público/app)
    static async findActive() {
        const { data, error } = await supabase
            .from('app_cards')
            .select('*')
            .eq('is_active', true)
            .order('position', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    // Buscar por ID
    static async findById(id) {
        const { data, error } = await supabase
            .from('app_cards')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    // Atualizar card
    static async update(id, updates) {
        const { data, error } = await supabase
            .from('app_cards')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Deletar card
    static async delete(id) {
        const { error } = await supabase
            .from('app_cards')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    // Toggle ativo/inativo
    static async toggleActive(id) {
        const card = await this.findById(id);
        if (!card) throw new Error('Card não encontrado');

        return await this.update(id, { is_active: !card.is_active });
    }

    // Reordenar cards
    static async reorder(orderedIds) {
        const updates = orderedIds.map((id, index) => ({
            id,
            position: index,
        }));

        for (const { id, position } of updates) {
            const { error } = await supabase
                .from('app_cards')
                .update({ position })
                .eq('id', id);

            if (error) {
                logger.error(`Erro ao reordenar card ${id}: ${error.message}`);
                throw error;
            }
        }

        return await this.findAll();
    }
}

export default AppCard;
