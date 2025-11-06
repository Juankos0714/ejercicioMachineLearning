import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateEloExpectedScore,
  updateEloRatings,
  calculatePoissonProbabilities,
  monteCarloSimulation,
  calculateOver25Probability,
  calculateXG,
  calculateExpectedLambda,
  calculateBrierScore,
  exponentialWeightedAverage,
  type EloUpdateResult,
  type PoissonProbabilities,
  type MonteCarloResult
} from './mathUtils';

describe('mathUtils - Elo Rating System', () => {
  describe('calculateEloExpectedScore', () => {
    it('should return 0.5 for equal ratings', () => {
      const result = calculateEloExpectedScore(1500, 1500);
      expect(result).toBeCloseTo(0.5, 3);
    });

    it('should return higher probability for higher rated team', () => {
      const result = calculateEloExpectedScore(1700, 1500);
      expect(result).toBeGreaterThan(0.5);
      expect(result).toBeCloseTo(0.7597, 3);
    });

    it('should return lower probability for lower rated team', () => {
      const result = calculateEloExpectedScore(1300, 1500);
      expect(result).toBeLessThan(0.5);
      expect(result).toBeCloseTo(0.2403, 3);
    });

    it('should handle extreme rating differences', () => {
      const result = calculateEloExpectedScore(2000, 1200);
      expect(result).toBeGreaterThan(0.95);
    });

    it('should be symmetric', () => {
      const resultA = calculateEloExpectedScore(1600, 1400);
      const resultB = calculateEloExpectedScore(1400, 1600);
      expect(resultA + resultB).toBeCloseTo(1.0, 3);
    });
  });

  describe('updateEloRatings', () => {
    it('should increase winner rating and decrease loser rating', () => {
      const result: EloUpdateResult = updateEloRatings(1500, 1500, 2, 0, true);
      expect(result.newRatingA).toBeGreaterThan(1500);
      expect(result.newRatingB).toBeLessThan(1500);
    });

    it('should handle draws correctly', () => {
      const result: EloUpdateResult = updateEloRatings(1500, 1500, 1, 1, true);
      // With home advantage factored in, home team loses slight rating even in draw
      // because they were expected to do better at home
      const ratingChange = Math.abs(result.newRatingA - 1500);
      expect(ratingChange).toBeLessThan(2); // Small change for draw
      expect(result.newRatingA + result.newRatingB).toBeCloseTo(3000, 0); // Total conserved
    });

    it('should apply goal difference multiplier', () => {
      const result1 = updateEloRatings(1500, 1500, 1, 0, true);
      const result2 = updateEloRatings(1500, 1500, 5, 0, true);
      const ratingChange1 = result1.newRatingA - 1500;
      const ratingChange2 = result2.newRatingA - 1500;
      expect(ratingChange2).toBeGreaterThan(ratingChange1);
    });

    it('should apply home advantage correctly', () => {
      const homeResult = updateEloRatings(1500, 1500, 1, 0, true);
      const awayResult = updateEloRatings(1500, 1500, 1, 0, false);
      // Home advantage affects expected score, thus rating change
      const homeChange = homeResult.newRatingA - 1500;
      const awayChange = awayResult.newRatingA - 1500;
      expect(homeChange).toBeGreaterThan(0);
      expect(awayChange).toBeGreaterThan(0);
      // Both should increase for a win, but with different magnitudes
      expect(Math.abs(homeChange - awayChange)).toBeGreaterThan(0);
    });

    it('should conserve total rating points', () => {
      const result = updateEloRatings(1500, 1600, 2, 1, true);
      const totalBefore = 1500 + 1600;
      const totalAfter = result.newRatingA + result.newRatingB;
      expect(totalAfter).toBeCloseTo(totalBefore, 1);
    });
  });
});

describe('mathUtils - Poisson Distribution', () => {
  describe('calculatePoissonProbabilities', () => {
    it('should return probabilities that sum to approximately 1', () => {
      const result: PoissonProbabilities = calculatePoissonProbabilities(1.5, 1.2);
      const total = result.homeWin + result.draw + result.awayWin;
      expect(total).toBeCloseTo(1.0, 2);
    });

    it('should favor home team with higher lambda', () => {
      const result = calculatePoissonProbabilities(2.5, 1.0);
      expect(result.homeWin).toBeGreaterThan(result.awayWin);
    });

    it('should favor away team with lower home lambda', () => {
      const result = calculatePoissonProbabilities(1.0, 2.5);
      expect(result.awayWin).toBeGreaterThan(result.homeWin);
    });

    it('should have balanced probabilities for equal lambdas', () => {
      const result = calculatePoissonProbabilities(1.5, 1.5);
      expect(result.homeWin).toBeCloseTo(result.awayWin, 1);
    });

    it('should produce valid score matrix', () => {
      const result = calculatePoissonProbabilities(1.8, 1.3, 5);
      expect(result.scoreMatrix).toBeDefined();
      expect(result.scoreMatrix.length).toBe(6);
      expect(result.scoreMatrix[0].length).toBe(6);

      // Check all probabilities are non-negative
      result.scoreMatrix.forEach(row => {
        row.forEach(prob => {
          expect(prob).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('should handle low scoring match prediction', () => {
      const result = calculatePoissonProbabilities(0.8, 0.7);
      expect(result.draw).toBeGreaterThan(0.15);
    });

    it('should handle high scoring match prediction', () => {
      const result = calculatePoissonProbabilities(3.0, 2.8);
      const lowScoringProb = result.scoreMatrix[0][0] + result.scoreMatrix[0][1] + result.scoreMatrix[1][0];
      expect(lowScoringProb).toBeLessThan(0.1);
    });
  });
});

describe('mathUtils - Monte Carlo Simulation', () => {
  describe('monteCarloSimulation', () => {
    it('should return probabilities that sum to approximately 1', () => {
      const result: MonteCarloResult = monteCarloSimulation(1.5, 1.2, 1000);
      const total = result.homeWinProb + result.drawProb + result.awayWinProb;
      expect(total).toBeCloseTo(1.0, 2);
    });

    it('should have average scores close to lambda values', () => {
      const lambdaHome = 2.0;
      const lambdaAway = 1.5;
      const result = monteCarloSimulation(lambdaHome, lambdaAway, 10000);
      expect(result.avgHomeScore).toBeCloseTo(lambdaHome, 0);
      expect(result.avgAwayScore).toBeCloseTo(lambdaAway, 0);
    });

    it('should favor home team with higher lambda', () => {
      const result = monteCarloSimulation(2.5, 1.0, 1000);
      expect(result.homeWinProb).toBeGreaterThan(result.awayWinProb);
    });

    it('should favor away team with lower home lambda', () => {
      const result = monteCarloSimulation(1.0, 2.5, 1000);
      expect(result.awayWinProb).toBeGreaterThan(result.homeWinProb);
    });

    it('should have score distribution with positive frequencies', () => {
      const result = monteCarloSimulation(1.8, 1.3, 1000);
      expect(result.scoreDistribution.size).toBeGreaterThan(0);

      let totalFreq = 0;
      result.scoreDistribution.forEach(freq => {
        expect(freq).toBeGreaterThan(0);
        totalFreq += freq;
      });
      expect(totalFreq).toBe(1000);
    });

    it('should calculate over 2.5 probability correctly', () => {
      const result = monteCarloSimulation(2.5, 2.0, 10000);
      expect(result.over25Prob).toBeGreaterThan(0.5);
    });

    it('should be consistent with multiple runs', () => {
      const result1 = monteCarloSimulation(1.8, 1.5, 5000);
      const result2 = monteCarloSimulation(1.8, 1.5, 5000);

      expect(result1.homeWinProb).toBeCloseTo(result2.homeWinProb, 1);
      expect(result1.drawProb).toBeCloseTo(result2.drawProb, 1);
      expect(result1.awayWinProb).toBeCloseTo(result2.awayWinProb, 1);
    });
  });
});

describe('mathUtils - Over/Under Calculations', () => {
  describe('calculateOver25Probability', () => {
    it('should return probability between 0 and 1', () => {
      const result = calculateOver25Probability(1.5, 1.3);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should return high probability for high-scoring match', () => {
      const result = calculateOver25Probability(2.8, 2.5);
      expect(result).toBeGreaterThan(0.7);
    });

    it('should return low probability for low-scoring match', () => {
      const result = calculateOver25Probability(0.8, 0.7);
      expect(result).toBeLessThan(0.3);
    });

    it('should increase with higher lambdas', () => {
      const result1 = calculateOver25Probability(1.0, 1.0);
      const result2 = calculateOver25Probability(2.0, 2.0);
      expect(result2).toBeGreaterThan(result1);
    });

    it('should match Monte Carlo results approximately', () => {
      const lambdaHome = 1.8;
      const lambdaAway = 1.6;
      const poissonResult = calculateOver25Probability(lambdaHome, lambdaAway);
      const mcResult = monteCarloSimulation(lambdaHome, lambdaAway, 10000);

      expect(poissonResult).toBeCloseTo(mcResult.over25Prob, 1);
    });
  });
});

describe('mathUtils - Expected Goals (xG)', () => {
  describe('calculateXG', () => {
    it('should return positive xG for shots', () => {
      const result = calculateXG(15, 8, 55);
      expect(result).toBeGreaterThan(0);
    });

    it('should increase with more shots', () => {
      const result1 = calculateXG(10, 5, 50);
      const result2 = calculateXG(20, 10, 50);
      expect(result2).toBeGreaterThan(result1);
    });

    it('should increase with better shot quality', () => {
      const result1 = calculateXG(10, 3, 50);
      const result2 = calculateXG(10, 7, 50);
      expect(result2).toBeGreaterThan(result1);
    });

    it('should increase with higher possession', () => {
      const result1 = calculateXG(15, 8, 40);
      const result2 = calculateXG(15, 8, 60);
      expect(result2).toBeGreaterThan(result1);
    });

    it('should handle edge case of zero shots', () => {
      const result = calculateXG(0, 0, 50);
      expect(result).toBe(0);
    });

    it('should handle edge case of no shots on target', () => {
      const result = calculateXG(10, 0, 50);
      expect(result).toBe(0);
    });

    it('should be realistic for typical match values', () => {
      const result = calculateXG(15, 7, 55);
      expect(result).toBeGreaterThan(0.5);
      expect(result).toBeLessThan(3.0);
    });
  });
});

describe('mathUtils - Lambda Calculation', () => {
  describe('calculateExpectedLambda', () => {
    it('should return positive lambda', () => {
      const result = calculateExpectedLambda(1.8, 1.2, 1.9, 1800, 1700, true);
      expect(result).toBeGreaterThan(0);
    });

    it('should increase with home advantage', () => {
      const homeResult = calculateExpectedLambda(1.8, 1.2, 1.9, 1800, 1800, true);
      const awayResult = calculateExpectedLambda(1.8, 1.2, 1.9, 1800, 1800, false);
      expect(homeResult).toBeGreaterThan(awayResult);
    });

    it('should increase with higher Elo rating', () => {
      const result1 = calculateExpectedLambda(1.8, 1.2, 1.9, 1600, 1800, true);
      const result2 = calculateExpectedLambda(1.8, 1.2, 1.9, 1900, 1800, true);
      expect(result2).toBeGreaterThan(result1);
    });

    it('should increase with higher attack strength', () => {
      const result1 = calculateExpectedLambda(1.2, 1.2, 1.3, 1800, 1800, true);
      const result2 = calculateExpectedLambda(2.2, 1.2, 2.3, 1800, 1800, true);
      expect(result2).toBeGreaterThan(result1);
    });

    it('should increase with weaker defense', () => {
      const result1 = calculateExpectedLambda(1.8, 0.8, 1.9, 1800, 1800, true);
      const result2 = calculateExpectedLambda(1.8, 1.5, 1.9, 1800, 1800, true);
      expect(result2).toBeGreaterThan(result1);
    });

    it('should be clamped between 0.3 and 4.0', () => {
      const result1 = calculateExpectedLambda(0.1, 0.1, 0.1, 1200, 2200, false);
      const result2 = calculateExpectedLambda(5.0, 3.0, 5.0, 2200, 1200, true);

      expect(result1).toBeGreaterThanOrEqual(0.3);
      expect(result2).toBeLessThanOrEqual(4.0);
    });

    it('should produce realistic values for typical teams', () => {
      const result = calculateExpectedLambda(1.8, 1.3, 1.9, 1850, 1800, true);
      expect(result).toBeGreaterThan(1.0);
      expect(result).toBeLessThan(3.0);
    });
  });
});

describe('mathUtils - Accuracy Metrics', () => {
  describe('calculateBrierScore', () => {
    it('should return 0 for perfect prediction', () => {
      const predicted = { home: 1, draw: 0, away: 0 };
      const actual = { home: 1, draw: 0, away: 0 };
      const result = calculateBrierScore(predicted, actual);
      expect(result).toBe(0);
    });

    it('should return higher score for worse prediction', () => {
      const predicted = { home: 1, draw: 0, away: 0 };
      const actual = { home: 0, draw: 0, away: 1 };
      const result = calculateBrierScore(predicted, actual);
      expect(result).toBeGreaterThan(0.5);
    });

    it('should be between 0 and 1', () => {
      const predicted = { home: 0.5, draw: 0.3, away: 0.2 };
      const actual = { home: 1, draw: 0, away: 0 };
      const result = calculateBrierScore(predicted, actual);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should reward probabilistic accuracy', () => {
      const predicted1 = { home: 0.7, draw: 0.2, away: 0.1 };
      const predicted2 = { home: 0.4, draw: 0.3, away: 0.3 };
      const actual = { home: 1, draw: 0, away: 0 };

      const score1 = calculateBrierScore(predicted1, actual);
      const score2 = calculateBrierScore(predicted2, actual);

      expect(score1).toBeLessThan(score2);
    });

    it('should handle draw predictions correctly', () => {
      const predicted = { home: 0.3, draw: 0.5, away: 0.2 };
      const actual = { home: 0, draw: 1, away: 0 };
      const result = calculateBrierScore(predicted, actual);
      expect(result).toBeLessThan(0.3);
    });
  });
});

describe('mathUtils - Statistical Functions', () => {
  describe('exponentialWeightedAverage', () => {
    it('should return single value for array of length 1', () => {
      const result = exponentialWeightedAverage([5]);
      expect(result).toBe(5);
    });

    it('should return 0 for empty array', () => {
      const result = exponentialWeightedAverage([]);
      expect(result).toBe(0);
    });

    it('should weight recent values more heavily', () => {
      const values = [1, 1, 1, 5];
      const result = exponentialWeightedAverage(values, 0.5);
      expect(result).toBeGreaterThan(2.5);
    });

    it('should approach simple average with low alpha', () => {
      const values = [1, 2, 3, 4, 5];
      const result = exponentialWeightedAverage(values, 0.1);
      expect(result).toBeGreaterThan(1);
      expect(result).toBeLessThan(4);
    });

    it('should heavily weight last value with high alpha', () => {
      const values = [1, 1, 1, 10];
      const result = exponentialWeightedAverage(values, 0.9);
      expect(result).toBeGreaterThan(8);
    });

    it('should handle consistent values', () => {
      const values = [3, 3, 3, 3, 3];
      const result = exponentialWeightedAverage(values, 0.3);
      expect(result).toBeCloseTo(3, 1);
    });
  });
});

describe('mathUtils - Integration Tests', () => {
  it('should produce consistent predictions across methods', () => {
    const lambdaHome = 1.8;
    const lambdaAway = 1.5;

    const poissonResult = calculatePoissonProbabilities(lambdaHome, lambdaAway);
    const mcResult = monteCarloSimulation(lambdaHome, lambdaAway, 10000);

    // Results should be within 10% of each other
    const homeWinDiff = Math.abs(poissonResult.homeWin - mcResult.homeWinProb);
    const drawDiff = Math.abs(poissonResult.draw - mcResult.drawProb);
    const awayWinDiff = Math.abs(poissonResult.awayWin - mcResult.awayWinProb);

    expect(homeWinDiff).toBeLessThan(0.1);
    expect(drawDiff).toBeLessThan(0.1);
    expect(awayWinDiff).toBeLessThan(0.1);
  });

  it('should produce realistic match prediction', () => {
    // Simulate Man Utd vs Real Madrid
    const homeElo = 1900;
    const awayElo = 2120;
    const homeGoalsScored = 1.8;
    const awayGoalsScored = 2.6;
    const homeGoalsConceded = 1.3;
    const awayGoalsConceded = 0.9;
    const homeXG = 1.9;
    const awayXG = 2.8;

    const lambdaHome = calculateExpectedLambda(
      homeGoalsScored,
      awayGoalsConceded,
      homeXG,
      homeElo,
      awayElo,
      true
    );

    const lambdaAway = calculateExpectedLambda(
      awayGoalsScored,
      homeGoalsConceded,
      awayXG,
      awayElo,
      homeElo,
      false
    );

    const prediction = calculatePoissonProbabilities(lambdaHome, lambdaAway);
    const over25 = calculateOver25Probability(lambdaHome, lambdaAway);

    // Real Madrid should be favored
    expect(prediction.awayWin).toBeGreaterThan(prediction.homeWin);

    // High scoring match expected
    expect(over25).toBeGreaterThan(0.5);

    // All probabilities should be positive
    expect(prediction.homeWin).toBeGreaterThan(0);
    expect(prediction.draw).toBeGreaterThan(0);
    expect(prediction.awayWin).toBeGreaterThan(0);

    // Probabilities should sum to 1
    expect(prediction.homeWin + prediction.draw + prediction.awayWin).toBeCloseTo(1, 2);
  });
});

describe('mathUtils - Precision Statistics', () => {
  it('should maintain high precision across calculations', () => {
    const testCases = [
      { lambdaHome: 1.5, lambdaAway: 1.5 },
      { lambdaHome: 0.8, lambdaAway: 2.3 },
      { lambdaHome: 2.5, lambdaAway: 1.2 },
      { lambdaHome: 1.8, lambdaAway: 1.6 }
    ];

    const precisionErrors: number[] = [];

    testCases.forEach(testCase => {
      const poissonResult = calculatePoissonProbabilities(
        testCase.lambdaHome,
        testCase.lambdaAway
      );
      const mcResult = monteCarloSimulation(
        testCase.lambdaHome,
        testCase.lambdaAway,
        10000
      );

      // Calculate error between Poisson and Monte Carlo
      const homeError = Math.abs(poissonResult.homeWin - mcResult.homeWinProb);
      const drawError = Math.abs(poissonResult.draw - mcResult.drawProb);
      const awayError = Math.abs(poissonResult.awayWin - mcResult.awayWinProb);
      const avgError = (homeError + drawError + awayError) / 3;

      precisionErrors.push(avgError);
    });

    const avgPrecisionError = precisionErrors.reduce((a, b) => a + b) / precisionErrors.length;
    const maxPrecisionError = Math.max(...precisionErrors);

    // Average precision error should be less than 5%
    expect(avgPrecisionError).toBeLessThan(0.05);

    // Maximum precision error should be less than 10%
    expect(maxPrecisionError).toBeLessThan(0.10);

    console.log('\n=== PRECISION STATISTICS ===');
    console.log(`Average Precision Error: ${(avgPrecisionError * 100).toFixed(2)}%`);
    console.log(`Maximum Precision Error: ${(maxPrecisionError * 100).toFixed(2)}%`);
    console.log(`Test Cases: ${testCases.length}`);
    console.log('==========================\n');
  });
});
