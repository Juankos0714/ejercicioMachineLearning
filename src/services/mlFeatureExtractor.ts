import { Team, Match } from '../lib/supabase';

export interface MatchFeatures {
  // Home team features
  homeElo: number;
  homeAvgGoalsScored: number;
  homeAvgGoalsConceded: number;
  homeXG: number;

  // Away team features
  awayElo: number;
  awayAvgGoalsScored: number;
  awayAvgGoalsConceded: number;
  awayXG: number;

  // Derived features
  eloDifference: number;
  homeAttackVsAwayDefense: number;
  awayAttackVsHomeDefense: number;
  totalExpectedGoals: number;
  eloRatio: number;
  homeAdvantage: number;

  // League encoding
  leaguePremier: number;
  leagueLaLiga: number;
  leagueSerieA: number;
  leagueBundesliga: number;
  leagueLigue1: number;
}

export interface MatchTarget {
  homeWin: number;  // 1 if home won, 0 otherwise
  draw: number;     // 1 if draw, 0 otherwise
  awayWin: number;  // 1 if away won, 0 otherwise
  homeGoals: number;
  awayGoals: number;
  totalGoals: number;
  over25: number;   // 1 if over 2.5 goals, 0 otherwise
}

export interface TrainingData {
  features: MatchFeatures;
  target: MatchTarget;
}

/**
 * Extract features from a match for ML model
 */
export function extractMatchFeatures(
  homeTeam: Team,
  awayTeam: Team,
  league: string
): MatchFeatures {
  const eloDiff = homeTeam.elo_rating - awayTeam.elo_rating;
  const homeAdvantage = 1.15; // 15% home advantage factor

  return {
    // Home team raw features
    homeElo: homeTeam.elo_rating,
    homeAvgGoalsScored: homeTeam.avg_goals_scored,
    homeAvgGoalsConceded: homeTeam.avg_goals_conceded,
    homeXG: homeTeam.xg_per_match,

    // Away team raw features
    awayElo: awayTeam.elo_rating,
    awayAvgGoalsScored: awayTeam.avg_goals_scored,
    awayAvgGoalsConceded: awayTeam.avg_goals_conceded,
    awayXG: awayTeam.xg_per_match,

    // Derived features
    eloDifference: eloDiff,
    homeAttackVsAwayDefense: homeTeam.avg_goals_scored / Math.max(0.5, awayTeam.avg_goals_conceded),
    awayAttackVsHomeDefense: awayTeam.avg_goals_scored / Math.max(0.5, homeTeam.avg_goals_conceded),
    totalExpectedGoals: homeTeam.xg_per_match + awayTeam.xg_per_match,
    eloRatio: homeTeam.elo_rating / Math.max(1, awayTeam.elo_rating),
    homeAdvantage: homeAdvantage,

    // One-hot encode league
    leaguePremier: league === 'Premier League' ? 1 : 0,
    leagueLaLiga: league === 'La Liga' ? 1 : 0,
    leagueSerieA: league === 'Serie A' ? 1 : 0,
    leagueBundesliga: league === 'Bundesliga' ? 1 : 0,
    leagueLigue1: league === 'Ligue 1' ? 1 : 0,
  };
}

/**
 * Extract target values from a completed match
 */
export function extractMatchTarget(match: Match): MatchTarget | null {
  if (match.home_score === null || match.away_score === null) {
    return null; // Match not completed yet
  }

  const homeScore = match.home_score;
  const awayScore = match.away_score;
  const totalGoals = homeScore + awayScore;

  return {
    homeWin: homeScore > awayScore ? 1 : 0,
    draw: homeScore === awayScore ? 1 : 0,
    awayWin: awayScore > homeScore ? 1 : 0,
    homeGoals: homeScore,
    awayGoals: awayScore,
    totalGoals: totalGoals,
    over25: totalGoals > 2.5 ? 1 : 0,
  };
}

/**
 * Convert MatchFeatures to array for ML models
 */
export function featuresToArray(features: MatchFeatures): number[] {
  return [
    features.homeElo,
    features.homeAvgGoalsScored,
    features.homeAvgGoalsConceded,
    features.homeXG,
    features.awayElo,
    features.awayAvgGoalsScored,
    features.awayAvgGoalsConceded,
    features.awayXG,
    features.eloDifference,
    features.homeAttackVsAwayDefense,
    features.awayAttackVsHomeDefense,
    features.totalExpectedGoals,
    features.eloRatio,
    features.homeAdvantage,
    features.leaguePremier,
    features.leagueLaLiga,
    features.leagueSerieA,
    features.leagueBundesliga,
    features.leagueLigue1,
  ];
}

/**
 * Normalize features for neural network
 */
export function normalizeFeatures(featuresArray: number[][]): {
  normalized: number[][];
  means: number[];
  stds: number[];
} {
  const numFeatures = featuresArray[0].length;
  const means: number[] = [];
  const stds: number[] = [];

  // Calculate means and standard deviations
  for (let i = 0; i < numFeatures; i++) {
    const values = featuresArray.map(row => row[i]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    means.push(mean);
    stds.push(std > 0 ? std : 1); // Avoid division by zero
  }

  // Normalize
  const normalized = featuresArray.map(row =>
    row.map((val, i) => (val - means[i]) / stds[i])
  );

  return { normalized, means, stds };
}

/**
 * Apply normalization to a single feature vector
 */
export function normalizeSingleFeature(
  features: number[],
  means: number[],
  stds: number[]
): number[] {
  return features.map((val, i) => (val - means[i]) / stds[i]);
}

/**
 * Get feature names for interpretability
 */
export function getFeatureNames(): string[] {
  return [
    'homeElo',
    'homeAvgGoalsScored',
    'homeAvgGoalsConceded',
    'homeXG',
    'awayElo',
    'awayAvgGoalsScored',
    'awayAvgGoalsConceded',
    'awayXG',
    'eloDifference',
    'homeAttackVsAwayDefense',
    'awayAttackVsHomeDefense',
    'totalExpectedGoals',
    'eloRatio',
    'homeAdvantage',
    'leaguePremier',
    'leagueLaLiga',
    'leagueSerieA',
    'leagueBundesliga',
    'leagueLigue1',
  ];
}
