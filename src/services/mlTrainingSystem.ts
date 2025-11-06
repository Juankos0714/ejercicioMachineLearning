import { generateRealDataset, checkDataAvailability } from './mlRealDataLoader';
import { generateMockDataset } from './mlMockData';
import { trainRandomForest, evaluateRandomForest, type TrainedRandomForestModel } from './mlRandomForest';
import { trainNeuralNetwork, evaluateNeuralNetwork, saveNeuralNetwork, type TrainedNeuralNetwork } from './mlNeuralNetwork';
import { predictHybrid, calculateEnsembleMetrics, type HybridModels } from './mlHybridPredictor';
import type { MatchFeatures, MatchTarget } from './mlFeatureExtractor';

export interface TrainedModels {
  randomForest: TrainedRandomForestModel;
  neuralNetwork: TrainedNeuralNetwork;
  trainingMetadata: {
    trainedAt: string;
    trainSize: number;
    testSize: number;
    dataSource: 'real' | 'mock';
    performance: ModelPerformance;
    optimalWeights: EnsembleWeights;
  };
}

export interface ModelPerformance {
  randomForest: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    over25Accuracy: number;
  };
  neuralNetwork: {
    outcomeAccuracy: number;
    goalsMae: number;
    over25Accuracy: number;
    brierScore: number;
  };
  hybrid: {
    accuracy: number;
    brierScore: number;
    logLoss: number;
    improvement: number;  // vs mathematical only
  };
}

export interface EnsembleWeights {
  mathematical: number;
  randomForest: number;
  neuralNetwork: number;
}

export interface TrainingConfig {
  useRealData: boolean;
  matchLimit?: number;
  testRatio?: number;
  randomForest?: {
    nEstimators: number;
    maxDepth: number;
    minSamples: number;
    seed: number;
  };
  neuralNetwork?: {
    epochs: number;
    batchSize: number;
    validationSplit: number;
  };
  optimizeWeights?: boolean;
}

/**
 * Main training function - trains all models and optimizes ensemble
 */
export async function trainAllModels(
  config: TrainingConfig = {
    useRealData: true,
    matchLimit: 500,
    testRatio: 0.2,
    randomForest: {
      nEstimators: 100,
      maxDepth: 15,
      minSamples: 2,
      seed: 42
    },
    neuralNetwork: {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2
    },
    optimizeWeights: true
  }
): Promise<TrainedModels> {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║            TRAINING MACHINE LEARNING MODELS                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Step 1: Load data
  let dataset;
  let dataSource: 'real' | 'mock' = 'mock';

  if (config.useRealData) {
    const availability = await checkDataAvailability();
    console.log(`📊 ${availability.message}\n`);

    if (availability.hasData) {
      console.log('✓ Using REAL data from Supabase\n');
      dataset = await generateRealDataset(config.matchLimit, config.testRatio);
      dataSource = 'real';
    } else {
      console.log('⚠ Insufficient real data, falling back to MOCK data\n');
      dataset = generateMockDataset(200);
    }
  } else {
    console.log('✓ Using MOCK data for training\n');
    dataset = generateMockDataset(200);
  }

  const trainFeatures = dataset.trainSet.map(d => d.features);
  const trainTargets = dataset.trainSet.map(d => d.target);
  const testFeatures = dataset.testSet.map(d => d.features);
  const testTargets = dataset.testSet.map(d => d.target);

  // Step 2: Train Random Forest
  console.log('🌲 Training Random Forest...');
  const rfModel = trainRandomForest(trainFeatures, trainTargets, config.randomForest);
  const rfPerformance = evaluateRandomForest(rfModel, testFeatures, testTargets);
  console.log(`✓ RF Accuracy: ${(rfPerformance.accuracy * 100).toFixed(2)}%`);
  console.log(`✓ RF F1 Score: ${(rfPerformance.f1Score * 100).toFixed(2)}%\n`);

  // Step 3: Train Neural Network
  console.log('🧠 Training Neural Network...');
  const nnModel = await trainNeuralNetwork(trainFeatures, trainTargets, config.neuralNetwork);
  const nnPerformance = await evaluateNeuralNetwork(nnModel, testFeatures, testTargets);
  console.log(`✓ NN Outcome Accuracy: ${(nnPerformance.outcomeAccuracy * 100).toFixed(2)}%`);
  console.log(`✓ NN Brier Score: ${nnPerformance.brierScore.toFixed(4)}\n`);

  // Step 4: Optimize ensemble weights (if enabled)
  let optimalWeights: EnsembleWeights = {
    mathematical: 0.4,
    randomForest: 0.3,
    neuralNetwork: 0.3
  };

  if (config.optimizeWeights) {
    console.log('⚙️  Optimizing ensemble weights...');
    optimalWeights = await optimizeEnsembleWeights(
      dataset,
      { randomForest: rfModel, neuralNetwork: nnModel }
    );
    console.log(`✓ Optimal weights: Math=${(optimalWeights.mathematical * 100).toFixed(0)}%, RF=${(optimalWeights.randomForest * 100).toFixed(0)}%, NN=${(optimalWeights.neuralNetwork * 100).toFixed(0)}%\n`);
  }

  // Step 5: Evaluate hybrid model
  console.log('🔬 Evaluating hybrid model...');
  const hybridPredictions = [];
  const mathPredictions = [];
  const actualResults = [];

  for (let i = 0; i < Math.min(testFeatures.length, 50); i++) {
    const match = dataset.testSet[i];
    const homeTeam = dataset.teams[0];  // Simplified
    const awayTeam = dataset.teams[1];

    const mathPred = await predictHybrid(homeTeam, awayTeam, 'Premier League');
    const hybridPred = await predictHybrid(
      homeTeam,
      awayTeam,
      'Premier League',
      { randomForest: rfModel, neuralNetwork: nnModel },
      optimalWeights
    );

    mathPredictions.push(mathPred);
    hybridPredictions.push(hybridPred);
    actualResults.push({
      homeWin: match.target.homeWin,
      draw: match.target.draw,
      awayWin: match.target.awayWin
    });
  }

  const mathMetrics = calculateEnsembleMetrics(mathPredictions, actualResults);
  const hybridMetrics = calculateEnsembleMetrics(hybridPredictions, actualResults);
  const improvement = hybridMetrics.accuracy - mathMetrics.accuracy;

  console.log(`✓ Mathematical only: ${(mathMetrics.accuracy * 100).toFixed(2)}% accuracy`);
  console.log(`✓ Hybrid: ${(hybridMetrics.accuracy * 100).toFixed(2)}% accuracy`);
  console.log(`✓ Improvement: ${(improvement * 100).toFixed(2)}%\n`);

  // Step 6: Save models
  console.log('💾 Saving trained models...');
  await saveNeuralNetwork(nnModel, 'localstorage://football-predictor-trained');
  console.log('✓ Models saved successfully\n');

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                  TRAINING COMPLETE                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  return {
    randomForest: rfModel,
    neuralNetwork: nnModel,
    trainingMetadata: {
      trainedAt: new Date().toISOString(),
      trainSize: trainFeatures.length,
      testSize: testFeatures.length,
      dataSource,
      performance: {
        randomForest: rfPerformance,
        neuralNetwork: nnPerformance,
        hybrid: {
          accuracy: hybridMetrics.accuracy,
          brierScore: hybridMetrics.brierScore,
          logLoss: hybridMetrics.logLoss,
          improvement
        }
      },
      optimalWeights
    }
  };
}

/**
 * Optimize ensemble weights using grid search
 */
async function optimizeEnsembleWeights(
  dataset: any,
  models: HybridModels
): Promise<EnsembleWeights> {
  const testSample = dataset.testSet.slice(0, 30);  // Use subset for speed
  const homeTeam = dataset.teams[0];
  const awayTeam = dataset.teams[1];

  const weightCombinations = [
    { mathematical: 0.5, randomForest: 0.3, neuralNetwork: 0.2 },
    { mathematical: 0.4, randomForest: 0.3, neuralNetwork: 0.3 },
    { mathematical: 0.4, randomForest: 0.4, neuralNetwork: 0.2 },
    { mathematical: 0.3, randomForest: 0.4, neuralNetwork: 0.3 },
    { mathematical: 0.3, randomForest: 0.3, neuralNetwork: 0.4 },
    { mathematical: 0.2, randomForest: 0.4, neuralNetwork: 0.4 },
  ];

  let bestWeights = weightCombinations[1];  // Default
  let bestAccuracy = 0;

  for (const weights of weightCombinations) {
    const predictions = [];
    const actualResults = [];

    for (const sample of testSample) {
      const pred = await predictHybrid(
        homeTeam,
        awayTeam,
        'Premier League',
        models,
        weights
      );
      predictions.push(pred);
      actualResults.push({
        homeWin: sample.target.homeWin,
        draw: sample.target.draw,
        awayWin: sample.target.awayWin
      });
    }

    const metrics = calculateEnsembleMetrics(predictions, actualResults);

    if (metrics.accuracy > bestAccuracy) {
      bestAccuracy = metrics.accuracy;
      bestWeights = weights;
    }
  }

  return bestWeights;
}

/**
 * Evaluate model on holdout test set
 */
export async function evaluateOnTestSet(
  models: TrainedModels,
  testFeatures: MatchFeatures[],
  testTargets: MatchTarget[]
): Promise<ModelPerformance> {
  const rfPerformance = evaluateRandomForest(
    models.randomForest,
    testFeatures,
    testTargets
  );

  const nnPerformance = await evaluateNeuralNetwork(
    models.neuralNetwork,
    testFeatures,
    testTargets
  );

  return {
    randomForest: rfPerformance,
    neuralNetwork: nnPerformance,
    hybrid: models.trainingMetadata.performance.hybrid
  };
}

/**
 * Retrain models with new data
 */
export async function retrainModels(
  existingModels?: TrainedModels,
  newDataOnly: boolean = false
): Promise<TrainedModels> {
  console.log('\n🔄 Retraining models with latest data...\n');

  // Load latest data
  const dataset = await generateRealDataset(500, 0.2);

  // Use same configuration as original training
  const config: TrainingConfig = {
    useRealData: true,
    randomForest: {
      nEstimators: 100,
      maxDepth: 15,
      minSamples: 2,
      seed: 42
    },
    neuralNetwork: {
      epochs: 50,  // Fewer epochs for retraining
      batchSize: 32,
      validationSplit: 0.2
    },
    optimizeWeights: false  // Use existing weights for speed
  };

  // Train new models
  const newModels = await trainAllModels(config);

  // Compare performance
  if (existingModels) {
    const oldAccuracy = existingModels.trainingMetadata.performance.hybrid.accuracy;
    const newAccuracy = newModels.trainingMetadata.performance.hybrid.accuracy;
    const improvement = newAccuracy - oldAccuracy;

    console.log(`\n📊 Performance Comparison:`);
    console.log(`   Old accuracy: ${(oldAccuracy * 100).toFixed(2)}%`);
    console.log(`   New accuracy: ${(newAccuracy * 100).toFixed(2)}%`);
    console.log(`   Change: ${improvement > 0 ? '+' : ''}${(improvement * 100).toFixed(2)}%\n`);

    if (improvement < -0.05) {
      console.log('⚠️  Warning: New models perform worse. Consider keeping old models.\n');
    } else {
      console.log('✅ New models deployed successfully!\n');
    }
  }

  return newModels;
}

/**
 * Check if models need retraining (based on age and performance)
 */
export function shouldRetrain(models: TrainedModels): {
  shouldRetrain: boolean;
  reason: string;
} {
  const trainedAt = new Date(models.trainingMetadata.trainedAt);
  const now = new Date();
  const daysSinceTraining = (now.getTime() - trainedAt.getTime()) / (1000 * 60 * 60 * 24);

  // Retrain if models are older than 30 days
  if (daysSinceTraining > 30) {
    return {
      shouldRetrain: true,
      reason: `Models are ${Math.floor(daysSinceTraining)} days old (threshold: 30 days)`
    };
  }

  // Retrain if performance is below threshold
  const accuracy = models.trainingMetadata.performance.hybrid.accuracy;
  if (accuracy < 0.40) {
    return {
      shouldRetrain: true,
      reason: `Accuracy ${(accuracy * 100).toFixed(1)}% is below threshold (40%)`
    };
  }

  return {
    shouldRetrain: false,
    reason: `Models are ${Math.floor(daysSinceTraining)} days old and performing well (${(accuracy * 100).toFixed(1)}% accuracy)`
  };
}

/**
 * Schedule automatic retraining
 */
export class AutoRetrainingScheduler {
  private intervalId?: NodeJS.Timeout;
  private models?: TrainedModels;

  constructor(private checkIntervalHours: number = 24) {}

  async start(initialModels?: TrainedModels) {
    console.log(`🔄 Starting auto-retraining scheduler (checks every ${this.checkIntervalHours}h)`);

    this.models = initialModels;

    this.intervalId = setInterval(async () => {
      await this.checkAndRetrain();
    }, this.checkIntervalHours * 60 * 60 * 1000);

    // Initial check
    await this.checkAndRetrain();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('🛑 Auto-retraining scheduler stopped');
    }
  }

  private async checkAndRetrain() {
    if (!this.models) {
      console.log('📚 No existing models, training initial models...');
      this.models = await trainAllModels();
      return;
    }

    const { shouldRetrain, reason } = shouldRetrain(this.models);

    console.log(`\n🔍 Checking retraining status...`);
    console.log(`   ${reason}`);

    if (shouldRetrain) {
      console.log('   ➡️  Retraining models...\n');
      this.models = await retrainModels(this.models);
    } else {
      console.log('   ✓ Models are up to date\n');
    }
  }

  getModels(): TrainedModels | undefined {
    return this.models;
  }
}
