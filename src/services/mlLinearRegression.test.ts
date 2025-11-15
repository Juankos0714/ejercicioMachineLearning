import { describe, it, expect } from 'vitest';
import {
  trainLinearRegression,
  predictLinearRegression,
  evaluateLinearRegression,
  analyzeCoefficients,
  crossValidateLinearRegression,
} from './mlLinearRegression';
import { MatchFeatures, MatchTarget } from './mlFeatureExtractor';

// Helper function to create sample features
function createSampleFeatures(
  homeElo: number,
  awayElo: number,
  homeGoalsScored: number,
  awayGoalsScored: number
): MatchFeatures {
  return {
    homeElo,
    homeAvgGoalsScored: homeGoalsScored,
    homeAvgGoalsConceded: 1.0,
    homeXG: homeGoalsScored,
    awayElo,
    awayAvgGoalsScored: awayGoalsScored,
    awayAvgGoalsConceded: 1.0,
    awayXG: awayGoalsScored,
    eloDifference: homeElo - awayElo,
    homeAttackVsAwayDefense: homeGoalsScored / 1.0,
    awayAttackVsHomeDefense: awayGoalsScored / 1.0,
    totalExpectedGoals: homeGoalsScored + awayGoalsScored,
    eloRatio: homeElo / awayElo,
    homeAdvantage: 1.15,
    leaguePremier: 1,
    leagueLaLiga: 0,
    leagueSerieA: 0,
    leagueBundesliga: 0,
    leagueLigue1: 0,
  };
}

// Helper function to create sample target
function createSampleTarget(homeGoals: number, awayGoals: number): MatchTarget {
  return {
    homeWin: homeGoals > awayGoals ? 1 : 0,
    draw: homeGoals === awayGoals ? 1 : 0,
    awayWin: awayGoals > homeGoals ? 1 : 0,
    homeGoals,
    awayGoals,
    totalGoals: homeGoals + awayGoals,
    over25: homeGoals + awayGoals > 2.5 ? 1 : 0,
  };
}

describe('Linear Regression Model', () => {
  describe('Training', () => {
    it('should train a linear regression model successfully', () => {
      const features: MatchFeatures[] = [
        createSampleFeatures(2000, 1800, 2.5, 1.5),
        createSampleFeatures(1900, 2100, 1.5, 2.5),
        createSampleFeatures(2100, 2000, 2.8, 1.8),
        createSampleFeatures(1800, 1900, 1.2, 1.5),
        createSampleFeatures(2050, 1950, 2.3, 1.9),
      ];

      const targets: MatchTarget[] = [
        createSampleTarget(3, 1),
        createSampleTarget(1, 2),
        createSampleTarget(3, 2),
        createSampleTarget(1, 1),
        createSampleTarget(2, 2),
      ];

      const model = trainLinearRegression(features, targets);

      expect(model.homeGoalsCoefficients).toBeDefined();
      expect(model.awayGoalsCoefficients).toBeDefined();
      expect(model.homeGoalsIntercept).toBeDefined();
      expect(model.awayGoalsIntercept).toBeDefined();
      expect(model.featureNames).toHaveLength(19);
      expect(model.homeGoalsCoefficients).toHaveLength(19);
      expect(model.awayGoalsCoefficients).toHaveLength(19);
    });

    it('should produce reasonable coefficient values', () => {
      const features: MatchFeatures[] = [];
      const targets: MatchTarget[] = [];

      // Create more realistic training data
      for (let i = 0; i < 50; i++) {
        const homeElo = 1800 + Math.random() * 400;
        const awayElo = 1800 + Math.random() * 400;
        const homeGoalsScored = 1.5 + Math.random() * 1.5;
        const awayGoalsScored = 1.5 + Math.random() * 1.5;

        features.push(createSampleFeatures(homeElo, awayElo, homeGoalsScored, awayGoalsScored));

        // Simulate realistic goal outcomes
        const homeGoals = Math.round(homeGoalsScored + (homeElo - awayElo) / 500);
        const awayGoals = Math.round(awayGoalsScored + (awayElo - homeElo) / 500);

        targets.push(createSampleTarget(Math.max(0, homeGoals), Math.max(0, awayGoals)));
      }

      const model = trainLinearRegression(features, targets);

      // Coefficients should be finite numbers
      model.homeGoalsCoefficients.forEach(coef => {
        expect(isFinite(coef)).toBe(true);
        expect(isNaN(coef)).toBe(false);
      });

      model.awayGoalsCoefficients.forEach(coef => {
        expect(isFinite(coef)).toBe(true);
        expect(isNaN(coef)).toBe(false);
      });

      expect(isFinite(model.homeGoalsIntercept)).toBe(true);
      expect(isFinite(model.awayGoalsIntercept)).toBe(true);
    });
  });

  describe('Prediction', () => {
    it('should make predictions for new matches', () => {
      const features: MatchFeatures[] = [];
      const targets: MatchTarget[] = [];

      for (let i = 0; i < 30; i++) {
        const homeElo = 1800 + Math.random() * 400;
        const awayElo = 1800 + Math.random() * 400;
        const homeGoalsScored = 1.5 + Math.random() * 1.5;
        const awayGoalsScored = 1.5 + Math.random() * 1.5;

        features.push(createSampleFeatures(homeElo, awayElo, homeGoalsScored, awayGoalsScored));
        const homeGoals = Math.round(homeGoalsScored + (homeElo - awayElo) / 500);
        const awayGoals = Math.round(awayGoalsScored + (awayElo - homeElo) / 500);
        targets.push(createSampleTarget(Math.max(0, homeGoals), Math.max(0, awayGoals)));
      }

      const model = trainLinearRegression(features, targets);

      const testFeature = createSampleFeatures(2000, 1900, 2.2, 1.8);
      const prediction = predictLinearRegression(model, testFeature);

      expect(prediction.expectedHomeGoals).toBeGreaterThanOrEqual(0);
      expect(prediction.expectedAwayGoals).toBeGreaterThanOrEqual(0);
      expect(prediction.expectedTotalGoals).toBeGreaterThanOrEqual(0);
      expect(prediction.over25Prob).toBeGreaterThanOrEqual(0);
      expect(prediction.over25Prob).toBeLessThanOrEqual(1);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should predict higher goals for stronger teams', () => {
      const features: MatchFeatures[] = [];
      const targets: MatchTarget[] = [];

      // Create training data where higher Elo = more goals
      for (let i = 0; i < 50; i++) {
        const homeElo = 1800 + Math.random() * 400;
        const awayElo = 1800 + Math.random() * 400;
        const homeGoalsScored = 1.0 + (homeElo - 1800) / 200;
        const awayGoalsScored = 1.0 + (awayElo - 1800) / 200;

        features.push(createSampleFeatures(homeElo, awayElo, homeGoalsScored, awayGoalsScored));
        targets.push(createSampleTarget(
          Math.max(0, Math.round(homeGoalsScored)),
          Math.max(0, Math.round(awayGoalsScored))
        ));
      }

      const model = trainLinearRegression(features, targets);

      const strongTeam = createSampleFeatures(2200, 1800, 2.8, 1.5);
      const weakTeam = createSampleFeatures(1800, 2200, 1.5, 2.8);

      const strongPrediction = predictLinearRegression(model, strongTeam);
      const weakPrediction = predictLinearRegression(model, weakTeam);

      // Strong home team should score more than weak home team
      expect(strongPrediction.expectedHomeGoals).toBeGreaterThan(weakPrediction.expectedHomeGoals);
    });
  });

  describe('Evaluation', () => {
    it('should calculate evaluation metrics correctly', () => {
      const features: MatchFeatures[] = [];
      const targets: MatchTarget[] = [];

      for (let i = 0; i < 40; i++) {
        const homeElo = 1800 + Math.random() * 400;
        const awayElo = 1800 + Math.random() * 400;
        const homeGoalsScored = 1.5 + Math.random() * 1.5;
        const awayGoalsScored = 1.5 + Math.random() * 1.5;

        features.push(createSampleFeatures(homeElo, awayElo, homeGoalsScored, awayGoalsScored));
        const homeGoals = Math.round(homeGoalsScored + (homeElo - awayElo) / 500);
        const awayGoals = Math.round(awayGoalsScored + (awayElo - homeElo) / 500);
        targets.push(createSampleTarget(Math.max(0, homeGoals), Math.max(0, awayGoals)));
      }

      // Split data
      const trainFeatures = features.slice(0, 30);
      const trainTargets = targets.slice(0, 30);
      const testFeatures = features.slice(30);
      const testTargets = targets.slice(30);

      const model = trainLinearRegression(trainFeatures, trainTargets);
      const metrics = evaluateLinearRegression(model, testFeatures, testTargets);

      // R² should be between -∞ and 1 (typically between 0 and 1 for reasonable models)
      expect(metrics.homeGoals.r2).toBeLessThanOrEqual(1);
      expect(metrics.awayGoals.r2).toBeLessThanOrEqual(1);

      // MAE should be positive
      expect(metrics.homeGoals.mae).toBeGreaterThanOrEqual(0);
      expect(metrics.awayGoals.mae).toBeGreaterThanOrEqual(0);

      // RMSE should be >= MAE
      expect(metrics.homeGoals.rmse).toBeGreaterThanOrEqual(metrics.homeGoals.mae);
      expect(metrics.awayGoals.rmse).toBeGreaterThanOrEqual(metrics.awayGoals.mae);

      // MSE should equal RMSE²
      expect(Math.abs(metrics.homeGoals.mse - metrics.homeGoals.rmse ** 2)).toBeLessThan(0.0001);
      expect(Math.abs(metrics.awayGoals.mse - metrics.awayGoals.rmse ** 2)).toBeLessThan(0.0001);

      // Mean residual should be close to 0 (unbiased)
      expect(Math.abs(metrics.homeGoals.meanResidual)).toBeLessThan(1);
      expect(Math.abs(metrics.awayGoals.meanResidual)).toBeLessThan(1);

      // Over 2.5 accuracy should be between 0 and 1
      expect(metrics.combined.over25Accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.combined.over25Accuracy).toBeLessThanOrEqual(1);
    });

    it('should have metrics consistent with performance', () => {
      const features: MatchFeatures[] = [];
      const targets: MatchTarget[] = [];

      // Create realistic data with good variation
      for (let i = 0; i < 100; i++) {
        const homeElo = 1700 + Math.random() * 600;
        const awayElo = 1700 + Math.random() * 600;
        const homeGoalsScored = 0.8 + Math.random() * 2.5;
        const awayGoalsScored = 0.8 + Math.random() * 2.5;

        features.push(createSampleFeatures(homeElo, awayElo, homeGoalsScored, awayGoalsScored));

        // Add correlation between Elo and goals
        const homeBonus = (homeElo - 2000) / 300;
        const awayBonus = (awayElo - 2000) / 300;

        const homeGoals = Math.max(0, Math.round(homeGoalsScored + homeBonus));
        const awayGoals = Math.max(0, Math.round(awayGoalsScored + awayBonus));
        targets.push(createSampleTarget(homeGoals, awayGoals));
      }

      const trainFeatures = features.slice(0, 80);
      const trainTargets = targets.slice(0, 80);
      const testFeatures = features.slice(80);
      const testTargets = targets.slice(80);

      const model = trainLinearRegression(trainFeatures, trainTargets);
      const metrics = evaluateLinearRegression(model, testFeatures, testTargets);

      // MAE should be reasonable (positive and not too large)
      expect(metrics.homeGoals.mae).toBeGreaterThan(0);
      expect(metrics.awayGoals.mae).toBeGreaterThan(0);
      expect(metrics.homeGoals.mae).toBeLessThan(5);
      expect(metrics.awayGoals.mae).toBeLessThan(5);

      // R² should be finite
      expect(isFinite(metrics.homeGoals.r2)).toBe(true);
      expect(isFinite(metrics.awayGoals.r2)).toBe(true);

      // RMSE should be >= MAE
      expect(metrics.homeGoals.rmse).toBeGreaterThanOrEqual(metrics.homeGoals.mae);
      expect(metrics.awayGoals.rmse).toBeGreaterThanOrEqual(metrics.awayGoals.mae);
    });
  });

  describe('Coefficient Analysis', () => {
    it('should analyze coefficients correctly', () => {
      const features: MatchFeatures[] = [];
      const targets: MatchTarget[] = [];

      for (let i = 0; i < 50; i++) {
        const homeElo = 1800 + Math.random() * 400;
        const awayElo = 1800 + Math.random() * 400;
        const homeGoalsScored = 1.5 + Math.random() * 1.5;
        const awayGoalsScored = 1.5 + Math.random() * 1.5;

        features.push(createSampleFeatures(homeElo, awayElo, homeGoalsScored, awayGoalsScored));
        const homeGoals = Math.round(homeGoalsScored + (homeElo - awayElo) / 500);
        const awayGoals = Math.round(awayGoalsScored + (awayElo - homeElo) / 500);
        targets.push(createSampleTarget(Math.max(0, homeGoals), Math.max(0, awayGoals)));
      }

      const model = trainLinearRegression(features, targets);
      const analysis = analyzeCoefficients(model);

      expect(analysis.coefficients).toHaveLength(19);
      expect(analysis.topFeatures.homeGoals).toHaveLength(10);
      expect(analysis.topFeatures.awayGoals).toHaveLength(10);
      expect(analysis.intercepts.homeGoals).toBeDefined();
      expect(analysis.intercepts.awayGoals).toBeDefined();

      // Top features should be sorted by absolute value
      for (let i = 0; i < 9; i++) {
        expect(analysis.topFeatures.homeGoals[i].absValue)
          .toBeGreaterThanOrEqual(analysis.topFeatures.homeGoals[i + 1].absValue);
        expect(analysis.topFeatures.awayGoals[i].absValue)
          .toBeGreaterThanOrEqual(analysis.topFeatures.awayGoals[i + 1].absValue);
      }
    });
  });

  describe('Cross-Validation', () => {
    it('should perform k-fold cross-validation', () => {
      const features: MatchFeatures[] = [];
      const targets: MatchTarget[] = [];

      for (let i = 0; i < 100; i++) {
        const homeElo = 1800 + Math.random() * 400;
        const awayElo = 1800 + Math.random() * 400;
        const homeGoalsScored = 1.5 + Math.random() * 1.5;
        const awayGoalsScored = 1.5 + Math.random() * 1.5;

        features.push(createSampleFeatures(homeElo, awayElo, homeGoalsScored, awayGoalsScored));
        const homeGoals = Math.round(homeGoalsScored + (homeElo - awayElo) / 500);
        const awayGoals = Math.round(awayGoalsScored + (awayElo - homeElo) / 500);
        targets.push(createSampleTarget(Math.max(0, homeGoals), Math.max(0, awayGoals)));
      }

      const cvResults = crossValidateLinearRegression(features, targets, 5);

      expect(cvResults.foldResults).toHaveLength(5);
      expect(cvResults.meanR2Home).toBeDefined();
      expect(cvResults.meanR2Away).toBeDefined();
      expect(cvResults.meanMAEHome).toBeGreaterThanOrEqual(0);
      expect(cvResults.meanMAEAway).toBeGreaterThanOrEqual(0);
      expect(cvResults.meanOver25Accuracy).toBeGreaterThanOrEqual(0);
      expect(cvResults.meanOver25Accuracy).toBeLessThanOrEqual(1);
    });

    it('should have consistent results across folds', () => {
      const features: MatchFeatures[] = [];
      const targets: MatchTarget[] = [];

      for (let i = 0; i < 100; i++) {
        const homeElo = 1800 + Math.random() * 400;
        const awayElo = 1800 + Math.random() * 400;
        const homeGoalsScored = 1.5 + Math.random() * 1.5;
        const awayGoalsScored = 1.5 + Math.random() * 1.5;

        features.push(createSampleFeatures(homeElo, awayElo, homeGoalsScored, awayGoalsScored));
        const homeGoals = Math.round(homeGoalsScored + (homeElo - awayElo) / 500);
        const awayGoals = Math.round(awayGoalsScored + (awayElo - homeElo) / 500);
        targets.push(createSampleTarget(Math.max(0, homeGoals), Math.max(0, awayGoals)));
      }

      const cvResults = crossValidateLinearRegression(features, targets, 5);

      // All folds should have reasonable metrics
      cvResults.foldResults.forEach(fold => {
        expect(fold.homeGoals.mae).toBeGreaterThanOrEqual(0);
        expect(fold.awayGoals.mae).toBeGreaterThanOrEqual(0);
        expect(fold.homeGoals.mae).toBeLessThan(5); // Shouldn't be wildly inaccurate
        expect(fold.awayGoals.mae).toBeLessThan(5);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle perfect predictions', () => {
      const features: MatchFeatures[] = [
        createSampleFeatures(2000, 1800, 2.0, 1.0),
        createSampleFeatures(1900, 2100, 1.0, 2.0),
      ];

      const targets: MatchTarget[] = [
        createSampleTarget(2, 1),
        createSampleTarget(1, 2),
      ];

      const model = trainLinearRegression(features, targets);
      const metrics = evaluateLinearRegression(model, features, targets);

      // Perfect prediction should have R² = 1 or very close
      // (might not be exactly 1 due to numerical precision)
      expect(metrics.homeGoals.mae).toBeLessThan(0.5);
      expect(metrics.awayGoals.mae).toBeLessThan(0.5);
    });

    it('should handle all zeros in target', () => {
      const features: MatchFeatures[] = [
        createSampleFeatures(2000, 1800, 0, 0),
        createSampleFeatures(1900, 2100, 0, 0),
      ];

      const targets: MatchTarget[] = [
        createSampleTarget(0, 0),
        createSampleTarget(0, 0),
      ];

      const model = trainLinearRegression(features, targets);
      const prediction = predictLinearRegression(model, features[0]);

      expect(prediction.expectedHomeGoals).toBeGreaterThanOrEqual(0);
      expect(prediction.expectedAwayGoals).toBeGreaterThanOrEqual(0);
    });
  });
});
