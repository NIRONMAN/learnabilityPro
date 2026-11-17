-- Enable Row-Level Security (RLS) on all public tables to protect against unauthorized PostgREST API access
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vector_store ENABLE ROW LEVEL SECURITY;

-- Revoke all table, sequence, and routine privileges from Supabase API roles (anon and authenticated)
-- The application accesses PostgreSQL directly via JDBC using the dedicated backend credentials.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

-- Ensure future tables, sequences, and routines created in schema public do not grant access to anon or authenticated
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;
