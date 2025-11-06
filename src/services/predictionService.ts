import { supabase, Team } from '../lib/supabase';
import {
  calculatePoissonProbabilities,
  calculateExpectedLambda,
  calculateOver25Probability,
  monteCarloSimulation,
  type PoissonProbabilities,
  type MonteCarloResult
} from '../utils/mathUtils';

export interface PredictionResult {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  expectedHomeScore: number;
  expectedAwayScore: number;
  over25Prob: number;
  monteCarloResult: MonteCarloResult;
  poissonResult: PoissonProbabilities;
  homeTeam: Team;
  awayTeam: Team;
}

export async function predictMatch(
  homeTeamId: string,
  awayTeamId: string
): Promise<PredictionResult> {
  const { data: homeTeam, error: homeError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', homeTeamId)
    .maybeSingle();

  const { data: awayTeam, error: awayError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', awayTeamId)
    .maybeSingle();

  if (homeError || awayError || !homeTeam || !awayTeam) {
    throw new Error('Teams not found');
  }

  const lambdaHome = calculateExpectedLambda(
    homeTeam.avg_goals_scored,
    awayTeam.avg_goals_conceded,
    homeTeam.xg_per_match,
    homeTeam.elo_rating,
    awayTeam.elo_rating,
    true
  );

  const lambdaAway = calculateExpectedLambda(
    awayTeam.avg_goals_scored,
    homeTeam.avg_goals_conceded,
    awayTeam.xg_per_match,
    awayTeam.elo_rating,
    homeTeam.elo_rating,
    false
  );

  const poissonResult = calculatePoissonProbabilities(lambdaHome, lambdaAway);
  const monteCarloResult = monteCarloSimulation(lambdaHome, lambdaAway, 10000);
  const over25Prob = calculateOver25Probability(lambdaHome, lambdaAway);

  const homeWinProb = (poissonResult.homeWin + monteCarloResult.homeWinProb) / 2;
  const drawProb = (poissonResult.draw + monteCarloResult.drawProb) / 2;
  const awayWinProb = (poissonResult.awayWin + monteCarloResult.awayWinProb) / 2;

  const total = homeWinProb + drawProb + awayWinProb;

  return {
    homeWinProb: homeWinProb / total,
    drawProb: drawProb / total,
    awayWinProb: awayWinProb / total,
    expectedHomeScore: lambdaHome,
    expectedAwayScore: lambdaAway,
    over25Prob,
    monteCarloResult,
    poissonResult,
    homeTeam,
    awayTeam
  };
}

export async function savePrediction(
  matchId: string,
  userId: string | null,
  prediction: {
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
    expectedHomeScore: number;
    expectedAwayScore: number;
    over25Prob: number;
  }
) {
  const { data, error } = await supabase
    .from('predictions')
    .insert({
      match_id: matchId,
      user_id: userId,
      home_win_prob: prediction.homeWinProb,
      draw_prob: prediction.drawProb,
      away_win_prob: prediction.awayWinProb,
      expected_home_score: prediction.expectedHomeScore,
      expected_away_score: prediction.expectedAwayScore,
      over_2_5_prob: prediction.over25Prob
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTeamsByLeague(league: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('league', league)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getAllTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('league, name');

  if (error) throw error;
  return data || [];
}
