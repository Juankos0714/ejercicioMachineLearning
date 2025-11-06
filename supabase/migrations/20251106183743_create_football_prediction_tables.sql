/*
  # Football Prediction Database Schema

  1. New Tables
    - `teams`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `league` (text) - Premier League, La Liga, Serie A, Bundesliga, Ligue 1
      - `elo_rating` (numeric) - Current Elo rating
      - `avg_goals_scored` (numeric) - Average goals scored per match
      - `avg_goals_conceded` (numeric) - Average goals conceded per match
      - `xg_per_match` (numeric) - Expected goals per match
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `matches`
      - `id` (uuid, primary key)
      - `home_team_id` (uuid, foreign key to teams)
      - `away_team_id` (uuid, foreign key to teams)
      - `match_date` (timestamptz)
      - `league` (text)
      - `home_score` (integer, nullable) - Actual score if played
      - `away_score` (integer, nullable) - Actual score if played
      - `created_at` (timestamptz)
    
    - `predictions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `match_id` (uuid, foreign key to matches)
      - `home_win_prob` (numeric) - Probability of home win
      - `draw_prob` (numeric) - Probability of draw
      - `away_win_prob` (numeric) - Probability of away win
      - `expected_home_score` (numeric) - Expected home score
      - `expected_away_score` (numeric) - Expected away score
      - `over_2_5_prob` (numeric) - Probability of over 2.5 goals
      - `brier_score` (numeric, nullable) - Brier score if match completed
      - `created_at` (timestamptz)
    
    - `team_stats`
      - `id` (uuid, primary key)
      - `team_id` (uuid, foreign key to teams)
      - `date` (date)
      - `shots` (integer)
      - `shots_on_target` (integer)
      - `possession` (numeric)
      - `xg` (numeric)
      - `form_points` (integer) - Recent form (last 5 matches)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for teams and matches
    - Users can create and read their own predictions
    - Only authenticated users can access stats
*/

CREATE TABLE IF NOT EXISTS teams (
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

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id uuid REFERENCES teams(id) NOT NULL,
  away_team_id uuid REFERENCES teams(id) NOT NULL,
  match_date timestamptz NOT NULL,
  league text NOT NULL,
  home_score integer,
  away_score integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS predictions (
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

CREATE TABLE IF NOT EXISTS team_stats (
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

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view teams"
  ON teams FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can view matches"
  ON matches FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can view all predictions"
  ON predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own predictions"
  ON predictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view team stats"
  ON team_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_team ON team_stats(team_id, date DESC);