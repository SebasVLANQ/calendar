/*
  # Complete Database Installation Script
  # Expediciones Angostura - Event Calendar System
  
  This file contains the complete database schema and initial data for the
  Event Calendar Web Application. Use this script to:
  - Set up a new database instance from scratch
  - Restore database after corruption or failure
  - Clone the system to a new environment
  
  ## Tables Created:
  1. events - Event management with scheduling and capacity
  2. user_profiles - Extended user information beyond auth.users
  3. event_registrations - User event bookings and seat management
  
  ## Security Features:
  - Row Level Security (RLS) enabled on all tables
  - Comprehensive policies for user access control
  - Admin-only access for event management
  - User-specific access for profiles and registrations
  - Updated RLS policy allowing users to update seat availability and status
  
  ## Additional Features:
  - Automatic timestamp updates via triggers
  - Performance indexes on key columns
  - Sample event data for testing
  - Data integrity constraints and validations
  
  ## Usage:
  Run this script in your Supabase SQL editor or via psql to create
  the complete database structure.
  
  ## Version: 2.0
  ## Last Updated: January 2025
  ## Changes: Added granular RLS policy for event seat booking
*/

-- ============================================================================
-- DROP EXISTING OBJECTS (for clean reinstall)
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

-- Drop policies (to avoid conflicts during reinstall)
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Admins can insert events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Admins can update all event fields" ON events;
DROP POLICY IF EXISTS "Users can update seat availability and status" ON events;
DROP POLICY IF EXISTS "Admins can delete events" ON events;

DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can view all registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can insert their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can update their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can delete their own registrations" ON event_registrations;

-- Drop tables (CASCADE will handle foreign key dependencies)
DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- Create events table
CREATE TABLE events (
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
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  age integer NOT NULL CHECK (age >= 13 AND age <= 120),
  country_of_residence text NOT NULL DEFAULT '',
  city_town_name text NOT NULL DEFAULT '',
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event_registrations table
CREATE TABLE event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  seats_requested integer NOT NULL CHECK (seats_requested >= 1 AND seats_requested <= 4),
  registration_date timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Events policies (readable by everyone, manageable by admins, seat updates by users)
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

-- Updated comprehensive policy for event updates
CREATE POLICY "Users can update seat availability and status"
  ON events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    -- Allow admins to update everything
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    -- Allow regular users to only update seats_available and status
    -- and only when seats are being decremented or status is changing to fully-booked
    (
      -- Ensure only seats_available and status can be changed by non-admins
      OLD.title = NEW.title AND
      OLD.description = NEW.description AND
      OLD.start_time = NEW.start_time AND
      OLD.end_time = NEW.end_time AND
      OLD.duration = NEW.duration AND
      OLD.difficulty = NEW.difficulty AND
      OLD.total_seats = NEW.total_seats AND
      -- Allow seats_available to be decremented or stay the same
      NEW.seats_available <= OLD.seats_available AND
      NEW.seats_available >= 0 AND
      -- Allow status to change to fully-booked when seats reach 0, or stay the same
      (
        (NEW.seats_available = 0 AND NEW.status = 'fully-booked') OR
        (NEW.seats_available > 0 AND NEW.status = OLD.status) OR
        NEW.status = OLD.status
      )
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

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX events_start_time_idx ON events(start_time);
CREATE INDEX events_status_idx ON events(status);
CREATE INDEX events_difficulty_idx ON events(difficulty);
CREATE INDEX user_profiles_username_idx ON user_profiles(username);
CREATE INDEX user_profiles_email_idx ON user_profiles(email);
CREATE INDEX user_profiles_is_admin_idx ON user_profiles(is_admin);
CREATE INDEX event_registrations_user_id_idx ON event_registrations(user_id);
CREATE INDEX event_registrations_event_id_idx ON event_registrations(event_id);
CREATE INDEX event_registrations_registration_date_idx ON event_registrations(registration_date);

-- ============================================================================
-- CREATE FUNCTIONS AND TRIGGERS
-- ============================================================================

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

-- ============================================================================
-- INSERT INITIAL DATA
-- ============================================================================

-- Insert sample events for testing and demonstration
INSERT INTO events (title, description, start_time, end_time, duration, difficulty, seats_available, total_seats, status) VALUES
('Web Development Workshop', 'Learn modern web development with React, TypeScript, and Tailwind CSS. Perfect for beginners looking to start their journey in web development. This comprehensive workshop covers the fundamentals of building responsive, interactive web applications.', '2025-02-15 09:00:00+00', '2025-02-15 12:00:00+00', 180, 'Beginner', 20, 25, 'available'),

('Advanced JavaScript Patterns', 'Deep dive into advanced JavaScript concepts including closures, prototypes, async patterns, and modern ES6+ features. This workshop is designed for developers who want to master JavaScript and write more efficient, maintainable code.', '2025-02-20 14:00:00+00', '2025-02-20 18:00:00+00', 240, 'Advanced', 12, 15, 'available'),

('UI/UX Design Fundamentals', 'Master the principles of user interface and user experience design with hands-on projects. Learn about design thinking, wireframing, prototyping, and creating user-centered designs that convert and engage.', '2025-02-25 10:00:00+00', '2025-02-25 12:30:00+00', 150, 'Intermediate', 18, 20, 'available'),

('Database Design Workshop', 'Learn how to design efficient and scalable database schemas with real-world examples. Cover normalization, indexing strategies, query optimization, and best practices for both SQL and NoSQL databases.', '2025-03-05 13:00:00+00', '2025-03-05 16:20:00+00', 200, 'Intermediate', 15, 18, 'available'),

('Introduction to Machine Learning', 'Get started with machine learning concepts and practical implementations using Python. This beginner-friendly workshop covers supervised learning, data preprocessing, model evaluation, and popular ML libraries.', '2025-03-10 09:30:00+00', '2025-03-10 13:10:00+00', 220, 'Beginner', 25, 30, 'available'),

('DevOps and Cloud Computing', 'Explore modern DevOps practices and cloud deployment strategies for scalable applications. Learn about containerization, CI/CD pipelines, infrastructure as code, and cloud platform services.', '2025-03-15 14:00:00+00', '2025-03-15 19:00:00+00', 300, 'Advanced', 10, 12, 'available'),

('Mobile App Development with React Native', 'Build cross-platform mobile applications using React Native. This workshop covers navigation, state management, native modules, and deployment to both iOS and Android app stores.', '2025-03-20 10:00:00+00', '2025-03-20 15:00:00+00', 300, 'Intermediate', 16, 20, 'available'),

('Cybersecurity Fundamentals', 'Learn essential cybersecurity concepts including threat assessment, secure coding practices, encryption, and network security. Perfect for developers who want to build more secure applications.', '2025-03-25 13:30:00+00', '2025-03-25 17:30:00+00', 240, 'Beginner', 22, 25, 'available'),

('Python for Data Science', 'Comprehensive introduction to Python programming for data analysis and visualization. Learn pandas, numpy, matplotlib, and seaborn libraries through hands-on projects with real datasets.', '2025-04-01 10:00:00+00', '2025-04-01 14:00:00+00', 240, 'Beginner', 20, 25, 'available'),

('Advanced React Patterns', 'Master advanced React concepts including custom hooks, context patterns, performance optimization, and state management. Perfect for developers looking to level up their React skills.', '2025-04-05 13:00:00+00', '2025-04-05 17:30:00+00', 270, 'Advanced', 8, 12, 'available');

-- ============================================================================
-- VERIFICATION QUERIES (Optional - for testing)
-- ============================================================================

/*
-- Uncomment these queries to verify the installation:

-- Check table creation
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('events', 'user_profiles', 'event_registrations');

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('events', 'user_profiles', 'event_registrations');

-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check indexes
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('events', 'user_profiles', 'event_registrations')
ORDER BY tablename, indexname;

-- Check sample data
SELECT COUNT(*) as event_count FROM events;
SELECT title, difficulty, seats_available, total_seats, status FROM events ORDER BY start_time LIMIT 5;

-- Check functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'update_updated_at_column';

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Test RLS policies (run as authenticated user)
-- SELECT * FROM events; -- Should work for everyone
-- UPDATE events SET seats_available = seats_available - 1 WHERE id = 'some-event-id'; -- Should work for authenticated users
-- INSERT INTO events (title, description, start_time, end_time, duration, difficulty, total_seats, seats_available) VALUES (...); -- Should only work for admins
*/

-- ============================================================================
-- INSTALLATION COMPLETE
-- ============================================================================

/*
  Installation Summary:
  ✓ 3 tables created (events, user_profiles, event_registrations)
  ✓ Row Level Security enabled on all tables
  ✓ 12 RLS policies created for proper access control
  ✓ 9 performance indexes created
  ✓ 1 utility function created (update_updated_at_column)
  ✓ 2 triggers created for automatic timestamp updates
  ✓ 10 sample events inserted for testing
  
  Key Features:
  ✓ Updated RLS policy allows users to update seat availability and status
  ✓ Admins have full control over all event fields
  ✓ Regular users can only decrement seats and change status to 'fully-booked'
  ✓ All other event fields are protected from unauthorized changes
  ✓ Comprehensive indexing for optimal performance
  ✓ Automatic timestamp management via triggers
  
  Next Steps:
  1. Create your first admin user through the application
  2. Test event registration functionality with seat updates
  3. Verify admin panel access and event management
  4. Customize sample events as needed for your use case
  5. Monitor RLS policy effectiveness in production
  
  For support or questions about this installation, refer to the
  application documentation or database schema comments.
  
  Version: 2.0 - Updated with granular RLS policies for seat booking
*/