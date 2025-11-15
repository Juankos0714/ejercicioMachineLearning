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

-- Teams: Public read access
CREATE POLICY "Anyone can view teams"
  ON teams FOR SELECT
  TO public
  USING (true);

-- Matches: Public read access
CREATE POLICY "Anyone can view matches"
  ON matches FOR SELECT
  TO public
  USING (true);

-- Predictions: Authenticated users can view all predictions
CREATE POLICY "Users can view all predictions"
  ON predictions FOR SELECT
  TO authenticated
  USING (true);

-- Predictions: Users can create their own predictions
CREATE POLICY "Users can create their own predictions"
  ON predictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Team Stats: Authenticated users can view
CREATE POLICY "Authenticated users can view team stats"
  ON team_stats FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 5. SEED DATA - TEAMS
-- ============================================================================

-- Premier League Teams
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Manchester City', 'Premier League', 2100, 2.5, 0.8, 2.7),
('Arsenal', 'Premier League', 2050, 2.3, 1.0, 2.4),
('Liverpool', 'Premier League', 2080, 2.4, 0.9, 2.6),
('Manchester United', 'Premier League', 1900, 1.8, 1.3, 1.9),
('Chelsea', 'Premier League', 1920, 1.9, 1.2, 2.0),
('Tottenham', 'Premier League', 1880, 2.0, 1.4, 2.1),
('Newcastle', 'Premier League', 1850, 1.7, 1.2, 1.8),
('Brighton', 'Premier League', 1820, 1.6, 1.3, 1.7),
('Aston Villa', 'Premier League', 1840, 1.7, 1.3, 1.8),
('West Ham', 'Premier League', 1800, 1.5, 1.4, 1.6);

-- La Liga Teams
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Real Madrid', 'La Liga', 2120, 2.6, 0.9, 2.8),
('Barcelona', 'La Liga', 2090, 2.5, 1.0, 2.7),
('Atletico Madrid', 'La Liga', 1950, 1.9, 0.8, 1.8),
('Real Sociedad', 'La Liga', 1850, 1.7, 1.3, 1.8),
('Real Betis', 'La Liga', 1820, 1.6, 1.4, 1.7),
('Villarreal', 'La Liga', 1840, 1.7, 1.3, 1.8);

-- Serie A Teams
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Inter Milan', 'Serie A', 2070, 2.3, 0.9, 2.5),
('AC Milan', 'Serie A', 2000, 2.0, 1.1, 2.2),
('Juventus', 'Serie A', 1980, 1.9, 1.0, 2.0),
('Napoli', 'Serie A', 2040, 2.2, 1.0, 2.4),
('Roma', 'Serie A', 1900, 1.8, 1.2, 1.9),
('Lazio', 'Serie A', 1880, 1.9, 1.3, 2.0);

-- Bundesliga Teams
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Bayern Munich', 'Bundesliga', 2150, 2.8, 0.9, 3.0),
('Borussia Dortmund', 'Bundesliga', 2020, 2.3, 1.2, 2.5),
('RB Leipzig', 'Bundesliga', 1950, 2.0, 1.1, 2.2),
('Bayer Leverkusen', 'Bundesliga', 1920, 2.1, 1.3, 2.3),
('Union Berlin', 'Bundesliga', 1850, 1.7, 1.2, 1.8),
('Eintracht Frankfurt', 'Bundesliga', 1840, 1.8, 1.4, 1.9);

-- Ligue 1 Teams
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('PSG', 'Ligue 1', 2110, 2.7, 0.9, 2.9),
('Marseille', 'Ligue 1', 1900, 1.9, 1.2, 2.0),
('Monaco', 'Ligue 1', 1880, 1.8, 1.3, 1.9),
('Lyon', 'Ligue 1', 1860, 1.7, 1.3, 1.8),
('Lille', 'Ligue 1', 1840, 1.6, 1.2, 1.7),
('Lens', 'Ligue 1', 1820, 1.7, 1.4, 1.8);

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
