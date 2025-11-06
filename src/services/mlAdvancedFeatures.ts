import { Team } from '../lib/supabase';
import { MatchFeatures } from './mlFeatureExtractor';

/**
 * Extended match features with advanced statistics
 */
export interface AdvancedMatchFeatures extends MatchFeatures {
  // Form features (last 5 matches)
  homeFormPoints: number;
  awayFormPoints: number;
  homeFormWinRate: number;
  awayFormWinRate: number;
  homeRecentGoalsScored: number;
  awayRecentGoalsScored: number;
  homeRecentGoalsConceded: number;
  awayRecentGoalsConceded: number;

  // Head-to-head history
  h2hHomeWins: number;
  h2hDraws: number;
  h2hAwayWins: number;
  h2hAvgHomeGoals: number;
  h2hAvgAwayGoals: number;

  // Advanced metrics
  homeShotsPerMatch: number;
  awayShotsPerMatch: number;
  homeShotsOnTargetRatio: number;
  awayShotsOnTargetRatio: number;
  homePossessionAvg: number;
  awayPossessionAvg: number;

  // Momentum indicators
  homeFormMomentum: number;  // Positive if improving
  awayFormMomentum: number;
  homeGoalDifferential: number;
  awayGoalDifferential: number;

  // Time-based features
  daysSinceLastMatch: number;
  isWeekendMatch: number;
  monthOfSeason: number;

  // Weather/conditions (when available)
  temperature?: number;
  isRainy?: number;
  windSpeed?: number;
}

export interface FormData {
  formPoints: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
}

export interface HeadToHeadData {
  homeWins: number;
  draws: number;
  awayWins: number;
  avgHomeGoals: number;
  avgAwayGoals: number;
  totalMatches: number;
}

export interface TeamAdvancedStats {
  avgShots: number;
  avgShotsOnTarget: number;
  avgPossession: number;
  avgXG: number;
  formPoints: number;
}

/**
 * Extract advanced features including form, h2h, and momentum
 */
export function extractAdvancedFeatures(
  homeTeam: Team,
  awayTeam: Team,
  league: string,
  homeForm: FormData,
  awayForm: FormData,
  h2h: HeadToHeadData,
  homeStats: TeamAdvancedStats,
  awayStats: TeamAdvancedStats,
  matchDate?: Date
): AdvancedMatchFeatures {
  // Base features from original extractor
  const baseFeatures = extractBaseFeatures(homeTeam, awayTeam, league);

  // Form features
  const homeFormWinRate = homeForm.wins / Math.max(1, homeForm.wins + homeForm.draws + homeForm.losses);
  const awayFormWinRate = awayForm.wins / Math.max(1, awayForm.wins + awayForm.draws + awayForm.losses);

  // Momentum: change in form over time
  const homeFormMomentum = calculateMomentum(homeForm);
  const awayFormMomentum = calculateMomentum(awayForm);

  // Goal differentials
  const homeGoalDifferential = homeForm.goalsScored - homeForm.goalsConceded;
  const awayGoalDifferential = awayForm.goalsScored - awayForm.goalsConceded;

  // H2H features
  const h2hTotalMatches = Math.max(1, h2h.totalMatches);
  const h2hHomeWinRate = h2h.homeWins / h2hTotalMatches;
  const h2hDrawRate = h2h.draws / h2hTotalMatches;
  const h2hAwayWinRate = h2h.awayWins / h2hTotalMatches;

  // Shooting efficiency
  const homeShotsOnTargetRatio = homeStats.avgShotsOnTarget / Math.max(1, homeStats.avgShots);
  const awayShotsOnTargetRatio = awayStats.avgShotsOnTarget / Math.max(1, awayStats.avgShots);

  // Time-based features
  const date = matchDate || new Date();
  const dayOfWeek = date.getDay();
  const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6) ? 1 : 0;
  const monthOfSeason = date.getMonth() + 1;

  return {
    ...baseFeatures,

    // Form
    homeFormPoints: homeForm.formPoints,
    awayFormPoints: awayForm.formPoints,
    homeFormWinRate,
    awayFormWinRate,
    homeRecentGoalsScored: homeForm.goalsScored,
    awayRecentGoalsScored: awayForm.goalsScored,
    homeRecentGoalsConceded: homeForm.goalsConceded,
    awayRecentGoalsConceded: awayForm.goalsConceded,

    // H2H
    h2hHomeWins: h2hHomeWinRate,
    h2hDraws: h2hDrawRate,
    h2hAwayWins: h2hAwayWinRate,
    h2hAvgHomeGoals: h2h.avgHomeGoals,
    h2hAvgAwayGoals: h2h.avgAwayGoals,

    // Advanced stats
    homeShotsPerMatch: homeStats.avgShots,
    awayShotsPerMatch: awayStats.avgShots,
    homeShotsOnTargetRatio,
    awayShotsOnTargetRatio,
    homePossessionAvg: homeStats.avgPossession,
    awayPossessionAvg: awayStats.avgPossession,

    // Momentum
    homeFormMomentum,
    awayFormMomentum,
    homeGoalDifferential,
    awayGoalDifferential,

    // Time-based
    daysSinceLastMatch: 7,  // Default, should be calculated
    isWeekendMatch: isWeekend,
    monthOfSeason
  };
}

/**
 * Extract base features (compatibility with original)
 */
function extractBaseFeatures(
  homeTeam: Team,
  awayTeam: Team,
  league: string
): MatchFeatures {
  const eloDiff = homeTeam.elo_rating - awayTeam.elo_rating;
  const homeAdvantage = 1.15;

  return {
    homeElo: homeTeam.elo_rating,
    homeAvgGoalsScored: homeTeam.avg_goals_scored,
    homeAvgGoalsConceded: homeTeam.avg_goals_conceded,
    homeXG: homeTeam.xg_per_match,
    awayElo: awayTeam.elo_rating,
    awayAvgGoalsScored: awayTeam.avg_goals_scored,
    awayAvgGoalsConceded: awayTeam.avg_goals_conceded,
    awayXG: awayTeam.xg_per_match,
    eloDifference: eloDiff,
    homeAttackVsAwayDefense: homeTeam.avg_goals_scored / Math.max(0.5, awayTeam.avg_goals_conceded),
    awayAttackVsHomeDefense: awayTeam.avg_goals_scored / Math.max(0.5, homeTeam.avg_goals_conceded),
    totalExpectedGoals: homeTeam.xg_per_match + awayTeam.xg_per_match,
    eloRatio: homeTeam.elo_rating / Math.max(1, awayTeam.elo_rating),
    homeAdvantage,
    leaguePremier: league === 'Premier League' ? 1 : 0,
    leagueLaLiga: league === 'La Liga' ? 1 : 0,
    leagueSerieA: league === 'Serie A' ? 1 : 0,
    leagueBundesliga: league === 'Bundesliga' ? 1 : 0,
    leagueLigue1: league === 'Ligue 1' ? 1 : 0,
  };
}

/**
 * Calculate momentum from form data
 * Positive if team is improving, negative if declining
 */
function calculateMomentum(form: FormData): number {
  // Simple momentum: recent form vs expected
  const expectedPoints = 5;  // Average for 5 matches
  const actualPoints = form.formPoints;
  const momentum = (actualPoints - expectedPoints) / expectedPoints;
  return momentum;
}

/**
 * Convert advanced features to array for ML models
 */
export function advancedFeaturesToArray(features: AdvancedMatchFeatures): number[] {
  return [
    // Base features (19)
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

    // Form features (8)
    features.homeFormPoints,
    features.awayFormPoints,
    features.homeFormWinRate,
    features.awayFormWinRate,
    features.homeRecentGoalsScored,
    features.awayRecentGoalsScored,
    features.homeRecentGoalsConceded,
    features.awayRecentGoalsConceded,

    // H2H features (5)
    features.h2hHomeWins,
    features.h2hDraws,
    features.h2hAwayWins,
    features.h2hAvgHomeGoals,
    features.h2hAvgAwayGoals,

    // Advanced stats (6)
    features.homeShotsPerMatch,
    features.awayShotsPerMatch,
    features.homeShotsOnTargetRatio,
    features.awayShotsOnTargetRatio,
    features.homePossessionAvg,
    features.awayPossessionAvg,

    // Momentum (4)
    features.homeFormMomentum,
    features.awayFormMomentum,
    features.homeGoalDifferential,
    features.awayGoalDifferential,

    // Time-based (3)
    features.daysSinceLastMatch,
    features.isWeekendMatch,
    features.monthOfSeason,
  ];
  // Total: 45 features (vs 19 original)
}

/**
 * Get feature names for advanced features
 */
export function getAdvancedFeatureNames(): string[] {
  return [
    // Base (19)
    'homeElo', 'homeAvgGoalsScored', 'homeAvgGoalsConceded', 'homeXG',
    'awayElo', 'awayAvgGoalsScored', 'awayAvgGoalsConceded', 'awayXG',
    'eloDifference', 'homeAttackVsAwayDefense', 'awayAttackVsHomeDefense',
    'totalExpectedGoals', 'eloRatio', 'homeAdvantage',
    'leaguePremier', 'leagueLaLiga', 'leagueSerieA', 'leagueBundesliga', 'leagueLigue1',

    // Form (8)
    'homeFormPoints', 'awayFormPoints', 'homeFormWinRate', 'awayFormWinRate',
    'homeRecentGoalsScored', 'awayRecentGoalsScored',
    'homeRecentGoalsConceded', 'awayRecentGoalsConceded',

    // H2H (5)
    'h2hHomeWins', 'h2hDraws', 'h2hAwayWins',
    'h2hAvgHomeGoals', 'h2hAvgAwayGoals',

    // Advanced stats (6)
    'homeShotsPerMatch', 'awayShotsPerMatch',
    'homeShotsOnTargetRatio', 'awayShotsOnTargetRatio',
    'homePossessionAvg', 'awayPossessionAvg',

    // Momentum (4)
    'homeFormMomentum', 'awayFormMomentum',
    'homeGoalDifferential', 'awayGoalDifferential',

    // Time (3)
    'daysSinceLastMatch', 'isWeekendMatch', 'monthOfSeason'
  ];
}

/**
 * Mock head-to-head data (for testing or when no h2h available)
 */
export function mockHeadToHeadData(): HeadToHeadData {
  return {
    homeWins: 2,
    draws: 2,
    awayWins: 1,
    avgHomeGoals: 1.8,
    avgAwayGoals: 1.4,
    totalMatches: 5
  };
}

/**
 * Mock advanced stats (for testing or when stats not available)
 */
export function mockAdvancedStats(): TeamAdvancedStats {
  return {
    avgShots: 12,
    avgShotsOnTarget: 5,
    avgPossession: 50,
    avgXG: 1.5,
    formPoints: 5
  };
}

/**
 * Mock form data (for testing or when form not available)
 */
export function mockFormData(): FormData {
  return {
    formPoints: 7,
    wins: 2,
    draws: 1,
    losses: 2,
    goalsScored: 6,
    goalsConceded: 5
  };
}
