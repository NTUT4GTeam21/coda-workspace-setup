ALTER TABLE public.word_cards
 ADD COLUMN sgsl_url text,
 ADD COLUMN sgsl_checked_at timestamptz,
 ADD COLUMN sgsl_manual boolean NOT NULL DEFAULT false,
 ADD COLUMN sgsl_candidates text[] NOT NULL DEFAULT '{}';