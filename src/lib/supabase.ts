import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Team {
  id: string;
  name: string;
  league: string;
  elo_rating: number;
  avg_goals_scored: number;
  avg_goals_conceded: number;
  xg_per_match: number;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  league: string;
  home_score: number | null;
  away_score: number | null;
  created_at: string;
}

export interface Prediction {
  id: string;
  user_id: string | null;
  match_id: string;
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
  expected_home_score: number;
  expected_away_score: number;
  over_2_5_prob: number;
  brier_score: number | null;
  created_at: string;
}

export interface TeamStats {
  id: string;
  team_id: string;
  date: string;
  shots: number;
  shots_on_target: number;
  possession: number;
  xg: number;
  form_points: number;
  created_at: string;
}
