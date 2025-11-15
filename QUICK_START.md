# Quick Start Guide

Get up and running with live betting markets in 5 minutes.

## Step 1: Get API Keys (5 min)

### The Odds API
1. Go to https://the-odds-api.com/
2. Sign up for free account
3. Get your API key from dashboard
4. Free tier: 500 requests/month

### Supabase
1. Go to https://supabase.com/
2. Create new project
3. Copy Project URL and anon key from Settings → API

## Step 2: Configure Environment (2 min)

```bash
# Copy example env file
cp .env.example .env

# Edit .env file with your credentials
nano .env
```

Update these values:
```env
VITE_ODDS_API_KEY=your_odds_api_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_ALERT_EMAIL=your_email@example.com
```

## Step 3: Setup Database (2 min)

1. Open Supabase Dashboard
2. Go to Database → SQL Editor
3. Create new query
4. Copy contents from:
   `supabase/migrations/20251115000001_create_betting_history_tables.sql`
5. Click "Run"

## Step 4: Install Dependencies (1 min)

```bash
npm install
```

## Step 5: Test the System (1 min)

```bash
# Run demo with mock data
npm run betting:demo
```

You should see betting analysis output with recommendations.

## Step 6: Run Live Markets 🚀

```bash
# Run live markets (Premier League)
npm run markets:live

# Or specify a sport
npm run markets:live -- --sport=soccer_spain_la_liga
```

That's it! You're now analyzing live betting markets.

## What's Happening?

The system is now:
- ✅ Fetching live odds every 5 minutes
- ✅ Running ML predictions on matches
- ✅ Identifying value bets
- ✅ Sending alerts for opportunities
- ✅ Storing data in Supabase

## Next Steps

1. **Customize Strategy**
   - Edit betting parameters in `.env`
   - Create custom strategies (see `LIVE_MARKETS_SETUP.md`)

2. **Setup Alerts**
   - Configure email alerts
   - Setup Slack/Discord webhooks
   - Get real-time notifications

3. **Track Performance**
   - View data in Supabase
   - Monitor ROI and CLV
   - Analyze winning strategies

4. **Scale Up**
   - Run multiple sports simultaneously
   - Increase API quota
   - Deploy to cloud for 24/7 operation

## Available Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production

# ML Training
npm run train                  # Train models
npm run train:mock             # Train with mock data

# Testing
npm run test                   # Run tests
npm run test:effectiveness     # Test model effectiveness

# Betting Analysis
npm run betting:demo           # Demo with mock data
npm run markets:live           # Live markets (default sport)
npm run markets:live:epl       # Premier League
npm run markets:live:laliga    # La Liga
npm run markets:live:nba       # NBA
```

## Common Issues

### "API key not configured"
- Make sure `.env` file exists
- Check that `VITE_ODDS_API_KEY` is set

### "Supabase connection error"
- Verify Supabase URL and key
- Make sure migrations have been run

### "No live matches found"
- No matches currently live
- Try different sport or wait for matches

## Documentation

- **Full Setup Guide**: `LIVE_MARKETS_SETUP.md`
- **ML Documentation**: `MACHINE_LEARNING.md`
- **Betting Analysis**: `BETTING_ANALYSIS.md`
- **Production Guide**: `PRODUCTION.md`

## Support

Need help? Check:
- Documentation in repo
- The Odds API docs: https://the-odds-api.com/liveapi/guides/v4/
- Supabase docs: https://supabase.com/docs

---

**Remember**: This is for educational purposes. Always bet responsibly!
