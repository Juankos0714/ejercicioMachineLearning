import { Team } from '../lib/supabase';
import {
  calculatePoissonProbabilities,
  calculateExpectedLambda,
  calculateOver25Probability,
  monteCarloSimulation,
  type PoissonProbabilities,
  type MonteCarloResult
} from '../utils/mathUtils';
import { extractMatchFeatures, type MatchFeatures } from './mlFeatureExtractor';
import {
  extractAdvancedFeatures,
  type AdvancedMatchFeatures,
  type FormData,
  type HeadToHeadData,
  type TeamAdvancedStats,
  mockFormData,
  mockHeadToHeadData,
  mockAdvancedStats
} from './mlAdvancedFeatures';
import {
  extractUltraFeatures,
  type UltraMatchFeatures,
  type UltraTeamStats
} from './mlUltraFeatures';
import { predictRandomForest, type RandomForestPrediction, type TrainedRandomForestModel } from './mlRandomForest';
import { predictNeuralNetwork, type NeuralNetworkPrediction, type TrainedNeuralNetwork } from './mlNeuralNetwork';

export interface HybridPrediction {
  // Final predictions (weighted combination)
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  expectedHomeScore: number;
  expectedAwayScore: number;
  over25Prob: number;

  // Individual method predictions
  mathematical: {
    poisson: PoissonProbabilities;
    monteCarlo: MonteCarloResult;
    lambdaHome: number;
    lambdaAway: number;
  };
  machineLearning?: {
    randomForest?: RandomForestPrediction;
    neuralNetwork?: NeuralNetworkPrediction;
  };

  // Metadata
  confidence: number;
  method: 'mathematical' | 'hybrid';
  featureLevel: FeatureLevel;
  featureCount: number;
  homeTeam: Team;
  awayTeam: Team;
}

export interface HybridModels {
  randomForest?: TrainedRandomForestModel;
  neuralNetwork?: TrainedNeuralNetwork;
}

export type FeatureLevel = 'basic' | 'advanced' | 'ultra';

export interface ExtendedMatchData {
  // For advanced features
  homeForm?: FormData;
  awayForm?: FormData;
  h2h?: HeadToHeadData;
  homeAdvancedStats?: TeamAdvancedStats;
  awayAdvancedStats?: TeamAdvancedStats;
  matchDate?: Date;

  // For ultra features
  homeUltraStats?: UltraTeamStats;
  awayUltraStats?: UltraTeamStats;
}

/**
 * Make hybrid prediction combining mathematical and ML methods
 * @param homeTeam Home team data
 * @param awayTeam Away team data
 * @param league League name
 * @param models ML models (optional)
 * @param weights Model weights for ensemble
 * @param extendedData Extended statistics (optional, for advanced/ultra features)
 * @param featureLevel Force specific feature level (auto-detects if not specified)
 */
export async function predictHybrid(
  homeTeam: Team,
  awayTeam: Team,
  league: string,
  models?: HybridModels,
  weights = {
    mathematical: 0.4,
    randomForest: 0.3,
    neuralNetwork: 0.3
  },
  extendedData?: ExtendedMatchData,
  featureLevel?: FeatureLevel
): Promise<HybridPrediction> {
  // Step 1: Calculate mathematical predictions (always available)
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
  const over25Poisson = calculateOver25Probability(lambdaHome, lambdaAway);

  // Average Poisson and Monte Carlo for mathematical prediction
  const mathHomeWin = (poissonResult.homeWin + monteCarloResult.homeWinProb) / 2;
  const mathDraw = (poissonResult.draw + monteCarloResult.drawProb) / 2;
  const mathAwayWin = (poissonResult.awayWin + monteCarloResult.awayWinProb) / 2;
  const mathOver25 = (over25Poisson + monteCarloResult.over25Prob) / 2;

  // Step 2: Extract features for ML models based on available data
  let features: MatchFeatures | AdvancedMatchFeatures | UltraMatchFeatures;
  let actualFeatureLevel: FeatureLevel = featureLevel || 'basic';

  // Auto-detect feature level if not specified
  if (!featureLevel) {
    if (extendedData?.homeUltraStats && extendedData?.awayUltraStats) {
      actualFeatureLevel = 'ultra';
    } else if (extendedData?.homeForm && extendedData?.awayForm) {
      actualFeatureLevel = 'advanced';
    } else {
      actualFeatureLevel = 'basic';
    }
  }

  // Extract appropriate features
  if (actualFeatureLevel === 'ultra' && extendedData?.homeUltraStats && extendedData?.awayUltraStats) {
    // Use ultra features (112 features)
    extractMatchFeatures(homeTeam, awayTeam, league);
    const advancedFeatures = extractAdvancedFeatures(
      homeTeam,
      awayTeam,
      league,
      extendedData.homeForm || mockFormData(),
      extendedData.awayForm || mockFormData(),
      extendedData.h2h || mockHeadToHeadData(),
      extendedData.homeAdvancedStats || mockAdvancedStats(),
      extendedData.awayAdvancedStats || mockAdvancedStats(),
      extendedData.matchDate
    );
    features = extractUltraFeatures(
      homeTeam,
      awayTeam,
      league,
      extendedData.homeUltraStats,
      extendedData.awayUltraStats,
      advancedFeatures
    );
  } else if (actualFeatureLevel === 'advanced' && extendedData) {
    // Use advanced features (45 features)
    features = extractAdvancedFeatures(
      homeTeam,
      awayTeam,
      league,
      extendedData.homeForm || mockFormData(),
      extendedData.awayForm || mockFormData(),
      extendedData.h2h || mockHeadToHeadData(),
      extendedData.homeAdvancedStats || mockAdvancedStats(),
      extendedData.awayAdvancedStats || mockAdvancedStats(),
      extendedData.matchDate
    );
  } else {
    // Use basic features (19 features)
    features = extractMatchFeatures(homeTeam, awayTeam, league);
  }

  let finalHomeWin = mathHomeWin;
  let finalDraw = mathDraw;
  let finalAwayWin = mathAwayWin;
  let finalOver25 = mathOver25;
  let finalHomeGoals = lambdaHome;
  let finalAwayGoals = lambdaAway;
  let confidence = 0.7; // Base confidence for mathematical only
  let method: 'mathematical' | 'hybrid' = 'mathematical';

  const mlPredictions: {
    randomForest?: RandomForestPrediction;
    neuralNetwork?: NeuralNetworkPrediction;
  } = {};

  // Step 3: Apply ML models if available
  if (models) {
    let totalWeight = weights.mathematical;
    let weightedHomeWin = mathHomeWin * weights.mathematical;
    let weightedDraw = mathDraw * weights.mathematical;
    let weightedAwayWin = mathAwayWin * weights.mathematical;
    let weightedOver25 = mathOver25 * weights.mathematical;
    let weightedHomeGoals = lambdaHome * weights.mathematical;
    let weightedAwayGoals = lambdaAway * weights.mathematical;
    let confidenceSum = 0.7 * weights.mathematical;

    // Random Forest prediction
    if (models.randomForest) {
      const rfPred = predictRandomForest(models.randomForest, features);
      mlPredictions.randomForest = rfPred;

      weightedHomeWin += rfPred.homeWinProb * weights.randomForest;
      weightedDraw += rfPred.drawProb * weights.randomForest;
      weightedAwayWin += rfPred.awayWinProb * weights.randomForest;
      weightedOver25 += rfPred.over25Prob * weights.randomForest;
      confidenceSum += rfPred.confidence * weights.randomForest;
      totalWeight += weights.randomForest;
    }

    // Neural Network prediction
    if (models.neuralNetwork) {
      const nnPred = await predictNeuralNetwork(models.neuralNetwork, features);
      mlPredictions.neuralNetwork = nnPred;

      weightedHomeWin += nnPred.homeWinProb * weights.neuralNetwork;
      weightedDraw += nnPred.drawProb * weights.neuralNetwork;
      weightedAwayWin += nnPred.awayWinProb * weights.neuralNetwork;
      weightedOver25 += nnPred.over25Prob * weights.neuralNetwork;
      weightedHomeGoals += nnPred.expectedHomeGoals * weights.neuralNetwork;
      weightedAwayGoals += nnPred.expectedAwayGoals * weights.neuralNetwork;
      confidenceSum += nnPred.confidence * weights.neuralNetwork;
      totalWeight += weights.neuralNetwork;
    }

    // Normalize weighted predictions
    if (totalWeight > 0) {
      finalHomeWin = weightedHomeWin / totalWeight;
      finalDraw = weightedDraw / totalWeight;
      finalAwayWin = weightedAwayWin / totalWeight;
      finalOver25 = weightedOver25 / totalWeight;
      finalHomeGoals = weightedHomeGoals / totalWeight;
      finalAwayGoals = weightedAwayGoals / totalWeight;
      confidence = confidenceSum / totalWeight;
      method = 'hybrid';
    }
  }

  // Ensure probabilities sum to 1
  const total = finalHomeWin + finalDraw + finalAwayWin;
  if (total > 0) {
    finalHomeWin /= total;
    finalDraw /= total;
    finalAwayWin /= total;
  }

  // Calculate feature count based on level
  const featureCount = actualFeatureLevel === 'ultra' ? 112 :
                      actualFeatureLevel === 'advanced' ? 45 : 19;

  return {
    homeWinProb: finalHomeWin,
    drawProb: finalDraw,
    awayWinProb: finalAwayWin,
    expectedHomeScore: finalHomeGoals,
    expectedAwayScore: finalAwayGoals,
    over25Prob: finalOver25,
    mathematical: {
      poisson: poissonResult,
      monteCarlo: monteCarloResult,
      lambdaHome,
      lambdaAway,
    },
    machineLearning: Object.keys(mlPredictions).length > 0 ? mlPredictions : undefined,
    confidence,
    method,
    featureLevel: actualFeatureLevel,
    featureCount,
    homeTeam,
    awayTeam,
  };
}

/**
 * Compare predictions across different methods
 */
export interface PredictionComparison {
  mathematical: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over25: number;
  };
  randomForest?: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over25: number;
  };
  neuralNetwork?: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over25: number;
  };
  hybrid: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over25: number;
  };
  consensus: {
    mostLikely: 'home' | 'draw' | 'away';
    confidence: number;
  };
}

export async function comparePredictions(
  homeTeam: Team,
  awayTeam: Team,
  league: string,
  models?: HybridModels,
  extendedData?: ExtendedMatchData,
  featureLevel?: FeatureLevel
): Promise<PredictionComparison> {
  const hybrid = await predictHybrid(homeTeam, awayTeam, league, models, undefined, extendedData, featureLevel);

  const comparison: PredictionComparison = {
    mathematical: {
      homeWin: (hybrid.mathematical.poisson.homeWin + hybrid.mathematical.monteCarlo.homeWinProb) / 2,
      draw: (hybrid.mathematical.poisson.draw + hybrid.mathematical.monteCarlo.drawProb) / 2,
      awayWin: (hybrid.mathematical.poisson.awayWin + hybrid.mathematical.monteCarlo.awayWinProb) / 2,
      over25: hybrid.mathematical.monteCarlo.over25Prob,
    },
    hybrid: {
      homeWin: hybrid.homeWinProb,
      draw: hybrid.drawProb,
      awayWin: hybrid.awayWinProb,
      over25: hybrid.over25Prob,
    },
    consensus: {
      mostLikely: 'home',
      confidence: hybrid.confidence,
    },
  };

  if (hybrid.machineLearning?.randomForest) {
    comparison.randomForest = {
      homeWin: hybrid.machineLearning.randomForest.homeWinProb,
      draw: hybrid.machineLearning.randomForest.drawProb,
      awayWin: hybrid.machineLearning.randomForest.awayWinProb,
      over25: hybrid.machineLearning.randomForest.over25Prob,
    };
  }

  if (hybrid.machineLearning?.neuralNetwork) {
    comparison.neuralNetwork = {
      homeWin: hybrid.machineLearning.neuralNetwork.homeWinProb,
      draw: hybrid.machineLearning.neuralNetwork.drawProb,
      awayWin: hybrid.machineLearning.neuralNetwork.awayWinProb,
      over25: hybrid.machineLearning.neuralNetwork.over25Prob,
    };
  }

  // Determine consensus
  const maxProb = Math.max(hybrid.homeWinProb, hybrid.drawProb, hybrid.awayWinProb);
  if (hybrid.homeWinProb === maxProb) {
    comparison.consensus.mostLikely = 'home';
  } else if (hybrid.drawProb === maxProb) {
    comparison.consensus.mostLikely = 'draw';
  } else {
    comparison.consensus.mostLikely = 'away';
  }

  return comparison;
}

/**
 * Calculate ensemble accuracy improvement
 */
export function calculateEnsembleMetrics(
  predictions: HybridPrediction[],
  actualResults: Array<{ homeWin: number; draw: number; awayWin: number }>
): {
  accuracy: number;
  brierScore: number;
  logLoss: number;
  calibration: number;
} {
  let correct = 0;
  let brierSum = 0;
  let logLossSum = 0;
  let calibrationSum = 0;

  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i];
    const actual = actualResults[i];

    // Accuracy
    const predOutcome = pred.homeWinProb > pred.drawProb && pred.homeWinProb > pred.awayWinProb ? 'home' :
                       pred.drawProb > pred.awayWinProb ? 'draw' : 'away';
    const actualOutcome = actual.homeWin === 1 ? 'home' :
                         actual.draw === 1 ? 'draw' : 'away';
    if (predOutcome === actualOutcome) correct++;

    // Brier Score
    brierSum += Math.pow(pred.homeWinProb - actual.homeWin, 2) +
                Math.pow(pred.drawProb - actual.draw, 2) +
                Math.pow(pred.awayWinProb - actual.awayWin, 2);

    // Log Loss
    const epsilon = 1e-15;
    const clippedHomeProb = Math.max(epsilon, Math.min(1 - epsilon, pred.homeWinProb));
    const clippedDrawProb = Math.max(epsilon, Math.min(1 - epsilon, pred.drawProb));
    const clippedAwayProb = Math.max(epsilon, Math.min(1 - epsilon, pred.awayWinProb));

    logLossSum += -(actual.homeWin * Math.log(clippedHomeProb) +
                    actual.draw * Math.log(clippedDrawProb) +
                    actual.awayWin * Math.log(clippedAwayProb));

    // Calibration (simplified)
    calibrationSum += Math.abs(pred.homeWinProb - actual.homeWin);
  }

  return {
    accuracy: correct / predictions.length,
    brierScore: brierSum / (predictions.length * 3),
    logLoss: logLossSum / predictions.length,
    calibration: 1 - (calibrationSum / predictions.length),
  };
}
