export interface EloUpdateResult {
  newRatingA: number;
  newRatingB: number;
}

export interface PoissonProbabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
  scoreMatrix: number[][];
}

export interface MonteCarloResult {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  avgHomeScore: number;
  avgAwayScore: number;
  over25Prob: number;
  scoreDistribution: Map<string, number>;
}

const K_BASE = 32;
const HOME_ADVANTAGE = 0.15;

export function calculateEloExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function updateEloRatings(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  scoreB: number,
  isHomeA: boolean = true
): EloUpdateResult {
  const adjustedRatingB = isHomeA ? ratingB - HOME_ADVANTAGE * 100 : ratingB;
  const expectedA = calculateEloExpectedScore(ratingA, adjustedRatingB);

  let actualA: number;
  if (scoreA > scoreB) actualA = 1.0;
  else if (scoreA < scoreB) actualA = 0.0;
  else actualA = 0.5;

  const goalDiffMultiplier = 1 + Math.abs(scoreA - scoreB) / 8;
  const K = K_BASE * goalDiffMultiplier;

  const newRatingA = ratingA + K * (actualA - expectedA);
  const newRatingB = ratingB + K * ((1 - actualA) - (1 - expectedA));

  return { newRatingA, newRatingB };
}

function poissonPMF(lambda: number, k: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  if (lambda <= 0) return k === 0 ? 1 : 0;

  let result = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) {
    result *= lambda / i;
  }
  return result;
}

export function calculatePoissonProbabilities(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals: number = 10
): PoissonProbabilities {
  const scoreMatrix: number[][] = [];
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;

  for (let h = 0; h <= maxGoals; h++) {
    scoreMatrix[h] = [];
    const probHome = poissonPMF(lambdaHome, h);

    for (let a = 0; a <= maxGoals; a++) {
      const probAway = poissonPMF(lambdaAway, a);
      const jointProb = probHome * probAway;
      scoreMatrix[h][a] = jointProb;

      if (h > a) homeWin += jointProb;
      else if (h === a) draw += jointProb;
      else awayWin += jointProb;
    }
  }

  const total = homeWin + draw + awayWin;
  return {
    homeWin: homeWin / total,
    draw: draw / total,
    awayWin: awayWin / total,
    scoreMatrix
  };
}

export function monteCarloSimulation(
  lambdaHome: number,
  lambdaAway: number,
  nSimulations: number = 10000
): MonteCarloResult {
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let totalHomeGoals = 0;
  let totalAwayGoals = 0;
  let over25 = 0;

  const scoreDistribution = new Map<string, number>();

  for (let i = 0; i < nSimulations; i++) {
    const homeGoals = poissonRandom(lambdaHome);
    const awayGoals = poissonRandom(lambdaAway);

    totalHomeGoals += homeGoals;
    totalAwayGoals += awayGoals;

    if (homeGoals > awayGoals) homeWins++;
    else if (homeGoals === awayGoals) draws++;
    else awayWins++;

    if (homeGoals + awayGoals > 2.5) over25++;

    const scoreKey = `${homeGoals}-${awayGoals}`;
    scoreDistribution.set(scoreKey, (scoreDistribution.get(scoreKey) || 0) + 1);
  }

  return {
    homeWinProb: homeWins / nSimulations,
    drawProb: draws / nSimulations,
    awayWinProb: awayWins / nSimulations,
    avgHomeScore: totalHomeGoals / nSimulations,
    avgAwayScore: totalAwayGoals / nSimulations,
    over25Prob: over25 / nSimulations,
    scoreDistribution
  };
}

function poissonRandom(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;

  do {
    k++;
    p *= Math.random();
  } while (p > L);

  return k - 1;
}

export function calculateOver25Probability(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals: number = 10
): number {
  let probUnder25 = 0;

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      if (h + a <= 2) {
        probUnder25 += poissonPMF(lambdaHome, h) * poissonPMF(lambdaAway, a);
      }
    }
  }

  return 1 - probUnder25;
}

export function calculateXG(
  shots: number,
  shotsOnTarget: number,
  possession: number
): number {
  const shotQuality = shotsOnTarget / Math.max(shots, 1);
  const possessionFactor = possession / 50;

  const baseXG = shots * 0.1 * shotQuality;
  return baseXG * possessionFactor;
}

export function calculateExpectedLambda(
  avgGoalsScored: number,
  avgGoalsConceded: number,
  xgPerMatch: number,
  eloRating: number,
  opponentEloRating: number,
  isHome: boolean
): number {
  const eloAdvantage = (eloRating - opponentEloRating) / 400;
  const homeAdvantage = isHome ? HOME_ADVANTAGE : -HOME_ADVANTAGE;

  const attackStrength = (avgGoalsScored + xgPerMatch) / 2;
  const defenseWeakness = avgGoalsConceded;

  const lambda = attackStrength * (1 + eloAdvantage * 0.5 + homeAdvantage) *
                 (defenseWeakness / 1.5);

  return Math.max(0.3, Math.min(4.0, lambda));
}

export function calculateBrierScore(
  predictedProbs: { home: number; draw: number; away: number },
  actualResult: { home: number; draw: number; away: number }
): number {
  const homeError = Math.pow(predictedProbs.home - actualResult.home, 2);
  const drawError = Math.pow(predictedProbs.draw - actualResult.draw, 2);
  const awayError = Math.pow(predictedProbs.away - actualResult.away, 2);

  return (homeError + drawError + awayError) / 3;
}

export function exponentialWeightedAverage(
  values: number[],
  alpha: number = 0.3
): number {
  if (values.length === 0) return 0;

  let ewa = values[0];
  for (let i = 1; i < values.length; i++) {
    ewa = alpha * values[i] + (1 - alpha) * ewa;
  }
  return ewa;
}
