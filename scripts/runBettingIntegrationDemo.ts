/**
 * BETTING ANALYTICS INTEGRATION DEMO
 *
 * Comprehensive demonstration of all betting analytics features:
 * - Odds API integration
 * - Backtesting
 * - Real-time alerts
 * - CLV analysis
 * - ML-enhanced predictions
 */

import { generateMockOdds, oddsAPI, CLVCalculator } from '../src/services/oddsApiService';
import { backtesting, BacktestConfig, HistoricalMatch } from '../src/services/backtestingEngine';
import { analyzeBettingOpportunities, initializeBankroll } from '../src/services/mlBettingAnalyzer';
import { alertSystem, AlertSystem } from '../src/services/alertSystem';
import { extractBettingFeatures, detectLineShoppingOpportunities } from '../src/services/mlBettingFeatures';
import { predictHybrid } from '../src/services/mlHybridPredictor';
import { Team } from '../src/lib/supabase';

// ==================== UTILITIES ====================

function log(section: string, message: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${section}`);
  console.log(`${'='.repeat(60)}`);
  console.log(message);
}

function logJSON(obj: any) {
  console.log(JSON.stringify(obj, null, 2));
}

// ==================== DEMO ====================

async function runDemo() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   BETTING ANALYTICS INTEGRATION - COMPREHENSIVE DEMO      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Create mock teams
  const homeTeam: Team = {
    id: '1',
    name: 'Manchester City',
    league: 'Premier League',
    country: 'England',
    created_at: new Date().toISOString(),
  };

  const awayTeam: Team = {
    id: '2',
    name: 'Liverpool',
    league: 'Premier League',
    country: 'England',
    created_at: new Date().toISOString(),
  };

  // ==================== 1. ODDS API INTEGRATION ====================
  log('1. ODDS API INTEGRATION', 'Fetching live odds from multiple bookmakers...');

  const mockOdds = generateMockOdds(homeTeam.name, awayTeam.name);
  console.log(`\n📊 Live Odds for ${homeTeam.name} vs ${awayTeam.name}:`);
  console.log(`   Home Win: ${mockOdds.bestOdds.homeWin.toFixed(2)}`);
  console.log(`   Draw:     ${mockOdds.bestOdds.draw.toFixed(2)}`);
  console.log(`   Away Win: ${mockOdds.bestOdds.awayWin.toFixed(2)}`);
  console.log(`   Over 2.5: ${mockOdds.bestOdds.over25?.toFixed(2)}`);
  console.log(`\n📈 Bookmaker Comparison:`);
  mockOdds.bookmakers.forEach(bm => {
    console.log(`   ${bm.bookmaker.padEnd(15)} - Home: ${bm.markets.h2h?.home.toFixed(2)} | Draw: ${bm.markets.h2h?.draw?.toFixed(2)} | Away: ${bm.markets.h2h?.away.toFixed(2)}`);
  });

  // Line shopping
  const lineShoppingOpportunities = detectLineShoppingOpportunities(
    mockOdds.bookmakers.map(bm => ({
      bookmaker: bm.bookmaker,
      odds: {
        homeWin: bm.markets.h2h?.home || 0,
        draw: bm.markets.h2h?.draw || 0,
        awayWin: bm.markets.h2h?.away || 0,
      },
    }))
  );

  console.log(`\n💰 Line Shopping Benefit: +${lineShoppingOpportunities.improvementPercent.toFixed(2)}%`);
  console.log(`   Best Home Odds: ${lineShoppingOpportunities.bestHomeOdds.odds.toFixed(2)} (${lineShoppingOpportunities.bestHomeOdds.bookmaker})`);
  console.log(`   Best Draw Odds: ${lineShoppingOpportunities.bestDrawOdds.odds.toFixed(2)} (${lineShoppingOpportunities.bestDrawOdds.bookmaker})`);
  console.log(`   Best Away Odds: ${lineShoppingOpportunities.bestAwayOdds.odds.toFixed(2)} (${lineShoppingOpportunities.bestAwayOdds.bookmaker})`);

  // ==================== 2. ML PREDICTION WITH BETTING FEATURES ====================
  log('2. ML PREDICTION WITH BETTING FEATURES', 'Generating prediction with betting-specific features...');

  const prediction = await predictHybrid(homeTeam, awayTeam, 'Premier League');

  console.log(`\n🤖 ML Prediction:`);
  console.log(`   Home Win: ${(prediction.homeWinProb * 100).toFixed(1)}%`);
  console.log(`   Draw:     ${(prediction.drawProb * 100).toFixed(1)}%`);
  console.log(`   Away Win: ${(prediction.awayWinProb * 100).toFixed(1)}%`);
  console.log(`   Over 2.5: ${(prediction.over25Prob * 100).toFixed(1)}%`);
  console.log(`   Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);

  // Extract betting features
  const bettingFeatures = extractBettingFeatures(
    homeTeam,
    awayTeam,
    mockOdds.bestOdds,
    undefined,
    {
      home: prediction.homeWinProb,
      draw: prediction.drawProb,
      away: prediction.awayWinProb,
    }
  );

  console.log(`\n📊 Betting Features:`);
  console.log(`   Bookmaker Margin: ${bettingFeatures.bookmakMargin.toFixed(2)}%`);
  console.log(`   Market Efficiency: ${(bettingFeatures.marketEfficiency * 100).toFixed(1)}%`);
  console.log(`   Expected Value (Home): ${bettingFeatures.expectedValueHome.toFixed(2)}%`);
  console.log(`   Expected Value (Away): ${bettingFeatures.expectedValueAway.toFixed(2)}%`);
  console.log(`   Sharp Money Indicator: ${bettingFeatures.sharpMoneyIndicator.toFixed(1)}/100`);

  // ==================== 3. VALUE BET ANALYSIS ====================
  log('3. VALUE BET ANALYSIS', 'Analyzing betting opportunities...');

  const analysis = analyzeBettingOpportunities(prediction, mockOdds.bestOdds, 1000);

  console.log(`\n💎 Value Bet Analysis:`);
  console.log(`   Total Opportunities: ${analysis.totalOpportunities}`);
  console.log(`   Average EV: ${analysis.overallEV.toFixed(2)}%`);
  console.log(`   Best Market: ${analysis.bestBetType}`);
  console.log(`   Market Efficiency: ${(analysis.marketEfficiency * 100).toFixed(1)}%`);

  console.log(`\n🎯 Top Recommendations:`);
  analysis.topRecommendations.slice(0, 3).forEach((rec, idx) => {
    console.log(`\n   ${idx + 1}. ${rec.description}`);
    console.log(`      • EV: ${rec.expectedValue.toFixed(2)}% (${rec.valueRating})`);
    console.log(`      • Odds: ${rec.marketOdds.toFixed(2)}`);
    console.log(`      • Win Probability: ${(rec.winProbability * 100).toFixed(1)}%`);
    console.log(`      • Risk Level: ${rec.riskLevel}`);
    console.log(`      • Kelly Stake: ${(rec.recommendedStake.kellyFractional * 100).toFixed(2)}% of bankroll`);
  });

  if (analysis.arbitrageOpportunities.length > 0) {
    console.log(`\n🚨 ARBITRAGE OPPORTUNITY DETECTED!`);
    analysis.arbitrageOpportunities.forEach(arb => {
      console.log(`   ${arb.description}`);
      console.log(`   Guaranteed Profit: ${arb.profitPercentage.toFixed(2)}%`);
    });
  }

  // ==================== 4. ALERT SYSTEM ====================
  log('4. AUTOMATIC ALERT SYSTEM', 'Setting up real-time alerts...');

  const alerts: AlertSystem = alertSystem.create();

  // Subscribe to alerts
  alerts.subscribe(alert => {
    console.log(`\n🔔 ALERT: ${alert.title}`);
    console.log(`   ${alert.message}`);
    console.log(`   Severity: ${alert.severity.toUpperCase()}`);
  });

  // Analyze and trigger alerts
  alerts.analyzeBettingOpportunities(analysis);

  console.log(`\n📬 Total Alerts Generated: ${alerts.getAlerts().length}`);
  console.log(`   Unread: ${alerts.getAlerts({ unreadOnly: true }).length}`);

  // ==================== 5. BACKTESTING ====================
  log('5. BACKTESTING SYSTEM', 'Running backtest on historical data...');

  // Generate mock historical matches
  const historicalMatches: HistoricalMatch[] = [];
  for (let i = 0; i < 100; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (100 - i));

    const mockPrediction = await predictHybrid(homeTeam, awayTeam, 'Premier League');
    const mockHistoricalOdds = generateMockOdds(homeTeam.name, awayTeam.name);

    // Simulate actual result
    const rand = Math.random();
    let homeScore = 0;
    let awayScore = 0;

    if (rand < mockPrediction.homeWinProb) {
      homeScore = Math.floor(Math.random() * 3) + 1;
      awayScore = Math.floor(Math.random() * homeScore);
    } else if (rand < mockPrediction.homeWinProb + mockPrediction.drawProb) {
      const score = Math.floor(Math.random() * 3);
      homeScore = score;
      awayScore = score;
    } else {
      awayScore = Math.floor(Math.random() * 3) + 1;
      homeScore = Math.floor(Math.random() * awayScore);
    }

    historicalMatches.push({
      id: `match-${i}`,
      date,
      homeTeam: homeTeam.name,
      awayTeam: awayTeam.name,
      homeScore,
      awayScore,
      prediction: mockPrediction,
      odds: mockHistoricalOdds.bestOdds,
    });
  }

  // Run backtests with different strategies
  const strategies: Array<{ name: string; config: BacktestConfig }> = [
    {
      name: 'Kelly Criterion',
      config: {
        startingBankroll: 1000,
        strategy: 'KellyCriterion',
        minEV: 2,
        kellyFraction: 0.25,
        maxStake: 0.05,
      },
    },
    {
      name: 'Fixed Stake',
      config: {
        startingBankroll: 1000,
        strategy: 'FixedStake',
        minEV: 2,
        maxStake: 0.02,
      },
    },
    {
      name: 'Value Betting',
      config: {
        startingBankroll: 1000,
        strategy: 'ValueBetting',
        minEV: 5,
        maxStake: 0.05,
      },
    },
  ];

  console.log(`\n📊 Backtesting ${historicalMatches.length} matches across ${strategies.length} strategies...\n`);

  for (const strat of strategies) {
    const engine = backtesting.createEngine(strat.config);
    const result = engine.runBacktest(historicalMatches);

    console.log(`\n━━━ ${strat.name} Strategy ━━━`);
    console.log(`   Total Bets: ${result.totalBets}`);
    console.log(`   Win Rate: ${result.winRate.toFixed(1)}%`);
    console.log(`   Starting Bankroll: $${result.startingBankroll.toFixed(2)}`);
    console.log(`   Final Bankroll: $${result.finalBankroll.toFixed(2)}`);
    console.log(`   Net Profit: ${result.netProfit >= 0 ? '+' : ''}$${result.netProfit.toFixed(2)}`);
    console.log(`   ROI: ${result.roi >= 0 ? '+' : ''}${result.roi.toFixed(2)}%`);
    console.log(`   Max Drawdown: ${result.maxDrawdownPercent.toFixed(2)}%`);
    console.log(`   Sharpe Ratio: ${result.sharpeRatio.toFixed(3)}`);
    console.log(`   Longest Win Streak: ${result.longestWinStreak}`);
    console.log(`   Longest Lose Streak: ${result.longestLoseStreak}`);
  }

  // ==================== 6. CLV ANALYSIS ====================
  log('6. CLOSING LINE VALUE (CLV) ANALYSIS', 'Tracking closing line performance...');

  const clvCalculator = oddsAPI.createCLVCalculator();

  // Record odds snapshots
  const opening = generateMockOdds(homeTeam.name, awayTeam.name);
  const closing = generateMockOdds(homeTeam.name, awayTeam.name);

  clvCalculator.recordOdds(opening);
  clvCalculator.recordOdds(closing);

  // Calculate CLV for a bet placed at opening odds
  const clvHome = clvCalculator.calculateCLV(
    homeTeam.name,
    awayTeam.name,
    'h2h',
    'home',
    opening.avgOdds.homeWin
  );

  if (clvHome) {
    console.log(`\n🎯 Closing Line Value:`);
    console.log(`   Market: ${clvHome.market} - ${clvHome.outcome}`);
    console.log(`   Opening Odds: ${clvHome.openingOdds.toFixed(2)}`);
    console.log(`   Bet Odds: ${clvHome.betOdds.toFixed(2)}`);
    console.log(`   Closing Odds: ${clvHome.closingOdds.toFixed(2)}`);
    console.log(`   CLV: ${clvHome.clv >= 0 ? '+' : ''}${clvHome.clv.toFixed(2)}%`);
    console.log(`   Rating: ${clvHome.clvRating}`);

    if (clvHome.clv > 0) {
      console.log(`   ✅ You beat the closing line! This indicates sharp betting.`);
    } else {
      console.log(`   ⚠️  Negative CLV. Try to find better timing or lines.`);
    }
  }

  // ==================== 7. MONTE CARLO SIMULATION ====================
  log('7. MONTE CARLO SIMULATION', 'Running probabilistic analysis...');

  const simulator = backtesting.createSimulator();
  const monteCarloResult = simulator.runSimulation(
    historicalMatches.slice(0, 50), // Use subset for speed
    {
      startingBankroll: 1000,
      strategy: 'KellyCriterion',
      minEV: 3,
      kellyFraction: 0.25,
    },
    100 // simulations
  );

  console.log(`\n🎲 Monte Carlo Simulation (100 runs):`);
  console.log(`   Mean ROI: ${monteCarloResult.statistics.meanROI.toFixed(2)}%`);
  console.log(`   Median ROI: ${monteCarloResult.statistics.medianROI.toFixed(2)}%`);
  console.log(`   Best Case: +${monteCarloResult.statistics.bestCase.toFixed(2)}%`);
  console.log(`   Worst Case: ${monteCarloResult.statistics.worstCase.toFixed(2)}%`);
  console.log(`   25th Percentile: ${monteCarloResult.statistics.percentile25.toFixed(2)}%`);
  console.log(`   75th Percentile: ${monteCarloResult.statistics.percentile75.toFixed(2)}%`);
  console.log(`   Probability of Profit: ${monteCarloResult.statistics.probabilityOfProfit.toFixed(1)}%`);
  console.log(`   Probability of Ruin: ${monteCarloResult.statistics.probabilityOfRuin.toFixed(1)}%`);

  // ==================== SUMMARY ====================
  log('📈 SUMMARY', 'Betting Analytics Integration Demo Complete!');

  console.log(`
✅ Demonstrated Features:
   1. ✓ Odds API Integration (mock data)
   2. ✓ Line Shopping Optimization
   3. ✓ ML Predictions with Betting Features
   4. ✓ Value Bet Detection & Analysis
   5. ✓ Automatic Alert System
   6. ✓ Backtesting Engine
   7. ✓ Multiple Betting Strategies
   8. ✓ Closing Line Value (CLV) Analysis
   9. ✓ Monte Carlo Simulation
   10. ✓ Risk Management Metrics

📊 Key Metrics from Demo:
   • Best Strategy: ${strategies[0].name}
   • Average CLV: ${clvHome ? clvHome.clv.toFixed(2) + '%' : 'N/A'}
   • Monte Carlo Mean ROI: ${monteCarloResult.statistics.meanROI.toFixed(2)}%
   • Line Shopping Benefit: +${lineShoppingOpportunities.improvementPercent.toFixed(2)}%

🚀 Next Steps:
   1. Configure real Odds API key in oddsApiService.ts
   2. Connect to Supabase for historical data storage
   3. Set up webhook/email alerts
   4. Customize betting strategies
   5. Run on live markets!

⚠️  Disclaimer: This is for educational purposes only.
   Never bet more than you can afford to lose.
  `);

  console.log('\n' + '='.repeat(60) + '\n');
}

// Run demo
runDemo().catch(console.error);
