/**
 * Training Script - Train ML models with real data
 *
 * Usage:
 *   npm run train          - Train with real Supabase data
 *   npm run train:mock     - Train with mock data
 *   npm run train:retrain  - Retrain existing models
 */

import { trainAllModels, retrainModels } from '../src/services/mlTrainingSystem';
import { checkDataAvailability } from '../src/services/mlRealDataLoader';
import { initializeMLAPI, mlAPI } from '../src/services/mlProductionAPI';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'train';

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║            FOOTBALL PREDICTION ML TRAINING                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    switch (command) {
      case 'train':
        await trainWithRealData();
        break;

      case 'train:mock':
        await trainWithMockData();
        break;

      case 'train:retrain':
        await retrainExistingModels();
        break;

      case 'check':
        await checkData();
        break;

      case 'api':
        await testAPI();
        break;

      default:
        console.log('Unknown command:', command);
        console.log('\nAvailable commands:');
        console.log('  train         - Train with real Supabase data');
        console.log('  train:mock    - Train with mock data');
        console.log('  train:retrain - Retrain existing models');
        console.log('  check         - Check data availability');
        console.log('  api           - Test production API');
    }
  } catch (error) {
    console.error('\n❌ Training failed:', error);
    process.exit(1);
  }
}

async function trainWithRealData() {
  console.log('📊 Training with REAL Supabase data...\n');

  const availability = await checkDataAvailability();
  console.log(`Status: ${availability.message}\n`);

  if (!availability.hasData) {
    console.log('⚠️  Insufficient real data. Use "train:mock" instead.\n');
    return;
  }

  const models = await trainAllModels({
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
  });

  printResults(models);
}

async function trainWithMockData() {
  console.log('🎲 Training with MOCK data...\n');

  const models = await trainAllModels({
    useRealData: false,
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
  });

  printResults(models);
}

async function retrainExistingModels() {
  console.log('🔄 Retraining existing models...\n');

  const models = await retrainModels();

  printResults(models);
}

async function checkData() {
  console.log('🔍 Checking data availability...\n');

  const availability = await checkDataAvailability();

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                   DATA AVAILABILITY REPORT                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`Teams: ${availability.teamsCount}`);
  console.log(`Total Matches: ${availability.matchesCount}`);
  console.log(`Completed Matches: ${availability.completedMatchesCount}`);
  console.log(`\nStatus: ${availability.hasData ? '✅ Ready for training' : '❌ Insufficient data'}`);
  console.log(`Message: ${availability.message}\n`);
}

async function testAPI() {
  console.log('🧪 Testing Production API...\n');

  await initializeMLAPI(false);

  console.log('Testing health check...');
  const health = await mlAPI.healthCheck();
  console.log(`Status: ${health.status}`);
  console.log(`Details:`, health.details);
  console.log('');

  console.log('Testing performance metrics...');
  const metrics = mlAPI.getPerformanceMetrics();
  if (metrics) {
    console.log(`Trained at: ${metrics.trainedAt}`);
    console.log(`Data source: ${metrics.dataSource}`);
    console.log(`Train size: ${metrics.trainSize}`);
    console.log(`Test size: ${metrics.testSize}`);
    console.log(`Hybrid accuracy: ${(metrics.performance.hybrid.accuracy * 100).toFixed(2)}%`);
    console.log(`Optimal weights:`, metrics.optimalWeights);
  }
  console.log('');

  await mlAPI.shutdown();
}

function printResults(models: any) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      TRAINING RESULTS                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const metadata = models.trainingMetadata;
  const perf = metadata.performance;

  console.log('📈 Dataset:');
  console.log(`   Source: ${metadata.dataSource.toUpperCase()}`);
  console.log(`   Training samples: ${metadata.trainSize}`);
  console.log(`   Test samples: ${metadata.testSize}`);
  console.log(`   Trained at: ${new Date(metadata.trainedAt).toLocaleString()}\n`);

  console.log('🌲 Random Forest:');
  console.log(`   Accuracy: ${(perf.randomForest.accuracy * 100).toFixed(2)}%`);
  console.log(`   Precision: ${(perf.randomForest.precision * 100).toFixed(2)}%`);
  console.log(`   Recall: ${(perf.randomForest.recall * 100).toFixed(2)}%`);
  console.log(`   F1 Score: ${(perf.randomForest.f1Score * 100).toFixed(2)}%`);
  console.log(`   Over 2.5: ${(perf.randomForest.over25Accuracy * 100).toFixed(2)}%\n`);

  console.log('🧠 Neural Network:');
  console.log(`   Accuracy: ${(perf.neuralNetwork.outcomeAccuracy * 100).toFixed(2)}%`);
  console.log(`   Goals MAE: ${perf.neuralNetwork.goalsMae.toFixed(3)}`);
  console.log(`   Over 2.5: ${(perf.neuralNetwork.over25Accuracy * 100).toFixed(2)}%`);
  console.log(`   Brier Score: ${perf.neuralNetwork.brierScore.toFixed(4)}\n`);

  console.log('🎯 Hybrid Ensemble:');
  console.log(`   Accuracy: ${(perf.hybrid.accuracy * 100).toFixed(2)}%`);
  console.log(`   Brier Score: ${perf.hybrid.brierScore.toFixed(4)}`);
  console.log(`   Log Loss: ${perf.hybrid.logLoss.toFixed(4)}`);
  console.log(`   Improvement: ${(perf.hybrid.improvement * 100).toFixed(2)}%\n`);

  console.log('⚖️  Optimal Weights:');
  console.log(`   Mathematical: ${(metadata.optimalWeights.mathematical * 100).toFixed(0)}%`);
  console.log(`   Random Forest: ${(metadata.optimalWeights.randomForest * 100).toFixed(0)}%`);
  console.log(`   Neural Network: ${(metadata.optimalWeights.neuralNetwork * 100).toFixed(0)}%\n`);

  const grade = perf.hybrid.accuracy > 0.50 ? '⭐⭐⭐⭐⭐ EXCELLENT' :
                perf.hybrid.accuracy > 0.45 ? '⭐⭐⭐⭐ VERY GOOD' :
                perf.hybrid.accuracy > 0.40 ? '⭐⭐⭐ GOOD' :
                perf.hybrid.accuracy > 0.35 ? '⭐⭐ FAIR' : '⭐ NEEDS IMPROVEMENT';

  console.log(`🏆 Overall Grade: ${grade}\n`);

  console.log('✅ Models saved and ready for production!\n');
}

// Run if called directly
if (require.main === module) {
  main().then(() => {
    console.log('Done!');
    process.exit(0);
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { main as trainModels };
