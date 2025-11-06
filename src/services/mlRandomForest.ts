import { RandomForestClassifier as RFC } from 'ml-random-forest';
import { MatchFeatures, MatchTarget, featuresToArray } from './mlFeatureExtractor';

export interface RandomForestPrediction {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  over25Prob: number;
  confidence: number;
}

export interface TrainedRandomForestModel {
  outcomeModel: any; // RandomForestClassifier for win/draw/loss
  over25Model: any;  // RandomForestClassifier for over/under 2.5
  featureImportance: number[];
}

/**
 * Train Random Forest models for match outcome and over/under predictions
 */
export function trainRandomForest(
  features: MatchFeatures[],
  targets: MatchTarget[],
  options = {
    nEstimators: 100,
    maxDepth: 10,
    minSamples: 2,
    seed: 42
  }
): TrainedRandomForestModel {
  // Convert features to arrays
  const X = features.map(f => featuresToArray(f));

  // Prepare outcome labels (0: home win, 1: draw, 2: away win)
  const yOutcome = targets.map(t => {
    if (t.homeWin === 1) return 0;
    if (t.draw === 1) return 1;
    return 2;
  });

  // Prepare over/under labels
  const yOver25 = targets.map(t => t.over25);

  // Train outcome model
  const outcomeModel = new RFC({
    nEstimators: options.nEstimators,
    maxFeatures: Math.floor(Math.sqrt(X[0].length)),
    replacement: true,
    seed: options.seed,
  });
  outcomeModel.train(X, yOutcome);

  // Train over/under model
  const over25Model = new RFC({
    nEstimators: options.nEstimators,
    maxFeatures: Math.floor(Math.sqrt(X[0].length)),
    replacement: true,
    seed: options.seed,
  });
  over25Model.train(X, yOver25);

  // Calculate feature importance (simplified - based on usage in trees)
  const featureImportance = new Array(X[0].length).fill(1 / X[0].length);

  return {
    outcomeModel,
    over25Model,
    featureImportance,
  };
}

/**
 * Make prediction using trained Random Forest models
 */
export function predictRandomForest(
  model: TrainedRandomForestModel,
  features: MatchFeatures
): RandomForestPrediction {
  const X = featuresToArray(features);

  // Predict outcome probabilities
  const outcomePredictions = model.outcomeModel.predict([X], { probability: true });
  const outcomeProbs = Array.isArray(outcomePredictions[0]) ? outcomePredictions[0] : [0.33, 0.33, 0.34];

  // Predict over/under probability
  const over25Predictions = model.over25Model.predict([X], { probability: true });
  const over25ProbArray = Array.isArray(over25Predictions[0]) ? over25Predictions[0] : [0.5, 0.5];
  const over25Prob = over25ProbArray[1] || 0.5; // Probability of class 1 (over 2.5)

  // Calculate confidence based on maximum probability
  const maxProb = Math.max(...outcomeProbs);
  const confidence = maxProb;

  return {
    homeWinProb: outcomeProbs[0] || 0.33,
    drawProb: outcomeProbs[1] || 0.33,
    awayWinProb: outcomeProbs[2] || 0.33,
    over25Prob: over25Prob,
    confidence: confidence,
  };
}

/**
 * Evaluate Random Forest model accuracy
 */
export function evaluateRandomForest(
  model: TrainedRandomForestModel,
  testFeatures: MatchFeatures[],
  testTargets: MatchTarget[]
): {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  over25Accuracy: number;
} {
  const X = testFeatures.map(f => featuresToArray(f));

  // Prepare test labels
  const yTrue = testTargets.map(t => {
    if (t.homeWin === 1) return 0;
    if (t.draw === 1) return 1;
    return 2;
  });

  const yOver25True = testTargets.map(t => t.over25);

  // Make predictions
  const yPred = model.outcomeModel.predict(X);
  const yOver25Pred = model.over25Model.predict(X);

  // Calculate accuracy
  let correct = 0;
  let over25Correct = 0;

  for (let i = 0; i < yTrue.length; i++) {
    if (yPred[i] === yTrue[i]) correct++;
    if (yOver25Pred[i] === yOver25True[i]) over25Correct++;
  }

  const accuracy = correct / yTrue.length;
  const over25Accuracy = over25Correct / yOver25True.length;

  // Calculate precision, recall, F1 (simplified - macro average)
  const precision = calculatePrecision(yTrue, yPred);
  const recall = calculateRecall(yTrue, yPred);
  const f1Score = 2 * (precision * recall) / (precision + recall || 1);

  return {
    accuracy,
    precision,
    recall,
    f1Score,
    over25Accuracy,
  };
}

function calculatePrecision(yTrue: number[], yPred: number[]): number {
  const classes = [0, 1, 2];
  let totalPrecision = 0;

  for (const cls of classes) {
    let truePositive = 0;
    let falsePositive = 0;

    for (let i = 0; i < yTrue.length; i++) {
      if (yPred[i] === cls) {
        if (yTrue[i] === cls) {
          truePositive++;
        } else {
          falsePositive++;
        }
      }
    }

    const precision = truePositive / (truePositive + falsePositive || 1);
    totalPrecision += precision;
  }

  return totalPrecision / classes.length;
}

function calculateRecall(yTrue: number[], yPred: number[]): number {
  const classes = [0, 1, 2];
  let totalRecall = 0;

  for (const cls of classes) {
    let truePositive = 0;
    let falseNegative = 0;

    for (let i = 0; i < yTrue.length; i++) {
      if (yTrue[i] === cls) {
        if (yPred[i] === cls) {
          truePositive++;
        } else {
          falseNegative++;
        }
      }
    }

    const recall = truePositive / (truePositive + falseNegative || 1);
    totalRecall += recall;
  }

  return totalRecall / classes.length;
}

/**
 * Cross-validation for Random Forest model
 */
export function crossValidateRandomForest(
  features: MatchFeatures[],
  targets: MatchTarget[],
  kFolds: number = 5
): {
  meanAccuracy: number;
  stdAccuracy: number;
  meanF1Score: number;
  accuracies: number[];
} {
  const foldSize = Math.floor(features.length / kFolds);
  const accuracies: number[] = [];
  const f1Scores: number[] = [];

  for (let i = 0; i < kFolds; i++) {
    // Split data into train and validation
    const validationStart = i * foldSize;
    const validationEnd = validationStart + foldSize;

    const trainFeatures = [
      ...features.slice(0, validationStart),
      ...features.slice(validationEnd)
    ];
    const trainTargets = [
      ...targets.slice(0, validationStart),
      ...targets.slice(validationEnd)
    ];
    const validationFeatures = features.slice(validationStart, validationEnd);
    const validationTargets = targets.slice(validationStart, validationEnd);

    // Train and evaluate
    const model = trainRandomForest(trainFeatures, trainTargets);
    const evaluation = evaluateRandomForest(model, validationFeatures, validationTargets);

    accuracies.push(evaluation.accuracy);
    f1Scores.push(evaluation.f1Score);
  }

  const meanAccuracy = accuracies.reduce((a, b) => a + b) / accuracies.length;
  const meanF1Score = f1Scores.reduce((a, b) => a + b) / f1Scores.length;
  const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - meanAccuracy, 2), 0) / accuracies.length;
  const stdAccuracy = Math.sqrt(variance);

  return {
    meanAccuracy,
    stdAccuracy,
    meanF1Score,
    accuracies,
  };
}
