import { describe, it, expect } from 'vitest';
import type { PredictionComparison, EffectivenessMetrics } from './mlModelEffectivenessTest';

/**
 * Tests para el módulo de test de efectividad del modelo
 */

describe('mlModelEffectivenessTest', () => {
  describe('Estructura de datos', () => {
    it('debe tener la estructura correcta para PredictionComparison', () => {
      const comparison: PredictionComparison = {
        match: {
          matchId: 'test-1',
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          homeScore: 2,
          awayScore: 1,
          outcome: 'home',
          totalGoals: 3,
          over25: true,
          matchDate: '2024-10-15'
        },
        prediction: {
          homeWinProb: 0.55,
          drawProb: 0.25,
          awayWinProb: 0.20,
          predictedOutcome: 'home',
          over25Prob: 0.65,
          predictedOver25: true,
          expectedHomeScore: 1.8,
          expectedAwayScore: 1.2,
          confidence: 0.75
        },
        accuracy: {
          outcomeCorrect: true,
          over25Correct: true,
          scoreErrorHome: 0.2,
          scoreErrorAway: 0.2
        }
      };

      expect(comparison.match.matchId).toBe('test-1');
      expect(comparison.prediction.predictedOutcome).toBe('home');
      expect(comparison.accuracy.outcomeCorrect).toBe(true);
    });
  });

  describe('Cálculo de métricas', () => {
    it('debe calcular accuracy correctamente', () => {
      // Crear datos de prueba
      const comparisons: PredictionComparison[] = [
        createComparison('home', 'home', true),
        createComparison('home', 'draw', false),
        createComparison('away', 'away', true),
        createComparison('draw', 'draw', true),
      ];

      // 3 de 4 correctos = 75%
      const correctCount = comparisons.filter(c => c.accuracy.outcomeCorrect).length;
      const accuracy = correctCount / comparisons.length;

      expect(accuracy).toBe(0.75);
    });

    it('debe calcular precision y recall para una categoría', () => {
      // Crear datos de prueba con 2 TP, 1 FP, 1 FN para 'home'
      const comparisons: PredictionComparison[] = [
        createComparison('home', 'home', true),  // TP
        createComparison('home', 'home', true),  // TP
        createComparison('draw', 'home', false), // FP
        createComparison('home', 'draw', false), // FN
      ];

      // True Positives: predicho home y es home = 2
      // False Positives: predicho home pero no es home = 1
      // False Negatives: es home pero no predicho home = 1

      const tp = comparisons.filter(c =>
        c.match.outcome === 'home' && c.prediction.predictedOutcome === 'home'
      ).length;

      const fp = comparisons.filter(c =>
        c.match.outcome !== 'home' && c.prediction.predictedOutcome === 'home'
      ).length;

      const fn = comparisons.filter(c =>
        c.match.outcome === 'home' && c.prediction.predictedOutcome !== 'home'
      ).length;

      const precision = tp / (tp + fp); // 2 / 3 = 0.666
      const recall = tp / (tp + fn);     // 2 / 3 = 0.666
      const f1 = 2 * (precision * recall) / (precision + recall);

      expect(tp).toBe(2);
      expect(fp).toBe(1);
      expect(fn).toBe(1);
      expect(precision).toBeCloseTo(0.666, 2);
      expect(recall).toBeCloseTo(0.666, 2);
      expect(f1).toBeCloseTo(0.666, 2);
    });

    it('debe calcular Brier Score correctamente', () => {
      // Brier score = promedio de (predicción - real)^2 para cada clase
      const comparison = createComparison('home', 'home', true);
      comparison.prediction.homeWinProb = 0.7;
      comparison.prediction.drawProb = 0.2;
      comparison.prediction.awayWinProb = 0.1;

      // Real: home=1, draw=0, away=0
      const brierScore =
        Math.pow(0.7 - 1, 2) +  // (0.7 - 1)^2 = 0.09
        Math.pow(0.2 - 0, 2) +  // (0.2 - 0)^2 = 0.04
        Math.pow(0.1 - 0, 2);   // (0.1 - 0)^2 = 0.01
                                // Total = 0.14

      expect(brierScore).toBeCloseTo(0.14, 2);
    });

    it('debe calcular error de goles correctamente', () => {
      const comparison = createComparison('home', 'home', true);
      comparison.match.homeScore = 3;
      comparison.match.awayScore = 1;
      comparison.prediction.expectedHomeScore = 2.5;
      comparison.prediction.expectedAwayScore = 1.2;

      const homeError = Math.abs(comparison.prediction.expectedHomeScore - comparison.match.homeScore);
      const awayError = Math.abs(comparison.prediction.expectedAwayScore - comparison.match.awayScore);

      expect(homeError).toBe(0.5);
      expect(awayError).toBeCloseTo(0.2, 1);
    });

    it('debe calcular RMSE correctamente', () => {
      const errors = [0.5, 1.0, 0.3];
      const squaredErrors = errors.map(e => e * e);
      const meanSquaredError = squaredErrors.reduce((a, b) => a + b, 0) / errors.length;
      const rmse = Math.sqrt(meanSquaredError);

      // (0.25 + 1.0 + 0.09) / 3 = 0.4467
      // sqrt(0.4467) = 0.668

      expect(rmse).toBeCloseTo(0.668, 2);
    });
  });

  describe('Over 2.5 goles', () => {
    it('debe identificar correctamente over 2.5', () => {
      const over = createComparison('home', 'home', true);
      over.match.totalGoals = 4;
      over.match.over25 = true;

      const under = createComparison('home', 'home', true);
      under.match.totalGoals = 2;
      under.match.over25 = false;

      expect(over.match.over25).toBe(true);
      expect(under.match.over25).toBe(false);
    });

    it('debe calcular accuracy de over 2.5', () => {
      const comparisons: PredictionComparison[] = [
        createOver25Comparison(true, true),   // TP
        createOver25Comparison(true, true),   // TP
        createOver25Comparison(false, false), // TN
        createOver25Comparison(true, false),  // FN
        createOver25Comparison(false, true),  // FP
      ];

      const correct = comparisons.filter(c => c.accuracy.over25Correct).length;
      const accuracy = correct / comparisons.length;

      // TP=2, TN=1 = 3 correctos de 5 = 60%
      expect(accuracy).toBe(0.6);
    });
  });

  describe('Matriz de confusión', () => {
    it('debe construir matriz de confusión correctamente', () => {
      const comparisons: PredictionComparison[] = [
        createComparison('home', 'home', true),
        createComparison('home', 'draw', false),
        createComparison('home', 'away', false),
        createComparison('draw', 'home', false),
        createComparison('draw', 'draw', true),
        createComparison('away', 'away', true),
      ];

      const matrix = {
        home: { predictedHome: 0, predictedDraw: 0, predictedAway: 0 },
        draw: { predictedHome: 0, predictedDraw: 0, predictedAway: 0 },
        away: { predictedHome: 0, predictedDraw: 0, predictedAway: 0 }
      };

      comparisons.forEach(comp => {
        const actual = comp.match.outcome;
        const predicted = comp.prediction.predictedOutcome;
        const key = `predicted${predicted.charAt(0).toUpperCase() + predicted.slice(1)}` as keyof typeof matrix[typeof actual];
        matrix[actual][key]++;
      });

      expect(matrix.home.predictedHome).toBe(1);
      expect(matrix.home.predictedDraw).toBe(1);
      expect(matrix.home.predictedAway).toBe(1);
      expect(matrix.draw.predictedHome).toBe(1);
      expect(matrix.draw.predictedDraw).toBe(1);
      expect(matrix.away.predictedAway).toBe(1);
    });
  });

  describe('Validación de datos', () => {
    it('debe validar rangos de probabilidades', () => {
      const comparison = createComparison('home', 'home', true);

      // Las probabilidades deben sumar ~1
      const sum = comparison.prediction.homeWinProb +
                  comparison.prediction.drawProb +
                  comparison.prediction.awayWinProb;

      expect(sum).toBeCloseTo(1.0, 1);
    });

    it('debe validar que las probabilidades estén entre 0 y 1', () => {
      const comparison = createComparison('home', 'home', true);

      expect(comparison.prediction.homeWinProb).toBeGreaterThanOrEqual(0);
      expect(comparison.prediction.homeWinProb).toBeLessThanOrEqual(1);
      expect(comparison.prediction.drawProb).toBeGreaterThanOrEqual(0);
      expect(comparison.prediction.drawProb).toBeLessThanOrEqual(1);
      expect(comparison.prediction.awayWinProb).toBeGreaterThanOrEqual(0);
      expect(comparison.prediction.awayWinProb).toBeLessThanOrEqual(1);
    });

    it('debe validar que los goles esperados sean no negativos', () => {
      const comparison = createComparison('home', 'home', true);

      expect(comparison.prediction.expectedHomeScore).toBeGreaterThanOrEqual(0);
      expect(comparison.prediction.expectedAwayScore).toBeGreaterThanOrEqual(0);
    });
  });
});

/**
 * Helper: Crea una comparación de prueba
 */
function createComparison(
  actualOutcome: 'home' | 'draw' | 'away',
  predictedOutcome: 'home' | 'draw' | 'away',
  correct: boolean
): PredictionComparison {
  return {
    match: {
      matchId: `test-${Math.random()}`,
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      homeScore: actualOutcome === 'home' ? 2 : actualOutcome === 'away' ? 0 : 1,
      awayScore: actualOutcome === 'away' ? 2 : actualOutcome === 'home' ? 0 : 1,
      outcome: actualOutcome,
      totalGoals: 2,
      over25: false,
      matchDate: '2024-10-15'
    },
    prediction: {
      homeWinProb: predictedOutcome === 'home' ? 0.6 : 0.2,
      drawProb: predictedOutcome === 'draw' ? 0.6 : 0.2,
      awayWinProb: predictedOutcome === 'away' ? 0.6 : 0.2,
      predictedOutcome,
      over25Prob: 0.4,
      predictedOver25: false,
      expectedHomeScore: 1.5,
      expectedAwayScore: 1.0,
      confidence: 0.7
    },
    accuracy: {
      outcomeCorrect: correct,
      over25Correct: true,
      scoreErrorHome: 0.5,
      scoreErrorAway: 0.5
    }
  };
}

/**
 * Helper: Crea una comparación para over 2.5
 */
function createOver25Comparison(
  actualOver25: boolean,
  predictedOver25: boolean
): PredictionComparison {
  return {
    match: {
      matchId: `test-${Math.random()}`,
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      homeScore: actualOver25 ? 2 : 1,
      awayScore: actualOver25 ? 2 : 0,
      outcome: 'home',
      totalGoals: actualOver25 ? 4 : 1,
      over25: actualOver25,
      matchDate: '2024-10-15'
    },
    prediction: {
      homeWinProb: 0.5,
      drawProb: 0.3,
      awayWinProb: 0.2,
      predictedOutcome: 'home',
      over25Prob: predictedOver25 ? 0.7 : 0.3,
      predictedOver25,
      expectedHomeScore: predictedOver25 ? 2.0 : 1.0,
      expectedAwayScore: predictedOver25 ? 1.5 : 0.5,
      confidence: 0.7
    },
    accuracy: {
      outcomeCorrect: true,
      over25Correct: actualOver25 === predictedOver25,
      scoreErrorHome: 0.5,
      scoreErrorAway: 0.5
    }
  };
}
