#!/usr/bin/env ts-node

/**
 * Script para evaluar el modelo de Regresión Lineal con datos reales
 *
 * Este script:
 * 1. Carga datos reales de partidos desde Supabase
 * 2. Entrena un modelo de regresión lineal
 * 3. Evalúa el modelo con datos de test
 * 4. Realiza validación cruzada
 * 5. Analiza los coeficientes del modelo
 * 6. Genera un reporte detallado de evaluación
 */

import { generateRealDataset } from '../src/services/mlRealDataLoader';
import {
  trainLinearRegression,
  evaluateLinearRegression,
  analyzeCoefficients,
  printRegressionReport,
  crossValidateLinearRegression,
  predictLinearRegression,
} from '../src/services/mlLinearRegression';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     EVALUACIÓN DE REGRESIÓN LINEAL PARA PREDICCIÓN DE GOLES     ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Cargar datos reales
    console.log('📊 Paso 1: Cargando datos de partidos reales...\n');
    const dataset = await generateRealDataset(500, 0.2);

    if (dataset.stats.completedMatches < 50) {
      console.error('❌ No hay suficientes datos para entrenar el modelo');
      console.log(`   Se encontraron ${dataset.stats.completedMatches} partidos, se necesitan al menos 50`);
      process.exit(1);
    }

    console.log(`✓ ${dataset.stats.completedMatches} partidos cargados exitosamente`);
    console.log(`✓ Ligas: ${dataset.stats.leagues.join(', ')}\n`);

    // 2. Extraer features y targets
    console.log('📊 Paso 2: Preparando datos de entrenamiento y prueba...\n');

    const trainFeatures = dataset.trainSet.map(d => d.features);
    const trainTargets = dataset.trainSet.map(d => d.target);
    const testFeatures = dataset.testSet.map(d => d.features);
    const testTargets = dataset.testSet.map(d => d.target);

    console.log(`  Entrenamiento: ${trainFeatures.length} partidos`);
    console.log(`  Prueba: ${testFeatures.length} partidos\n`);

    // 3. Entrenar modelo de regresión lineal
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('📊 Paso 3: Entrenando modelo de Regresión Lineal...');
    console.log('═══════════════════════════════════════════════════════════════════');

    const model = trainLinearRegression(trainFeatures, trainTargets);
    console.log('\n✓ Modelo entrenado exitosamente!\n');

    // 4. Evaluar modelo con datos de prueba
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('📊 Paso 4: Evaluando modelo con datos de prueba...');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const metrics = evaluateLinearRegression(model, testFeatures, testTargets);

    // 5. Analizar coeficientes
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('📊 Paso 5: Analizando coeficientes del modelo...');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const analysis = analyzeCoefficients(model);

    // 6. Imprimir reporte detallado
    printRegressionReport(metrics, analysis);

    // 7. Validación cruzada
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('📊 Paso 6: Realizando validación cruzada (5-fold)...');
    console.log('═══════════════════════════════════════════════════════════════════');

    const allFeatures = dataset.trainingData.map(d => d.features);
    const allTargets = dataset.trainingData.map(d => d.target);
    const cvResults = crossValidateLinearRegression(allFeatures, allTargets, 5);

    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║            RESULTADOS DE VALIDACIÓN CRUZADA (5-Fold)            ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    console.log(`  Mean R² (Home Goals):       ${cvResults.meanR2Home.toFixed(4)} (${(cvResults.meanR2Home * 100).toFixed(2)}%)`);
    console.log(`  Mean R² (Away Goals):       ${cvResults.meanR2Away.toFixed(4)} (${(cvResults.meanR2Away * 100).toFixed(2)}%)`);
    console.log(`  Mean MAE (Home Goals):      ${cvResults.meanMAEHome.toFixed(4)} goals`);
    console.log(`  Mean MAE (Away Goals):      ${cvResults.meanMAEAway.toFixed(4)} goals`);
    console.log(`  Mean Over 2.5 Accuracy:     ${(cvResults.meanOver25Accuracy * 100).toFixed(2)}%\n`);

    // Variabilidad entre folds
    const r2HomeValues = cvResults.foldResults.map(f => f.homeGoals.r2);
    const r2AwayValues = cvResults.foldResults.map(f => f.awayGoals.r2);
    const stdR2Home = Math.sqrt(r2HomeValues.reduce((sum, v) => sum + Math.pow(v - cvResults.meanR2Home, 2), 0) / 5);
    const stdR2Away = Math.sqrt(r2AwayValues.reduce((sum, v) => sum + Math.pow(v - cvResults.meanR2Away, 2), 0) / 5);

    console.log(`  Std R² (Home Goals):        ${stdR2Home.toFixed(4)} (variability across folds)`);
    console.log(`  Std R² (Away Goals):        ${stdR2Away.toFixed(4)} (variability across folds)\n`);

    // 8. Ejemplos de predicciones
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('📊 Paso 7: Ejemplos de predicciones vs. resultados reales');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const numExamples = Math.min(10, testFeatures.length);
    for (let i = 0; i < numExamples; i++) {
      const prediction = predictLinearRegression(model, testFeatures[i]);
      const actual = testTargets[i];

      const homeError = Math.abs(prediction.expectedHomeGoals - actual.homeGoals);
      const awayError = Math.abs(prediction.expectedAwayGoals - actual.awayGoals);

      console.log(`Partido ${i + 1}:`);
      console.log(`  Predicción: ${prediction.expectedHomeGoals.toFixed(2)} - ${prediction.expectedAwayGoals.toFixed(2)} (Total: ${prediction.expectedTotalGoals.toFixed(2)})`);
      console.log(`  Real:       ${actual.homeGoals} - ${actual.awayGoals} (Total: ${actual.totalGoals})`);
      console.log(`  Error:      ${homeError.toFixed(2)} - ${awayError.toFixed(2)}`);
      console.log(`  Over 2.5:   Predicho=${prediction.over25Prob > 0.5 ? 'Sí' : 'No'} (${(prediction.over25Prob * 100).toFixed(1)}%), Real=${actual.over25 ? 'Sí' : 'No'}\n`);
    }

    // 9. Resumen final
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

    console.log('🎯 Interpretación de R²:');
    if (avgR2 > 0.7) {
      console.log('   ✓ Excelente: El modelo explica >70% de la variabilidad en los goles');
    } else if (avgR2 > 0.5) {
      console.log('   ✓ Bueno: El modelo explica >50% de la variabilidad en los goles');
    } else if (avgR2 > 0.3) {
      console.log('   ⚠ Aceptable: El modelo explica >30% de la variabilidad');
    } else if (avgR2 > 0) {
      console.log('   ⚠ Bajo: El modelo tiene capacidad predictiva limitada');
    } else {
      console.log('   ❌ Pobre: El modelo predice peor que usar la media');
    }

    console.log('\n💡 Interpretación de MAE:');
    if (avgMAE < 0.8) {
      console.log('   ✓ Excelente: Error promedio <0.8 goles');
    } else if (avgMAE < 1.0) {
      console.log('   ✓ Bueno: Error promedio <1.0 goles');
    } else if (avgMAE < 1.3) {
      console.log('   ⚠ Aceptable: Error promedio <1.3 goles');
    } else {
      console.log('   ⚠ Mejorable: Error promedio >1.3 goles');
    }

    console.log('\n🔍 Características del modelo:');
    console.log('   - Algoritmo: Regresión Lineal Múltiple (OLS)');
    console.log(`   - Features utilizadas: ${model.featureNames.length}`);
    console.log('   - Variables objetivo: Home Goals, Away Goals');
    console.log('   - Método de evaluación: Train/Test Split + 5-Fold CV\n');

    console.log('✓ Top 3 features más importantes para Home Goals:');
    analysis.topFeatures.homeGoals.slice(0, 3).forEach((f, i) => {
      const impact = f.coefficient > 0 ? 'aumenta' : 'disminuye';
      console.log(`   ${i + 1}. ${f.feature} (coef: ${f.coefficient.toFixed(4)}) - ${impact} goles locales`);
    });

    console.log('\n✓ Top 3 features más importantes para Away Goals:');
    analysis.topFeatures.awayGoals.slice(0, 3).forEach((f, i) => {
      const impact = f.coefficient > 0 ? 'aumenta' : 'disminuye';
      console.log(`   ${i + 1}. ${f.feature} (coef: ${f.coefficient.toFixed(4)}) - ${impact} goles visitantes`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('✅ Evaluación completada exitosamente!');
    console.log('═══════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error durante la evaluación:');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar script
main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
