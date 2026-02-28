import { Keyboard } from 'grammy';

export const adminMainMenu = new Keyboard()
    .text('🎫 Criar Cupom').text('📋 Pendentes').row()
    .text('🤖 IA ADVANCED').row()
    .text('📅 Posts Agendados').row()
    .resized();
