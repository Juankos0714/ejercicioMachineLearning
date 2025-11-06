import { describe, it, expect } from 'vitest';
import {
  calculatePoissonProbabilities,
  monteCarloSimulation,
  calculateOver25Probability,
  calculateExpectedLambda,
  calculateBrierScore,
  updateEloRatings,
  calculateXG
} from './mathUtils';

interface PrecisionTest {
  name: string;
  lambdaHome: number;
  lambdaAway: number;
  poissonError?: number;
  mcError?: number;
  over25Error?: number;
}

interface AccuracyMetrics {
  totalTests: number;
  averageError: number;
  maxError: number;
  minError: number;
  errorStdDev: number;
  successRate: number;
}

describe('Precision Report - Comprehensive Analysis', () => {
  it('should generate comprehensive precision statistics', () => {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║         REPORTE DE PRECISIÓN - TESTS UNITARIOS                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const testCases: PrecisionTest[] = [
      { name: 'Partido equilibrado', lambdaHome: 1.5, lambdaAway: 1.5 },
      { name: 'Favorito local', lambdaHome: 2.5, lambdaAway: 1.2 },
      { name: 'Favorito visitante', lambdaHome: 1.0, lambdaAway: 2.8 },
      { name: 'Bajo scoring', lambdaHome: 0.8, lambdaAway: 0.7 },
      { name: 'Alto scoring', lambdaHome: 3.0, lambdaAway: 2.5 },
      { name: 'Diferencia moderada', lambdaHome: 1.8, lambdaAway: 1.3 },
      { name: 'Gran favorito local', lambdaHome: 3.5, lambdaAway: 0.8 },
      { name: 'Gran favorito visitante', lambdaHome: 0.9, lambdaAway: 3.2 }
    ];

    const errors: number[] = [];
    const over25Errors: number[] = [];

    console.log('📊 ANÁLISIS DE PREDICCIONES POR MÉTODO\n');
    console.log('─────────────────────────────────────────────────────────────────');

    testCases.forEach((testCase, index) => {
      const poissonResult = calculatePoissonProbabilities(
        testCase.lambdaHome,
        testCase.lambdaAway
      );
      const mcResult = monteCarloSimulation(
        testCase.lambdaHome,
        testCase.lambdaAway,
        10000
      );
      const over25Poisson = calculateOver25Probability(
        testCase.lambdaHome,
        testCase.lambdaAway
      );

      const homeError = Math.abs(poissonResult.homeWin - mcResult.homeWinProb);
      const drawError = Math.abs(poissonResult.draw - mcResult.drawProb);
      const awayError = Math.abs(poissonResult.awayWin - mcResult.awayWinProb);
      const avgError = (homeError + drawError + awayError) / 3;
      const over25Error = Math.abs(over25Poisson - mcResult.over25Prob);

      errors.push(avgError);
      over25Errors.push(over25Error);

      testCase.poissonError = avgError;
      testCase.over25Error = over25Error;

      console.log(`\n${index + 1}. ${testCase.name}`);
      console.log(`   Lambda: Home ${testCase.lambdaHome} - Away ${testCase.lambdaAway}`);
      console.log(`   Poisson: H:${(poissonResult.homeWin * 100).toFixed(1)}% D:${(poissonResult.draw * 100).toFixed(1)}% A:${(poissonResult.awayWin * 100).toFixed(1)}%`);
      console.log(`   MonteCarlo: H:${(mcResult.homeWinProb * 100).toFixed(1)}% D:${(mcResult.drawProb * 100).toFixed(1)}% A:${(mcResult.awayWinProb * 100).toFixed(1)}%`);
      console.log(`   ✓ Error promedio: ${(avgError * 100).toFixed(2)}%`);
      console.log(`   ✓ Error Over 2.5: ${(over25Error * 100).toFixed(2)}%`);
    });

    // Calculate statistics
    const avgError = errors.reduce((a, b) => a + b) / errors.length;
    const maxError = Math.max(...errors);
    const minError = Math.min(...errors);
    const avgOver25Error = over25Errors.reduce((a, b) => a + b) / over25Errors.length;

    // Standard deviation
    const variance = errors.reduce((sum, err) => sum + Math.pow(err - avgError, 2), 0) / errors.length;
    const stdDev = Math.sqrt(variance);

    // Success rate (errors < 5%)
    const successfulTests = errors.filter(err => err < 0.05).length;
    const successRate = (successfulTests / errors.length) * 100;

    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                  ESTADÍSTICAS DE PRECISIÓN                     ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('📈 MÉTRICAS GENERALES:');
    console.log(`   • Total de tests: ${testCases.length}`);
    console.log(`   • Error promedio: ${(avgError * 100).toFixed(3)}%`);
    console.log(`   • Error mínimo: ${(minError * 100).toFixed(3)}%`);
    console.log(`   • Error máximo: ${(maxError * 100).toFixed(3)}%`);
    console.log(`   • Desviación estándar: ${(stdDev * 100).toFixed(3)}%`);
    console.log(`   • Tasa de éxito (error < 5%): ${successRate.toFixed(1)}%\n`);

    console.log('🎯 PRECISIÓN OVER/UNDER 2.5:');
    console.log(`   • Error promedio Over 2.5: ${(avgOver25Error * 100).toFixed(3)}%`);
    console.log(`   • Error máximo Over 2.5: ${(Math.max(...over25Errors) * 100).toFixed(3)}%\n`);

    // Test Elo system accuracy
    console.log('⚡ PRECISIÓN SISTEMA ELO:\n');
    const eloTests = [
      { teamA: 1500, teamB: 1500, scoreA: 2, scoreB: 1, home: true },
      { teamA: 1800, teamB: 1600, scoreA: 3, scoreB: 0, home: true },
      { teamA: 1400, teamB: 1700, scoreA: 1, scoreB: 1, home: false }
    ];

    eloTests.forEach((test, idx) => {
      const result = updateEloRatings(test.teamA, test.teamB, test.scoreA, test.scoreB, test.home);
      const change = Math.abs(result.newRatingA - test.teamA);
      console.log(`   Test ${idx + 1}: Cambio Elo = ${change.toFixed(1)} puntos`);
    });

    // Test xG calculation accuracy
    console.log('\n⚽ PRECISIÓN EXPECTED GOALS (xG):\n');
    const xgTests = [
      { shots: 15, onTarget: 8, possession: 55, expected: 'moderado' },
      { shots: 20, onTarget: 12, possession: 65, expected: 'alto' },
      { shots: 8, onTarget: 3, possession: 40, expected: 'bajo' }
    ];

    xgTests.forEach((test, idx) => {
      const xg = calculateXG(test.shots, test.onTarget, test.possession);
      console.log(`   Test ${idx + 1}: xG = ${xg.toFixed(2)} (${test.expected})`);
    });

    // Test Brier Score
    console.log('\n📊 PRECISIÓN BRIER SCORE:\n');
    const brierTests = [
      {
        predicted: { home: 0.7, draw: 0.2, away: 0.1 },
        actual: { home: 1, draw: 0, away: 0 },
        scenario: 'Predicción correcta fuerte'
      },
      {
        predicted: { home: 0.4, draw: 0.3, away: 0.3 },
        actual: { home: 1, draw: 0, away: 0 },
        scenario: 'Predicción correcta débil'
      },
      {
        predicted: { home: 0.8, draw: 0.15, away: 0.05 },
        actual: { home: 0, draw: 0, away: 1 },
        scenario: 'Predicción incorrecta'
      }
    ];

    brierTests.forEach(test => {
      const score = calculateBrierScore(test.predicted, test.actual);
      console.log(`   ${test.scenario}: ${score.toFixed(4)} ${score < 0.2 ? '✓' : '✗'}`);
    });

    // Lambda calculation tests
    console.log('\n🔢 PRECISIÓN CÁLCULO LAMBDA:\n');
    const lambdaTests = [
      {
        name: 'Equipo balanceado casa',
        avgScored: 1.8, avgConceded: 1.2, xg: 1.9,
        elo: 1850, oppElo: 1800, home: true
      },
      {
        name: 'Favorito visitante',
        avgScored: 2.5, avgConceded: 0.8, xg: 2.7,
        elo: 2100, oppElo: 1700, home: false
      }
    ];

    lambdaTests.forEach(test => {
      const lambda = calculateExpectedLambda(
        test.avgScored, test.avgConceded, test.xg,
        test.elo, test.oppElo, test.home
      );
      console.log(`   ${test.name}: λ = ${lambda.toFixed(2)}`);
    });

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                     EVALUACIÓN FINAL                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const overallScore = calculateOverallScore(avgError, successRate, avgOver25Error);

    console.log('🏆 CALIFICACIÓN GENERAL:\n');
    console.log(`   Precisión Poisson vs Monte Carlo: ${getGrade(avgError)}`);
    console.log(`   Precisión Over/Under 2.5: ${getGrade(avgOver25Error)}`);
    console.log(`   Tasa de éxito: ${getSuccessGrade(successRate)}`);
    console.log(`   \n   ⭐ SCORE TOTAL: ${overallScore}/100\n`);

    if (overallScore >= 90) {
      console.log('   ✅ EXCELENTE: El sistema tiene alta precisión');
    } else if (overallScore >= 75) {
      console.log('   ✓ BUENO: El sistema tiene buena precisión');
    } else if (overallScore >= 60) {
      console.log('   ⚠ ACEPTABLE: El sistema necesita mejoras');
    } else {
      console.log('   ❌ INSUFICIENTE: El sistema requiere optimización');
    }

    console.log('\n─────────────────────────────────────────────────────────────────\n');

    // Assertions for test validation
    expect(avgError).toBeLessThan(0.05); // Average error < 5%
    expect(maxError).toBeLessThan(0.10); // Max error < 10%
    expect(successRate).toBeGreaterThan(70); // Success rate > 70%
    expect(avgOver25Error).toBeLessThan(0.05); // Over 2.5 error < 5%
    expect(overallScore).toBeGreaterThan(75); // Overall score > 75
  });
});

function getGrade(error: number): string {
  const errorPercent = error * 100;
  if (errorPercent < 2) return '⭐⭐⭐⭐⭐ EXCELENTE';
  if (errorPercent < 3) return '⭐⭐⭐⭐ MUY BUENO';
  if (errorPercent < 5) return '⭐⭐⭐ BUENO';
  if (errorPercent < 8) return '⭐⭐ ACEPTABLE';
  return '⭐ NECESITA MEJORA';
}

function getSuccessGrade(rate: number): string {
  if (rate >= 95) return '⭐⭐⭐⭐⭐ EXCELENTE';
  if (rate >= 85) return '⭐⭐⭐⭐ MUY BUENO';
  if (rate >= 70) return '⭐⭐⭐ BUENO';
  if (rate >= 50) return '⭐⭐ ACEPTABLE';
  return '⭐ NECESITA MEJORA';
}

function calculateOverallScore(
  avgError: number,
  successRate: number,
  over25Error: number
): number {
  // Weight: 40% accuracy, 40% success rate, 20% over/under accuracy
  const accuracyScore = Math.max(0, 100 - (avgError * 100 * 10));
  const successScore = successRate;
  const over25Score = Math.max(0, 100 - (over25Error * 100 * 10));

  return Math.round((accuracyScore * 0.4) + (successScore * 0.4) + (over25Score * 0.2));
}
