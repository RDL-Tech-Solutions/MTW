-- Table: public.user_coupon_views
-- Description: Records when a user views a coupon to notify them later if it runs out of stock.

CREATE TABLE IF NOT EXISTS public.user_coupon_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- references auth.users(id) conceptually
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, coupon_id)
);

-- Index for fast querying when a coupon goes out of stock
CREATE INDEX IF NOT EXISTS idx_user_coupon_views_coupon_id ON public.user_coupon_views(coupon_id);
CREATE INDEX IF NOT EXISTS idx_user_coupon_views_user_id ON public.user_coupon_views(user_id);

-- Enable RLS
ALTER TABLE public.user_coupon_views ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can only see their own views" 
ON public.user_coupon_views 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own views" 
ON public.user_coupon_views 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all coupon views" 
ON public.user_coupon_views 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
);
