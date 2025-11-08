# Test de Efectividad del Modelo de Predicción

Este documento explica cómo usar el sistema de test de efectividad del modelo de predicción de partidos de fútbol.

## 📋 Descripción General

El test de efectividad compara las predicciones del modelo con resultados reales de partidos durante un periodo específico (típicamente un mes) y calcula métricas detalladas de rendimiento.

## 🎯 Métricas Calculadas

### 1. **Accuracy de Resultados (Home/Draw/Away)**
- **Accuracy General**: Porcentaje de resultados predichos correctamente
- **Precision por Categoría**: Para cada resultado (local, empate, visitante)
- **Recall por Categoría**: Tasa de detección de cada resultado
- **F1-Score**: Media armónica de precision y recall

### 2. **Over 2.5 Goles**
- **Accuracy**: Porcentaje de predicciones correctas de over/under 2.5
- **Precision**: De las predicciones "over", cuántas fueron correctas
- **Recall**: De los partidos "over" reales, cuántos se predijeron
- **F1-Score**: Balance entre precision y recall

### 3. **Métricas Probabilísticas**
- **Brier Score**: Mide la precisión de las probabilidades (0 = perfecto, menor es mejor)
- **Log Loss**: Penaliza predicciones confiadas pero incorrectas
- **Calibration Score**: Qué tan bien las probabilidades reflejan la confianza real

### 4. **Error en Predicción de Goles**
- **Error Promedio**: Diferencia promedio entre goles predichos y reales
- **RMSE (Root Mean Square Error)**: Error cuadrático medio (penaliza errores grandes)

### 5. **Matriz de Confusión**
Muestra cómo se distribuyen las predicciones vs resultados reales.

## 🚀 Uso

### Ejecutar el Test

```bash
# Test para un mes específico
npm run test:effectiveness -- 2024 10  # Octubre 2024
npm run test:effectiveness -- 2024 11  # Noviembre 2024

# Sin argumentos, usa el mes anterior
npm run test:effectiveness
```

### Ejemplo de Uso en Código

```typescript
import { testModelEffectiveness, printEffectivenessReport } from './src/services/mlModelEffectivenessTest';

// Ejecutar test para octubre 2024
const metrics = await testModelEffectiveness(2024, 10);

// Imprimir reporte detallado
printEffectivenessReport(metrics);

// Acceder a métricas específicas
console.log(`Accuracy: ${metrics.outcomeAccuracy * 100}%`);
console.log(`Brier Score: ${metrics.brierScore}`);
console.log(`F1-Score Home: ${metrics.outcomeF1Score.home}`);
```

## 📊 Interpretación de Resultados

### Accuracy General
- **> 55%**: 🏆 Excelente - Significativamente mejor que azar
- **50-55%**: ⭐ Muy Bueno - Mejor que predicción aleatoria
- **45-50%**: 👍 Bueno - Ligeramente mejor que azar
- **40-45%**: ⚠️  Regular - Cerca de predicción aleatoria (~33%)
- **< 40%**: ❌ Necesita mejoras

### Brier Score
- **< 0.20**: 🏆 Excelente calibración
- **0.20-0.25**: ⭐ Buena calibración
- **0.25-0.35**: 👍 Aceptable
- **> 0.35**: ⚠️  Necesita calibración

### Calibration Score
- **> 90%**: 🏆 Excelente - Probabilidades muy confiables
- **85-90%**: ⭐ Muy bueno
- **75-85%**: 👍 Bueno
- **< 75%**: ⚠️  Las probabilidades necesitan ajuste

### Error de Goles
- **< 1.0**: 🏆 Excelente precisión
- **1.0-1.5**: ⭐ Buena precisión
- **1.5-2.0**: 👍 Aceptable
- **> 2.0**: ⚠️  Necesita mejoras

## 📈 Ejemplo de Salida

```
╔══════════════════════════════════════════════════════════════════╗
║                  REPORTE DE EFECTIVIDAD DEL MODELO               ║
╚══════════════════════════════════════════════════════════════════╝

📅 Periodo: 2024-10-01 a 2024-10-31
📊 Total de partidos analizados: 125

═══════════════════════════════════════════════════════════════════
  ACCURACY DE PREDICCIÓN DE RESULTADOS (Home/Draw/Away)
═══════════════════════════════════════════════════════════════════
  Accuracy general: 52.80%

  Por categoría:
    HOME - Precision: 58.33% | Recall: 65.12% | F1: 61.54%
    DRAW - Precision: 35.71% | Recall: 28.57% | F1: 31.75%
    AWAY - Precision: 54.17% | Recall: 48.15% | F1: 50.98%

═══════════════════════════════════════════════════════════════════
  ACCURACY DE OVER 2.5 GOLES
═══════════════════════════════════════════════════════════════════
  Accuracy: 64.80%
  Precision: 68.42%
  Recall: 70.27%
  F1-Score: 69.33%

═══════════════════════════════════════════════════════════════════
  MÉTRICAS PROBABILÍSTICAS
═══════════════════════════════════════════════════════════════════
  Brier Score: 0.2245 (menor es mejor, 0 = perfecto)
  Log Loss: 1.0234 (menor es mejor)
  Calibration Score: 88.45% (mayor es mejor)

═══════════════════════════════════════════════════════════════════
  ERROR EN PREDICCIÓN DE GOLES
═══════════════════════════════════════════════════════════════════
  Error promedio goles local: 0.89
  Error promedio goles visitante: 0.76
  Error promedio total: 0.83
  RMSE local: 1.12
  RMSE visitante: 0.98

═══════════════════════════════════════════════════════════════════
  CONFIANZA DEL MODELO
═══════════════════════════════════════════════════════════════════
  Confianza promedio: 72.50%
  Calibración de confianza: 86.30%

═══════════════════════════════════════════════════════════════════
  MATRIZ DE CONFUSIÓN
═══════════════════════════════════════════════════════════════════
  Real \ Predicho │  HOME │  DRAW │  AWAY
  ────────────────┼───────┼───────┼───────
  HOME            │    56 │    12 │    18
  DRAW            │     8 │     8 │     6
  AWAY            │    14 │     6 │    26

╔══════════════════════════════════════════════════════════════════╗
║                         RESUMEN EJECUTIVO                        ║
╚══════════════════════════════════════════════════════════════════╝

  🎯 Accuracy General: 52.80% ⭐ (Muy Bueno)
  📊 Brier Score: 0.2245
  🎲 Over 2.5 Accuracy: 64.80%
  ⚽ Error Promedio Goles: 0.83
  ✅ F1-Score Promedio: 48.09%

  Interpretación:
  ✓ El modelo supera el 50% de accuracy, mejor que predicciones al azar
  ✓ Buen Brier Score - las probabilidades están bien calibradas
  ✓ Predicción de goles muy precisa (error < 1 gol)
  ✓ Mejor desempeño en victorias locales (F1: 61.5%)
  ⚠ Necesita mejorar en empates (F1: 31.8%)
```

## 🔍 Métricas Detalladas

### EffectivenessMetrics Interface

```typescript
interface EffectivenessMetrics {
  // Información general
  totalMatches: number;
  dateRange: { start: string; end: string };

  // Accuracy de resultados
  outcomeAccuracy: number;
  outcomePrecision: { home: number; draw: number; away: number };
  outcomeRecall: { home: number; draw: number; away: number };
  outcomeF1Score: { home: number; draw: number; away: number };

  // Over 2.5
  over25Accuracy: number;
  over25Precision: number;
  over25Recall: number;
  over25F1Score: number;

  // Métricas probabilísticas
  brierScore: number;
  logLoss: number;
  calibrationScore: number;

  // Errores de goles
  avgGoalErrorHome: number;
  avgGoalErrorAway: number;
  avgTotalGoalError: number;
  rmseHome: number;
  rmseAway: number;

  // Confianza
  avgConfidence: number;
  confidenceCalibration: number;

  // Matriz de confusión
  confusionMatrix: { ... };

  // Comparaciones individuales
  comparisons: PredictionComparison[];
}
```

## 📝 Requisitos Previos

1. **Base de Datos Configurada**: Necesitas tener Supabase configurado con:
   - Tabla `teams` con datos de equipos
   - Tabla `matches` con partidos completados (home_score y away_score no nulos)

2. **Variables de Entorno**: Archivo `.env` con:
   ```
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_key_de_supabase
   ```

3. **Datos Históricos**: Al menos 20-30 partidos completados en el mes que quieres analizar

## 🧪 Ejecutar Tests Unitarios

```bash
# Ejecutar todos los tests
npm run test

# Ejecutar solo tests de efectividad
npm run test -- mlModelEffectivenessTest.test.ts

# Modo watch
npm run test -- --watch
```

## 💡 Consejos

1. **Periodo de Análisis**:
   - Un mes (20-40 partidos) es ideal para un análisis representativo
   - Menos de 15 partidos puede dar resultados poco confiables
   - Más de 100 partidos puede incluir cambios en la forma de equipos

2. **Interpretación de Empates**:
   - Los empates son naturalmente más difíciles de predecir
   - F1-Score de empates suele ser menor que home/away
   - Esto es normal y esperado en modelos de predicción de fútbol

3. **Brier Score**:
   - Es la métrica más importante para evaluar probabilidades
   - Un modelo que siempre predice 33.33% para cada resultado tiene Brier Score ≈ 0.44
   - Cualquier score < 0.35 indica que el modelo es mejor que azar

4. **Calibración**:
   - Si calibrationScore es bajo pero accuracy es alto, el modelo acierta pero no está seguro
   - Si calibrationScore es alto pero accuracy bajo, el modelo está muy confiado pero se equivoca

## 🔄 Mejoras Futuras

- [ ] Soporte para múltiples meses en un solo test
- [ ] Comparación entre diferentes versiones del modelo
- [ ] Exportación de reportes a PDF/CSV
- [ ] Gráficos de distribución de probabilidades
- [ ] Análisis por liga/competición
- [ ] Tracking de mejora del modelo a lo largo del tiempo

## 📚 Referencias

- **Brier Score**: [Wikipedia - Brier Score](https://en.wikipedia.org/wiki/Brier_score)
- **Log Loss**: [Wikipedia - Cross Entropy](https://en.wikipedia.org/wiki/Cross_entropy)
- **F1 Score**: [Wikipedia - F-score](https://en.wikipedia.org/wiki/F-score)
- **RMSE**: [Wikipedia - Root-mean-square deviation](https://en.wikipedia.org/wiki/Root-mean-square_deviation)

## 🤝 Contribuir

Si encuentras bugs o tienes sugerencias de mejora, por favor:
1. Crea un issue describiendo el problema
2. Envía un PR con la solución propuesta
3. Asegúrate de que todos los tests pasen

---

**Última actualización**: Noviembre 2024
