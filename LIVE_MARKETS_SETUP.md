# Live Markets Setup Guide

Complete guide for setting up and running the betting analytics system with real market data.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [API Keys Configuration](#api-keys-configuration)
3. [Supabase Setup](#supabase-setup)
4. [Alert Notifications](#alert-notifications)
5. [Strategy Customization](#strategy-customization)
6. [Running Live Markets](#running-live-markets)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts

1. **The Odds API** - For live odds data
   - Sign up at: https://the-odds-api.com/
   - Free tier: 500 requests/month
   - Paid tiers available for production use

2. **Supabase** - For data storage
   - Sign up at: https://supabase.com/
   - Free tier available
   - Create a new project

3. **Email Service** (Optional) - For email alerts
   - SendGrid, Mailgun, or similar
   - Or use SMTP server

4. **Webhook URLs** (Optional) - For integrations
   - Slack, Discord, Telegram, or custom webhooks

## API Keys Configuration

### 1. Copy Environment File

```bash
cp .env.example .env
```

### 2. Configure The Odds API

Get your API key from https://the-odds-api.com/account/

```env
VITE_ODDS_API_KEY=your_actual_api_key_here
```

### 3. Configure Supabase

From your Supabase project dashboard:
- Project URL: Settings → API → Project URL
- Anon Key: Settings → API → Project API keys → anon public

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Configure Betting Parameters

Adjust these based on your risk tolerance:

```env
# Starting bankroll in USD
VITE_DEFAULT_BANKROLL=1000

# Maximum stake as percentage of bankroll (1-10)
VITE_MAX_STAKE_PERCENT=5

# Minimum expected value to consider a bet (0-20)
VITE_MIN_EXPECTED_VALUE=2

# Kelly Criterion fraction (0.1-1.0, recommended: 0.25)
VITE_KELLY_FRACTION=0.25
```

### 5. Configure Alert Settings

```env
# Your email for alerts
VITE_ALERT_EMAIL=your_email@example.com

# Webhook URL for custom notifications
VITE_ALERT_WEBHOOK_URL=https://your-webhook-url.com/alerts
```

## Supabase Setup

### 1. Run Database Migrations

Navigate to your Supabase project:
- Go to: Database → SQL Editor
- Create a new query
- Copy and paste the contents of:
  `supabase/migrations/20251115000001_create_betting_history_tables.sql`
- Click "Run"

This will create all necessary tables:
- `odds_history` - Historical odds snapshots
- `bet_history` - Your bet records
- `bankroll_history` - Bankroll tracking
- `daily_performance` - Performance metrics
- `alert_history` - Alert logs
- `user_betting_preferences` - Your preferences

### 2. Verify Tables

In Supabase Dashboard → Database → Tables, you should see all the new tables.

### 3. Set Up Row Level Security (RLS)

The migration automatically sets up RLS policies. Verify by checking:
- Database → Policies

Each table should have policies for user-specific access.

## Alert Notifications

### Email Alerts

#### Option 1: Backend API (Recommended)

Create an API endpoint at `/api/send-email` that handles email sending.

Example using Express + Nodemailer:

```javascript
// api/send-email.js
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html } = req.body;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

#### Option 2: Supabase Edge Functions

Create a Supabase Edge Function for email sending.

### Webhook Alerts

#### Slack Integration

1. Create a Slack webhook:
   - Go to: https://api.slack.com/messaging/webhooks
   - Create a new webhook
   - Copy the webhook URL

2. Configure in preferences:
```typescript
await userPreferencesService.savePreferences({
  alertWebhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
});
```

#### Discord Integration

1. Create a Discord webhook:
   - Server Settings → Integrations → Webhooks
   - Create webhook
   - Copy URL

2. Use the notification service:
```typescript
await webhookService.sendDiscordNotification(alert, discordWebhookUrl);
```

#### Telegram Integration

1. Create a Telegram bot:
   - Talk to @BotFather on Telegram
   - Create new bot
   - Get bot token and chat ID

2. Configure and use:
```typescript
await webhookService.sendTelegramNotification(
  alert,
  'YOUR_BOT_TOKEN',
  'YOUR_CHAT_ID'
);
```

## Strategy Customization

### Using Pre-built Strategies

The system includes several pre-built strategies:

1. **Conservative Value Betting** - Low risk, high confidence bets
2. **Kelly Criterion Strategy** - Optimal stake sizing
3. **Aggressive Value Hunting** - High volume, all value opportunities
4. **Arbitrage Hunter** - Risk-free arbitrage only
5. **High Odds Value** - Undervalued underdogs

### Selecting a Strategy

```typescript
import { strategyService } from './src/services/strategyCustomizationService';

// Get all available strategies
const strategies = strategyService.getAllStrategies();

// Select a strategy
const strategy = strategyService.getStrategy('kelly-criterion');
```

### Creating Custom Strategy

```typescript
const customStrategy = strategyService.createStrategy({
  name: 'My Custom Strategy',
  description: 'Tailored to my preferences',
  baseStrategy: 'ValueBetting',
  riskProfile: 'moderate',

  // Risk management
  maxStakePercent: 3,
  kellyFraction: 0.2,
  stopLossPercent: 20,

  // Betting criteria
  minExpectedValue: 5,
  minConfidence: 0.7,
  minOdds: 1.5,
  maxOdds: 5.0,

  // Markets
  enabledMarkets: ['1X2', 'OverUnder'],

  // Custom rules
  rules: [
    {
      id: 'high-confidence-boost',
      name: 'Increase stake for high confidence',
      enabled: true,
      condition: {
        type: 'confidence',
        operator: '>=',
        value: 0.8,
      },
      action: {
        type: 'adjust_stake',
        stakeMultiplier: 1.5,
      },
    },
  ],
});
```

### Saving Strategy to User Preferences

```typescript
await userPreferencesService.savePreferences({
  preferredStrategy: customStrategy.id,
});
```

## Running Live Markets

### Basic Usage

```bash
# Run with default settings (Premier League, 5min updates)
npm run markets:live

# Run with custom sport
npm run markets:live -- --sport=soccer_spain_la_liga

# Run with custom update interval (in seconds)
npm run markets:live -- --sport=soccer_epl --interval=300
```

### Available Sports

The Odds API supports many sports. Common ones:

- `soccer_epl` - English Premier League
- `soccer_spain_la_liga` - Spanish La Liga
- `soccer_germany_bundesliga` - German Bundesliga
- `soccer_italy_serie_a` - Italian Serie A
- `soccer_uefa_champs_league` - UEFA Champions League
- `basketball_nba` - NBA
- `basketball_euroleague` - EuroLeague
- `americanfootball_nfl` - NFL
- `icehockey_nhl` - NHL

Full list: https://the-odds-api.com/sports-odds-data/sports-apis.html

### Example Output

```
╔════════════════════════════════════════════════════════════╗
║          LIVE BETTING MARKETS - REAL-TIME ANALYSIS         ║
╚════════════════════════════════════════════════════════════╝

ℹ️ [CONFIG] Sport: soccer_epl
ℹ️ [CONFIG] Regions: uk, us, eu
ℹ️ [CONFIG] Markets: h2h, totals
ℹ️ [CONFIG] Update Interval: 300s
ℹ️ [CONFIG] Alerts: Enabled

ℹ️ [FETCHING] Fetching live odds from The Odds API...
✅ [FETCHING] Found 5 live matches

────────────────────────────────────────────────────────────────────────────────
ℹ️ [MATCH] Manchester City vs Liverpool

ℹ️ [ML] Generating prediction...
   Home Win: 48.3%
   Draw:     26.7%
   Away Win: 25.0%
   Confidence: 72.5%

ℹ️ [ANALYSIS] Analyzing betting opportunities...
   Total Opportunities: 3
   Average EV: 4.2%
   Market Efficiency: 92.3%

✅ [RECOMMENDATIONS] Top recommendations:

   1. Away Win @ 4.20
      EV: 5.2% | Odds: 4.20
      Kelly Stake: 1.24%
      Risk: Medium | Rating: Good Value

   2. Over 2.5 Goals @ 1.85
      EV: 3.8% | Odds: 1.85
      Kelly Stake: 0.95%
      Risk: Low | Rating: Fair Value
```

### Monitoring and Logs

The script will:
- ✅ Fetch live odds every interval
- ✅ Generate ML predictions
- ✅ Identify value bets
- ✅ Send alerts for opportunities
- ✅ Store data in Supabase
- ✅ Track performance

Press `Ctrl+C` to stop the runner gracefully.

## Advanced Configuration

### Custom Update Intervals

Adjust based on your API quota:

- **Free tier (500 requests/month)**:
  - ~15 requests/day = 1 request every ~96 minutes
  - Recommended: `--interval=6000` (100 minutes)

- **Paid tier (10,000 requests/month)**:
  - ~300 requests/day = 1 request every ~5 minutes
  - Recommended: `--interval=300` (5 minutes)

### Running Multiple Sports

Run multiple instances for different sports:

```bash
# Terminal 1: Premier League
npm run markets:live:epl

# Terminal 2: NBA
npm run markets:live:nba

# Terminal 3: La Liga
npm run markets:live:laliga
```

### Production Deployment

For 24/7 operation:

1. **Use Process Manager** (PM2):
```bash
npm install -g pm2
pm2 start npm --name "betting-epl" -- run markets:live:epl
pm2 save
pm2 startup
```

2. **Use Docker**:
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "markets:live"]
```

3. **Use Cloud Functions** (Serverless):
   - AWS Lambda
   - Google Cloud Functions
   - Vercel Serverless Functions

## Troubleshooting

### API Key Errors

```
❌ ERROR: The Odds API key not configured!
```

**Solution**: Make sure `.env` file exists and contains valid `VITE_ODDS_API_KEY`

### Supabase Connection Errors

```
Failed to store odds snapshot: Error...
```

**Solution**:
1. Check Supabase URL and keys in `.env`
2. Verify migrations have been run
3. Check RLS policies are set up

### No Live Matches Found

```
⚠️ [FETCHING] No live matches found
```

**Reason**: No matches currently live for the selected sport/region

**Solution**:
- Try different sport
- Wait for match schedule
- Check The Odds API for available matches

### Rate Limit Exceeded

```
Odds API error: 429 Too Many Requests
```

**Solution**:
- Increase update interval
- Upgrade API plan
- Monitor API usage at https://the-odds-api.com/account/

### Email Alerts Not Working

**Solution**:
1. Verify email API endpoint is set up
2. Check SMTP credentials
3. Test with notification service:
```typescript
await notificationService.testChannels({
  email: 'your@email.com'
});
```

## Best Practices

### 1. Start Small
- Begin with demo mode
- Test with small bankroll
- Verify alerts work correctly

### 2. Monitor API Usage
- Check The Odds API dashboard regularly
- Adjust intervals to stay within quota
- Consider upgrading for production

### 3. Track Performance
- Review `daily_performance` table
- Monitor `bet_history`
- Calculate actual ROI vs predictions

### 4. Responsible Betting
- Never bet more than you can afford to lose
- Set strict stop-loss limits
- Take breaks from betting
- This is for educational purposes

### 5. Security
- Never commit `.env` file
- Use environment variables in production
- Rotate API keys regularly
- Enable Supabase RLS

## Support and Resources

- **The Odds API Docs**: https://the-odds-api.com/liveapi/guides/v4/
- **Supabase Docs**: https://supabase.com/docs
- **Project Issues**: Check GitHub issues
- **Community**: Join discussions

## Next Steps

After setup:

1. ✅ Run demo mode: `npm run betting:demo`
2. ✅ Test alerts: Use notification service test
3. ✅ Run live markets: `npm run markets:live`
4. ✅ Monitor performance: Check Supabase dashboard
5. ✅ Customize strategy: Create your own strategy
6. ✅ Scale up: Increase bankroll and volume

---

**⚠️ DISCLAIMER**: This system is for educational and research purposes only. Sports betting involves risk. Never bet more than you can afford to lose. Past performance does not guarantee future results. Always gamble responsibly.
