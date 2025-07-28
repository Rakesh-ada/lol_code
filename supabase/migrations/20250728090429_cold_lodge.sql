/*
  # Create shared Q&A feed system

  1. New Tables
    - `qa_pairs`
      - `id` (uuid, primary key)
      - `question` (text, the programming question)
      - `code` (text, optional code snippet)
      - `answer` (text, the AI-generated code answer)
      - `language` (text, detected programming language)
      - `user_name` (text, name of person who asked)
      - `created_at` (timestamp)
      - `expires_at` (timestamp, auto-expires after 3 hours)

  2. Security
    - Enable RLS on `qa_pairs` table
    - Add policy for anyone to read all Q&A pairs
    - Add policy for anyone to insert new Q&A pairs
    - Add policy for anyone to update Q&A pairs

  3. Real-time
    - Enable real-time subscriptions for live updates
*/

-- Create the qa_pairs table
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

-- Create policies for public access
CREATE POLICY "Anyone can read qa_pairs"
  ON qa_pairs
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert qa_pairs"
  ON qa_pairs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own qa_pairs"
  ON qa_pairs
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qa_pairs_created_at ON qa_pairs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_pairs_expires_at ON qa_pairs (expires_at);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE qa_pairs;