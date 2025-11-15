#!/usr/bin/env ts-node

/**
 * Script de demostración de Regresión Lineal con datos sintéticos
 *
 * Este script demuestra la regresión lineal sin necesidad de conexión a Supabase
 */

import { MatchFeatures, MatchTarget } from '../src/services/mlFeatureExtractor.js';
import {
  trainLinearRegression,
  evaluateLinearRegression,
  analyzeCoefficients,
  printRegressionReport,
  crossValidateLinearRegression,
  predictLinearRegression,
} from '../src/services/mlLinearRegression.js';

// Helper para crear features sintéticas
function createSyntheticFeatures(
  homeElo: number,
  awayElo: number,
  homeGoalsScored: number,
  awayGoalsScored: number,
  league: string = 'Premier League'
): MatchFeatures {
  return {
    homeElo,
    homeAvgGoalsScored: homeGoalsScored,
    homeAvgGoalsConceded: 1.0 + Math.random() * 0.5,
    homeXG: homeGoalsScored * (0.9 + Math.random() * 0.2),
    awayElo,
    awayAvgGoalsScored: awayGoalsScored,
    awayAvgGoalsConceded: 1.0 + Math.random() * 0.5,
    awayXG: awayGoalsScored * (0.9 + Math.random() * 0.2),
    eloDifference: homeElo - awayElo,
    homeAttackVsAwayDefense: homeGoalsScored / 1.2,
    awayAttackVsHomeDefense: awayGoalsScored / 1.2,
    totalExpectedGoals: homeGoalsScored + awayGoalsScored,
    eloRatio: homeElo / awayElo,
    homeAdvantage: 1.15,
    leaguePremier: league === 'Premier League' ? 1 : 0,
    leagueLaLiga: league === 'La Liga' ? 1 : 0,
    leagueSerieA: league === 'Serie A' ? 1 : 0,
    leagueBundesliga: league === 'Bundesliga' ? 1 : 0,
    leagueLigue1: league === 'Ligue 1' ? 1 : 0,
  };
}

// Helper para crear target sintético
function createSyntheticTarget(homeGoals: number, awayGoals: number): MatchTarget {
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

// Generar datos sintéticos realistas
function generateSyntheticData(numSamples: number): {
  features: MatchFeatures[];
  targets: MatchTarget[];
} {
  const features: MatchFeatures[] = [];
  const targets: MatchTarget[] = [];

  const leagues = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'];

  for (let i = 0; i < numSamples; i++) {
    // Generar Elo aleatorios con distribución realista
    const homeElo = 1700 + Math.random() * 600;
    const awayElo = 1700 + Math.random() * 600;

    // Goles promedio basados en Elo (correlación realista)
    const homeGoalsBase = 1.2 + (homeElo - 2000) / 400;
    const awayGoalsBase = 1.2 + (awayElo - 2000) / 400;

    const homeGoalsScored = Math.max(0.5, homeGoalsBase + Math.random() * 0.8);
    const awayGoalsScored = Math.max(0.5, awayGoalsBase + Math.random() * 0.8);

    // Liga aleatoria
    const league = leagues[Math.floor(Math.random() * leagues.length)];

    features.push(createSyntheticFeatures(homeElo, awayElo, homeGoalsScored, awayGoalsScored, league));

    // Goles reales con variación basada en estadísticas
    const homeGoalsReal = Math.max(
      0,
      Math.round(homeGoalsScored + (homeElo - awayElo) / 500 + (Math.random() - 0.5) * 0.5)
    );
    const awayGoalsReal = Math.max(
      0,
      Math.round(awayGoalsScored + (awayElo - homeElo) / 500 + (Math.random() - 0.5) * 0.5)
    );

    targets.push(createSyntheticTarget(homeGoalsReal, awayGoalsReal));
  }

  return { features, targets };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║   DEMOSTRACIÓN DE REGRESIÓN LINEAL PARA PREDICCIÓN DE GOLES     ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('📊 Generando datos sintéticos realistas...\n');

  // Generar 200 partidos sintéticos
  const { features, targets } = generateSyntheticData(200);

  console.log(`✓ ${features.length} partidos generados\n`);

  // Dividir datos en entrenamiento (80%) y prueba (20%)
  const splitIndex = Math.floor(features.length * 0.8);

  const trainFeatures = features.slice(0, splitIndex);
  const trainTargets = targets.slice(0, splitIndex);
  const testFeatures = features.slice(splitIndex);
  const testTargets = targets.slice(splitIndex);

  console.log(`  Entrenamiento: ${trainFeatures.length} partidos`);
  console.log(`  Prueba: ${testFeatures.length} partidos\n`);

  // Entrenar modelo
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📊 Entrenando modelo de Regresión Lineal...');
  console.log('═══════════════════════════════════════════════════════════════════');

  const model = trainLinearRegression(trainFeatures, trainTargets);
  console.log('\n✓ Modelo entrenado exitosamente!\n');

  // Evaluar modelo
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📊 Evaluando modelo con datos de prueba...');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const metrics = evaluateLinearRegression(model, testFeatures, testTargets);

  // Analizar coeficientes
  const analysis = analyzeCoefficients(model);

  // Imprimir reporte detallado
  printRegressionReport(metrics, analysis);

  // Validación cruzada
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📊 Realizando validación cruzada (5-fold)...');
  console.log('═══════════════════════════════════════════════════════════════════');

  const cvResults = crossValidateLinearRegression(features, targets, 5);

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║            RESULTADOS DE VALIDACIÓN CRUZADA (5-Fold)            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log(`  Mean R² (Home Goals):       ${cvResults.meanR2Home.toFixed(4)} (${(cvResults.meanR2Home * 100).toFixed(2)}%)`);
  console.log(`  Mean R² (Away Goals):       ${cvResults.meanR2Away.toFixed(4)} (${(cvResults.meanR2Away * 100).toFixed(2)}%)`);
  console.log(`  Mean MAE (Home Goals):      ${cvResults.meanMAEHome.toFixed(4)} goles`);
  console.log(`  Mean MAE (Away Goals):      ${cvResults.meanMAEAway.toFixed(4)} goles`);
  console.log(`  Mean Over 2.5 Accuracy:     ${(cvResults.meanOver25Accuracy * 100).toFixed(2)}%\n`);

  // Ejemplos de predicciones
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📊 Ejemplos de predicciones vs. resultados reales');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const numExamples = Math.min(10, testFeatures.length);
  for (let i = 0; i < numExamples; i++) {
    const prediction = predictLinearRegression(model, testFeatures[i]);
    const actual = testTargets[i];

    const homeError = Math.abs(prediction.expectedHomeGoals - actual.homeGoals);
    const awayError = Math.abs(prediction.expectedAwayGoals - actual.awayGoals);

    console.log(`Partido ${i + 1}:`);
    console.log(`  Features: Home Elo=${testFeatures[i].homeElo.toFixed(0)}, Away Elo=${testFeatures[i].awayElo.toFixed(0)}`);
    console.log(`  Predicción: ${prediction.expectedHomeGoals.toFixed(2)} - ${prediction.expectedAwayGoals.toFixed(2)} (Total: ${prediction.expectedTotalGoals.toFixed(2)})`);
    console.log(`  Real:       ${actual.homeGoals} - ${actual.awayGoals} (Total: ${actual.totalGoals})`);
    console.log(`  Error:      ${homeError.toFixed(2)} - ${awayError.toFixed(2)}`);
    console.log(`  Over 2.5:   Predicho=${prediction.over25Prob > 0.5 ? 'Sí' : 'No'} (${(prediction.over25Prob * 100).toFixed(1)}%), Real=${actual.over25 ? 'Sí' : 'No'}\n`);
  }

  // Resumen final
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                      RESUMEN DE EVALUACIÓN                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const avgR2 = (metrics.homeGoals.r2 + metrics.awayGoals.r2) / 2;
  const avgMAE = (metrics.homeGoals.mae + metrics.awayGoals.mae) / 2;

  console.log('📈 Rendimiento del modelo:');
  console.log(`   - R² Promedio:             ${avgR2.toFixed(4)} (${(avgR2 * 100).toFixed(2)}% varianza explicada)`);
  console.log(`   - MAE Promedio:            ${avgMAE.toFixed(4)} goles`);
  console.log(`   - RMSE Promedio:           ${((metrics.homeGoals.rmse + metrics.awayGoals.rmse) / 2).toFixed(4)} goles`);
  console.log(`   - Over 2.5 Accuracy:       ${(metrics.combined.over25Accuracy * 100).toFixed(2)}%\n`);

  console.log('🎯 Interpretación:');
  if (avgR2 > 0.7) {
    console.log('   ✓ Excelente: El modelo explica >70% de la variabilidad en los goles');
  } else if (avgR2 > 0.5) {
    console.log('   ✓ Bueno: El modelo explica >50% de la variabilidad en los goles');
  } else if (avgR2 > 0.3) {
    console.log('   ⚠ Aceptable: El modelo explica >30% de la variabilidad');
  } else {
    console.log('   ⚠ Mejorable: El modelo tiene capacidad predictiva limitada');
  }

  console.log('\n🔍 Características del modelo:');
  console.log('   - Algoritmo: Regresión Lineal Múltiple (OLS)');
  console.log(`   - Features utilizadas: ${model.featureNames.length}`);
  console.log('   - Variables objetivo: Home Goals, Away Goals');
  console.log(`   - Datos de entrenamiento: ${trainFeatures.length} partidos sintéticos\n`);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('✅ Demostración completada exitosamente!');
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

// Ejecutar demostración
main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
