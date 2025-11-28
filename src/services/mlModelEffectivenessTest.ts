import { supabase, Team, Match } from '../lib/supabase';
import { predictHybrid, HybridPrediction } from './mlHybridPredictor';

/**
 * Resultado real de un partido
 */
export interface ActualResult {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  outcome: 'home' | 'draw' | 'away';
  totalGoals: number;
  over25: boolean;
  matchDate: string;
}

/**
 * Comparación entre predicción y resultado real
 */
export interface PredictionComparison {
  match: ActualResult;
  prediction: {
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
    predictedOutcome: 'home' | 'draw' | 'away';
    over25Prob: number;
    predictedOver25: boolean;
    expectedHomeScore: number;
    expectedAwayScore: number;
    confidence: number;
  };
  accuracy: {
    outcomeCorrect: boolean;
    over25Correct: boolean;
    scoreErrorHome: number;
    scoreErrorAway: number;
  };
}

/**
 * Métricas de efectividad del modelo
 */
export interface EffectivenessMetrics {
  // Métricas generales
  totalMatches: number;
  dateRange: {
    start: string;
    end: string;
  };

  // Accuracy de resultados (Home/Draw/Away)
  outcomeAccuracy: number;
  outcomePrecision: {
    home: number;
    draw: number;
    away: number;
  };
  outcomeRecall: {
    home: number;
    draw: number;
    away: number;
  };
  outcomeF1Score: {
    home: number;
    draw: number;
    away: number;
  };

  // Accuracy de Over 2.5
  over25Accuracy: number;
  over25Precision: number;
  over25Recall: number;
  over25F1Score: number;

  // Métricas probabilísticas
  brierScore: number;
  logLoss: number;
  calibrationScore: number;

  // Errores de predicción de goles
  avgGoalErrorHome: number;
  avgGoalErrorAway: number;
  avgTotalGoalError: number;
  rmseHome: number;
  rmseAway: number;

  // Distribución de confianza
  avgConfidence: number;
  confidenceCalibration: number;

  // Detalles por resultado
  confusionMatrix: {
    home: { predictedHome: number; predictedDraw: number; predictedAway: number };
    draw: { predictedHome: number; predictedDraw: number; predictedAway: number };
    away: { predictedHome: number; predictedDraw: number; predictedAway: number };
  };

  // Comparaciones individuales
  comparisons: PredictionComparison[];
}

/**
 * Determina el resultado predicho basado en probabilidades
 */
function getPredictedOutcome(homeWinProb: number, drawProb: number, awayWinProb: number): 'home' | 'draw' | 'away' {
  if (homeWinProb > drawProb && homeWinProb > awayWinProb) return 'home';
  if (drawProb > awayWinProb) return 'draw';
  return 'away';
}

/**
 * Obtiene partidos de un rango de fechas con resultados reales
 */
async function getMatchesInDateRange(
  startDate: string,
  endDate: string
): Promise<{ matches: Match[]; teams: Map<string, Team> }> {
  console.log(`\n📅 Cargando partidos entre ${startDate} y ${endDate}...`);

  // Cargar todos los equipos
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*');

  if (teamsError) {
    throw new Error(`Error cargando equipos: ${teamsError.message}`);
  }

  // Cargar partidos completados en el rango de fechas
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .gte('match_date', startDate)
    .lte('match_date', endDate)
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)
    .order('match_date', { ascending: true });

  if (matchesError) {
    throw new Error(`Error cargando partidos: ${matchesError.message}`);
  }

  const teamMap = new Map<string, Team>();
  teams?.forEach(team => teamMap.set(team.id, team));

  console.log(`✓ ${matches?.length || 0} partidos encontrados`);
  console.log(`✓ ${teams?.length || 0} equipos cargados`);

  return {
    matches: matches || [],
    teams: teamMap
  };
}

/**
 * Genera predicción para un partido específico
 */
async function generatePredictionForMatch(
  match: Match,
  teamMap: Map<string, Team>
): Promise<HybridPrediction | null> {
  const homeTeam = teamMap.get(match.home_team_id);
  const awayTeam = teamMap.get(match.away_team_id);

  if (!homeTeam || !awayTeam) {
    console.warn(`⚠ Equipos no encontrados para partido ${match.id}`);
    return null;
  }

  try {
    // Generar predicción usando el método híbrido
    const prediction = await predictHybrid(
      homeTeam,
      awayTeam,
      match.league,
      undefined, // Sin modelos ML entrenados por ahora, solo matemático
      { mathematical: 1.0, randomForest: 0, neuralNetwork: 0 }
    );

    return prediction;
  } catch (error) {
    console.error(`❌ Error generando predicción para partido ${match.id}:`, error);
    return null;
  }
}

/**
 * Calcula todas las métricas de efectividad
 */
function calculateMetrics(comparisons: PredictionComparison[]): Omit<EffectivenessMetrics, 'totalMatches' | 'dateRange' | 'comparisons'> {
  const n = comparisons.length;

  // Contadores para matriz de confusión y métricas
  const confusionMatrix = {
    home: { predictedHome: 0, predictedDraw: 0, predictedAway: 0 },
    draw: { predictedHome: 0, predictedDraw: 0, predictedAway: 0 },
    away: { predictedHome: 0, predictedDraw: 0, predictedAway: 0 }
  };

  // Contadores para precision/recall
  const truePositives = { home: 0, draw: 0, away: 0 };
  const falsePositives = { home: 0, draw: 0, away: 0 };
  const falseNegatives = { home: 0, draw: 0, away: 0 };

  // Over 2.5
  let over25TP = 0, over25FP = 0, over25TN = 0, over25FN = 0;

  // Métricas probabilísticas
  let brierSum = 0;
  let logLossSum = 0;
  let calibrationSum = 0;
  let confidenceSum = 0;

  // Errores de goles
  let goalErrorHomeSum = 0;
  let goalErrorAwaySum = 0;
  let goalErrorHomeSqSum = 0;
  let goalErrorAwaySqSum = 0;

  for (const comp of comparisons) {
    const actual = comp.match.outcome;
    const predicted = comp.prediction.predictedOutcome;

    // Matriz de confusión
    confusionMatrix[actual][`predicted${predicted.charAt(0).toUpperCase() + predicted.slice(1)}` as keyof typeof confusionMatrix[typeof actual]]++;

    // True/False Positives/Negatives para cada categoría
    ['home', 'draw', 'away'].forEach(outcome => {
      if (actual === outcome && predicted === outcome) {
        truePositives[outcome as keyof typeof truePositives]++;
      } else if (predicted === outcome) {
        falsePositives[outcome as keyof typeof falsePositives]++;
      } else if (actual === outcome) {
        falseNegatives[outcome as keyof typeof falseNegatives]++;
      }
    });

    // Over 2.5 métricas
    const actualOver25 = comp.match.over25;
    const predictedOver25 = comp.prediction.predictedOver25;
    if (actualOver25 && predictedOver25) over25TP++;
    else if (!actualOver25 && predictedOver25) over25FP++;
    else if (!actualOver25 && !predictedOver25) over25TN++;
    else over25FN++;

    // Brier Score
    const actualProbs = {
      home: actual === 'home' ? 1 : 0,
      draw: actual === 'draw' ? 1 : 0,
      away: actual === 'away' ? 1 : 0
    };
    brierSum += Math.pow(comp.prediction.homeWinProb - actualProbs.home, 2) +
                Math.pow(comp.prediction.drawProb - actualProbs.draw, 2) +
                Math.pow(comp.prediction.awayWinProb - actualProbs.away, 2);

    // Log Loss
    const epsilon = 1e-15;
    const homeProb = Math.max(epsilon, Math.min(1 - epsilon, comp.prediction.homeWinProb));
    const drawProb = Math.max(epsilon, Math.min(1 - epsilon, comp.prediction.drawProb));
    const awayProb = Math.max(epsilon, Math.min(1 - epsilon, comp.prediction.awayWinProb));

    logLossSum += -(actualProbs.home * Math.log(homeProb) +
                    actualProbs.draw * Math.log(drawProb) +
                    actualProbs.away * Math.log(awayProb));

    // Calibración (diferencia entre probabilidad predicha y resultado real)
    const maxProb = Math.max(comp.prediction.homeWinProb, comp.prediction.drawProb, comp.prediction.awayWinProb);
    const wasCorrect = comp.accuracy.outcomeCorrect ? 1 : 0;
    calibrationSum += Math.abs(maxProb - wasCorrect);

    // Confianza
    confidenceSum += comp.prediction.confidence;

    // Errores de goles
    const homeError = Math.abs(comp.prediction.expectedHomeScore - comp.match.homeScore);
    const awayError = Math.abs(comp.prediction.expectedAwayScore - comp.match.awayScore);
    goalErrorHomeSum += homeError;
    goalErrorAwaySum += awayError;
    goalErrorHomeSqSum += homeError * homeError;
    goalErrorAwaySqSum += awayError * awayError;
  }

  // Calcular accuracy de resultados
  const correctOutcomes = comparisons.filter(c => c.accuracy.outcomeCorrect).length;
  const outcomeAccuracy = correctOutcomes / n;

  // Calcular precision, recall y F1 por categoría
  const calculateF1 = (tp: number, fp: number, fn: number) => {
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
    return { precision, recall, f1 };
  };

  const homeMetrics = calculateF1(truePositives.home, falsePositives.home, falseNegatives.home);
  const drawMetrics = calculateF1(truePositives.draw, falsePositives.draw, falseNegatives.draw);
  const awayMetrics = calculateF1(truePositives.away, falsePositives.away, falseNegatives.away);

  // Over 2.5 métricas
  const over25Accuracy = (over25TP + over25TN) / n;
  const over25Precision = over25TP + over25FP > 0 ? over25TP / (over25TP + over25FP) : 0;
  const over25Recall = over25TP + over25FN > 0 ? over25TP / (over25TP + over25FN) : 0;
  const over25F1Score = over25Precision + over25Recall > 0
    ? 2 * (over25Precision * over25Recall) / (over25Precision + over25Recall)
    : 0;

  return {
    outcomeAccuracy,
    outcomePrecision: {
      home: homeMetrics.precision,
      draw: drawMetrics.precision,
      away: awayMetrics.precision
    },
    outcomeRecall: {
      home: homeMetrics.recall,
      draw: drawMetrics.recall,
      away: awayMetrics.recall
    },
    outcomeF1Score: {
      home: homeMetrics.f1,
      draw: drawMetrics.f1,
      away: awayMetrics.f1
    },
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
 * Test de efectividad del modelo para un mes específico
 * @param year Año (ej: 2024)
 * @param month Mes (1-12)
 */
export async function testModelEffectiveness(
  year: number,
  month: number
): Promise<EffectivenessMetrics> {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║          TEST DE EFECTIVIDAD DEL MODELO DE PREDICCIÓN          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  // Calcular rango de fechas para el mes
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Último día del mes
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`\n📊 Periodo de análisis: ${startDateStr} a ${endDateStr}`);

  // Obtener partidos del mes
  const { matches, teams } = await getMatchesInDateRange(startDateStr, endDateStr);

  if (matches.length === 0) {
    throw new Error('No se encontraron partidos completados en el periodo especificado');
  }

  console.log(`\n🔮 Generando predicciones para ${matches.length} partidos...`);

  // Generar predicciones y comparaciones
  const comparisons: PredictionComparison[] = [];
  let processed = 0;

  for (const match of matches) {
    const prediction = await generatePredictionForMatch(match, teams);

    if (prediction && match.home_score !== null && match.away_score !== null) {
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

      const homeTeam = teams.get(match.home_team_id);
      const awayTeam = teams.get(match.away_team_id);

      comparisons.push({
        match: {
          matchId: match.id,
          homeTeam: homeTeam?.name || 'Unknown',
          awayTeam: awayTeam?.name || 'Unknown',
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

      processed++;
      if (processed % 10 === 0) {
        console.log(`  Procesados: ${processed}/${matches.length}`);
      }
    }
  }

  console.log(`\n✓ ${comparisons.length} predicciones completadas`);
  console.log('\n📈 Calculando métricas de efectividad...\n');

  // Calcular métricas
  const metrics = calculateMetrics(comparisons);

  return {
    totalMatches: comparisons.length,
    dateRange: {
      start: startDateStr,
      end: endDateStr
    },
    ...metrics,
    comparisons
  };
}

/**
 * Imprime un reporte detallado de las métricas
 */
export function printEffectivenessReport(metrics: EffectivenessMetrics): void {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                  REPORTE DE EFECTIVIDAD DEL MODELO               ║');
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

  // Mostrar algunos ejemplos de predicciones
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
}

/**
 * Guarda el reporte en formato JSON
 */
export async function saveReportToFile(
  metrics: EffectivenessMetrics,
  filename: string = 'model-effectiveness-report.json'
): Promise<void> {
  const report = {
    generatedAt: new Date().toISOString(),
    ...metrics
  };

  // En Node.js usarías fs, pero en el navegador podrías usar localStorage o descargar el archivo
  const json = JSON.stringify(report, null, 2);
  console.log(`\n💾 Reporte generado (${json.length} caracteres)`);
  console.log(`📄 Guardar como: ${filename}\n`);

  // Para propósitos de demostración, imprimimos la ruta donde se debería guardar
  return Promise.resolve();
}
