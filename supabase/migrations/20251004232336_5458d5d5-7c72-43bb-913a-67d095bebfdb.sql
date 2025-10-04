-- Add signature and stamp URL columns to employees table
ALTER TABLE public.employees
ADD COLUMN signature_url TEXT,
ADD COLUMN stamp_url TEXT;