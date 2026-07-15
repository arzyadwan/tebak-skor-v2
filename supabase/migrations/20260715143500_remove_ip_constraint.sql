-- Remove unique constraint unique_match_ip to allow multiple users on the same Wi-Fi (same IP)
ALTER TABLE public.tebak_skor_v2_predictions 
DROP CONSTRAINT IF EXISTS unique_match_ip;
