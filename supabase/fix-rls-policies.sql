-- ============================================================================
-- Fix RLS Policies for 404 Error
-- ============================================================================
-- This script fixes the RLS policies to allow anonymous (anon) users to
-- access the database tables. Run this if you're getting 404 errors when
-- trying to fetch teams or other data.
-- ============================================================================

-- Drop existing policies that use 'public' role
DROP POLICY IF EXISTS "Anyone can view teams" ON teams;
DROP POLICY IF EXISTS "Anyone can view matches" ON matches;
DROP POLICY IF EXISTS "Users can view all predictions" ON predictions;
DROP POLICY IF EXISTS "Users can create their own predictions" ON predictions;
DROP POLICY IF EXISTS "Anyone can create predictions" ON predictions;
DROP POLICY IF EXISTS "Authenticated users can view team stats" ON team_stats;
DROP POLICY IF EXISTS "Anyone can view team stats" ON team_stats;

-- Recreate policies with correct roles (anon, authenticated)
-- This allows both anonymous users (using anon key) and authenticated users to access data

-- Teams: Public read access
CREATE POLICY "Anyone can view teams"
  ON teams FOR SELECT
  TO anon, authenticated
  USING (true);

-- Matches: Public read access
CREATE POLICY "Anyone can view matches"
  ON matches FOR SELECT
  TO anon, authenticated
  USING (true);

-- Predictions: Public read access
CREATE POLICY "Users can view all predictions"
  ON predictions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Predictions: Allow anyone to create predictions
CREATE POLICY "Anyone can create predictions"
  ON predictions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Team Stats: Public read access
CREATE POLICY "Anyone can view team stats"
  ON team_stats FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these queries to verify the policies are set correctly:
--
-- 1. Check all policies:
-- SELECT schemaname, tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE tablename IN ('teams', 'matches', 'predictions', 'team_stats');
--
-- 2. Check teams table specifically:
-- SELECT policyname, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'teams';
-- ============================================================================
