#!/usr/bin/env tsx

/**
 * Script de demostración del test de efectividad
 * Usa datos simulados para mostrar cómo funciona el sistema
 *
 * Uso:
 *   npm run test:effectiveness:demo
 */

import type { Team, Match } from '../src/lib/supabase';
import type { PredictionComparison, EffectivenessMetrics, ActualResult } from '../src/services/mlModelEffectivenessTest';
import { predictHybrid } from '../src/services/mlHybridPredictor';

/**
 * Genera equipos de demostración
 */
function generateDemoTeams(): Map<string, Team> {
  const teams = new Map<string, Team>();

  const teamData = [
    { id: '1', name: 'Real Madrid', league: 'La Liga', elo: 2100, avgGoalsScored: 2.3, avgGoalsConceded: 0.8, xg: 2.1 },
    { id: '2', name: 'Barcelona', league: 'La Liga', elo: 2050, avgGoalsScored: 2.1, avgGoalsConceded: 0.9, xg: 2.0 },
    { id: '3', name: 'Atletico Madrid', league: 'La Liga', elo: 1950, avgGoalsScored: 1.8, avgGoalsConceded: 1.0, xg: 1.7 },
    { id: '4', name: 'Sevilla', league: 'La Liga', elo: 1850, avgGoalsScored: 1.5, avgGoalsConceded: 1.2, xg: 1.4 },
    { id: '5', name: 'Manchester City', league: 'Premier League', elo: 2150, avgGoalsScored: 2.5, avgGoalsConceded: 0.7, xg: 2.3 },
    { id: '6', name: 'Liverpool', league: 'Premier League', elo: 2080, avgGoalsScored: 2.2, avgGoalsConceded: 0.9, xg: 2.1 },
    { id: '7', name: 'Arsenal', league: 'Premier League', elo: 2000, avgGoalsScored: 2.0, avgGoalsConceded: 1.0, xg: 1.9 },
    { id: '8', name: 'Chelsea', league: 'Premier League', elo: 1920, avgGoalsScored: 1.7, avgGoalsConceded: 1.1, xg: 1.6 },
    { id: '9', name: 'Bayern Munich', league: 'Bundesliga', elo: 2120, avgGoalsScored: 2.6, avgGoalsConceded: 0.9, xg: 2.4 },
    { id: '10', name: 'Borussia Dortmund', league: 'Bundesliga', elo: 1980, avgGoalsScored: 2.1, avgGoalsConceded: 1.2, xg: 2.0 },
  ];

  teamData.forEach(t => {
    teams.set(t.id, {
      id: t.id,
      name: t.name,
      league: t.league,
      elo_rating: t.elo,
      avg_goals_scored: t.avgGoalsScored,
      avg_goals_conceded: t.avgGoalsConceded,
      xg_per_match: t.xg,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  return teams;
}

/**
 * Genera partidos de demostración con resultados reales simulados
 */
function generateDemoMatches(): Match[] {
  return [
    // Partidos con victoria local clara
    { id: '1', home_team_id: '1', away_team_id: '4', match_date: '2024-10-05', league: 'La Liga', home_score: 3, away_score: 1, created_at: new Date().toISOString() },
    { id: '2', home_team_id: '5', away_team_id: '8', match_date: '2024-10-06', league: 'Premier League', home_score: 4, away_score: 0, created_at: new Date().toISOString() },
    { id: '3', home_team_id: '9', away_team_id: '10', match_date: '2024-10-07', league: 'Bundesliga', home_score: 3, away_score: 2, created_at: new Date().toISOString() },

    // Empates
    { id: '4', home_team_id: '2', away_team_id: '3', match_date: '2024-10-08', league: 'La Liga', home_score: 1, away_score: 1, created_at: new Date().toISOString() },
    { id: '5', home_team_id: '6', away_team_id: '7', match_date: '2024-10-09', league: 'Premier League', home_score: 2, away_score: 2, created_at: new Date().toISOString() },

    // Victorias visitantes
    { id: '6', home_team_id: '4', away_team_id: '1', match_date: '2024-10-12', league: 'La Liga', home_score: 0, away_score: 2, created_at: new Date().toISOString() },
    { id: '7', home_team_id: '8', away_team_id: '5', match_date: '2024-10-13', league: 'Premier League', home_score: 1, away_score: 3, created_at: new Date().toISOString() },

    // Partidos equilibrados
    { id: '8', home_team_id: '1', away_team_id: '2', match_date: '2024-10-15', league: 'La Liga', home_score: 2, away_score: 1, created_at: new Date().toISOString() },
    { id: '9', home_team_id: '5', away_team_id: '6', match_date: '2024-10-16', league: 'Premier League', home_score: 2, away_score: 2, created_at: new Date().toISOString() },
    { id: '10', home_team_id: '9', away_team_id: '3', match_date: '2024-10-17', league: 'Bundesliga', home_score: 3, away_score: 0, created_at: new Date().toISOString() },

    // Más variedad
    { id: '11', home_team_id: '3', away_team_id: '4', match_date: '2024-10-19', league: 'La Liga', home_score: 1, away_score: 0, created_at: new Date().toISOString() },
    { id: '12', home_team_id: '7', away_team_id: '8', match_date: '2024-10-20', league: 'Premier League', home_score: 3, away_score: 1, created_at: new Date().toISOString() },
    { id: '13', home_team_id: '10', away_team_id: '9', match_date: '2024-10-21', league: 'Bundesliga', home_score: 1, away_score: 4, created_at: new Date().toISOString() },
    { id: '14', home_team_id: '2', away_team_id: '1', match_date: '2024-10-22', league: 'La Liga', home_score: 0, away_score: 0, created_at: new Date().toISOString() },
    { id: '15', home_team_id: '6', away_team_id: '5', match_date: '2024-10-23', league: 'Premier League', home_score: 1, away_score: 2, created_at: new Date().toISOString() },

    // Partidos con muchos goles
    { id: '16', home_team_id: '1', away_team_id: '3', match_date: '2024-10-25', league: 'La Liga', home_score: 4, away_score: 3, created_at: new Date().toISOString() },
    { id: '17', home_team_id: '5', away_team_id: '7', match_date: '2024-10-26', league: 'Premier League', home_score: 5, away_score: 1, created_at: new Date().toISOString() },
    { id: '18', home_team_id: '9', away_team_id: '10', match_date: '2024-10-27', league: 'Bundesliga', home_score: 3, away_score: 3, created_at: new Date().toISOString() },

    // Partidos con pocos goles
    { id: '19', home_team_id: '3', away_team_id: '2', match_date: '2024-10-28', league: 'La Liga', home_score: 1, away_score: 0, created_at: new Date().toISOString() },
    { id: '20', home_team_id: '8', away_team_id: '6', match_date: '2024-10-29', league: 'Premier League', home_score: 0, away_score: 1, created_at: new Date().toISOString() },
  ];
}

/**
 * Determina el resultado predicho
 */
function getPredictedOutcome(homeWinProb: number, drawProb: number, awayWinProb: number): 'home' | 'draw' | 'away' {
  if (homeWinProb > drawProb && homeWinProb > awayWinProb) return 'home';
  if (drawProb > awayWinProb) return 'draw';
  return 'away';
}

/**
 * Calcula métricas
 */
function calculateMetrics(comparisons: PredictionComparison[]): Omit<EffectivenessMetrics, 'totalMatches' | 'dateRange' | 'comparisons'> {
  const n = comparisons.length;

  const confusionMatrix = {
    home: { predictedHome: 0, predictedDraw: 0, predictedAway: 0 },
    draw: { predictedHome: 0, predictedDraw: 0, predictedAway: 0 },
    away: { predictedHome: 0, predictedDraw: 0, predictedAway: 0 }
  };

  const truePositives = { home: 0, draw: 0, away: 0 };
  const falsePositives = { home: 0, draw: 0, away: 0 };
  const falseNegatives = { home: 0, draw: 0, away: 0 };

  let over25TP = 0, over25FP = 0, over25TN = 0, over25FN = 0;
  let brierSum = 0, logLossSum = 0, calibrationSum = 0, confidenceSum = 0;
  let goalErrorHomeSum = 0, goalErrorAwaySum = 0, goalErrorHomeSqSum = 0, goalErrorAwaySqSum = 0;

  for (const comp of comparisons) {
    const actual = comp.match.outcome;
    const predicted = comp.prediction.predictedOutcome;

    confusionMatrix[actual][`predicted${predicted.charAt(0).toUpperCase() + predicted.slice(1)}` as keyof typeof confusionMatrix[typeof actual]]++;

    ['home', 'draw', 'away'].forEach(outcome => {
      if (actual === outcome && predicted === outcome) {
        truePositives[outcome as keyof typeof truePositives]++;
      } else if (predicted === outcome) {
        falsePositives[outcome as keyof typeof falsePositives]++;
      } else if (actual === outcome) {
        falseNegatives[outcome as keyof typeof falseNegatives]++;
      }
    });

    const actualOver25 = comp.match.over25;
    const predictedOver25 = comp.prediction.predictedOver25;
    if (actualOver25 && predictedOver25) over25TP++;
    else if (!actualOver25 && predictedOver25) over25FP++;
    else if (!actualOver25 && !predictedOver25) over25TN++;
    else over25FN++;

    const actualProbs = {
      home: actual === 'home' ? 1 : 0,
      draw: actual === 'draw' ? 1 : 0,
      away: actual === 'away' ? 1 : 0
    };
    brierSum += Math.pow(comp.prediction.homeWinProb - actualProbs.home, 2) +
                Math.pow(comp.prediction.drawProb - actualProbs.draw, 2) +
                Math.pow(comp.prediction.awayWinProb - actualProbs.away, 2);

    const epsilon = 1e-15;
    const homeProb = Math.max(epsilon, Math.min(1 - epsilon, comp.prediction.homeWinProb));
    const drawProb = Math.max(epsilon, Math.min(1 - epsilon, comp.prediction.drawProb));
    const awayProb = Math.max(epsilon, Math.min(1 - epsilon, comp.prediction.awayWinProb));

    logLossSum += -(actualProbs.home * Math.log(homeProb) +
                    actualProbs.draw * Math.log(drawProb) +
                    actualProbs.away * Math.log(awayProb));

    const maxProb = Math.max(comp.prediction.homeWinProb, comp.prediction.drawProb, comp.prediction.awayWinProb);
    const wasCorrect = comp.accuracy.outcomeCorrect ? 1 : 0;
    calibrationSum += Math.abs(maxProb - wasCorrect);

    confidenceSum += comp.prediction.confidence;

    const homeError = Math.abs(comp.prediction.expectedHomeScore - comp.match.homeScore);
    const awayError = Math.abs(comp.prediction.expectedAwayScore - comp.match.awayScore);
    goalErrorHomeSum += homeError;
    goalErrorAwaySum += awayError;
    goalErrorHomeSqSum += homeError * homeError;
    goalErrorAwaySqSum += awayError * awayError;
  }

  const correctOutcomes = comparisons.filter(c => c.accuracy.outcomeCorrect).length;
  const outcomeAccuracy = correctOutcomes / n;

  const calculateF1 = (tp: number, fp: number, fn: number) => {
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
    return { precision, recall, f1 };
  };

  const homeMetrics = calculateF1(truePositives.home, falsePositives.home, falseNegatives.home);
  const drawMetrics = calculateF1(truePositives.draw, falsePositives.draw, falseNegatives.draw);
  const awayMetrics = calculateF1(truePositives.away, falsePositives.away, falseNegatives.away);

  const over25Accuracy = (over25TP + over25TN) / n;
  const over25Precision = over25TP + over25FP > 0 ? over25TP / (over25TP + over25FP) : 0;
  const over25Recall = over25TP + over25FN > 0 ? over25TP / (over25TP + over25FN) : 0;
  const over25F1Score = over25Precision + over25Recall > 0
    ? 2 * (over25Precision * over25Recall) / (over25Precision + over25Recall)
    : 0;

  return {
    outcomeAccuracy,
    outcomePrecision: { home: homeMetrics.precision, draw: drawMetrics.precision, away: awayMetrics.precision },
    outcomeRecall: { home: homeMetrics.recall, draw: drawMetrics.recall, away: awayMetrics.recall },
    outcomeF1Score: { home: homeMetrics.f1, draw: drawMetrics.f1, away: awayMetrics.f1 },
    over25Accuracy,
    over25Precision,
    over25Recall,
    over25F1Score,
    brierScore: brierSum / (n * 3),
    logLoss: logLossSum / n,
    calibrationScore: 1 - (calibrationSum / n),
    avgGoalErrorHome: goalErrorHomeSum / n,
    avgGoalErrorAway: goalErrorAwaySum / n,
    avgTotalGoalError: (goalErrorHomeSum + goalErrorAwaySum) / (n * 2),
    rmseHome: Math.sqrt(goalErrorHomeSqSum / n),
    rmseAway: Math.sqrt(goalErrorAwaySqSum / n),
    avgConfidence: confidenceSum / n,
    confidenceCalibration: 1 - Math.abs((confidenceSum / n) - outcomeAccuracy),
    confusionMatrix
  };
}

/**
 * Imprime reporte
 */
function printReport(metrics: EffectivenessMetrics): void {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                  REPORTE DE EFECTIVIDAD DEL MODELO               ║');
  console.log('║                        (MODO DEMOSTRACIÓN)                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log(`📅 Periodo: ${metrics.dateRange.start} a ${metrics.dateRange.end}`);
  console.log(`📊 Total de partidos analizados: ${metrics.totalMatches}\n`);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  ACCURACY DE PREDICCIÓN DE RESULTADOS (Home/Draw/Away)');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Accuracy general: ${(metrics.outcomeAccuracy * 100).toFixed(2)}%\n`);

  console.log('  Por categoría:');
  console.log(`    HOME - Precision: ${(metrics.outcomePrecision.home * 100).toFixed(2)}% | Recall: ${(metrics.outcomeRecall.home * 100).toFixed(2)}% | F1: ${(metrics.outcomeF1Score.home * 100).toFixed(2)}%`);
  console.log(`    DRAW - Precision: ${(metrics.outcomePrecision.draw * 100).toFixed(2)}% | Recall: ${(metrics.outcomeRecall.draw * 100).toFixed(2)}% | F1: ${(metrics.outcomeF1Score.draw * 100).toFixed(2)}%`);
  console.log(`    AWAY - Precision: ${(metrics.outcomePrecision.away * 100).toFixed(2)}% | Recall: ${(metrics.outcomeRecall.away * 100).toFixed(2)}% | F1: ${(metrics.outcomeF1Score.away * 100).toFixed(2)}%\n`);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  ACCURACY DE OVER 2.5 GOLES');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Accuracy: ${(metrics.over25Accuracy * 100).toFixed(2)}%`);
  console.log(`  Precision: ${(metrics.over25Precision * 100).toFixed(2)}%`);
  console.log(`  Recall: ${(metrics.over25Recall * 100).toFixed(2)}%`);
  console.log(`  F1-Score: ${(metrics.over25F1Score * 100).toFixed(2)}%\n`);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  MÉTRICAS PROBABILÍSTICAS');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Brier Score: ${metrics.brierScore.toFixed(4)} (menor es mejor, 0 = perfecto)`);
  console.log(`  Log Loss: ${metrics.logLoss.toFixed(4)} (menor es mejor)`);
  console.log(`  Calibration Score: ${(metrics.calibrationScore * 100).toFixed(2)}% (mayor es mejor)\n`);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  ERROR EN PREDICCIÓN DE GOLES');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Error promedio goles local: ${metrics.avgGoalErrorHome.toFixed(2)}`);
  console.log(`  Error promedio goles visitante: ${metrics.avgGoalErrorAway.toFixed(2)}`);
  console.log(`  Error promedio total: ${metrics.avgTotalGoalError.toFixed(2)}`);
  console.log(`  RMSE local: ${metrics.rmseHome.toFixed(2)}`);
  console.log(`  RMSE visitante: ${metrics.rmseAway.toFixed(2)}\n`);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  CONFIANZA DEL MODELO');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Confianza promedio: ${(metrics.avgConfidence * 100).toFixed(2)}%`);
  console.log(`  Calibración de confianza: ${(metrics.confidenceCalibration * 100).toFixed(2)}%\n`);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  MATRIZ DE CONFUSIÓN');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  Real \\ Predicho │  HOME │  DRAW │  AWAY');
  console.log('  ────────────────┼───────┼───────┼───────');
  console.log(`  HOME            │  ${String(metrics.confusionMatrix.home.predictedHome).padStart(4)} │  ${String(metrics.confusionMatrix.home.predictedDraw).padStart(4)} │  ${String(metrics.confusionMatrix.home.predictedAway).padStart(4)}`);
  console.log(`  DRAW            │  ${String(metrics.confusionMatrix.draw.predictedHome).padStart(4)} │  ${String(metrics.confusionMatrix.draw.predictedDraw).padStart(4)} │  ${String(metrics.confusionMatrix.draw.predictedAway).padStart(4)}`);
  console.log(`  AWAY            │  ${String(metrics.confusionMatrix.away.predictedHome).padStart(4)} │  ${String(metrics.confusionMatrix.away.predictedDraw).padStart(4)} │  ${String(metrics.confusionMatrix.away.predictedAway).padStart(4)}`);
  console.log('\n');

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  EJEMPLOS DE PREDICCIONES');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const examples = metrics.comparisons.slice(0, 5);
  examples.forEach((comp, idx) => {
    const correct = comp.accuracy.outcomeCorrect ? '✓' : '✗';
    console.log(`${idx + 1}. ${comp.match.homeTeam} vs ${comp.match.awayTeam}`);
    console.log(`   Resultado: ${comp.match.homeScore}-${comp.match.awayScore} (${comp.match.outcome.toUpperCase()})`);
    console.log(`   Predicción: ${comp.prediction.predictedOutcome.toUpperCase()} ${correct}`);
    console.log(`   Probabilidades: H:${(comp.prediction.homeWinProb * 100).toFixed(1)}% D:${(comp.prediction.drawProb * 100).toFixed(1)}% A:${(comp.prediction.awayWinProb * 100).toFixed(1)}%`);
    console.log(`   Goles esperados: ${comp.prediction.expectedHomeScore.toFixed(1)} - ${comp.prediction.expectedAwayScore.toFixed(1)}\n`);
  });

  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Resumen ejecutivo
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         RESUMEN EJECUTIVO                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const grade = getModelGrade(metrics.outcomeAccuracy);
  const avgF1 = (metrics.outcomeF1Score.home + metrics.outcomeF1Score.draw + metrics.outcomeF1Score.away) / 3;

  console.log(`  🎯 Accuracy General: ${(metrics.outcomeAccuracy * 100).toFixed(2)}% ${grade}`);
  console.log(`  📊 Brier Score: ${metrics.brierScore.toFixed(4)}`);
  console.log(`  🎲 Over 2.5 Accuracy: ${(metrics.over25Accuracy * 100).toFixed(2)}%`);
  console.log(`  ⚽ Error Promedio Goles: ${metrics.avgTotalGoalError.toFixed(2)}`);
  console.log(`  ✅ F1-Score Promedio: ${(avgF1 * 100).toFixed(2)}%`);

  console.log('\n  Interpretación:');
  console.log(getInterpretation(metrics));

  console.log('\n═══════════════════════════════════════════════════════════════════\n');
  console.log('✅ Test de demostración completado\n');
  console.log('💡 Para usar datos reales de Supabase, configura las variables de entorno');
  console.log('   y ejecuta: npm run test:effectiveness -- 2024 10\n');
}

function getModelGrade(accuracy: number): string {
  if (accuracy >= 0.55) return '🏆 (Excelente)';
  if (accuracy >= 0.50) return '⭐ (Muy Bueno)';
  if (accuracy >= 0.45) return '👍 (Bueno)';
  if (accuracy >= 0.40) return '⚠️  (Regular)';
  return '❌ (Necesita mejoras)';
}

function getInterpretation(metrics: any): string {
  const lines: string[] = [];

  if (metrics.outcomeAccuracy >= 0.50) {
    lines.push('  ✓ El modelo supera el 50% de accuracy, mejor que predicciones al azar');
  } else if (metrics.outcomeAccuracy >= 0.40) {
    lines.push('  ⚠ El modelo está cerca de predicciones al azar (~33% para 3 resultados)');
  } else {
    lines.push('  ⚠ El modelo necesita mejoras significativas en precisión');
  }

  if (metrics.brierScore < 0.25) {
    lines.push('  ✓ Buen Brier Score - las probabilidades están bien calibradas');
  } else if (metrics.brierScore < 0.35) {
    lines.push('  ⚠ Brier Score aceptable - hay espacio para mejorar calibración');
  }

  if (metrics.avgTotalGoalError < 1.0) {
    lines.push('  ✓ Predicción de goles muy precisa (error < 1 gol)');
  } else if (metrics.avgTotalGoalError < 1.5) {
    lines.push('  ✓ Predicción de goles aceptable');
  }

  return lines.join('\n');
}

async function main() {
  console.log('\n🚀 Iniciando test de efectividad (MODO DEMOSTRACIÓN)...\n');
  console.log('📝 Este test usa datos simulados para demostrar el funcionamiento.\n');

  const teams = generateDemoTeams();
  const matches = generateDemoMatches();

  console.log(`📊 Generando predicciones para ${matches.length} partidos simulados...\n`);

  const comparisons: PredictionComparison[] = [];

  for (const match of matches) {
    const homeTeam = teams.get(match.home_team_id);
    const awayTeam = teams.get(match.away_team_id);

    if (!homeTeam || !awayTeam || match.home_score === null || match.away_score === null) continue;

    const prediction = await predictHybrid(
      homeTeam,
      awayTeam,
      match.league,
      undefined,
      { mathematical: 1.0, randomForest: 0, neuralNetwork: 0 }
    );

    const outcome: 'home' | 'draw' | 'away' =
      match.home_score > match.away_score ? 'home' :
      match.home_score < match.away_score ? 'away' : 'draw';

    const predictedOutcome = getPredictedOutcome(
      prediction.homeWinProb,
      prediction.drawProb,
      prediction.awayWinProb
    );

    const totalGoals = match.home_score + match.away_score;
    const predictedOver25 = prediction.over25Prob > 0.5;

    comparisons.push({
      match: {
        matchId: match.id,
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        homeScore: match.home_score,
        awayScore: match.away_score,
        outcome,
        totalGoals,
        over25: totalGoals > 2.5,
        matchDate: match.match_date
      },
      prediction: {
        homeWinProb: prediction.homeWinProb,
        drawProb: prediction.drawProb,
        awayWinProb: prediction.awayWinProb,
        predictedOutcome,
        over25Prob: prediction.over25Prob,
        predictedOver25,
        expectedHomeScore: prediction.expectedHomeScore,
        expectedAwayScore: prediction.expectedAwayScore,
        confidence: prediction.confidence
      },
      accuracy: {
        outcomeCorrect: outcome === predictedOutcome,
        over25Correct: (totalGoals > 2.5) === predictedOver25,
        scoreErrorHome: Math.abs(prediction.expectedHomeScore - match.home_score),
        scoreErrorAway: Math.abs(prediction.expectedAwayScore - match.away_score)
      }
    });
  }

  console.log(`✓ ${comparisons.length} predicciones completadas\n`);
  console.log('📈 Calculando métricas de efectividad...\n');

  const calculatedMetrics = calculateMetrics(comparisons);

  const metrics: EffectivenessMetrics = {
    totalMatches: comparisons.length,
    dateRange: {
      start: '2024-10-05',
      end: '2024-10-29'
    },
    ...calculatedMetrics,
    comparisons
  };

  printReport(metrics);
}

main().catch(console.error);
