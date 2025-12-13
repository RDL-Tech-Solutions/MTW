import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Cliente Supabase para autenticação OAuth
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase não configurado para OAuth. Configure SUPABASE_URL e SUPABASE_ANON_KEY');
}

export const supabaseAuth = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Gerar URL de autenticação OAuth
 */
export async function getOAuthUrl(provider, redirectUrl) {
  if (!supabaseAuth) {
    throw new Error('Supabase não configurado');
  }

  const { data, error } = await supabaseAuth.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
      queryParams: provider === 'google' ? {
        access_type: 'offline',
        prompt: 'consent',
      } : {},
    },
  });

  if (error) throw error;
  return data.url;
}

/**
 * Trocar código de autorização por sessão
 */
export async function exchangeCodeForSession(code) {
  if (!supabaseAuth) {
    throw new Error('Supabase não configurado');
  }

  const { data, error } = await supabaseAuth.auth.exchangeCodeForSession(code);

  if (error) throw error;
  return data;
}

/**
 * Obter URL de callback do Supabase
 */
export function getCallbackUrl() {
  return `${supabaseUrl}/auth/v1/callback`;
}

export default supabaseAuth;

