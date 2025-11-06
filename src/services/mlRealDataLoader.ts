import { supabase, Team, Match } from '../lib/supabase';
import { MatchFeatures, MatchTarget, extractMatchFeatures, extractMatchTarget } from './mlFeatureExtractor';

export interface RealDataset {
  teams: Team[];
  matches: Match[];
  trainingData: Array<{ features: MatchFeatures; target: MatchTarget }>;
  trainSet: Array<{ features: MatchFeatures; target: MatchTarget }>;
  testSet: Array<{ features: MatchFeatures; target: MatchTarget }>;
  stats: {
    totalMatches: number;
    completedMatches: number;
    trainSize: number;
    testSize: number;
    leagues: string[];
  };
}

/**
 * Load real historical match data from Supabase
 */
export async function loadRealMatchData(
  limit: number = 500,
  includeUnfinished: boolean = false
): Promise<{
  matches: Match[];
  teams: Map<string, Team>;
}> {
  console.log('📥 Loading real match data from Supabase...');

  // Load all teams
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .order('elo_rating', { ascending: false });

  if (teamsError) {
    throw new Error(`Failed to load teams: ${teamsError.message}`);
  }

  console.log(`✓ Loaded ${teams?.length || 0} teams`);

  // Load matches with scores (completed matches)
  let matchQuery = supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: false })
    .limit(limit);

  if (!includeUnfinished) {
    matchQuery = matchQuery
      .not('home_score', 'is', null)
      .not('away_score', 'is', null);
  }

  const { data: matches, error: matchesError } = await matchQuery;

  if (matchesError) {
    throw new Error(`Failed to load matches: ${matchesError.message}`);
  }

  console.log(`✓ Loaded ${matches?.length || 0} matches`);

  // Create team lookup map
  const teamMap = new Map<string, Team>();
  teams?.forEach(team => teamMap.set(team.id, team));

  return {
    matches: matches || [],
    teams: teamMap
  };
}

/**
 * Generate training dataset from real Supabase data
 */
export async function generateRealDataset(
  matchLimit: number = 500,
  testRatio: number = 0.2
): Promise<RealDataset> {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           LOADING REAL TRAINING DATA FROM SUPABASE            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const { matches, teams: teamMap } = await loadRealMatchData(matchLimit, false);

  // Extract training data
  const trainingData: Array<{ features: MatchFeatures; target: MatchTarget }> = [];
  const leagues = new Set<string>();

  for (const match of matches) {
    const homeTeam = teamMap.get(match.home_team_id);
    const awayTeam = teamMap.get(match.away_team_id);

    if (!homeTeam || !awayTeam) {
      console.warn(`⚠ Skipping match ${match.id}: teams not found`);
      continue;
    }

    const features = extractMatchFeatures(homeTeam, awayTeam, match.league);
    const target = extractMatchTarget(match);

    if (target) {
      trainingData.push({ features, target });
      leagues.add(match.league);
    }
  }

  console.log(`\n✓ Extracted ${trainingData.length} training samples`);
  console.log(`✓ Leagues: ${Array.from(leagues).join(', ')}`);

  // Split into train and test sets
  const shuffled = [...trainingData].sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(trainingData.length * (1 - testRatio));

  const trainSet = shuffled.slice(0, splitIndex);
  const testSet = shuffled.slice(splitIndex);

  console.log(`✓ Training set: ${trainSet.length} samples`);
  console.log(`✓ Test set: ${testSet.length} samples\n`);

  return {
    teams: Array.from(teamMap.values()),
    matches,
    trainingData,
    trainSet,
    testSet,
    stats: {
      totalMatches: matches.length,
      completedMatches: trainingData.length,
      trainSize: trainSet.length,
      testSize: testSet.length,
      leagues: Array.from(leagues)
    }
  };
}

/**
 * Get team statistics for a specific date range
 */
export async function getTeamStatsInDateRange(
  teamId: string,
  startDate: string,
  endDate: string
): Promise<{
  avgShots: number;
  avgShotsOnTarget: number;
  avgPossession: number;
  avgXG: number;
  formPoints: number;
}> {
  const { data: stats, error } = await supabase
    .from('team_stats')
    .select('*')
    .eq('team_id', teamId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .limit(10);

  if (error || !stats || stats.length === 0) {
    return {
      avgShots: 12,
      avgShotsOnTarget: 5,
      avgPossession: 50,
      avgXG: 1.5,
      formPoints: 5
    };
  }

  // Calculate averages
  const avgShots = stats.reduce((sum, s) => sum + (s.shots || 0), 0) / stats.length;
  const avgShotsOnTarget = stats.reduce((sum, s) => sum + (s.shots_on_target || 0), 0) / stats.length;
  const avgPossession = stats.reduce((sum, s) => sum + (s.possession || 0), 0) / stats.length;
  const avgXG = stats.reduce((sum, s) => sum + (s.xg || 0), 0) / stats.length;

  // Get most recent form
  const formPoints = stats[0]?.form_points || 5;

  return {
    avgShots,
    avgShotsOnTarget,
    avgPossession,
    avgXG,
    formPoints
  };
}

/**
 * Calculate recent form for a team (last 5 matches)
 */
export async function calculateRecentForm(
  teamId: string,
  beforeDate?: string
): Promise<{
  formPoints: number;  // Points from last 5 matches
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
}> {
  let query = supabase
    .from('matches')
    .select('*')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)
    .order('match_date', { ascending: false })
    .limit(5);

  if (beforeDate) {
    query = query.lt('match_date', beforeDate);
  }

  const { data: matches, error } = await query;

  if (error || !matches || matches.length === 0) {
    return {
      formPoints: 5,
      wins: 1,
      draws: 2,
      losses: 2,
      goalsScored: 5,
      goalsConceded: 5
    };
  }

  let formPoints = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsScored = 0;
  let goalsConceded = 0;

  for (const match of matches) {
    const isHome = match.home_team_id === teamId;
    const teamScore = isHome ? match.home_score! : match.away_score!;
    const opponentScore = isHome ? match.away_score! : match.home_score!;

    goalsScored += teamScore;
    goalsConceded += opponentScore;

    if (teamScore > opponentScore) {
      formPoints += 3;
      wins++;
    } else if (teamScore === opponentScore) {
      formPoints += 1;
      draws++;
    } else {
      losses++;
    }
  }

  return {
    formPoints,
    wins,
    draws,
    losses,
    goalsScored,
    goalsConceded
  };
}

/**
 * Update team Elo ratings based on match result
 */
export async function updateTeamEloAfterMatch(
  matchId: string
): Promise<{ homeEloChange: number; awayEloChange: number }> {
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (matchError || !match || match.home_score === null || match.away_score === null) {
    throw new Error('Match not found or not completed');
  }

  const { data: homeTeam } = await supabase
    .from('teams')
    .select('*')
    .eq('id', match.home_team_id)
    .single();

  const { data: awayTeam } = await supabase
    .from('teams')
    .select('*')
    .eq('id', match.away_team_id)
    .single();

  if (!homeTeam || !awayTeam) {
    throw new Error('Teams not found');
  }

  // Calculate new Elo ratings using existing function
  const { updateEloRatings } = await import('../utils/mathUtils');
  const result = updateEloRatings(
    homeTeam.elo_rating,
    awayTeam.elo_rating,
    match.home_score,
    match.away_score,
    true
  );

  // Update teams in database
  await supabase
    .from('teams')
    .update({ elo_rating: result.newRatingA, updated_at: new Date().toISOString() })
    .eq('id', match.home_team_id);

  await supabase
    .from('teams')
    .update({ elo_rating: result.newRatingB, updated_at: new Date().toISOString() })
    .eq('id', match.away_team_id);

  return {
    homeEloChange: result.newRatingA - homeTeam.elo_rating,
    awayEloChange: result.newRatingB - awayTeam.elo_rating
  };
}

/**
 * Check if sufficient data is available for training
 */
export async function checkDataAvailability(): Promise<{
  hasData: boolean;
  teamsCount: number;
  matchesCount: number;
  completedMatchesCount: number;
  message: string;
}> {
  const { count: teamsCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true });

  const { count: matchesCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true });

  const { count: completedMatchesCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .not('home_score', 'is', null)
    .not('away_score', 'is', null);

  const hasData = (teamsCount || 0) >= 10 && (completedMatchesCount || 0) >= 50;

  let message = '';
  if (!hasData) {
    if ((teamsCount || 0) < 10) {
      message = `Insufficient teams: ${teamsCount || 0} (need at least 10)`;
    } else {
      message = `Insufficient completed matches: ${completedMatchesCount || 0} (need at least 50)`;
    }
  } else {
    message = `Ready for training: ${teamsCount} teams, ${completedMatchesCount} completed matches`;
  }

  return {
    hasData,
    teamsCount: teamsCount || 0,
    matchesCount: matchesCount || 0,
    completedMatchesCount: completedMatchesCount || 0,
    message
  };
}
