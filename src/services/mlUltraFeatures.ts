import { Team } from '../lib/supabase';
import { AdvancedMatchFeatures } from './mlAdvancedFeatures';

/**
 * Ultra-advanced match features with extensive statistics for maximum accuracy
 * Total features: 112 (vs 45 advanced, 19 basic)
 */
export interface UltraMatchFeatures extends AdvancedMatchFeatures {
  // Home/Away split performance
  homeWinRateAtHome: number;
  awayWinRateAway: number;
  homeGoalsScoredAtHome: number;
  awayGoalsScoredAway: number;
  homeGoalsConcededAtHome: number;
  awayGoalsConcededAway: number;
  homePointsAtHome: number;
  awayPointsAway: number;

  // Corners and set pieces
  homeCornersPerMatch: number;
  awayCornersPerMatch: number;
  homeCornerConversionRate: number;
  awayCornerConversionRate: number;
  homeSetPieceGoals: number;
  awaySetPieceGoals: number;

  // Discipline
  homeYellowCardsPerMatch: number;
  awayYellowCardsPerMatch: number;
  homeRedCardsPerMatch: number;
  awayRedCardsPerMatch: number;
  homeFoulsPerMatch: number;
  awayFoulsPerMatch: number;

  // Defensive metrics
  homeCleanSheetRate: number;
  awayCleanSheetRate: number;
  homeTacklesPerMatch: number;
  awayTacklesPerMatch: number;
  homeInterceptionsPerMatch: number;
  awayInterceptionsPerMatch: number;
  homeBlocksPerMatch: number;
  awayBlocksPerMatch: number;

  // Shot conversion efficiency
  homeGoalConversionRate: number;  // Goals / Shots
  awayGoalConversionRate: number;
  homeBigChancesCreated: number;
  awayBigChancesCreated: number;
  homeBigChancesMissed: number;
  awayBigChancesMissed: number;

  // League position and points
  homeLeaguePosition: number;
  awayLeaguePosition: number;
  homeLeaguePoints: number;
  awayLeaguePoints: number;
  positionDifference: number;
  pointsDifference: number;

  // Form trends (weighted recent performance)
  homeForm3Matches: number;  // Last 3 matches
  awayForm3Matches: number;
  homeForm10Matches: number;  // Last 10 matches
  awayForm10Matches: number;
  homeFormTrend: number;  // Is form improving or declining?
  awayFormTrend: number;

  // Performance patterns
  homeScoredFirstRate: number;  // % of matches where team scored first
  awayScoredFirstRate: number;
  homeWonWhenScoredFirst: number;
  awayWonWhenScoredFirst: number;
  homeComebackWins: number;  // Wins when losing at half-time
  awayComebackWins: number;

  // First/second half performance
  homeFirstHalfGoals: number;
  awayFirstHalfGoals: number;
  homeSecondHalfGoals: number;
  awaySecondHalfGoals: number;

  // Squad depth and rotation
  homeSquadRotationIndex: number;  // Higher = more rotation
  awaySquadRotationIndex: number;
  homeInjuriesCount: number;
  awayInjuriesCount: number;

  // Market value and wages (financial power indicators)
  homeSquadValue: number;
  awaySquadValue: number;
  squadValueRatio: number;

  // Manager experience
  homeManagerTenure: number;  // Months as manager
  awayManagerTenure: number;
  homeManagerWinRate: number;
  awayManagerWinRate: number;
}

/**
 * Extended team statistics for ultra features
 */
export interface UltraTeamStats {
  // Home/away splits
  homeMatches: number;
  awayMatches: number;
  homeWins: number;
  awayWins: number;
  homeGoalsScored: number;
  awayGoalsScored: number;
  homeGoalsConceded: number;
  awayGoalsConceded: number;
  homePoints: number;
  awayPoints: number;

  // Set pieces
  avgCorners: number;
  cornerGoals: number;
  setPieceGoals: number;

  // Discipline
  avgYellowCards: number;
  avgRedCards: number;
  avgFouls: number;

  // Defense
  cleanSheets: number;
  avgTackles: number;
  avgInterceptions: number;
  avgBlocks: number;

  // Shooting
  avgShots: number;
  avgShotsOnTarget: number;
  totalGoals: number;
  bigChancesCreated: number;
  bigChancesMissed: number;

  // League standings
  leaguePosition: number;
  leaguePoints: number;

  // Form
  last3Points: number;
  last5Points: number;
  last10Points: number;

  // Performance patterns
  scoredFirstCount: number;
  wonWhenScoredFirst: number;
  comebackWins: number;
  firstHalfGoals: number;
  secondHalfGoals: number;

  // Squad
  squadRotation: number;
  injuries: number;
  squadValue: number;

  // Manager
  managerMonths: number;
  managerWins: number;
  managerMatches: number;
}

/**
 * Extract ultra-advanced features for maximum prediction accuracy
 */
export function extractUltraFeatures(
  homeTeam: Team,
  awayTeam: Team,
  league: string,
  homeStats: UltraTeamStats,
  awayStats: UltraTeamStats,
  baseFeatures: AdvancedMatchFeatures
): UltraMatchFeatures {
  // Home/Away split calculations
  const homeWinRateAtHome = homeStats.homeMatches > 0
    ? homeStats.homeWins / homeStats.homeMatches
    : 0.5;
  const awayWinRateAway = awayStats.awayMatches > 0
    ? awayStats.awayWins / awayStats.awayMatches
    : 0.3;

  const homeGoalsScoredAtHome = homeStats.homeMatches > 0
    ? homeStats.homeGoalsScored / homeStats.homeMatches
    : homeTeam.avg_goals_scored;
  const awayGoalsScoredAway = awayStats.awayMatches > 0
    ? awayStats.awayGoalsScored / awayStats.awayMatches
    : awayTeam.avg_goals_scored;

  // Corner statistics
  const homeCornerConversion = homeStats.avgCorners > 0
    ? homeStats.cornerGoals / (homeStats.avgCorners * Math.max(1, homeStats.homeMatches + homeStats.awayMatches))
    : 0.05;
  const awayCornerConversion = awayStats.avgCorners > 0
    ? awayStats.cornerGoals / (awayStats.avgCorners * Math.max(1, awayStats.homeMatches + awayStats.awayMatches))
    : 0.05;

  // Clean sheet rates
  const totalHomeMatches = homeStats.homeMatches + homeStats.awayMatches;
  const totalAwayMatches = awayStats.homeMatches + awayStats.awayMatches;
  const homeCleanSheetRate = totalHomeMatches > 0
    ? homeStats.cleanSheets / totalHomeMatches
    : 0.3;
  const awayCleanSheetRate = totalAwayMatches > 0
    ? awayStats.cleanSheets / totalAwayMatches
    : 0.25;

  // Goal conversion rates
  const homeGoalConversion = homeStats.avgShots > 0
    ? homeStats.totalGoals / (homeStats.avgShots * totalHomeMatches)
    : 0.1;
  const awayGoalConversion = awayStats.avgShots > 0
    ? awayStats.totalGoals / (awayStats.avgShots * totalAwayMatches)
    : 0.1;

  // Position metrics
  const positionDiff = homeStats.leaguePosition - awayStats.leaguePosition;
  const pointsDiff = homeStats.leaguePoints - awayStats.leaguePoints;

  // Form trends (weighted recent performance)
  const homeForm3 = homeStats.last3Points;
  const awayForm3 = awayStats.last3Points;
  const homeForm10 = homeStats.last10Points;
  const awayForm10 = awayStats.last10Points;

  // Form trend: positive if improving (recent form better than longer term)
  const homeFormTrend = (homeForm3 / 3) - (homeStats.last5Points / 5);
  const awayFormTrend = (awayForm3 / 3) - (awayStats.last5Points / 5);

  // Scoring first statistics
  const homeScoredFirstRate = totalHomeMatches > 0
    ? homeStats.scoredFirstCount / totalHomeMatches
    : 0.5;
  const awayScoredFirstRate = totalAwayMatches > 0
    ? awayStats.scoredFirstCount / totalAwayMatches
    : 0.5;

  const homeWonWhenScoredFirst = homeStats.scoredFirstCount > 0
    ? homeStats.wonWhenScoredFirst / homeStats.scoredFirstCount
    : 0.7;
  const awayWonWhenScoredFirst = awayStats.scoredFirstCount > 0
    ? awayStats.wonWhenScoredFirst / awayStats.scoredFirstCount
    : 0.7;

  // Squad value ratio
  const squadValueRatio = awayStats.squadValue > 0
    ? homeStats.squadValue / awayStats.squadValue
    : 1;

  // Manager stats
  const homeManagerWinRate = homeStats.managerMatches > 0
    ? homeStats.managerWins / homeStats.managerMatches
    : 0.4;
  const awayManagerWinRate = awayStats.managerMatches > 0
    ? awayStats.managerWins / awayStats.managerMatches
    : 0.4;

  return {
    ...baseFeatures,

    // Home/Away splits
    homeWinRateAtHome,
    awayWinRateAway,
    homeGoalsScoredAtHome,
    awayGoalsScoredAway,
    homeGoalsConcededAtHome: homeStats.homeMatches > 0 ? homeStats.homeGoalsConceded / homeStats.homeMatches : homeTeam.avg_goals_conceded,
    awayGoalsConcededAway: awayStats.awayMatches > 0 ? awayStats.awayGoalsConceded / awayStats.awayMatches : awayTeam.avg_goals_conceded,
    homePointsAtHome: homeStats.homePoints,
    awayPointsAway: awayStats.awayPoints,

    // Corners
    homeCornersPerMatch: homeStats.avgCorners,
    awayCornersPerMatch: awayStats.avgCorners,
    homeCornerConversionRate: homeCornerConversion,
    awayCornerConversionRate: awayCornerConversion,
    homeSetPieceGoals: homeStats.setPieceGoals,
    awaySetPieceGoals: awayStats.setPieceGoals,

    // Discipline
    homeYellowCardsPerMatch: homeStats.avgYellowCards,
    awayYellowCardsPerMatch: awayStats.avgYellowCards,
    homeRedCardsPerMatch: homeStats.avgRedCards,
    awayRedCardsPerMatch: awayStats.avgRedCards,
    homeFoulsPerMatch: homeStats.avgFouls,
    awayFoulsPerMatch: awayStats.avgFouls,

    // Defense
    homeCleanSheetRate,
    awayCleanSheetRate,
    homeTacklesPerMatch: homeStats.avgTackles,
    awayTacklesPerMatch: awayStats.avgTackles,
    homeInterceptionsPerMatch: homeStats.avgInterceptions,
    awayInterceptionsPerMatch: awayStats.avgInterceptions,
    homeBlocksPerMatch: homeStats.avgBlocks,
    awayBlocksPerMatch: awayStats.avgBlocks,

    // Shooting efficiency
    homeGoalConversionRate: homeGoalConversion,
    awayGoalConversionRate: awayGoalConversion,
    homeBigChancesCreated: homeStats.bigChancesCreated,
    awayBigChancesCreated: awayStats.bigChancesCreated,
    homeBigChancesMissed: homeStats.bigChancesMissed,
    awayBigChancesMissed: awayStats.bigChancesMissed,

    // League position
    homeLeaguePosition: homeStats.leaguePosition,
    awayLeaguePosition: awayStats.leaguePosition,
    homeLeaguePoints: homeStats.leaguePoints,
    awayLeaguePoints: awayStats.leaguePoints,
    positionDifference: positionDiff,
    pointsDifference: pointsDiff,

    // Form trends
    homeForm3Matches: homeForm3,
    awayForm3Matches: awayForm3,
    homeForm10Matches: homeForm10,
    awayForm10Matches: awayForm10,
    homeFormTrend,
    awayFormTrend,

    // Performance patterns
    homeScoredFirstRate,
    awayScoredFirstRate,
    homeWonWhenScoredFirst,
    awayWonWhenScoredFirst,
    homeComebackWins: homeStats.comebackWins,
    awayComebackWins: awayStats.comebackWins,

    // Half performance
    homeFirstHalfGoals: homeStats.firstHalfGoals,
    awayFirstHalfGoals: awayStats.firstHalfGoals,
    homeSecondHalfGoals: homeStats.secondHalfGoals,
    awaySecondHalfGoals: awayStats.secondHalfGoals,

    // Squad
    homeSquadRotationIndex: homeStats.squadRotation,
    awaySquadRotationIndex: awayStats.squadRotation,
    homeInjuriesCount: homeStats.injuries,
    awayInjuriesCount: awayStats.injuries,
    homeSquadValue: homeStats.squadValue,
    awaySquadValue: awayStats.squadValue,
    squadValueRatio,

    // Manager
    homeManagerTenure: homeStats.managerMonths,
    awayManagerTenure: awayStats.managerMonths,
    homeManagerWinRate,
    awayManagerWinRate,
  };
}

/**
 * Convert ultra features to array for ML models
 */
export function ultraFeaturesToArray(features: UltraMatchFeatures): number[] {
  return [
    // Base features (19) - from AdvancedMatchFeatures
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

    // Advanced form features (8)
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

    // Advanced stats from AdvancedMatchFeatures (6)
    features.homeShotsPerMatch,
    features.awayShotsPerMatch,
    features.homeShotsOnTargetRatio,
    features.awayShotsOnTargetRatio,
    features.homePossessionAvg,
    features.awayPossessionAvg,

    // Momentum from AdvancedMatchFeatures (4)
    features.homeFormMomentum,
    features.awayFormMomentum,
    features.homeGoalDifferential,
    features.awayGoalDifferential,

    // Time-based from AdvancedMatchFeatures (3)
    features.daysSinceLastMatch,
    features.isWeekendMatch,
    features.monthOfSeason,

    // NEW: Home/Away splits (8)
    features.homeWinRateAtHome,
    features.awayWinRateAway,
    features.homeGoalsScoredAtHome,
    features.awayGoalsScoredAway,
    features.homeGoalsConcededAtHome,
    features.awayGoalsConcededAway,
    features.homePointsAtHome,
    features.awayPointsAway,

    // NEW: Corners (6)
    features.homeCornersPerMatch,
    features.awayCornersPerMatch,
    features.homeCornerConversionRate,
    features.awayCornerConversionRate,
    features.homeSetPieceGoals,
    features.awaySetPieceGoals,

    // NEW: Discipline (6)
    features.homeYellowCardsPerMatch,
    features.awayYellowCardsPerMatch,
    features.homeRedCardsPerMatch,
    features.awayRedCardsPerMatch,
    features.homeFoulsPerMatch,
    features.awayFoulsPerMatch,

    // NEW: Defense (8)
    features.homeCleanSheetRate,
    features.awayCleanSheetRate,
    features.homeTacklesPerMatch,
    features.awayTacklesPerMatch,
    features.homeInterceptionsPerMatch,
    features.awayInterceptionsPerMatch,
    features.homeBlocksPerMatch,
    features.awayBlocksPerMatch,

    // NEW: Shooting efficiency (6)
    features.homeGoalConversionRate,
    features.awayGoalConversionRate,
    features.homeBigChancesCreated,
    features.awayBigChancesCreated,
    features.homeBigChancesMissed,
    features.awayBigChancesMissed,

    // NEW: League position (6)
    features.homeLeaguePosition,
    features.awayLeaguePosition,
    features.homeLeaguePoints,
    features.awayLeaguePoints,
    features.positionDifference,
    features.pointsDifference,

    // NEW: Form trends (6)
    features.homeForm3Matches,
    features.awayForm3Matches,
    features.homeForm10Matches,
    features.awayForm10Matches,
    features.homeFormTrend,
    features.awayFormTrend,

    // NEW: Performance patterns (8)
    features.homeScoredFirstRate,
    features.awayScoredFirstRate,
    features.homeWonWhenScoredFirst,
    features.awayWonWhenScoredFirst,
    features.homeComebackWins,
    features.awayComebackWins,
    features.homeFirstHalfGoals,
    features.awayFirstHalfGoals,

    // NEW: Second half + Squad (6)
    features.homeSecondHalfGoals,
    features.awaySecondHalfGoals,
    features.homeSquadRotationIndex,
    features.awaySquadRotationIndex,
    features.homeInjuriesCount,
    features.awayInjuriesCount,

    // NEW: Financial + Manager (5)
    features.homeSquadValue,
    features.awaySquadValue,
    features.squadValueRatio,
    features.homeManagerTenure,
    features.awayManagerTenure,

    // NEW: Manager win rates (2)
    features.homeManagerWinRate,
    features.awayManagerWinRate,
  ];
  // Total: 112 features (vs 45 advanced, 19 basic)
}

/**
 * Get all ultra feature names
 */
export function getUltraFeatureNames(): string[] {
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
    'h2hHomeWins', 'h2hDraws', 'h2hAwayWins', 'h2hAvgHomeGoals', 'h2hAvgAwayGoals',

    // Advanced stats (6)
    'homeShotsPerMatch', 'awayShotsPerMatch', 'homeShotsOnTargetRatio',
    'awayShotsOnTargetRatio', 'homePossessionAvg', 'awayPossessionAvg',

    // Momentum (4)
    'homeFormMomentum', 'awayFormMomentum', 'homeGoalDifferential', 'awayGoalDifferential',

    // Time (3)
    'daysSinceLastMatch', 'isWeekendMatch', 'monthOfSeason',

    // Home/Away splits (8)
    'homeWinRateAtHome', 'awayWinRateAway', 'homeGoalsScoredAtHome', 'awayGoalsScoredAway',
    'homeGoalsConcededAtHome', 'awayGoalsConcededAway', 'homePointsAtHome', 'awayPointsAway',

    // Corners (6)
    'homeCornersPerMatch', 'awayCornersPerMatch', 'homeCornerConversionRate',
    'awayCornerConversionRate', 'homeSetPieceGoals', 'awaySetPieceGoals',

    // Discipline (6)
    'homeYellowCardsPerMatch', 'awayYellowCardsPerMatch', 'homeRedCardsPerMatch',
    'awayRedCardsPerMatch', 'homeFoulsPerMatch', 'awayFoulsPerMatch',

    // Defense (8)
    'homeCleanSheetRate', 'awayCleanSheetRate', 'homeTacklesPerMatch', 'awayTacklesPerMatch',
    'homeInterceptionsPerMatch', 'awayInterceptionsPerMatch', 'homeBlocksPerMatch', 'awayBlocksPerMatch',

    // Shooting efficiency (6)
    'homeGoalConversionRate', 'awayGoalConversionRate', 'homeBigChancesCreated',
    'awayBigChancesCreated', 'homeBigChancesMissed', 'awayBigChancesMissed',

    // League position (6)
    'homeLeaguePosition', 'awayLeaguePosition', 'homeLeaguePoints', 'awayLeaguePoints',
    'positionDifference', 'pointsDifference',

    // Form trends (6)
    'homeForm3Matches', 'awayForm3Matches', 'homeForm10Matches', 'awayForm10Matches',
    'homeFormTrend', 'awayFormTrend',

    // Performance patterns (8)
    'homeScoredFirstRate', 'awayScoredFirstRate', 'homeWonWhenScoredFirst',
    'awayWonWhenScoredFirst', 'homeComebackWins', 'awayComebackWins',
    'homeFirstHalfGoals', 'awayFirstHalfGoals',

    // Second half + Squad (6)
    'homeSecondHalfGoals', 'awaySecondHalfGoals', 'homeSquadRotationIndex',
    'awaySquadRotationIndex', 'homeInjuriesCount', 'awayInjuriesCount',

    // Financial + Manager (5)
    'homeSquadValue', 'awaySquadValue', 'squadValueRatio',
    'homeManagerTenure', 'awayManagerTenure',

    // Manager win rates (2)
    'homeManagerWinRate', 'awayManagerWinRate',
  ];
}

/**
 * Mock ultra stats for testing
 */
export function mockUltraStats(): UltraTeamStats {
  return {
    homeMatches: 10,
    awayMatches: 10,
    homeWins: 6,
    awayWins: 3,
    homeGoalsScored: 18,
    awayGoalsScored: 12,
    homeGoalsConceded: 8,
    awayGoalsConceded: 11,
    homePoints: 18,
    awayPoints: 10,
    avgCorners: 5.5,
    cornerGoals: 3,
    setPieceGoals: 5,
    avgYellowCards: 1.8,
    avgRedCards: 0.1,
    avgFouls: 11.5,
    cleanSheets: 7,
    avgTackles: 16.2,
    avgInterceptions: 12.5,
    avgBlocks: 4.3,
    avgShots: 13.5,
    avgShotsOnTarget: 5.2,
    totalGoals: 30,
    bigChancesCreated: 25,
    bigChancesMissed: 12,
    leaguePosition: 5,
    leaguePoints: 45,
    last3Points: 7,
    last5Points: 11,
    last10Points: 21,
    scoredFirstCount: 14,
    wonWhenScoredFirst: 11,
    comebackWins: 2,
    firstHalfGoals: 14,
    secondHalfGoals: 16,
    squadRotation: 0.35,
    injuries: 2,
    squadValue: 450,
    managerMonths: 18,
    managerWins: 28,
    managerMatches: 60,
  };
}
