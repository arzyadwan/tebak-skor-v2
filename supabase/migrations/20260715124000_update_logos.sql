-- Update match logos to official API-Sports URLs for England vs Argentina match
UPDATE public.tebak_skor_v2_matches
SET team_a_logo = 'https://media.api-sports.io/football/teams/10.png',
    team_b_logo = 'https://media.api-sports.io/football/teams/26.png'
WHERE id = 1;
