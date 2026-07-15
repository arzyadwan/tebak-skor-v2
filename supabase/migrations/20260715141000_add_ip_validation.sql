-- Add ip_address column to predictions table
ALTER TABLE public.tebak_skor_v2_predictions 
ADD COLUMN ip_address text;

-- Add unique constraint on (match_id, ip_address) to prevent duplicate submissions from the same IP
ALTER TABLE public.tebak_skor_v2_predictions 
ADD CONSTRAINT unique_match_ip UNIQUE (match_id, ip_address);
