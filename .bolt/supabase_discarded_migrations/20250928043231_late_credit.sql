/*
  # Create Events and User Profiles Tables

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `duration` (integer, minutes)
      - `difficulty` (text, enum-like)
      - `seats_available` (integer)
      - `total_seats` (integer)
      - `status` (text, enum-like)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `user_profiles`
      - `id` (uuid, references auth.users)
      - `username` (text, unique)
      - `full_name` (text)
      - `phone` (text)
      - `age` (integer)
      - `is_admin` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `event_registrations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `event_id` (uuid, references events)
      - `seats_requested` (integer)
      - `registration_date` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read events
    - Add policies for users to manage their own profiles and registrations
    - Add policies for admins to manage events
*/

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration integer NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  seats_available integer NOT NULL DEFAULT 0,
  total_seats integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'fully-booked', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  age integer NOT NULL CHECK (age >= 13 AND age <= 120),
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event_registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  seats_requested integer NOT NULL CHECK (seats_requested >= 1 AND seats_requested <= 4),
  registration_date timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Events policies (readable by everyone, manageable by admins)
CREATE POLICY "Events are viewable by everyone"
  ON events
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can insert events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- User profiles policies
CREATE POLICY "Users can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Event registrations policies
CREATE POLICY "Users can view all registrations"
  ON event_registrations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own registrations"
  ON event_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations"
  ON event_registrations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own registrations"
  ON event_registrations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS events_start_time_idx ON events(start_time);
CREATE INDEX IF NOT EXISTS events_status_idx ON events(status);
CREATE INDEX IF NOT EXISTS user_profiles_username_idx ON user_profiles(username);
CREATE INDEX IF NOT EXISTS event_registrations_user_id_idx ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS event_registrations_event_id_idx ON event_registrations(event_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample events
INSERT INTO events (title, description, start_time, end_time, duration, difficulty, seats_available, total_seats, status) VALUES
('Web Development Workshop', 'Learn modern web development with React, TypeScript, and Tailwind CSS. Perfect for beginners looking to start their journey.', '2025-02-15 09:00:00+00', '2025-02-15 12:00:00+00', 180, 'Beginner', 20, 25, 'available'),
('Advanced JavaScript Patterns', 'Deep dive into advanced JavaScript concepts including closures, prototypes, and async patterns.', '2025-02-20 14:00:00+00', '2025-02-20 18:00:00+00', 240, 'Advanced', 12, 15, 'available'),
('UI/UX Design Fundamentals', 'Master the principles of user interface and user experience design with hands-on projects.', '2025-02-25 10:00:00+00', '2025-02-25 12:30:00+00', 150, 'Intermediate', 18, 20, 'available'),
('Database Design Workshop', 'Learn how to design efficient and scalable database schemas with real-world examples.', '2025-03-05 13:00:00+00', '2025-03-05 16:20:00+00', 200, 'Intermediate', 15, 18, 'available'),
('Introduction to Machine Learning', 'Get started with machine learning concepts and practical implementations using Python.', '2025-03-10 09:30:00+00', '2025-03-10 13:10:00+00', 220, 'Beginner', 25, 30, 'available'),
('DevOps and Cloud Computing', 'Explore modern DevOps practices and cloud deployment strategies for scalable applications.', '2025-03-15 14:00:00+00', '2025-03-15 19:00:00+00', 300, 'Advanced', 10, 12, 'available');

-- Create default admin user profile (will be linked when admin signs up)
-- Note: This will be created when the admin user signs up through the app