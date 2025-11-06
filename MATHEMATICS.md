# Mathematical Models Documentation

## Overview

This application uses precise mathematical models to predict football match outcomes. All calculations are performed with numerical accuracy, avoiding approximations where possible.

## 1. Elo Rating System

### Basic Formula
```
Expected Score: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
Rating Update: R_new = R_old + K * (S - E)
```

### Parameters
- **Base K-factor**: 32
- **Goal Difference Multiplier**: `1 + |goal_diff| / 8`
- **Home Advantage**: 15% (equivalent to 60 Elo points)

### Implementation
```typescript
function updateEloRatings(ratingA, ratingB, scoreA, scoreB, isHomeA) {
  const adjustedRatingB = isHomeA ? ratingB - 60 : ratingB;
  const expectedA = 1 / (1 + Math.pow(10, (adjustedRatingB - ratingA) / 400));

  const actualA = scoreA > scoreB ? 1.0 : (scoreA < scoreB ? 0.0 : 0.5);
  const goalDiffMultiplier = 1 + Math.abs(scoreA - scoreB) / 8;
  const K = 32 * goalDiffMultiplier;

  return ratingA + K * (actualA - expectedA);
}
```

### Accuracy
- Converges over multiple matches
- Home advantage empirically validated at ~15%
- K-factor tuned for European football

## 2. Poisson Distribution

### Probability Mass Function
```
P(X = k) = (λ^k * e^-λ) / k!
```

### Implementation
```typescript
function poissonPMF(lambda, k) {
  if (k < 0 || !Number.isInteger(k)) return 0;
  if (lambda <= 0) return k === 0 ? 1 : 0;

  let result = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) {
    result *= lambda / i;
  }
  return result;
}
```

### Bivariable Distribution
For independent home and away scores:
```
P(home = h, away = a) = P_home(h) * P_away(a)
```

### Match Outcome Probabilities
```typescript
homeWin = Σ Σ P(h,a) for all h > a
draw    = Σ P(h,h) for all h
awayWin = Σ Σ P(h,a) for all h < a
```

### Lambda Calculation
```typescript
λ = attack_strength * (1 + elo_advantage * 0.5 + home_advantage) * (defense_weakness / 1.5)
```

Where:
- `attack_strength = (avg_goals_scored + xg) / 2`
- `elo_advantage = (team_elo - opponent_elo) / 400`
- `home_advantage = 0.15` (home) or `-0.15` (away)
- `defense_weakness = opponent_avg_goals_conceded`

### Bounds
Lambda is clamped to `[0.3, 4.0]` to prevent extreme predictions.

## 3. Monte Carlo Simulation

### Algorithm
```
For i = 1 to N:
  home_goals = PoissonRandom(λ_home)
  away_goals = PoissonRandom(λ_away)
  Record outcome (win/draw/loss)
  Record score

Calculate empirical probabilities
```

### Poisson Random Number Generation
```typescript
function poissonRandom(lambda) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;

  do {
    k++;
    p *= Math.random();
  } while (p > L);

  return k - 1;
}
```

### Convergence
- **N = 10,000** simulations for production
- Standard error: ~0.5% for probabilities
- 95% confidence interval: ±1%

### Validation
Monte Carlo results should converge to Poisson analytical results:
```
|P_monte_carlo - P_poisson| < 0.02 (with N = 10,000)
```

## 4. Over/Under Goals

### Over 2.5 Goals Probability
```
P(total > 2.5) = 1 - P(total ≤ 2)
P(total ≤ 2) = Σ P(h,a) for all (h,a) where h + a ≤ 2
```

### Exact Calculation
```typescript
function calculateOver25Probability(lambdaHome, lambdaAway) {
  let probUnder25 = 0;

  for (let h = 0; h <= 10; h++) {
    for (let a = 0; a <= 10; a++) {
      if (h + a <= 2) {
        probUnder25 += poissonPMF(lambdaHome, h) * poissonPMF(lambdaAway, a);
      }
    }
  }

  return 1 - probUnder25;
}
```

## 5. Expected Goals (xG)

### Calculation
```typescript
xG = shots * 0.1 * shot_quality * possession_factor
```

Where:
- `shot_quality = shots_on_target / shots`
- `possession_factor = possession / 50`

### Integration with Poisson
xG is averaged with historical goals scored:
```
attack_strength = (avg_goals_scored + xg_per_match) / 2
```

## 6. Brier Score (Accuracy Metric)

### Formula
```
Brier = (1/N) * Σ [(P_predicted - P_actual)²]
```

For multi-class (win/draw/loss):
```
Brier = [(P_home - A_home)² + (P_draw - A_draw)² + (P_away - A_away)²] / 3
```

### Implementation
```typescript
function calculateBrierScore(predicted, actual) {
  const homeError = Math.pow(predicted.home - actual.home, 2);
  const drawError = Math.pow(predicted.draw - actual.draw, 2);
  const awayError = Math.pow(predicted.away - actual.away, 2);

  return (homeError + drawError + awayError) / 3;
}
```

### Target Values
- **Excellent**: Brier < 0.15
- **Good**: Brier < 0.20
- **Acceptable**: Brier < 0.25
- **Poor**: Brier ≥ 0.25

## 7. Model Calibration

### Probability Calibration
Probabilities should be well-calibrated:
```
If P(win) = 0.6 across N matches, then ~60% should be wins
```

### Platt Scaling (Optional)
For better calibration:
```
P_calibrated = 1 / (1 + exp(A * P_raw + B))
```

Where A and B are fitted on validation data.

## 8. Sensitivity Analysis

### Elo Sensitivity
```
ΔP(win) / ΔElo ≈ 0.001 per Elo point
```
A 100 Elo advantage increases win probability by ~10%.

### Lambda Sensitivity
```
ΔP(win) / Δλ ≈ 0.15 per lambda unit
```

### Home Advantage Impact
15% boost to lambda increases home win probability by ~8-12%.

## 9. Numerical Precision

### Floating Point Accuracy
- JavaScript uses IEEE 754 double precision
- 15-17 significant decimal digits
- Sufficient for all calculations

### Avoiding Underflow
For large k in Poisson PMF:
- Use iterative multiplication
- Avoid direct factorial calculation
- Log-space arithmetic for extreme values (not needed for football scores)

### Convergence Criteria
Monte Carlo: Stop when standard error < 0.005

## 10. Validation Metrics

### Cross-Validation
- **10-fold cross-validation** on historical data
- Target accuracy: 70-80%

### Metrics Tracked
- **Accuracy**: Correct outcome predictions
- **Log Loss**: Penalizes confident wrong predictions
- **Brier Score**: Probability calibration
- **ROC-AUC**: Discrimination ability

### Example Results (Target)
```
Accuracy:     75%
Brier Score:  0.18
Log Loss:     0.48
ROC-AUC:      0.78
```

## 11. Limitations

### Model Assumptions
1. **Independence**: Assumes home/away goals are independent (not always true)
2. **Stationarity**: Assumes team strength is constant (changes over season)
3. **Poisson**: Assumes goals follow Poisson distribution (reasonable but not perfect)

### Unmodeled Factors
- Player injuries
- Tactical changes
- Weather conditions
- Referee bias
- Team motivation
- Recent form trends

### Variance
Even perfect models have inherent randomness. Expected long-term accuracy ceiling: ~80%.

## 12. Future Improvements

### Advanced Models
- **Negative Binomial**: Better tail behavior than Poisson
- **Bivariate Copulas**: Model score correlation
- **Time-Varying Elo**: Decay over off-season
- **Bayesian Hierarchical**: Pool information across leagues

### Feature Engineering
- **Form**: Exponentially weighted recent results
- **Head-to-Head**: Historical matchup adjustment
- **Rest Days**: Fatigue modeling
- **Venue**: Stadium-specific effects

### Machine Learning
- **Gradient Boosting**: XGBoost for lambda prediction
- **Neural Networks**: Deep learning on match sequences
- **Ensemble Methods**: Combine multiple models

## References

1. Elo, A. (1978). The Rating of Chessplayers, Past and Present
2. Dixon & Coles (1997). Modelling Association Football Scores
3. Karlis & Ntzoufras (2003). Analysis of Sports Data using Bivariate Poisson Models
4. Hvattum & Arntzen (2010). Using ELO ratings for match result prediction
5. FiveThirtyEight Soccer Predictions Methodology
