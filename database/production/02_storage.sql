-- =====================================================
-- CONFIGURAÇÃO DE BUCKETS (STORAGE) DO SUPABASE
-- Execute este script após o schema principal
-- Data: 2025-12-29
-- =====================================================

-- =====================================================
-- 1. CRIAR BUCKETS
-- =====================================================

-- Bucket para imagens de produtos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'products', 
  'products', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- Bucket temporário para uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'temp', 
  'temp', 
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- Bucket para avatares de usuários
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'avatars', 
  'avatars', 
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152;

-- =====================================================
-- 2. POLÍTICAS DE SEGURANÇA PARA 'products'
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Public Access Products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Products" ON storage.objects;
DROP POLICY IF EXISTS "Admin Manage Products" ON storage.objects;
DROP POLICY IF EXISTS "Service Role Full Access Products" ON storage.objects;

-- Acesso público de leitura
CREATE POLICY "Public Access Products" ON storage.objects 
FOR SELECT USING (bucket_id = 'products');

-- Upload para usuários autenticados
CREATE POLICY "Authenticated Upload Products" ON storage.objects 
FOR INSERT WITH CHECK (
    bucket_id = 'products' 
    AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- Update/Delete para admin ou service_role
CREATE POLICY "Admin Manage Products" ON storage.objects 
FOR ALL USING (
    bucket_id = 'products' 
    AND (
      auth.role() = 'service_role'
      OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
    )
);

-- =====================================================
-- 3. POLÍTICAS DE SEGURANÇA PARA 'temp'
-- =====================================================

DROP POLICY IF EXISTS "Public Access Temp" ON storage.objects;
DROP POLICY IF EXISTS "Anyone Upload Temp" ON storage.objects;

-- Acesso público
CREATE POLICY "Public Access Temp" ON storage.objects 
FOR SELECT USING (bucket_id = 'temp');

-- Qualquer um pode fazer upload
CREATE POLICY "Anyone Upload Temp" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'temp');

-- Qualquer um pode deletar do temp
CREATE POLICY "Anyone Delete Temp" ON storage.objects 
FOR DELETE USING (bucket_id = 'temp');

-- =====================================================
-- 4. POLÍTICAS DE SEGURANÇA PARA 'avatars'
-- =====================================================

DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
DROP POLICY IF EXISTS "User Upload Own Avatar" ON storage.objects;
DROP POLICY IF EXISTS "User Delete Own Avatar" ON storage.objects;

-- Acesso público de leitura
CREATE POLICY "Public Access Avatars" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

 -- Usuário pode fazer upload do próprio avatar
 CREATE POLICY "User Upload Own Avatar" ON storage.objects 
 FOR INSERT WITH CHECK (
     bucket_id = 'avatars' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = auth.uid()::text
 );

 -- Usuário pode deletar o próprio avatar
 CREATE POLICY "User Delete Own Avatar" ON storage.objects 
 FOR DELETE USING (
     bucket_id = 'avatars' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = auth.uid()::text
 );

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================
SELECT 'Buckets e Políticas de Storage configurados!' as status;

-- =====================================================
-- RESUMO DOS BUCKETS
-- =====================================================
-- products: Imagens de produtos (5MB max, público)
-- temp: Upload temporário (10MB max, público)
-- avatars: Avatares de usuários (2MB max, público)
