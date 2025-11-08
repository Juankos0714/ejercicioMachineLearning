#!/usr/bin/env tsx

/**
 * Script para ejecutar el test de efectividad del modelo
 *
 * Uso:
 *   npm run test:effectiveness -- 2024 10  # Test para octubre 2024
 *   npm run test:effectiveness -- 2024 11  # Test para noviembre 2024
 */

import { testModelEffectiveness, printEffectivenessReport } from '../src/services/mlModelEffectivenessTest';

async function main() {
  // Obtener argumentos de línea de comandos
  const args = process.argv.slice(2);

  let year: number;
  let month: number;

  if (args.length >= 2) {
    year = parseInt(args[0]);
    month = parseInt(args[1]);
  } else {
    // Por defecto, usar el mes anterior
    const now = new Date();
    year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    month = now.getMonth() === 0 ? 12 : now.getMonth();
  }

  // Validar argumentos
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    console.error('❌ Error: Argumentos inválidos');
    console.log('\nUso: npm run test:effectiveness -- <año> <mes>');
    console.log('Ejemplo: npm run test:effectiveness -- 2024 10\n');
    process.exit(1);
  }

  console.log(`\n🚀 Iniciando test de efectividad para ${getMonthName(month)} ${year}...\n`);

  try {
    // Ejecutar test
    const metrics = await testModelEffectiveness(year, month);

    // Imprimir reporte
    printEffectivenessReport(metrics);

    // Resumen final
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                         RESUMEN EJECUTIVO                        ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    const grade = getModelGrade(metrics.outcomeAccuracy);
    console.log(`  🎯 Accuracy General: ${(metrics.outcomeAccuracy * 100).toFixed(2)}% ${grade}`);
    console.log(`  📊 Brier Score: ${metrics.brierScore.toFixed(4)}`);
    console.log(`  🎲 Over 2.5 Accuracy: ${(metrics.over25Accuracy * 100).toFixed(2)}%`);
    console.log(`  ⚽ Error Promedio Goles: ${metrics.avgTotalGoalError.toFixed(2)}`);
    console.log(`  ✅ F1-Score Promedio: ${(getAverageF1(metrics) * 100).toFixed(2)}%`);

    console.log('\n  Interpretación:');
    console.log(getInterpretation(metrics));

    console.log('\n═══════════════════════════════════════════════════════════════════\n');
    console.log('✅ Test completado exitosamente\n');

  } catch (error) {
    console.error('\n❌ Error ejecutando test de efectividad:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Obtiene el nombre del mes
 */
function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1];
}

/**
 * Asigna una calificación al modelo basado en accuracy
 */
function getModelGrade(accuracy: number): string {
  if (accuracy >= 0.55) return '🏆 (Excelente)';
  if (accuracy >= 0.50) return '⭐ (Muy Bueno)';
  if (accuracy >= 0.45) return '👍 (Bueno)';
  if (accuracy >= 0.40) return '⚠️  (Regular)';
  return '❌ (Necesita mejoras)';
}

/**
 * Calcula el F1-Score promedio
 */
function getAverageF1(metrics: any): number {
  return (metrics.outcomeF1Score.home + metrics.outcomeF1Score.draw + metrics.outcomeF1Score.away) / 3;
}

/**
 * Genera interpretación de los resultados
 */
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
  } else {
    lines.push('  ⚠ Brier Score alto - las probabilidades necesitan mejor calibración');
  }

  if (metrics.calibrationScore > 0.85) {
    lines.push('  ✓ Excelente calibración - las probabilidades reflejan confianza real');
  }

  if (metrics.avgTotalGoalError < 1.0) {
    lines.push('  ✓ Predicción de goles muy precisa (error < 1 gol)');
  } else if (metrics.avgTotalGoalError < 1.5) {
    lines.push('  ✓ Predicción de goles aceptable');
  }

  // Identificar fortalezas y debilidades
  const f1Scores = [
    { type: 'victorias locales', score: metrics.outcomeF1Score.home },
    { type: 'empates', score: metrics.outcomeF1Score.draw },
    { type: 'victorias visitantes', score: metrics.outcomeF1Score.away }
  ];

  const best = f1Scores.reduce((max, curr) => curr.score > max.score ? curr : max);
  const worst = f1Scores.reduce((min, curr) => curr.score < min.score ? curr : min);

  if (best.score > 0.4) {
    lines.push(`  ✓ Mejor desempeño en ${best.type} (F1: ${(best.score * 100).toFixed(1)}%)`);
  }
  if (worst.score < 0.3) {
    lines.push(`  ⚠ Necesita mejorar en ${worst.type} (F1: ${(worst.score * 100).toFixed(1)}%)`);
  }

  return lines.join('\n');
}

// Ejecutar
main().catch(console.error);
