-- CREATE TABLES FOR TEBAK SKOR V2

-- 1. Matches Table
CREATE TABLE IF NOT EXISTS public.tebak_skor_v2_matches (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_a_name text NOT NULL,
    team_b_name text NOT NULL,
    team_a_logo text, -- Can be emoji flag or image URL
    team_b_logo text, -- Can be emoji flag or image URL
    kickoff_time timestamp with time zone NOT NULL,
    status text NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'LIVE', 'FINISHED'
    score_a integer NOT NULL DEFAULT 0,
    score_b integer NOT NULL DEFAULT 0,
    api_fixture_id bigint, -- Optional API-Sports fixture ID
    elapsed_time integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Predictions Table
CREATE TABLE IF NOT EXISTS public.tebak_skor_v2_predictions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id bigint REFERENCES public.tebak_skor_v2_matches(id) ON DELETE CASCADE NOT NULL,
    participant_name text NOT NULL,
    guess_a integer NOT NULL,
    guess_b integer NOT NULL,
    device_id text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Prevent duplicate participant name for the same match
    CONSTRAINT unique_match_participant UNIQUE (match_id, participant_name)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tebak_skor_v2_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tebak_skor_v2_predictions ENABLE ROW LEVEL SECURITY;

-- DROP Policies if they exist
DROP POLICY IF EXISTS "Allow public select matches" ON public.tebak_skor_v2_matches;
DROP POLICY IF EXISTS "Allow public select predictions" ON public.tebak_skor_v2_predictions;
DROP POLICY IF EXISTS "Allow public insert predictions" ON public.tebak_skor_v2_predictions;

-- PUBLIC READ ACCESS (Allow everyone to view matches and predictions)
CREATE POLICY "Allow public select matches" ON public.tebak_skor_v2_matches
    FOR SELECT USING (true);

CREATE POLICY "Allow public select predictions" ON public.tebak_skor_v2_predictions
    FOR SELECT USING (true);

-- PUBLIC WRITE ACCESS FOR PREDICTIONS
-- (Anyone can submit a prediction, validation is handled in DB constraints and JS)
CREATE POLICY "Allow public insert predictions" ON public.tebak_skor_v2_predictions
    FOR INSERT WITH CHECK (
        -- Can only submit if the match is still PENDING
        EXISTS (
            SELECT 1 FROM public.tebak_skor_v2_matches
            WHERE id = match_id AND status = 'PENDING' AND kickoff_time > now()
        )
    );

-- SECURED RPC FUNCTIONS FOR ADMIN ACTIONS
-- (Using a simple PIN code verified on the server side)

-- 1. Function to insert a new match
CREATE OR REPLACE FUNCTION public.admin_create_match(
    team_a text,
    team_b text,
    logo_a text,
    logo_b text,
    kickoff timestamp with time zone,
    api_id bigint,
    admin_pin text
) RETURNS bigint AS $$
DECLARE
    new_match_id bigint;
BEGIN
    IF admin_pin = '1234' THEN -- Set default PIN to '1234'
        INSERT INTO public.tebak_skor_v2_matches (team_a_name, team_b_name, team_a_logo, team_b_logo, kickoff_time, api_fixture_id)
        VALUES (team_a, team_b, logo_a, logo_b, kickoff, api_id)
        RETURNING id INTO new_match_id;
        
        RETURN new_match_id;
    ELSE
        RAISE EXCEPTION 'PIN Admin Salah!';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to update match details (scores, status, elapsed time)
CREATE OR REPLACE FUNCTION public.admin_update_match(
    match_id bigint,
    val_score_a integer,
    val_score_b integer,
    val_status text,
    val_elapsed integer,
    admin_pin text
) RETURNS void AS $$
BEGIN
    IF admin_pin = '1234' THEN
        UPDATE public.tebak_skor_v2_matches
        SET score_a = val_score_a,
            score_b = val_score_b,
            status = val_status,
            elapsed_time = val_elapsed,
            updated_at = now()
        WHERE id = match_id;
    ELSE
        RAISE EXCEPTION 'PIN Admin Salah!';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to delete a match
CREATE OR REPLACE FUNCTION public.admin_delete_match(
    match_id bigint,
    admin_pin text
) RETURNS void AS $$
BEGIN
    IF admin_pin = '1234' THEN
        DELETE FROM public.tebak_skor_v2_matches
        WHERE id = match_id;
    ELSE
        RAISE EXCEPTION 'PIN Admin Salah!';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to delete a single prediction (admin moderation)
CREATE OR REPLACE FUNCTION public.admin_delete_prediction(
    prediction_id bigint,
    admin_pin text
) RETURNS void AS $$
BEGIN
    IF admin_pin = '1234' THEN
        DELETE FROM public.tebak_skor_v2_predictions
        WHERE id = prediction_id;
    ELSE
        RAISE EXCEPTION 'PIN Admin Salah!';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
