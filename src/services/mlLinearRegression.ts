import { MatchFeatures, MatchTarget, featuresToArray, getFeatureNames } from './mlFeatureExtractor';

export interface LinearRegressionPrediction {
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  expectedTotalGoals: number;
  over25Prob: number;
  confidence: number;
}

export interface TrainedLinearRegressionModel {
  homeGoalsCoefficients: number[];
  homeGoalsIntercept: number;
  awayGoalsCoefficients: number[];
  awayGoalsIntercept: number;
  featureNames: string[];
  metrics?: RegressionMetrics;
}

export interface RegressionMetrics {
  // Home goals metrics
  homeGoals: {
    r2: number;           // R² score (coefficient of determination)
    mse: number;          // Mean Squared Error
    rmse: number;         // Root Mean Squared Error
    mae: number;          // Mean Absolute Error
    mape: number;         // Mean Absolute Percentage Error
    meanResidual: number; // Mean of residuals (should be ~0)
    stdResidual: number;  // Standard deviation of residuals
  };
  // Away goals metrics
  awayGoals: {
    r2: number;
    mse: number;
    rmse: number;
    mae: number;
    mape: number;
    meanResidual: number;
    stdResidual: number;
  };
  // Combined metrics
  combined: {
    totalGoalsR2: number;
    totalGoalsMae: number;
    totalGoalsRmse: number;
    over25Accuracy: number;
  };
}

export interface RegressionAnalysis {
  coefficients: { feature: string; homeGoalsCoef: number; awayGoalsCoef: number }[];
  intercepts: { homeGoals: number; awayGoals: number };
  topFeatures: {
    homeGoals: { feature: string; coefficient: number; absValue: number }[];
    awayGoals: { feature: string; coefficient: number; absValue: number }[];
  };
}

/**
 * Matrix multiplication helper: result = A * B
 */
function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;

  const result: number[][] = Array(rowsA).fill(0).map(() => Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }

  return result;
}

/**
 * Matrix transpose helper
 */
function transpose(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = Array(cols).fill(0).map(() => Array(rows).fill(0));

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = matrix[i][j];
    }
  }

  return result;
}

/**
 * Matrix inversion using Gaussian elimination (for small matrices)
 */
function matrixInverse(matrix: number[][]): number[][] {
  const n = matrix.length;
  const identity: number[][] = Array(n).fill(0).map((_, i) =>
    Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
  );

  // Create augmented matrix [A | I]
  const augmented = matrix.map((row, i) => [...row, ...identity[i]]);

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // Make diagonal 1
    const divisor = augmented[i][i];
    if (Math.abs(divisor) < 1e-10) {
      throw new Error('Matrix is singular and cannot be inverted');
    }

    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= divisor;
    }

    // Eliminate column
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }

  // Extract inverse from augmented matrix
  return augmented.map(row => row.slice(n));
}

/**
 * Train Linear Regression model using Ordinary Least Squares (OLS)
 * Formula: β = (X^T * X)^-1 * X^T * y
 */
export function trainLinearRegression(
  features: MatchFeatures[],
  targets: MatchTarget[]
): TrainedLinearRegressionModel {
  console.log(`\n🔧 Training Linear Regression with ${features.length} samples...`);

  // Convert features to matrix X (add intercept column)
  const X = features.map(f => [1, ...featuresToArray(f)]); // Add 1 for intercept
  const n = X.length;
  const m = X[0].length;

  // Extract target variables
  const yHome = targets.map(t => [t.homeGoals]);
  const yAway = targets.map(t => [t.awayGoals]);

  // Calculate coefficients using Normal Equation: β = (X^T * X)^-1 * X^T * y
  const XT = transpose(X);
  const XTX = matrixMultiply(XT, X);

  let XTX_inv: number[][];
  try {
    XTX_inv = matrixInverse(XTX);
  } catch (error) {
    console.error('❌ Matrix inversion failed. Using regularization...');
    // Add small regularization term to diagonal (Ridge regression)
    for (let i = 0; i < XTX.length; i++) {
      XTX[i][i] += 0.001;
    }
    XTX_inv = matrixInverse(XTX);
  }

  const XTX_inv_XT = matrixMultiply(XTX_inv, XT);

  // Calculate coefficients for home goals
  const betaHome = matrixMultiply(XTX_inv_XT, yHome);
  const homeGoalsIntercept = betaHome[0][0];
  const homeGoalsCoefficients = betaHome.slice(1).map(b => b[0]);

  // Calculate coefficients for away goals
  const betaAway = matrixMultiply(XTX_inv_XT, yAway);
  const awayGoalsIntercept = betaAway[0][0];
  const awayGoalsCoefficients = betaAway.slice(1).map(b => b[0]);

  console.log(`✓ Model trained successfully`);
  console.log(`  Home Goals Intercept: ${homeGoalsIntercept.toFixed(4)}`);
  console.log(`  Away Goals Intercept: ${awayGoalsIntercept.toFixed(4)}`);

  return {
    homeGoalsCoefficients,
    homeGoalsIntercept,
    awayGoalsCoefficients,
    awayGoalsIntercept,
    featureNames: getFeatureNames(),
  };
}

/**
 * Make prediction using trained Linear Regression model
 */
export function predictLinearRegression(
  model: TrainedLinearRegressionModel,
  features: MatchFeatures
): LinearRegressionPrediction {
  const X = featuresToArray(features);

  // Calculate predictions: y = X * β + intercept
  let homeGoals = model.homeGoalsIntercept;
  let awayGoals = model.awayGoalsIntercept;

  for (let i = 0; i < X.length; i++) {
    homeGoals += X[i] * model.homeGoalsCoefficients[i];
    awayGoals += X[i] * model.awayGoalsCoefficients[i];
  }

  // Ensure non-negative predictions
  homeGoals = Math.max(0, homeGoals);
  awayGoals = Math.max(0, awayGoals);

  const totalGoals = homeGoals + awayGoals;

  // Estimate over 2.5 probability based on Poisson distribution
  // P(X + Y > 2.5) ≈ probability that total goals > 2.5
  const over25Prob = totalGoals > 2.5 ? Math.min(0.95, (totalGoals - 2.5) / 3 + 0.5) : Math.max(0.05, totalGoals / 2.5 * 0.5);

  // Confidence based on how extreme the prediction is (middle values = higher confidence)
  const confidence = Math.min(0.8, 0.4 + Math.abs(homeGoals - awayGoals) * 0.1);

  return {
    expectedHomeGoals: homeGoals,
    expectedAwayGoals: awayGoals,
    expectedTotalGoals: totalGoals,
    over25Prob: over25Prob,
    confidence: confidence,
  };
}

/**
 * Evaluate Linear Regression model performance
 */
export function evaluateLinearRegression(
  model: TrainedLinearRegressionModel,
  testFeatures: MatchFeatures[],
  testTargets: MatchTarget[]
): RegressionMetrics {
  const n = testFeatures.length;

  // Make predictions
  const predictions = testFeatures.map(f => predictLinearRegression(model, f));

  // Calculate residuals and metrics for home goals
  const homeResiduals = testTargets.map((t, i) => t.homeGoals - predictions[i].expectedHomeGoals);
  const homeSSR = homeResiduals.reduce((sum, r) => sum + r * r, 0); // Sum of squared residuals
  const homeMean = testTargets.reduce((sum, t) => sum + t.homeGoals, 0) / n;
  const homeSST = testTargets.reduce((sum, t) => sum + Math.pow(t.homeGoals - homeMean, 2), 0); // Total sum of squares

  const homeR2 = 1 - (homeSSR / homeSST);
  const homeMSE = homeSSR / n;
  const homeRMSE = Math.sqrt(homeMSE);
  const homeMAE = homeResiduals.reduce((sum, r) => sum + Math.abs(r), 0) / n;
  const homeMAPE = testTargets.reduce((sum, t, i) => {
    const actual = t.homeGoals;
    const predicted = predictions[i].expectedHomeGoals;
    return sum + (actual > 0 ? Math.abs((actual - predicted) / actual) : 0);
  }, 0) / n * 100;
  const homeMeanResidual = homeResiduals.reduce((sum, r) => sum + r, 0) / n;
  const homeStdResidual = Math.sqrt(homeResiduals.reduce((sum, r) => sum + Math.pow(r - homeMeanResidual, 2), 0) / n);

  // Calculate residuals and metrics for away goals
  const awayResiduals = testTargets.map((t, i) => t.awayGoals - predictions[i].expectedAwayGoals);
  const awaySSR = awayResiduals.reduce((sum, r) => sum + r * r, 0);
  const awayMean = testTargets.reduce((sum, t) => sum + t.awayGoals, 0) / n;
  const awaySST = testTargets.reduce((sum, t) => sum + Math.pow(t.awayGoals - awayMean, 2), 0);

  const awayR2 = 1 - (awaySSR / awaySST);
  const awayMSE = awaySSR / n;
  const awayRMSE = Math.sqrt(awayMSE);
  const awayMAE = awayResiduals.reduce((sum, r) => sum + Math.abs(r), 0) / n;
  const awayMAPE = testTargets.reduce((sum, t, i) => {
    const actual = t.awayGoals;
    const predicted = predictions[i].expectedAwayGoals;
    return sum + (actual > 0 ? Math.abs((actual - predicted) / actual) : 0);
  }, 0) / n * 100;
  const awayMeanResidual = awayResiduals.reduce((sum, r) => sum + r, 0) / n;
  const awayStdResidual = Math.sqrt(awayResiduals.reduce((sum, r) => sum + Math.pow(r - awayMeanResidual, 2), 0) / n);

  // Combined metrics for total goals
  const totalGoalsResiduals = testTargets.map((t, i) =>
    t.totalGoals - predictions[i].expectedTotalGoals
  );
  const totalGoalsMean = testTargets.reduce((sum, t) => sum + t.totalGoals, 0) / n;
  const totalGoalsSST = testTargets.reduce((sum, t) => sum + Math.pow(t.totalGoals - totalGoalsMean, 2), 0);
  const totalGoalsSSR = totalGoalsResiduals.reduce((sum, r) => sum + r * r, 0);
  const totalGoalsR2 = 1 - (totalGoalsSSR / totalGoalsSST);
  const totalGoalsMAE = totalGoalsResiduals.reduce((sum, r) => sum + Math.abs(r), 0) / n;
  const totalGoalsRMSE = Math.sqrt(totalGoalsSSR / n);

  // Over 2.5 accuracy
  let over25Correct = 0;
  for (let i = 0; i < n; i++) {
    const actualOver25 = testTargets[i].over25 === 1;
    const predictedOver25 = predictions[i].over25Prob > 0.5;
    if (actualOver25 === predictedOver25) over25Correct++;
  }
  const over25Accuracy = over25Correct / n;

  return {
    homeGoals: {
      r2: homeR2,
      mse: homeMSE,
      rmse: homeRMSE,
      mae: homeMAE,
      mape: homeMAPE,
      meanResidual: homeMeanResidual,
      stdResidual: homeStdResidual,
    },
    awayGoals: {
      r2: awayR2,
      mse: awayMSE,
      rmse: awayRMSE,
      mae: awayMAE,
      mape: awayMAPE,
      meanResidual: awayMeanResidual,
      stdResidual: awayStdResidual,
    },
    combined: {
      totalGoalsR2: totalGoalsR2,
      totalGoalsMae: totalGoalsMAE,
      totalGoalsRmse: totalGoalsRMSE,
      over25Accuracy: over25Accuracy,
    },
  };
}

/**
 * Analyze regression coefficients to understand feature importance
 */
export function analyzeCoefficients(model: TrainedLinearRegressionModel): RegressionAnalysis {
  const coefficients = model.featureNames.map((feature, i) => ({
    feature,
    homeGoalsCoef: model.homeGoalsCoefficients[i],
    awayGoalsCoef: model.awayGoalsCoefficients[i],
  }));

  // Sort by absolute value to find most important features
  const topHomeFeatures = coefficients
    .map(c => ({ feature: c.feature, coefficient: c.homeGoalsCoef, absValue: Math.abs(c.homeGoalsCoef) }))
    .sort((a, b) => b.absValue - a.absValue)
    .slice(0, 10);

  const topAwayFeatures = coefficients
    .map(c => ({ feature: c.feature, coefficient: c.awayGoalsCoef, absValue: Math.abs(c.awayGoalsCoef) }))
    .sort((a, b) => b.absValue - a.absValue)
    .slice(0, 10);

  return {
    coefficients,
    intercepts: {
      homeGoals: model.homeGoalsIntercept,
      awayGoals: model.awayGoalsIntercept,
    },
    topFeatures: {
      homeGoals: topHomeFeatures,
      awayGoals: topAwayFeatures,
    },
  };
}

/**
 * Print detailed evaluation report
 */
export function printRegressionReport(
  metrics: RegressionMetrics,
  analysis: RegressionAnalysis
): void {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║          LINEAR REGRESSION EVALUATION REPORT                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  HOME GOALS PREDICTION METRICS');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  R² Score:              ${metrics.homeGoals.r2.toFixed(4)} (${(metrics.homeGoals.r2 * 100).toFixed(2)}% variance explained)`);
  console.log(`  Mean Absolute Error:   ${metrics.homeGoals.mae.toFixed(4)} goals`);
  console.log(`  Root Mean Squared:     ${metrics.homeGoals.rmse.toFixed(4)} goals`);
  console.log(`  Mean Squared Error:    ${metrics.homeGoals.mse.toFixed(4)}`);
  console.log(`  MAPE:                  ${metrics.homeGoals.mape.toFixed(2)}%`);
  console.log(`  Mean Residual:         ${metrics.homeGoals.meanResidual.toFixed(4)} (should be ~0)`);
  console.log(`  Std Residual:          ${metrics.homeGoals.stdResidual.toFixed(4)}\n`);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  AWAY GOALS PREDICTION METRICS');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  R² Score:              ${metrics.awayGoals.r2.toFixed(4)} (${(metrics.awayGoals.r2 * 100).toFixed(2)}% variance explained)`);
  console.log(`  Mean Absolute Error:   ${metrics.awayGoals.mae.toFixed(4)} goals`);
  console.log(`  Root Mean Squared:     ${metrics.awayGoals.rmse.toFixed(4)} goals`);
  console.log(`  Mean Squared Error:    ${metrics.awayGoals.mse.toFixed(4)}`);
  console.log(`  MAPE:                  ${metrics.awayGoals.mape.toFixed(2)}%`);
  console.log(`  Mean Residual:         ${metrics.awayGoals.meanResidual.toFixed(4)} (should be ~0)`);
  console.log(`  Std Residual:          ${metrics.awayGoals.stdResidual.toFixed(4)}\n`);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  COMBINED METRICS');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Total Goals R²:        ${metrics.combined.totalGoalsR2.toFixed(4)} (${(metrics.combined.totalGoalsR2 * 100).toFixed(2)}%)`);
  console.log(`  Total Goals MAE:       ${metrics.combined.totalGoalsMae.toFixed(4)} goals`);
  console.log(`  Total Goals RMSE:      ${metrics.combined.totalGoalsRmse.toFixed(4)} goals`);
  console.log(`  Over 2.5 Accuracy:     ${(metrics.combined.over25Accuracy * 100).toFixed(2)}%\n`);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  MODEL COEFFICIENTS (INTERCEPTS)');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Home Goals Intercept:  ${analysis.intercepts.homeGoals.toFixed(4)}`);
  console.log(`  Away Goals Intercept:  ${analysis.intercepts.awayGoals.toFixed(4)}\n`);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  TOP 10 FEATURES FOR HOME GOALS');
  console.log('═══════════════════════════════════════════════════════════════════');
  analysis.topFeatures.homeGoals.forEach((f, i) => {
    const sign = f.coefficient >= 0 ? '+' : '';
    console.log(`  ${(i + 1).toString().padStart(2)}. ${f.feature.padEnd(30)} ${sign}${f.coefficient.toFixed(6)}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  TOP 10 FEATURES FOR AWAY GOALS');
  console.log('═══════════════════════════════════════════════════════════════════');
  analysis.topFeatures.awayGoals.forEach((f, i) => {
    const sign = f.coefficient >= 0 ? '+' : '';
    console.log(`  ${(i + 1).toString().padStart(2)}. ${f.feature.padEnd(30)} ${sign}${f.coefficient.toFixed(6)}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  MODEL INTERPRETATION');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  Positive coefficient = increases predicted goals');
  console.log('  Negative coefficient = decreases predicted goals');
  console.log('  Larger absolute value = stronger influence on prediction\n');

  // Model quality assessment
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  MODEL QUALITY ASSESSMENT');
  console.log('═══════════════════════════════════════════════════════════════════');

  const avgR2 = (metrics.homeGoals.r2 + metrics.awayGoals.r2) / 2;
  const avgMAE = (metrics.homeGoals.mae + metrics.awayGoals.mae) / 2;

  let quality = 'Poor';
  if (avgR2 > 0.7 && avgMAE < 0.8) quality = 'Excellent';
  else if (avgR2 > 0.5 && avgMAE < 1.0) quality = 'Good';
  else if (avgR2 > 0.3 && avgMAE < 1.3) quality = 'Fair';

  console.log(`  Overall Quality:       ${quality}`);
  console.log(`  Average R²:            ${avgR2.toFixed(4)}`);
  console.log(`  Average MAE:           ${avgMAE.toFixed(4)} goals`);

  if (Math.abs(metrics.homeGoals.meanResidual) < 0.1 && Math.abs(metrics.awayGoals.meanResidual) < 0.1) {
    console.log(`  Bias Check:            ✓ Unbiased (residuals centered at 0)`);
  } else {
    console.log(`  Bias Check:            ⚠ Slight bias detected`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════\n');
}

/**
 * Cross-validation for Linear Regression
 */
export function crossValidateLinearRegression(
  features: MatchFeatures[],
  targets: MatchTarget[],
  kFolds: number = 5
): {
  meanR2Home: number;
  meanR2Away: number;
  meanMAEHome: number;
  meanMAEAway: number;
  meanOver25Accuracy: number;
  foldResults: RegressionMetrics[];
} {
  const foldSize = Math.floor(features.length / kFolds);
  const foldResults: RegressionMetrics[] = [];

  console.log(`\n🔄 Running ${kFolds}-Fold Cross-Validation...`);

  for (let i = 0; i < kFolds; i++) {
    const validationStart = i * foldSize;
    const validationEnd = validationStart + foldSize;

    // Split data
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
    const model = trainLinearRegression(trainFeatures, trainTargets);
    const metrics = evaluateLinearRegression(model, validationFeatures, validationTargets);

    foldResults.push(metrics);

    console.log(`  Fold ${i + 1}/${kFolds}: R²(H)=${metrics.homeGoals.r2.toFixed(3)}, R²(A)=${metrics.awayGoals.r2.toFixed(3)}, MAE(H)=${metrics.homeGoals.mae.toFixed(3)}, MAE(A)=${metrics.awayGoals.mae.toFixed(3)}`);
  }

  // Calculate averages
  const meanR2Home = foldResults.reduce((sum, m) => sum + m.homeGoals.r2, 0) / kFolds;
  const meanR2Away = foldResults.reduce((sum, m) => sum + m.awayGoals.r2, 0) / kFolds;
  const meanMAEHome = foldResults.reduce((sum, m) => sum + m.homeGoals.mae, 0) / kFolds;
  const meanMAEAway = foldResults.reduce((sum, m) => sum + m.awayGoals.mae, 0) / kFolds;
  const meanOver25Accuracy = foldResults.reduce((sum, m) => sum + m.combined.over25Accuracy, 0) / kFolds;

  console.log(`\n✓ Cross-Validation Complete:`);
  console.log(`  Mean R² (Home):        ${meanR2Home.toFixed(4)}`);
  console.log(`  Mean R² (Away):        ${meanR2Away.toFixed(4)}`);
  console.log(`  Mean MAE (Home):       ${meanMAEHome.toFixed(4)} goals`);
  console.log(`  Mean MAE (Away):       ${meanMAEAway.toFixed(4)} goals`);
  console.log(`  Mean Over2.5 Accuracy: ${(meanOver25Accuracy * 100).toFixed(2)}%\n`);

  return {
    meanR2Home,
    meanR2Away,
    meanMAEHome,
    meanMAEAway,
    meanOver25Accuracy,
    foldResults,
  };
}
