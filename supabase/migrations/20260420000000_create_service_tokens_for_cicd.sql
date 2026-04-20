ALTER TABLE public.service_tokens 
ADD COLUMN IF NOT EXISTS environment text,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
