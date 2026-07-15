-- Drop the old table if exists
DROP TABLE IF EXISTS public.images;

-- Create images metadata table supporting groups
CREATE TABLE public.images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  content_type TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Insert storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('ephemeral-images', 'ephemeral-images', false)
ON CONFLICT (id) DO NOTHING;
