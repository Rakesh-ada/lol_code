/*
  # Create Q&A Pairs Table

  1. New Tables
    - `qa_pairs`
      - `id` (uuid, primary key)
      - `question` (text, required)
      - `code` (text, optional)
      - `answer` (text, required)
      - `language` (text, required)
      - `user_name` (text, required)
      - `created_at` (timestamptz, auto-generated)
      - `expires_at` (timestamptz, auto-generated, 3 hours from creation)

  2. Security
    - Enable RLS on `qa_pairs` table
    - Add policy for anonymous users to read all data
    - Add policy for anonymous users to insert new data
    - Enable real-time subscriptions

  3. Features
    - Automatic expiration after 3 hours
    - Real-time updates for all users
    - Public read/write access for shared Q&A feed
*/

-- Create the qa_pairs table
CREATE TABLE IF NOT EXISTS qa_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  code text,
  answer text NOT NULL,
  language text NOT NULL DEFAULT 'text',
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '3 hours')
);

-- Enable Row Level Security
ALTER TABLE qa_pairs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous users to read all Q&A pairs
CREATE POLICY "Anyone can read qa_pairs"
  ON qa_pairs
  FOR SELECT
  TO anon
  USING (true);

-- Create policy to allow anonymous users to insert Q&A pairs
CREATE POLICY "Anyone can insert qa_pairs"
  ON qa_pairs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Enable real-time subscriptions for the table
ALTER PUBLICATION supabase_realtime ADD TABLE qa_pairs;