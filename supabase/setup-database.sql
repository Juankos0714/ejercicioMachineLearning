-- ============================================================================
-- Football Prediction Database - Complete Setup Script
-- ============================================================================
-- This script creates all required tables, RLS policies, and seed data.
-- Run this in your Supabase SQL Editor to set up the database.
-- ============================================================================

-- Drop existing tables if they exist (use with caution in production)
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS team_stats CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- Teams table
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  league text NOT NULL,
  elo_rating numeric DEFAULT 1500,
  avg_goals_scored numeric DEFAULT 1.5,
  avg_goals_conceded numeric DEFAULT 1.5,
  xg_per_match numeric DEFAULT 1.5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Matches table
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id uuid REFERENCES teams(id) NOT NULL,
  away_team_id uuid REFERENCES teams(id) NOT NULL,
  match_date timestamptz NOT NULL,
  league text NOT NULL,
  home_score integer,
  away_score integer,
  created_at timestamptz DEFAULT now()
);

-- Predictions table
CREATE TABLE predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  match_id uuid REFERENCES matches(id) NOT NULL,
  home_win_prob numeric NOT NULL,
  draw_prob numeric NOT NULL,
  away_win_prob numeric NOT NULL,
  expected_home_score numeric NOT NULL,
  expected_away_score numeric NOT NULL,
  over_2_5_prob numeric NOT NULL,
  brier_score numeric,
  created_at timestamptz DEFAULT now()
);

-- Team stats table
CREATE TABLE team_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) NOT NULL,
  date date NOT NULL,
  shots integer DEFAULT 0,
  shots_on_target integer DEFAULT 0,
  possession numeric DEFAULT 50,
  xg numeric DEFAULT 0,
  form_points integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_team ON team_stats(team_id, date DESC);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Teams: Public read access (allow anonymous and authenticated users)
CREATE POLICY "Anyone can view teams"
  ON teams FOR SELECT
  TO anon, authenticated
  USING (true);

-- Matches: Public read access (allow anonymous and authenticated users)
CREATE POLICY "Anyone can view matches"
  ON matches FOR SELECT
  TO anon, authenticated
  USING (true);

-- Predictions: Allow anonymous and authenticated users to view all predictions
CREATE POLICY "Users can view all predictions"
  ON predictions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Predictions: Allow anonymous users to create predictions (user_id can be null)
CREATE POLICY "Anyone can create predictions"
  ON predictions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Team Stats: Allow anonymous and authenticated users to view
CREATE POLICY "Anyone can view team stats"
  ON team_stats FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- 5. SEED DATA - TEAMS (Updated for 2025-26 Season - as of Nov 2025)
-- ============================================================================

-- Premier League Teams (Arsenal leading, Man City 2nd after GW11)
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Manchester City', 'Premier League', 2080, 2.2, 0.9, 2.4),
('Arsenal', 'Premier League', 2100, 2.1, 0.8, 2.3),
('Liverpool', 'Premier League', 1980, 1.7, 1.2, 1.9),
('Manchester United', 'Premier League', 1900, 1.6, 1.3, 1.7),
('Chelsea', 'Premier League', 2020, 2.0, 1.0, 2.1),
('Tottenham', 'Premier League', 1950, 1.8, 1.2, 1.9),
('Newcastle', 'Premier League', 1920, 1.8, 1.1, 1.9),
('Brighton', 'Premier League', 1880, 1.7, 1.2, 1.8),
('Aston Villa', 'Premier League', 1900, 1.8, 1.2, 1.9),
('West Ham', 'Premier League', 1840, 1.5, 1.3, 1.6);

-- La Liga Teams (Barcelona defending champions, 2.5 goals/game)
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Real Madrid', 'La Liga', 2100, 2.2, 1.0, 2.4),
('Barcelona', 'La Liga', 2120, 2.5, 0.9, 2.7),
('Atletico Madrid', 'La Liga', 2000, 2.0, 0.8, 2.0),
('Real Sociedad', 'La Liga', 1880, 1.8, 1.2, 1.9),
('Real Betis', 'La Liga', 1840, 1.6, 1.3, 1.7),
('Villarreal', 'La Liga', 1860, 1.7, 1.2, 1.8);

-- Serie A Teams (Napoli defending champions and league leaders, Inter 2nd)
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Inter Milan', 'Serie A', 2090, 2.4, 0.8, 2.6),
('AC Milan', 'Serie A', 1980, 1.9, 1.1, 2.1),
('Juventus', 'Serie A', 2020, 2.0, 0.9, 2.2),
('Napoli', 'Serie A', 2100, 1.8, 0.7, 2.0),
('Roma', 'Serie A', 1920, 1.7, 1.2, 1.9),
('Lazio', 'Serie A', 1900, 1.8, 1.2, 2.0);

-- Bundesliga Teams (Bayern dominant with 28/30 points, 3.44 goals/game avg)
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Bayern Munich', 'Bundesliga', 2180, 3.4, 0.7, 3.6),
('Borussia Dortmund', 'Bundesliga', 2000, 2.4, 1.1, 2.6),
('RB Leipzig', 'Bundesliga', 2050, 2.5, 0.9, 2.7),
('Bayer Leverkusen', 'Bundesliga', 1980, 2.0, 1.2, 2.2),
('Union Berlin', 'Bundesliga', 1880, 1.8, 1.1, 1.9),
('Eintracht Frankfurt', 'Bundesliga', 1860, 1.9, 1.3, 2.0);

-- Ligue 1 Teams (PSG leading with 8W-3D-1L, 2.0 goals/game)
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('PSG', 'Ligue 1', 2100, 2.0, 0.8, 2.1),
('Marseille', 'Ligue 1', 1920, 1.8, 1.1, 1.9),
('Monaco', 'Ligue 1', 1900, 1.9, 1.2, 2.0),
('Lyon', 'Ligue 1', 1880, 1.7, 1.2, 1.8),
('Lille', 'Ligue 1', 1860, 1.7, 1.1, 1.8),
('Lens', 'Ligue 1', 1840, 1.8, 1.3, 1.9);

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- You should now have:
-- ✅ All tables created (teams, matches, predictions, team_stats)
-- ✅ Indexes for performance
-- ✅ RLS policies for security
-- ✅ Sample teams from 5 major leagues
--
-- Next steps:
-- 1. Verify tables exist in the Supabase dashboard
-- 2. Test the application - you should now be able to select teams
-- 3. Start making predictions!
-- ============================================================================
