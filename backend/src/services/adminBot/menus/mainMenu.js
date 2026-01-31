import { Keyboard } from 'grammy';

export const adminMainMenu = new Keyboard()
    .text('🎫 Criar Cupom').text('📋 Pendentes').row()
    .resized();
