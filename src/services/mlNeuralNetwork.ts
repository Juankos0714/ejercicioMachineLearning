import * as tf from '@tensorflow/tfjs';
import {
  MatchFeatures,
  MatchTarget,
  featuresToArray,
  normalizeFeatures,
  normalizeSingleFeature
} from './mlFeatureExtractor';

export interface NeuralNetworkPrediction {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  over25Prob: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  confidence: number;
}

export interface TrainedNeuralNetwork {
  outcomeModel: tf.LayersModel;
  goalsModel: tf.LayersModel;
  over25Model: tf.LayersModel;
  means: number[];
  stds: number[];
}

/**
 * Create neural network architecture for match outcome prediction
 */
function createOutcomeModel(inputShape: number): tf.Sequential {
  const model = tf.sequential();

  // Input layer
  model.add(tf.layers.dense({
    units: 64,
    activation: 'relu',
    inputShape: [inputShape],
    kernelInitializer: 'heNormal',
  }));

  // Dropout for regularization
  model.add(tf.layers.dropout({ rate: 0.3 }));

  // Hidden layers
  model.add(tf.layers.dense({
    units: 32,
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));

  model.add(tf.layers.dropout({ rate: 0.2 }));

  model.add(tf.layers.dense({
    units: 16,
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));

  // Output layer - 3 classes (home win, draw, away win)
  model.add(tf.layers.dense({
    units: 3,
    activation: 'softmax',
  }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
}

/**
 * Create neural network for goals prediction (regression)
 */
function createGoalsModel(inputShape: number): tf.Sequential {
  const model = tf.sequential();

  model.add(tf.layers.dense({
    units: 64,
    activation: 'relu',
    inputShape: [inputShape],
    kernelInitializer: 'heNormal',
  }));

  model.add(tf.layers.dropout({ rate: 0.2 }));

  model.add(tf.layers.dense({
    units: 32,
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));

  model.add(tf.layers.dropout({ rate: 0.2 }));

  // Output layer - 2 outputs (home goals, away goals)
  model.add(tf.layers.dense({
    units: 2,
    activation: 'relu', // ReLU for non-negative goals
  }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mae'],
  });

  return model;
}

/**
 * Create neural network for over/under 2.5 prediction
 */
function createOver25Model(inputShape: number): tf.Sequential {
  const model = tf.sequential();

  model.add(tf.layers.dense({
    units: 32,
    activation: 'relu',
    inputShape: [inputShape],
    kernelInitializer: 'heNormal',
  }));

  model.add(tf.layers.dropout({ rate: 0.2 }));

  model.add(tf.layers.dense({
    units: 16,
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));

  // Output layer - binary classification
  model.add(tf.layers.dense({
    units: 1,
    activation: 'sigmoid',
  }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
}

/**
 * Train neural network models
 */
export async function trainNeuralNetwork(
  features: MatchFeatures[],
  targets: MatchTarget[],
  options = {
    epochs: 100,
    batchSize: 32,
    validationSplit: 0.2,
  }
): Promise<TrainedNeuralNetwork> {
  // Convert features to arrays
  const X = features.map(f => featuresToArray(f));

  // Normalize features
  const { normalized, means, stds } = normalizeFeatures(X);

  // Prepare outcome labels (one-hot encoded)
  const yOutcome = targets.map(t => [t.homeWin, t.draw, t.awayWin]);

  // Prepare goals labels
  const yGoals = targets.map(t => [t.homeGoals, t.awayGoals]);

  // Prepare over/under labels
  const yOver25 = targets.map(t => [t.over25]);

  // Convert to tensors
  const xTensor = tf.tensor2d(normalized);
  const yOutcomeTensor = tf.tensor2d(yOutcome);
  const yGoalsTensor = tf.tensor2d(yGoals);
  const yOver25Tensor = tf.tensor2d(yOver25);

  // Create models
  const outcomeModel = createOutcomeModel(normalized[0].length);
  const goalsModel = createGoalsModel(normalized[0].length);
  const over25Model = createOver25Model(normalized[0].length);

  // Train outcome model
  await outcomeModel.fit(xTensor, yOutcomeTensor, {
    epochs: options.epochs,
    batchSize: options.batchSize,
    validationSplit: options.validationSplit,
    verbose: 0,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 20 === 0) {
          console.log(`Outcome Model - Epoch ${epoch}: loss = ${logs?.loss.toFixed(4)}, accuracy = ${logs?.acc?.toFixed(4)}`);
        }
      }
    }
  });

  // Train goals model
  await goalsModel.fit(xTensor, yGoalsTensor, {
    epochs: options.epochs,
    batchSize: options.batchSize,
    validationSplit: options.validationSplit,
    verbose: 0,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 20 === 0) {
          console.log(`Goals Model - Epoch ${epoch}: loss = ${logs?.loss.toFixed(4)}, mae = ${logs?.mae?.toFixed(4)}`);
        }
      }
    }
  });

  // Train over/under model
  await over25Model.fit(xTensor, yOver25Tensor, {
    epochs: options.epochs,
    batchSize: options.batchSize,
    validationSplit: options.validationSplit,
    verbose: 0,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 20 === 0) {
          console.log(`Over2.5 Model - Epoch ${epoch}: loss = ${logs?.loss.toFixed(4)}, accuracy = ${logs?.acc?.toFixed(4)}`);
        }
      }
    }
  });

  // Cleanup tensors
  xTensor.dispose();
  yOutcomeTensor.dispose();
  yGoalsTensor.dispose();
  yOver25Tensor.dispose();

  return {
    outcomeModel,
    goalsModel,
    over25Model,
    means,
    stds,
  };
}

/**
 * Make prediction using trained neural network
 */
export async function predictNeuralNetwork(
  model: TrainedNeuralNetwork,
  features: MatchFeatures
): Promise<NeuralNetworkPrediction> {
  const X = featuresToArray(features);
  const normalizedX = normalizeSingleFeature(X, model.means, model.stds);
  const xTensor = tf.tensor2d([normalizedX]);

  // Predict outcome probabilities
  const outcomePrediction = model.outcomeModel.predict(xTensor) as tf.Tensor;
  const outcomeProbs = await outcomePrediction.data();

  // Predict goals
  const goalsPrediction = model.goalsModel.predict(xTensor) as tf.Tensor;
  const goals = await goalsPrediction.data();

  // Predict over/under
  const over25Prediction = model.over25Model.predict(xTensor) as tf.Tensor;
  const over25Prob = (await over25Prediction.data())[0];

  // Cleanup tensors
  xTensor.dispose();
  outcomePrediction.dispose();
  goalsPrediction.dispose();
  over25Prediction.dispose();

  // Calculate confidence
  const maxProb = Math.max(outcomeProbs[0], outcomeProbs[1], outcomeProbs[2]);

  return {
    homeWinProb: outcomeProbs[0],
    drawProb: outcomeProbs[1],
    awayWinProb: outcomeProbs[2],
    over25Prob: over25Prob,
    expectedHomeGoals: Math.max(0, goals[0]),
    expectedAwayGoals: Math.max(0, goals[1]),
    confidence: maxProb,
  };
}

/**
 * Evaluate neural network performance
 */
export async function evaluateNeuralNetwork(
  model: TrainedNeuralNetwork,
  testFeatures: MatchFeatures[],
  testTargets: MatchTarget[]
): Promise<{
  outcomeAccuracy: number;
  goalsMae: number;
  over25Accuracy: number;
  brierScore: number;
}> {
  const X = testFeatures.map(f => featuresToArray(f));
  const { normalized } = normalizeFeatures(X);

  const xTensor = tf.tensor2d(normalized);

  // Evaluate outcome model
  const yOutcome = testTargets.map(t => [t.homeWin, t.draw, t.awayWin]);
  const yOutcomeTensor = tf.tensor2d(yOutcome);
  const outcomeEval = await model.outcomeModel.evaluate(xTensor, yOutcomeTensor) as tf.Scalar[];
  const outcomeAccuracy = await outcomeEval[1].data();

  // Evaluate goals model
  const yGoals = testTargets.map(t => [t.homeGoals, t.awayGoals]);
  const yGoalsTensor = tf.tensor2d(yGoals);
  const goalsEval = await model.goalsModel.evaluate(xTensor, yGoalsTensor) as tf.Scalar[];
  const goalsMae = await goalsEval[1].data();

  // Evaluate over/under model
  const yOver25 = testTargets.map(t => [t.over25]);
  const yOver25Tensor = tf.tensor2d(yOver25);
  const over25Eval = await model.over25Model.evaluate(xTensor, yOver25Tensor) as tf.Scalar[];
  const over25Accuracy = await over25Eval[1].data();

  // Calculate Brier Score
  const predictions = model.outcomeModel.predict(xTensor) as tf.Tensor;
  const predData = await predictions.data();
  let brierSum = 0;

  for (let i = 0; i < testTargets.length; i++) {
    const pred = [predData[i * 3], predData[i * 3 + 1], predData[i * 3 + 2]];
    const actual = [testTargets[i].homeWin, testTargets[i].draw, testTargets[i].awayWin];
    brierSum += pred.reduce((sum, p, j) => sum + Math.pow(p - actual[j], 2), 0);
  }

  const brierScore = brierSum / (testTargets.length * 3);

  // Cleanup
  xTensor.dispose();
  yOutcomeTensor.dispose();
  yGoalsTensor.dispose();
  yOver25Tensor.dispose();
  predictions.dispose();
  outcomeEval.forEach(t => t.dispose());
  goalsEval.forEach(t => t.dispose());
  over25Eval.forEach(t => t.dispose());

  return {
    outcomeAccuracy: outcomeAccuracy[0],
    goalsMae: goalsMae[0],
    over25Accuracy: over25Accuracy[0],
    brierScore,
  };
}

/**
 * Save model to browser storage or file
 */
export async function saveNeuralNetwork(
  model: TrainedNeuralNetwork,
  path: string = 'localstorage://football-predictor'
): Promise<void> {
  await model.outcomeModel.save(`${path}-outcome`);
  await model.goalsModel.save(`${path}-goals`);
  await model.over25Model.save(`${path}-over25`);

  // Save normalization parameters
  localStorage.setItem(`${path}-means`, JSON.stringify(model.means));
  localStorage.setItem(`${path}-stds`, JSON.stringify(model.stds));
}

/**
 * Load model from browser storage or file
 */
export async function loadNeuralNetwork(
  path: string = 'localstorage://football-predictor'
): Promise<TrainedNeuralNetwork> {
  const outcomeModel = await tf.loadLayersModel(`${path}-outcome`);
  const goalsModel = await tf.loadLayersModel(`${path}-goals`);
  const over25Model = await tf.loadLayersModel(`${path}-over25`);

  const means = JSON.parse(localStorage.getItem(`${path}-means`) || '[]');
  const stds = JSON.parse(localStorage.getItem(`${path}-stds`) || '[]');

  return {
    outcomeModel,
    goalsModel,
    over25Model,
    means,
    stds,
  };
}
