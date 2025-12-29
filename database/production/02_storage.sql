-- =====================================================
-- CONFIGURAÇÃO DE BUCKETS (STORAGE) DO SUPABASE
-- Execute este script E ative o Storage no painel do Supabase
-- =====================================================

-- 1. Criar buckets
-- OBS: A criação de buckets geralmente é feita via Dashboard ou API, mas alguns setups aceitam via SQL.
-- O mais importante aqui são as POLÍCIAS DE ACESSO (RLS) para os objetos.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('temp', 'temp', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Segurança (Row Level Security) para Storage

-- Permitir acesso público de leitura para 'products'
CREATE POLICY "Public Access Products" ON storage.objects FOR SELECT USING (bucket_id = 'products');

-- Permitir upload apenas para usuários autenticados (ou admin) em 'products'
CREATE POLICY "Authenticated Upload Products" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'products' 
    AND auth.role() = 'authenticated'
);

-- Permitir update/delete apenas para admin em 'products'
-- (Assumindo que admin tem role verificado na app, mas no storage policies é via auth.uid)
CREATE POLICY "Admin Manage Products" ON storage.objects FOR ALL USING (
    bucket_id = 'products' 
    AND auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
);

SELECT 'Buckets e Políticas de Storage configurados!' as status;
