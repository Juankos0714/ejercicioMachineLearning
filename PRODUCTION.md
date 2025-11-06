# Production Deployment Guide

Complete guide for deploying the ML-enhanced football prediction system to production.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Training Models](#training-models)
- [Production API](#production-api)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The system combines traditional mathematical models (Elo, Poisson, Monte Carlo) with Machine Learning (Random Forest, Neural Networks) to predict football match outcomes with high accuracy.

**Key Features:**
- ✅ Hybrid ensemble predictions (Math + ML)
- ✅ Real-time predictions via API
- ✅ Automatic retraining on schedule
- ✅ Advanced features (form, h2h, momentum)
- ✅ Model persistence and versioning
- ✅ Performance monitoring

---

## 🔧 Prerequisites

### Required

- Node.js 18+ and npm
- Supabase account with database
- At least **50 completed matches** in database
- At least **10 teams** in database

### Recommended

- 200+ completed matches for best results
- Historical team statistics
- Form data (last 5 matches per team)

---

## 🚀 Initial Setup

### 1. Environment Configuration

Create `.env` file:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Schema

Ensure your Supabase database has these tables:

```sql
-- Teams table
CREATE TABLE teams (
  id uuid PRIMARY KEY,
  name text UNIQUE NOT NULL,
  league text NOT NULL,
  elo_rating numeric DEFAULT 1500,
  avg_goals_scored numeric DEFAULT 1.5,
  avg_goals_conceded numeric DEFAULT 1.5,
  xg_per_match numeric DEFAULT 1.5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Matches table
CREATE TABLE matches (
  id uuid PRIMARY KEY,
  home_team_id uuid REFERENCES teams(id) NOT NULL,
  away_team_id uuid REFERENCES teams(id) NOT NULL,
  match_date timestamptz NOT NULL,
  league text NOT NULL,
  home_score integer,
  away_score integer,
  created_at timestamptz DEFAULT now()
);

-- Team stats table (optional, for advanced features)
CREATE TABLE team_stats (
  id uuid PRIMARY KEY,
  team_id uuid REFERENCES teams(id) NOT NULL,
  date date NOT NULL,
  shots integer DEFAULT 0,
  shots_on_target integer DEFAULT 0,
  possession numeric DEFAULT 50,
  xg numeric DEFAULT 0,
  form_points integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

### 3. Install Dependencies

```bash
npm install
```

---

## 🎓 Training Models

### Check Data Availability

Before training, check if you have enough data:

```bash
npm run train:check
```

**Output:**
```
╔════════════════════════════════════════════════════════════════╗
║                   DATA AVAILABILITY REPORT                     ║
╚════════════════════════════════════════════════════════════════╝

Teams: 15
Total Matches: 120
Completed Matches: 85

Status: ✅ Ready for training
Message: Ready for training: 15 teams, 85 completed matches
```

### Initial Training

#### With Real Data (Recommended for Production)

```bash
npm run train
```

This will:
1. Load historical matches from Supabase
2. Extract features from team data
3. Train Random Forest (100 trees, depth 15)
4. Train Neural Network (100 epochs)
5. Optimize ensemble weights
6. Save models to localStorage
7. Display performance metrics

**Expected Output:**
```
╔════════════════════════════════════════════════════════════════╗
║            TRAINING MACHINE LEARNING MODELS                    ║
╚════════════════════════════════════════════════════════════════╝

✓ Using REAL data from Supabase

📥 Loading real match data from Supabase...
✓ Loaded 15 teams
✓ Loaded 85 matches

✓ Extracted 85 training samples
✓ Leagues: Premier League, La Liga
✓ Training set: 68 samples
✓ Test set: 17 samples

🌲 Training Random Forest...
✓ RF Accuracy: 52.94%
✓ RF F1 Score: 49.23%

🧠 Training Neural Network...
Outcome Model - Epoch 0: loss = 1.1907, accuracy = 0.4250
Outcome Model - Epoch 20: loss = 0.9477, accuracy = 0.4875
...
✓ NN Outcome Accuracy: 41.18%
✓ NN Brier Score: 0.2130

⚙️  Optimizing ensemble weights...
✓ Optimal weights: Math=40%, RF=35%, NN=25%

🔬 Evaluating hybrid model...
✓ Mathematical only: 45.00% accuracy
✓ Hybrid: 52.00% accuracy
✓ Improvement: +7.00%

💾 Saving trained models...
✓ Models saved successfully

╔════════════════════════════════════════════════════════════════╗
║                  TRAINING COMPLETE                             ║
╚════════════════════════════════════════════════════════════════╝
```

#### With Mock Data (Testing/Development)

```bash
npm run train:mock
```

Uses synthetic data for testing purposes.

### Retraining

Retrain models with latest data:

```bash
npm run train:retrain
```

---

## 🌐 Production API

### Initialize API

In your main application file:

```typescript
import { initializeMLAPI } from './services/mlProductionAPI';

// Initialize on app startup
await initializeMLAPI(true);  // true = enable auto-retraining
```

### Make Predictions

#### Simple Prediction

```typescript
import { mlAPI } from './services/mlProductionAPI';

const prediction = await mlAPI.predict(homeTeamId, awayTeamId);

console.log('Home Win:', (prediction.homeWinProb * 100).toFixed(1) + '%');
console.log('Draw:', (prediction.drawProb * 100).toFixed(1) + '%');
console.log('Away Win:', (prediction.awayWinProb * 100).toFixed(1) + '%');
console.log('Over 2.5:', (prediction.over25Prob * 100).toFixed(1) + '%');
console.log('Confidence:', (prediction.confidence * 100).toFixed(1) + '%');
console.log('Method:', prediction.method);  // 'hybrid' or 'mathematical'
```

#### Advanced Prediction (with form, stats)

```typescript
const { prediction, features } = await mlAPI.predictAdvanced(
  homeTeamId,
  awayTeamId
);

console.log('Prediction:', prediction);
console.log('Home Form:', features.homeForm);  // Last 5 matches
console.log('Away Form:', features.awayForm);
```

#### Batch Predictions

```typescript
const matches = [
  { homeTeamId: 'team1', awayTeamId: 'team2' },
  { homeTeamId: 'team3', awayTeamId: 'team4' },
];

const predictions = await mlAPI.predictBatch(matches);
```

#### Upcoming Matches

```typescript
// Get all upcoming matches with predictions
const upcoming = await mlAPI.predictUpcomingMatches();

// Filter by league
const premierLeague = await mlAPI.predictUpcomingMatches('Premier League');

upcoming.forEach(({ match, prediction }) => {
  console.log(`${match.home_team.name} vs ${match.away_team.name}`);
  console.log(`Prediction: ${(prediction.homeWinProb * 100).toFixed(1)}% - ${(prediction.drawProb * 100).toFixed(1)}% - ${(prediction.awayWinProb * 100).toFixed(1)}%`);
});
```

### Health Check

```typescript
const health = await mlAPI.healthCheck();

console.log('Status:', health.status);  // 'healthy', 'degraded', 'unhealthy'
console.log('Details:', health.details);
```

### Performance Metrics

```typescript
const metrics = mlAPI.getPerformanceMetrics();

console.log('Trained at:', metrics.trainedAt);
console.log('Hybrid accuracy:', (metrics.performance.hybrid.accuracy * 100).toFixed(2) + '%');
console.log('Optimal weights:', metrics.optimalWeights);
```

### Manual Retraining

```typescript
await mlAPI.retrain();
```

---

## 🚢 Deployment

### Option 1: Vercel (Recommended)

1. **Push to GitHub**

```bash
git add .
git commit -m "Add ML production system"
git push origin main
```

2. **Deploy to Vercel**

```bash
npm install -g vercel
vercel
```

3. **Configure Environment Variables**

In Vercel dashboard:
- Add `VITE_SUPABASE_URL`
- Add `VITE_SUPABASE_ANON_KEY`

4. **Enable Edge Functions** (for API routes)

Create `api/predict.ts`:

```typescript
import { mlAPI } from '../src/services/mlProductionAPI';

export default async function handler(req, res) {
  const { homeTeamId, awayTeamId } = req.query;

  try {
    const prediction = await mlAPI.predict(homeTeamId, awayTeamId);
    res.json({ success: true, prediction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

### Option 2: Docker

1. **Create Dockerfile**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

2. **Build and Run**

```bash
docker build -t football-predictor .
docker run -p 3000:3000 -e VITE_SUPABASE_URL=your_url football-predictor
```

### Option 3: Traditional Server

1. **Build for production**

```bash
npm run build
```

2. **Serve with PM2**

```bash
npm install -g pm2
pm2 start npm --name "football-predictor" -- run preview
pm2 save
pm2 startup
```

---

## 📊 Monitoring

### Performance Tracking

Monitor these key metrics:

```typescript
setInterval(async () => {
  const health = await mlAPI.healthCheck();
  const metrics = mlAPI.getPerformanceMetrics();

  // Log to monitoring service
  console.log({
    timestamp: new Date(),
    status: health.status,
    accuracy: metrics.performance.hybrid.accuracy,
    brierScore: metrics.performance.hybrid.brierScore,
    modelAge: Date.now() - new Date(metrics.trainedAt).getTime()
  });
}, 3600000);  // Every hour
```

### Alerts

Set up alerts for:
- ❌ API health status != 'healthy'
- ❌ Accuracy drops below 40%
- ❌ Models older than 30 days
- ❌ Brier score above 0.30

### Logging

Integrate with logging service:

```typescript
import { initializeMLAPI } from './services/mlProductionAPI';

// Initialize with logging
await initializeMLAPI(true);

// Log all predictions
const originalPredict = mlAPI.predict;
mlAPI.predict = async (...args) => {
  const start = Date.now();
  const prediction = await originalPredict.apply(mlAPI, args);
  const duration = Date.now() - start;

  logger.info('Prediction made', {
    duration,
    confidence: prediction.confidence,
    method: prediction.method
  });

  return prediction;
};
```

---

## 🔧 Maintenance

### Automatic Retraining

By default, models retrain automatically every 24 hours if:
- Models are older than 30 days, OR
- Accuracy drops below 40%

Configure in initialization:

```typescript
import { AutoRetrainingScheduler } from './services/mlTrainingSystem';

const scheduler = new AutoRetrainingScheduler(24);  // Check every 24 hours
await scheduler.start();
```

### Manual Retraining Schedule

Create a cron job:

```bash
# Retrain every Sunday at 2 AM
0 2 * * 0 cd /path/to/app && npm run train:retrain
```

### Database Maintenance

1. **Keep Elo ratings updated**

After each match:

```typescript
import { updateTeamEloAfterMatch } from './services/mlRealDataLoader';

await updateTeamEloAfterMatch(matchId);
```

2. **Archive old predictions**

```sql
-- Archive predictions older than 1 year
DELETE FROM predictions WHERE created_at < NOW() - INTERVAL '1 year';
```

3. **Update team statistics**

Regularly update `team_stats` table with latest match data.

---

## 🐛 Troubleshooting

### Issue: "API not initialized"

**Solution:**
```typescript
await initializeMLAPI(true);
```

### Issue: "Insufficient data for training"

**Solution:**
- Add more completed matches to database
- Use mock data for testing: `npm run train:mock`
- Minimum requirements:
  - 10+ teams
  - 50+ completed matches

### Issue: "WebGL not supported" (Neural Network)

**Solution:**
Neural networks will fallback to CPU mode automatically. For better performance in Node.js:

```bash
npm install @tensorflow/tfjs-node
```

### Issue: "Models performing poorly"

**Solutions:**
1. **More training data**: Add more historical matches
2. **Better features**: Ensure team stats are accurate
3. **Hyperparameter tuning**: Adjust model configuration
4. **Retrain**: `npm run train:retrain`

### Issue: "Predictions too slow"

**Solutions:**
1. **Cache predictions** for same match
2. **Batch predictions** instead of individual
3. **Pre-compute** predictions for upcoming matches
4. **Use mathematical only** for faster predictions:

```typescript
const prediction = await mlAPI.predict(homeId, awayId, { useHybrid: false });
```

### Issue: "Models not persisting"

**Solution:**
Models are saved to browser localStorage. For server-side:

```typescript
import { saveNeuralNetwork } from './services/mlNeuralNetwork';

// Save to file
await saveNeuralNetwork(model, 'file://./models/predictor');

// Load from file
const model = await loadNeuralNetwork('file://./models/predictor');
```

---

## 📚 Additional Resources

- [MACHINE_LEARNING.md](./MACHINE_LEARNING.md) - ML architecture details
- [MATHEMATICS.md](./MATHEMATICS.md) - Mathematical models explained
- [README.md](./README.md) - General project overview

---

## 🔐 Security Considerations

1. **API Keys**: Never expose Supabase keys in client-side code
2. **Rate Limiting**: Implement rate limiting on prediction endpoints
3. **Authentication**: Require auth for sensitive operations
4. **Data Validation**: Validate all inputs before predictions
5. **CORS**: Configure CORS properly for production

---

## 📈 Performance Benchmarks

Expected performance with sufficient data:

| Metric | Target | Typical |
|--------|--------|---------|
| Hybrid Accuracy | >45% | 48-55% |
| Random Forest | >40% | 45-52% |
| Neural Network | >35% | 38-45% |
| Brier Score | <0.25 | 0.18-0.23 |
| Prediction Time | <100ms | 50-80ms |
| Training Time | <10min | 5-8min |

---

## 🎯 Success Criteria

Your system is production-ready when:

✅ Models trained with real data (85+ matches)
✅ Hybrid accuracy >45%
✅ Brier score <0.25
✅ API health status = 'healthy'
✅ Auto-retraining enabled
✅ Monitoring in place
✅ Error handling implemented
✅ Performance acceptable (<100ms predictions)

---

## 💡 Best Practices

1. **Start Simple**: Begin with mathematical models, add ML gradually
2. **Monitor Continuously**: Track performance metrics
3. **Retrain Regularly**: Keep models fresh with latest data
4. **A/B Test**: Compare mathematical vs hybrid predictions
5. **Validate**: Always validate predictions against actual results
6. **Document**: Keep track of model versions and performance
7. **Fail Gracefully**: Always have fallback to mathematical models

---

## 🤝 Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [MACHINE_LEARNING.md](./MACHINE_LEARNING.md)
3. Open an issue on GitHub
4. Check logs: `pm2 logs football-predictor`

---

**Ready for Production!** 🚀

Your ML-enhanced football prediction system is now ready to deploy and serve real-time predictions with high accuracy.
