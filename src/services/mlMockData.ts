import { Team, Match } from '../lib/supabase';
import { MatchFeatures, MatchTarget, extractMatchFeatures, extractMatchTarget } from './mlFeatureExtractor';

/**
 * Generate realistic mock teams for testing
 */
export function generateMockTeams(): Team[] {
  const teams: Team[] = [
    // Premier League
    {
      id: '1', name: 'Manchester City', league: 'Premier League',
      elo_rating: 2100, avg_goals_scored: 2.5, avg_goals_conceded: 0.8, xg_per_match: 2.7,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },
    {
      id: '2', name: 'Liverpool', league: 'Premier League',
      elo_rating: 2050, avg_goals_scored: 2.3, avg_goals_conceded: 0.9, xg_per_match: 2.5,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },
    {
      id: '3', name: 'Arsenal', league: 'Premier League',
      elo_rating: 2000, avg_goals_scored: 2.2, avg_goals_conceded: 1.0, xg_per_match: 2.3,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },
    {
      id: '4', name: 'Chelsea', league: 'Premier League',
      elo_rating: 1950, avg_goals_scored: 1.9, avg_goals_conceded: 1.1, xg_per_match: 2.0,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },
    {
      id: '5', name: 'Newcastle', league: 'Premier League',
      elo_rating: 1900, avg_goals_scored: 1.8, avg_goals_conceded: 1.2, xg_per_match: 1.9,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },
    {
      id: '6', name: 'Tottenham', league: 'Premier League',
      elo_rating: 1880, avg_goals_scored: 1.9, avg_goals_conceded: 1.3, xg_per_match: 2.0,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },
    {
      id: '7', name: 'Aston Villa', league: 'Premier League',
      elo_rating: 1820, avg_goals_scored: 1.6, avg_goals_conceded: 1.3, xg_per_match: 1.7,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },
    {
      id: '8', name: 'Brighton', league: 'Premier League',
      elo_rating: 1780, avg_goals_scored: 1.5, avg_goals_conceded: 1.4, xg_per_match: 1.6,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },
    {
      id: '9', name: 'West Ham', league: 'Premier League',
      elo_rating: 1720, avg_goals_scored: 1.4, avg_goals_conceded: 1.5, xg_per_match: 1.5,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },
    {
      id: '10', name: 'Everton', league: 'Premier League',
      elo_rating: 1650, avg_goals_scored: 1.2, avg_goals_conceded: 1.6, xg_per_match: 1.3,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },

    // La Liga
    {
      id: '11', name: 'Real Madrid', league: 'La Liga',
      elo_rating: 2120, avg_goals_scored: 2.6, avg_goals_conceded: 0.9, xg_per_match: 2.8,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },
    {
      id: '12', name: 'Barcelona', league: 'La Liga',
      elo_rating: 2080, avg_goals_scored: 2.4, avg_goals_conceded: 1.0, xg_per_match: 2.6,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },
    {
      id: '13', name: 'Atletico Madrid', league: 'La Liga',
      elo_rating: 1980, avg_goals_scored: 1.9, avg_goals_conceded: 0.9, xg_per_match: 1.9,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },
    {
      id: '14', name: 'Sevilla', league: 'La Liga',
      elo_rating: 1850, avg_goals_scored: 1.6, avg_goals_conceded: 1.2, xg_per_match: 1.7,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },
    {
      id: '15', name: 'Valencia', league: 'La Liga',
      elo_rating: 1780, avg_goals_scored: 1.4, avg_goals_conceded: 1.4, xg_per_match: 1.5,
      created_at: '2024-01-01', updated_at: '2024-01-01'
    },
  ];

  return teams;
}

/**
 * Generate realistic match results based on team strengths
 */
export function generateMockMatches(teams: Team[], count: number = 100): Match[] {
  const matches: Match[] = [];

  for (let i = 0; i < count; i++) {
    // Randomly select two different teams
    const homeIdx = Math.floor(Math.random() * teams.length);
    let awayIdx = Math.floor(Math.random() * teams.length);
    while (awayIdx === homeIdx) {
      awayIdx = Math.floor(Math.random() * teams.length);
    }

    const homeTeam = teams[homeIdx];
    const awayTeam = teams[awayIdx];

    // Simulate match result based on team strengths
    const homeStrength = (homeTeam.elo_rating + homeTeam.avg_goals_scored * 100 - awayTeam.avg_goals_conceded * 50) / 1000;
    const awayStrength = (awayTeam.elo_rating + awayTeam.avg_goals_scored * 100 - homeTeam.avg_goals_conceded * 50) / 1000;

    // Home advantage
    const homeBoost = 1.15;
    const adjustedHomeStrength = homeStrength * homeBoost;

    // Generate goals using Poisson-like distribution
    const homeGoals = Math.max(0, Math.round(adjustedHomeStrength + (Math.random() - 0.3) * 2));
    const awayGoals = Math.max(0, Math.round(awayStrength + (Math.random() - 0.3) * 2));

    matches.push({
      id: `match-${i}`,
      home_team_id: homeTeam.id,
      away_team_id: awayTeam.id,
      match_date: new Date(2024, 0, 1 + i).toISOString(),
      league: homeTeam.league,
      home_score: homeGoals,
      away_score: awayGoals,
      created_at: '2024-01-01'
    });
  }

  return matches;
}

/**
 * Generate training data from matches
 */
export function generateTrainingData(
  matches: Match[],
  teams: Team[]
): Array<{ features: MatchFeatures; target: MatchTarget }> {
  const trainingData: Array<{ features: MatchFeatures; target: MatchTarget }> = [];

  for (const match of matches) {
    const homeTeam = teams.find(t => t.id === match.home_team_id);
    const awayTeam = teams.find(t => t.id === match.away_team_id);

    if (!homeTeam || !awayTeam) continue;

    const features = extractMatchFeatures(homeTeam, awayTeam, match.league);
    const target = extractMatchTarget(match);

    if (target) {
      trainingData.push({ features, target });
    }
  }

  return trainingData;
}

/**
 * Split data into training and test sets
 */
export function trainTestSplit<T>(
  data: T[],
  testRatio: number = 0.2
): { train: T[]; test: T[] } {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(data.length * (1 - testRatio));

  return {
    train: shuffled.slice(0, splitIndex),
    test: shuffled.slice(splitIndex)
  };
}

/**
 * Generate comprehensive mock dataset for ML training
 */
export function generateMockDataset(numMatches: number = 200): {
  teams: Team[];
  matches: Match[];
  trainingData: Array<{ features: MatchFeatures; target: MatchTarget }>;
  trainSet: Array<{ features: MatchFeatures; target: MatchTarget }>;
  testSet: Array<{ features: MatchFeatures; target: MatchTarget }>;
} {
  const teams = generateMockTeams();
  const matches = generateMockMatches(teams, numMatches);
  const trainingData = generateTrainingData(matches, teams);
  const { train, test } = trainTestSplit(trainingData, 0.2);

  return {
    teams,
    matches,
    trainingData,
    trainSet: train,
    testSet: test
  };
}
