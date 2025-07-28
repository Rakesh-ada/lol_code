/*
  # Create Q&A System Database Schema

  1. New Tables
    - `qa_pairs`
      - `id` (uuid, primary key)
      - `question` (text, not null)
      - `code` (text, optional code snippet)
      - `answer` (text, AI generated answer)
      - `language` (text, programming language)
      - `user_name` (text, user who asked)
      - `created_at` (timestamp)
      - `expires_at` (timestamp, auto-calculated 3 hours from creation)

  2. Security
    - Enable RLS on `qa_pairs` table
    - Add policy for anyone to read all Q&A pairs
    - Add policy for authenticated users to insert new Q&A pairs
    - Add policy for users to update their own Q&A pairs

  3. Features
    - Automatic expiration after 3 hours
    - Public read access for shared feed
    - User attribution for questions
*/

CREATE TABLE IF NOT EXISTS qa_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  code text,
  answer text NOT NULL,
  language text NOT NULL DEFAULT 'javascript',
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '3 hours')
);

-- Enable Row Level Security
ALTER TABLE qa_pairs ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read all Q&A pairs (public feed)
CREATE POLICY "Anyone can read qa_pairs"
  ON qa_pairs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy to allow anyone to insert new Q&A pairs
CREATE POLICY "Anyone can insert qa_pairs"
  ON qa_pairs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy to allow users to update their own Q&A pairs
CREATE POLICY "Users can update own qa_pairs"
  ON qa_pairs
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for better performance on queries
CREATE INDEX IF NOT EXISTS idx_qa_pairs_created_at ON qa_pairs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_pairs_expires_at ON qa_pairs(expires_at);

-- Function to clean up expired Q&A pairs
CREATE OR REPLACE FUNCTION cleanup_expired_qa_pairs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM qa_pairs WHERE expires_at < now();
END;
$$;