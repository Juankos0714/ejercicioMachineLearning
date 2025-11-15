# Football Betting Analysis System

## 📊 Overview

A comprehensive betting analysis system that combines mathematical models, machine learning predictions, and advanced betting strategies to identify value betting opportunities and optimize stake sizing for football matches.

## 🎯 Features

### Core Analysis
- **Expected Value (EV) Calculation**: Identify bets where model probability exceeds market-implied probability
- **Kelly Criterion**: Optimal stake sizing for long-term bankroll growth
- **Value Betting**: Systematic approach to finding +EV opportunities
- **Arbitrage Detection**: Identify risk-free betting opportunities
- **Risk Assessment**: Multi-factor risk evaluation for each bet
- **Market Efficiency Analysis**: Evaluate bookmaker margins and market pricing

### Betting Strategies
1. **Value Betting**: Bet when EV > 0
2. **Kelly Criterion**: Optimal stake based on edge and odds
3. **Fixed Stake**: Conservative fixed percentage approach
4. **Fractional Kelly**: Reduced variance version of Kelly (safer)
5. **Arbitrage Betting**: Risk-free profit opportunities
6. **Hedge Betting**: Risk management across multiple positions

### Bankroll Management
- Track performance metrics (ROI, win rate, drawdown)
- Stake recommendations based on bankroll size
- Risk tolerance assessment
- Win/loss streak tracking
- Maximum drawdown monitoring
- Suggested bet limits

### Supported Markets
- **1X2 (Match Result)**: Home/Draw/Away
- **Over/Under Goals**: 0.5, 1.5, 2.5, 3.5 goals
- **Both Teams to Score (BTTS)**: Yes/No
- **Double Chance**: HomeOrDraw, DrawOrAway, HomeOrAway
- **Asian Handicap**: Various handicap lines
- **Correct Score**: Exact score predictions

## 📐 Mathematical Foundation

### Expected Value (EV)

Expected Value represents the average profit/loss per bet over the long run:

```
EV = (Model_Probability × Decimal_Odds) - 1
```

**Example:**
- Model predicts 30% chance of home win
- Bookmaker offers 3.50 odds (28.6% implied probability)
- EV = (0.30 × 3.50) - 1 = 0.05 = **5% positive EV**

**Interpretation:**
- **EV > 0**: Value bet (model sees better odds than bookmaker)
- **EV = 0**: Fair bet (no edge)
- **EV < 0**: Negative value (bookmaker has edge)

### Kelly Criterion

Optimal stake size for maximizing long-term logarithmic growth:

```
Kelly % = (b × p - q) / b

where:
  b = decimal odds - 1 (net odds)
  p = probability of winning
  q = probability of losing (1 - p)
```

**Example:**
- Probability: 35%
- Odds: 3.00
- b = 3.00 - 1 = 2.00
- Kelly = (2.00 × 0.35 - 0.65) / 2.00 = 0.025 = **2.5% of bankroll**

**Fractional Kelly:**
- Full Kelly can be aggressive and volatile
- **Quarter Kelly** (0.25x): Stake 1/4 of Kelly, much safer
- **Half Kelly** (0.5x): Stake 1/2 of Kelly, balanced approach

### Bookmaker Margin (Overround)

The bookmaker's profit margin built into odds:

```
Margin = (Sum of Implied Probabilities) - 1
```

**Example:**
- Home: 2.50 (40%), Draw: 3.50 (28.6%), Away: 3.00 (33.3%)
- Total: 101.9%
- Margin: **1.9%**

**Typical Margins:**
- Premier League: 5-7%
- Lower leagues: 7-10%
- Asian handicap: 2-4%
- Parlay/accumulator: 10-20%+

### Arbitrage Betting

Risk-free profit when sum of inverse odds < 1:

```
Arbitrage exists if: (1/odds1) + (1/odds2) + ... < 1
```

**Example:**
- Bookmaker A: Home 3.10, Draw 3.10, Away 3.20
- Total: 1/3.10 + 1/3.10 + 1/3.20 = 0.968 < 1
- **Arbitrage opportunity with 3.2% profit**

**Optimal Stakes:**
```
Stake_i = (1/odds_i) / Total_Inverse_Odds
```

## 🔧 Usage

### Basic Usage

```typescript
import { analyzeBettingOpportunities } from './services/mlBettingAnalyzer';
import type { MarketOdds } from './services/mlBettingAnalyzer';

// Your prediction from the ML model
const prediction: HybridPrediction = {
  homeWinProb: 0.35,
  drawProb: 0.28,
  awayWinProb: 0.37,
  over25Prob: 0.62,
  // ... other fields
};

// Market odds from bookmakers
const marketOdds: MarketOdds = {
  homeWin: 3.20,
  draw: 3.40,
  awayWin: 2.50,
  over25: 1.75,
  under25: 2.10,
};

// Analyze betting opportunities
const analysis = analyzeBettingOpportunities(prediction, marketOdds, 1000);

// Access recommendations
console.log('Top value bets:', analysis.topRecommendations);
console.log('Overall EV:', analysis.overallEV);
console.log('Arbitrage opportunities:', analysis.arbitrageOpportunities);
```

### Using the React Component

```tsx
import { BettingAnalysisPanel } from './components/BettingAnalysisPanel';

function MatchPrediction() {
  const prediction = usePrediction(); // Your prediction
  const marketOdds = useMarketOdds(); // Fetch from bookmaker API

  return (
    <div>
      {/* Your prediction display */}

      <BettingAnalysisPanel
        prediction={prediction}
        marketOdds={marketOdds}
        defaultBankroll={1000}
        showAdvanced={true}
      />
    </div>
  );
}
```

### Running the Demo

```bash
# Install dependencies
npm install

# Run comprehensive betting analysis demo
npx tsx scripts/runBettingAnalysisDemo.ts
```

The demo includes:
- Basic concept explanations
- Match-by-match analysis
- Strategy comparisons
- Portfolio simulations

### Running Tests

```bash
# Run all betting analyzer tests
npm test mlBettingAnalyzer.test.ts

# Run in watch mode
npm test -- --watch mlBettingAnalyzer.test.ts
```

## 📊 Bet Recommendation Structure

Each bet recommendation includes:

```typescript
interface BetRecommendation {
  // Bet details
  betType: '1X2' | 'OverUnder' | 'BTTS' | ...;
  outcome: string;
  description: string;

  // Value analysis
  marketOdds: number;
  impliedProb: number;
  modelProb: number;
  expectedValue: number;        // EV as percentage
  valueRating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Negative';

  // Risk assessment
  confidence: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  variance: number;

  // Stake recommendations
  recommendedStake: {
    kelly: number;              // Full Kelly
    kellyFractional: number;    // 1/4 Kelly (recommended)
    fixedPercentage: number;    // Fixed % strategy
    fixedAmount?: number;       // Dollar amount
  };

  // Flags
  isValueBet: boolean;          // EV > 0
  isStrongValue: boolean;       // EV > 5%
}
```

## 🎓 Betting Strategies Explained

### 1. Value Betting

**Concept:** Only bet when you have an edge (EV > 0)

**How it works:**
1. Calculate model probability
2. Compare to bookmaker implied probability
3. Bet when model prob > implied prob

**Pros:**
- Mathematical edge over long term
- Systematic approach
- Works across all sports/markets

**Cons:**
- Requires accurate model
- Variance can be high
- Bookmakers may limit winners

**Recommended for:** Experienced bettors with proven models

### 2. Kelly Criterion

**Concept:** Optimal stake to maximize long-term growth

**How it works:**
1. Calculate edge and odds
2. Apply Kelly formula
3. Stake the calculated percentage

**Pros:**
- Mathematically optimal
- Maximizes long-term growth
- Adapts to bankroll size

**Cons:**
- Can be aggressive (high variance)
- Assumes accurate probabilities
- Can lead to large stakes

**Recommended for:** Confident bettors with large bankrolls

**Best Practice:** Use **Fractional Kelly** (1/4 or 1/2) for safety

### 3. Fixed Stake

**Concept:** Bet a fixed percentage regardless of odds/edge

**How it works:**
1. Choose percentage (typically 1-2%)
2. Stake same % on every bet
3. Simple and consistent

**Pros:**
- Very simple
- Low variance
- Good for beginners
- Protects bankroll

**Cons:**
- Not optimal (leaves money on table)
- Doesn't account for edge size
- Slower growth than Kelly

**Recommended for:** Beginners and conservative bettors

### 4. Arbitrage Betting

**Concept:** Guarantee profit by betting all outcomes

**How it works:**
1. Find odds where total inverse < 1
2. Calculate optimal stakes for each outcome
3. Place all bets simultaneously

**Pros:**
- Risk-free profit
- No prediction needed
- Guaranteed return

**Cons:**
- Opportunities rare
- Small profit margins
- Requires multiple accounts
- Bookmakers may limit arbitrage bettors
- Need fast execution

**Recommended for:** Experienced bettors with multiple accounts

## 📈 Performance Metrics

### Win Rate
Percentage of bets won
```
Win Rate = (Bets Won / Total Bets) × 100%
```

**Note:** Win rate alone is meaningless without considering odds. A 40% win rate at 3.00 average odds is profitable.

### ROI (Return on Investment)
Overall profit as percentage of total staked
```
ROI = (Total Returns - Total Staked) / Total Staked × 100%
```

**Benchmarks:**
- 3-5% ROI: Good
- 5-10% ROI: Very good
- 10%+ ROI: Excellent (if sustained)

### Yield
Average profit per bet
```
Yield = Net Profit / Total Staked × 100%
```

### Sharpe Ratio
Risk-adjusted return
```
Sharpe Ratio = (Average Return - Risk-Free Rate) / Standard Deviation
```

**Interpretation:**
- < 1: Poor risk-adjusted return
- 1-2: Good
- 2+: Excellent

### Maximum Drawdown
Largest peak-to-trough decline
```
Max Drawdown = (Peak - Trough) / Peak × 100%
```

**Important:** Prepare for 30-50% drawdowns even with positive EV

## ⚠️ Risk Management

### Bankroll Requirements

**Minimum Bankroll:** 20-50x your average bet size

**Example:**
- Average bet: $20
- Minimum bankroll: $400-$1000
- Recommended: $1000-$2000

### Stake Limits

**Conservative:**
- Maximum 1-2% per bet
- Never more than 5% on any bet
- Reduce stakes during losing streaks

**Moderate:**
- Maximum 2-5% per bet
- Use fractional Kelly
- Strict bankroll tracking

**Aggressive:**
- Maximum 5-10% per bet
- Full Kelly (not recommended)
- High variance tolerance

### Stop-Loss Rules

1. **Daily Limit:** Stop if down 10% in a day
2. **Weekly Limit:** Stop if down 20% in a week
3. **Drawdown Limit:** Reduce stakes if down 30% from peak
4. **Losing Streak:** Take a break after 5+ consecutive losses

### Red Flags

🚩 **Avoid these situations:**
- Chasing losses with bigger bets
- Betting without analyzing value
- Betting more than you can afford to lose
- Ignoring bankroll limits
- Emotional betting
- Betting on every match

## 🎯 Finding Value Bets

### Where to Look

1. **Lesser-known leagues:**
   - Bookmakers less informed
   - Wider margins for error
   - More inefficiencies

2. **Asian handicap markets:**
   - Lower margins (2-4%)
   - More efficient pricing
   - Better value for sharp bettors

3. **In-play (live) betting:**
   - Rapidly changing odds
   - Bookmaker slower to react
   - Requires quick analysis

4. **Specific markets:**
   - Over/Under goals
   - Both teams to score
   - Corners/cards (less liquid)

### Signs of Value

✅ **Good indicators:**
- Model probability 5%+ higher than implied
- Low bookmaker margin on the market
- Odds drifting in your direction
- Multiple bookmakers offering similar value

❌ **Warning signs:**
- Odds shortening quickly
- Very low liquidity
- Suspiciously good odds (potential trap)
- Bookmaker limiting your stakes

## 🔬 Advanced Concepts

### Closing Line Value (CLV)

Comparing your bet odds to final closing odds:
- If you beat closing odds, you found value
- Consistently beating closing line = sharp bettor
- Track CLV as performance indicator

### Expected Growth Rate

Kelly's expected growth per bet:
```
g = p × ln(1 + b×f) + q × ln(1 - f)

where:
  f = Kelly fraction
  p = win probability
  q = loss probability
  b = net odds
```

### Correlation

Account for correlated bets:
- Home win + Over 2.5 (positive correlation)
- Home win + Away win (perfect negative correlation)
- Reduce stakes on correlated parlays

### Market Timing

Odds movement patterns:
- **Opening odds:** Less sharp, potential value
- **Steam moves:** Sharp money moving odds
- **Closing odds:** Most efficient pricing

## 📱 Integration with Bookmaker APIs

### Recommended APIs

1. **Odds-API.com**
   - Multiple bookmakers
   - Real-time odds
   - Historical data

2. **The-Odds-API**
   - Free tier available
   - Good coverage
   - Easy integration

3. **BetFair API**
   - Exchange odds
   - No bookmaker margin
   - Requires account

### Example Integration

```typescript
async function fetchMarketOdds(matchId: string): Promise<MarketOdds> {
  const response = await fetch(
    `https://api.the-odds-api.com/v4/sports/soccer_epl/odds/?apiKey=${API_KEY}&regions=uk&markets=h2h,totals`
  );

  const data = await response.json();

  // Transform to MarketOdds format
  return {
    homeWin: data.bookmakers[0].markets[0].outcomes[0].price,
    draw: data.bookmakers[0].markets[0].outcomes[1].price,
    awayWin: data.bookmakers[0].markets[0].outcomes[2].price,
    // ... other markets
  };
}
```

## 📊 Backtesting

### How to Backtest

1. **Data Collection:**
   - Historical predictions
   - Historical odds
   - Actual results

2. **Simulation:**
   - Apply strategy to historical data
   - Track hypothetical bankroll
   - Record all metrics

3. **Analysis:**
   - Calculate ROI, Sharpe ratio
   - Check for overfitting
   - Validate assumptions

### Example Backtest

```typescript
function backtest(
  predictions: Prediction[],
  odds: MarketOdds[],
  results: Result[],
  strategy: BettingStrategy,
  startingBankroll: number
): BacktestResult {
  let bankroll = initializeBankroll(startingBankroll);

  for (let i = 0; i < predictions.length; i++) {
    const analysis = analyzeBettingOpportunities(
      predictions[i],
      odds[i],
      bankroll.currentBankroll
    );

    // Apply strategy and simulate
    // ...
  }

  return {
    finalBankroll: bankroll.currentBankroll,
    roi: bankroll.roi,
    // ... other metrics
  };
}
```

## 🎓 Learning Resources

### Books
- "Trading and Exchanges" - Larry Harris
- "Fortune's Formula" - William Poundstone (Kelly Criterion)
- "Thinking, Fast and Slow" - Daniel Kahneman (Behavioral biases)

### Websites
- Pinnacle Sports Blog (excellent educational content)
- SmartSportsbetting.com
- Betting Resources on GitHub

### Key Skills
1. Probability and statistics
2. Bankroll management
3. Emotional control
4. Data analysis
5. Market understanding

## ⚠️ Legal and Ethical Considerations

### Responsible Gambling

- **Never bet more than you can afford to lose**
- Set strict limits and stick to them
- Take regular breaks
- Seek help if gambling becomes a problem

### Problem Gambling Resources
- National Council on Problem Gambling: 1-800-522-4700
- GamCare (UK): 0808 8020 133
- Gambling Therapy: www.gamblingtherapy.org

### Legal Status

- Check local laws before betting
- Online betting illegal in some jurisdictions
- Tax implications vary by country
- Keep records for tax purposes

## 🔐 Disclaimer

**THIS SYSTEM IS FOR EDUCATIONAL AND ANALYTICAL PURPOSES ONLY**

- Betting involves risk of monetary loss
- Past performance does not guarantee future results
- No system can guarantee profits
- Model predictions are estimates with inherent uncertainty
- Always gamble responsibly
- Seek professional help for gambling addiction

The authors and maintainers of this software assume no liability for any losses incurred through the use of this system.

## 📧 Support

For questions, issues, or contributions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: See README.md
- Email: support@example.com

## 📝 License

MIT License - See LICENSE file for details

---

**Remember: The house always has an edge in the long run. This tool helps you find situations where you have an edge, but variance is always present. Bet responsibly and never risk money you can't afford to lose.**
