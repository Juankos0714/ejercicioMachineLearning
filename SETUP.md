# Setup Guide

## Quick Start

### 1. Environment Variables

The Supabase database is already provisioned and configured. You need to ensure your `.env` file has the correct values:

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### 2. Database

The database schema has been created with the following tables:
- `teams` - Football teams with Elo ratings and statistics
- `matches` - Match records
- `predictions` - User predictions with probabilities
- `team_stats` - Detailed team statistics

Sample data for 30 teams across 5 leagues has been populated.

### 3. Run the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── AuthProvider.tsx       # Authentication context
│   ├── AuthModal.tsx          # Login/signup modal
│   ├── PredictionInterface.tsx # Main prediction UI
│   └── PredictionChart.tsx    # Plotly visualizations
├── lib/
│   └── supabase.ts           # Supabase client & types
├── services/
│   └── predictionService.ts  # Prediction logic
├── utils/
│   └── mathUtils.ts          # Mathematical functions
└── App.tsx                   # Main app component

scripts/
└── seed-database.sql         # Sample data SQL
```

## Mathematical Functions

All mathematical operations are in `src/utils/mathUtils.ts`:

### Elo Ratings
```typescript
updateEloRatings(ratingA, ratingB, scoreA, scoreB, isHomeA)
```
- K-factor: 32 (adjusted by goal difference)
- Home advantage: 0.15 (15% boost)

### Poisson Probabilities
```typescript
calculatePoissonProbabilities(lambdaHome, lambdaAway, maxGoals)
```
- Returns probability matrix for all score combinations
- Calculates win/draw/loss probabilities

### Monte Carlo Simulation
```typescript
monteCarloSimulation(lambdaHome, lambdaAway, nSimulations)
```
- Default: 10,000 simulations
- Returns empirical probabilities and score distribution

### Expected Lambda
```typescript
calculateExpectedLambda(avgGoalsScored, avgGoalsConceded, xgPerMatch, eloRating, opponentEloRating, isHome)
```
- Combines multiple factors
- Accounts for attack strength, defense weakness, and Elo advantage

## Testing a Prediction

Example: Manchester City vs Arsenal

1. Select "Premier League" from league dropdown
2. Choose "Manchester City" as home team
3. Choose "Arsenal" as away team
4. Click "Generate Prediction"

Expected results:
- Home Win: ~55%
- Draw: ~25%
- Away Win: ~20%
- Expected Score: ~2.1 - 1.4
- Over 2.5 Goals: ~65%

## Authentication

Users can sign up and sign in to:
- Save predictions
- Track accuracy over time
- Build prediction history

Authentication uses Supabase Auth with email/password.

## Data Updates

To update team statistics:
1. Modify values in `scripts/seed-database.sql`
2. Run SQL via Supabase dashboard or CLI
3. Or use the Supabase client to update programmatically

## Performance Notes

- Build size is large (~5MB) due to Plotly.js
- Consider code splitting for production
- Monte Carlo simulations run client-side (fast with modern browsers)
- All calculations use native JavaScript Math functions

## Troubleshooting

### Teams not loading
- Check Supabase connection in browser console
- Verify RLS policies allow public read access
- Ensure sample data was inserted successfully

### Predictions not saving
- User must be authenticated
- Check browser console for errors
- Verify RLS policies allow authenticated inserts

### Charts not rendering
- Ensure Plotly.js is installed: `npm install react-plotly.js plotly.js-dist-min`
- Check browser compatibility (modern browsers only)

## API Reference

### Prediction Service

```typescript
// Get teams by league
const teams = await getTeamsByLeague('Premier League');

// Generate prediction
const prediction = await predictMatch(homeTeamId, awayTeamId);

// Save prediction (requires authentication)
await savePrediction(matchId, userId, predictionData);
```

### Math Utils

All functions are pure and side-effect free. They accept numerical parameters and return mathematical results.

## Security

- RLS enabled on all tables
- Public read access for teams/matches
- Authenticated read/write for predictions
- User predictions isolated by user_id

## Next Steps

1. Add more teams to database
2. Integrate live data APIs
3. Implement historical match tracking
4. Add more visualization options
5. Build prediction accuracy dashboard
