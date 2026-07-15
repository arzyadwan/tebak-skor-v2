-- Create administrative RPC function to reset/clear predictions for a specific match
CREATE OR REPLACE FUNCTION public.admin_reset_predictions(
    match_id bigint,
    admin_pin text
) RETURNS void AS $$
BEGIN
    IF admin_pin = '1234' THEN -- Matches default PIN code '1234'
        DELETE FROM public.tebak_skor_v2_predictions
        WHERE tebak_skor_v2_predictions.match_id = admin_reset_predictions.match_id;
    ELSE
        RAISE EXCEPTION 'PIN Admin Salah!';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
