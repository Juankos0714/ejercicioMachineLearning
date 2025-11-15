/**
 * BETTING ANALYSIS SYSTEM - COMPREHENSIVE DEMO
 *
 * This script demonstrates the complete betting analysis functionality including:
 * - Expected Value (EV) calculations
 * - Kelly Criterion stake sizing
 * - Multiple betting strategies
 * - Bankroll management
 * - Risk assessment
 * - Arbitrage detection
 * - Historical performance tracking
 * - Portfolio simulation
 *
 * Run with: npx tsx scripts/runBettingAnalysisDemo.ts
 */

import { Team } from '../src/lib/supabase';
import type { HybridPrediction } from '../src/services/mlHybridPredictor';
import {
  analyzeBettingOpportunities,
  initializeBankroll,
  simulateBet,
  detectArbitrage,
  calculateKellyCriterion,
  calculateExpectedValue,
  calculateBookmakerMargin,
  type MarketOdds,
  type BankrollManager,
  type BetRecommendation,
} from '../src/services/mlBettingAnalyzer';

// ==================== DEMO DATA ====================

// Sample teams
const teams = {
  manUnited: {
    id: '1',
    name: 'Manchester United',
    league: 'Premier League',
    elo_rating: 1900,
    avg_goals_scored: 1.8,
    avg_goals_conceded: 1.2,
    xg_per_match: 1.9,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  } as Team,

  realMadrid: {
    id: '2',
    name: 'Real Madrid',
    league: 'La Liga',
    elo_rating: 2120,
    avg_goals_scored: 2.6,
    avg_goals_conceded: 0.8,
    xg_per_match: 2.8,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  } as Team,

  barcelona: {
    id: '3',
    name: 'Barcelona',
    league: 'La Liga',
    elo_rating: 2080,
    avg_goals_scored: 2.4,
    avg_goals_conceded: 0.9,
    xg_per_match: 2.6,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  } as Team,

  burnley: {
    id: '4',
    name: 'Burnley',
    league: 'Premier League',
    elo_rating: 1650,
    avg_goals_scored: 1.0,
    avg_goals_conceded: 1.8,
    xg_per_match: 1.1,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  } as Team,
};

// Sample matches with predictions and odds
const matches = [
  {
    name: 'Man United vs Real Madrid (UEFA Champions League)',
    prediction: {
      homeWinProb: 0.28,
      drawProb: 0.24,
      awayWinProb: 0.48,
      expectedHomeScore: 1.5,
      expectedAwayScore: 2.2,
      over25Prob: 0.68,
      mathematical: {
        poisson: { homeWin: 0.27, draw: 0.25, awayWin: 0.48, scoreMatrix: [] },
        monteCarlo: {
          homeWinProb: 0.29,
          drawProb: 0.23,
          awayWinProb: 0.48,
          over25Prob: 0.70,
          mostLikelyScore: { home: 1, away: 2, probability: 0.14 },
          scoreDistribution: [],
        },
        lambdaHome: 1.5,
        lambdaAway: 2.2,
      },
      confidence: 0.82,
      method: 'hybrid' as const,
      featureLevel: 'advanced' as const,
      featureCount: 45,
      homeTeam: teams.manUnited,
      awayTeam: teams.realMadrid,
    } as HybridPrediction,
    marketOdds: {
      homeWin: 3.75,    // Implied: 26.7% | Model: 28% | EV: +4.9%
      draw: 3.50,       // Implied: 28.6% | Model: 24% | EV: -16%
      awayWin: 2.00,    // Implied: 50.0% | Model: 48% | EV: -4%
      over25: 1.75,     // Implied: 57.1% | Model: 68% | EV: +19.0%
      under25: 2.10,    // Implied: 47.6% | Model: 32% | EV: -32.8%
      homeOrDraw: 1.75,
      drawOrAway: 1.30,
      homeOrAway: 1.25,
    } as MarketOdds,
  },
  {
    name: 'Barcelona vs Real Madrid (El Clásico)',
    prediction: {
      homeWinProb: 0.42,
      drawProb: 0.28,
      awayWinProb: 0.30,
      expectedHomeScore: 1.9,
      expectedAwayScore: 1.5,
      over25Prob: 0.58,
      mathematical: {
        poisson: { homeWin: 0.41, draw: 0.29, awayWin: 0.30, scoreMatrix: [] },
        monteCarlo: {
          homeWinProb: 0.43,
          drawProb: 0.27,
          awayWinProb: 0.30,
          over25Prob: 0.60,
          mostLikelyScore: { home: 2, away: 1, probability: 0.16 },
          scoreDistribution: [],
        },
        lambdaHome: 1.9,
        lambdaAway: 1.5,
      },
      confidence: 0.78,
      method: 'hybrid' as const,
      featureLevel: 'advanced' as const,
      featureCount: 45,
      homeTeam: teams.barcelona,
      awayTeam: teams.realMadrid,
    } as HybridPrediction,
    marketOdds: {
      homeWin: 2.60,    // Implied: 38.5% | Model: 42% | EV: +9.2%
      draw: 3.30,       // Implied: 30.3% | Model: 28% | EV: -7.6%
      awayWin: 2.90,    // Implied: 34.5% | Model: 30% | EV: -13%
      over25: 1.85,     // Implied: 54.1% | Model: 58% | EV: +7.3%
      under25: 2.00,    // Implied: 50.0% | Model: 42% | EV: -16%
      homeOrDraw: 1.45,
      drawOrAway: 1.55,
      homeOrAway: 1.35,
    } as MarketOdds,
  },
  {
    name: 'Man United vs Burnley (Premier League)',
    prediction: {
      homeWinProb: 0.72,
      drawProb: 0.18,
      awayWinProb: 0.10,
      expectedHomeScore: 2.5,
      expectedAwayScore: 0.9,
      over25Prob: 0.55,
      mathematical: {
        poisson: { homeWin: 0.71, draw: 0.19, awayWin: 0.10, scoreMatrix: [] },
        monteCarlo: {
          homeWinProb: 0.73,
          drawProb: 0.17,
          awayWinProb: 0.10,
          over25Prob: 0.57,
          mostLikelyScore: { home: 2, away: 0, probability: 0.18 },
          scoreDistribution: [],
        },
        lambdaHome: 2.5,
        lambdaAway: 0.9,
      },
      confidence: 0.85,
      method: 'hybrid' as const,
      featureLevel: 'advanced' as const,
      featureCount: 45,
      homeTeam: teams.manUnited,
      awayTeam: teams.burnley,
    } as HybridPrediction,
    marketOdds: {
      homeWin: 1.30,    // Implied: 76.9% | Model: 72% | EV: -6.4%
      draw: 5.50,       // Implied: 18.2% | Model: 18% | EV: -1.1%
      awayWin: 11.00,   // Implied: 9.1%  | Model: 10% | EV: +10%
      over25: 1.70,     // Implied: 58.8% | Model: 55% | EV: -6.5%
      under25: 2.20,    // Implied: 45.5% | Model: 45% | EV: -1.1%
      homeOrDraw: 1.12,
      drawOrAway: 3.50,
      homeOrAway: 1.08,
    } as MarketOdds,
  },
];

// ==================== HELPER FUNCTIONS ====================

function printSeparator(char: string = '=', length: number = 80) {
  console.log(char.repeat(length));
}

function printHeader(title: string) {
  printSeparator('=');
  console.log(`  ${title}`);
  printSeparator('=');
  console.log();
}

function printSection(title: string) {
  console.log();
  printSeparator('-');
  console.log(`  ${title}`);
  printSeparator('-');
}

function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

function formatCurrency(value: number, decimals: number = 2): string {
  return `$${value.toFixed(decimals)}`;
}

function formatOdds(odds: number, decimals: number = 2): string {
  return odds.toFixed(decimals);
}

function getValueColor(ev: number): string {
  if (ev >= 10) return '🟢 EXCELLENT';
  if (ev >= 5) return '🟡 GOOD';
  if (ev >= 2) return '🟠 FAIR';
  if (ev >= 0) return '⚪ POOR';
  return '🔴 NEGATIVE';
}

// ==================== DEMO FUNCTIONS ====================

function demonstrateBasicConcepts() {
  printHeader('BETTING ANALYSIS - BASIC CONCEPTS');

  console.log('1. ODDS AND PROBABILITY CONVERSION');
  console.log('   --------------------------------');
  const exampleOdds = [1.50, 2.00, 3.00, 5.00, 10.00];
  console.log('   Decimal Odds → Implied Probability');
  exampleOdds.forEach(odds => {
    const impliedProb = (1 / odds) * 100;
    console.log(`   ${formatOdds(odds)} → ${formatPercent(impliedProb)}`);
  });

  console.log('\n2. EXPECTED VALUE (EV) CALCULATION');
  console.log('   ---------------------------------');
  console.log('   Formula: EV = (Model Probability × Odds) - 1');
  console.log('   Example: Model says 35% chance, Bookmaker offers 3.00 odds');
  const ev = calculateExpectedValue(0.35, 3.00);
  console.log(`   EV = (0.35 × 3.00) - 1 = ${(ev / 100).toFixed(3)} = ${formatPercent(ev)}`);
  console.log(`   Interpretation: ${ev > 0 ? 'POSITIVE EV - Value bet!' : 'NEGATIVE EV - Avoid'}`);

  console.log('\n3. KELLY CRITERION STAKE SIZING');
  console.log('   ------------------------------');
  console.log('   Formula: Kelly % = (bp - q) / b');
  console.log('   where b = odds - 1, p = win probability, q = 1 - p');
  console.log('   Example: 35% win probability, 3.00 odds');
  const kelly = calculateKellyCriterion(0.35, 3.00);
  const kellyFractional = calculateKellyCriterion(0.35, 3.00, true, 0.25);
  console.log(`   Full Kelly: ${formatPercent(kelly * 100)} of bankroll`);
  console.log(`   Quarter Kelly (safer): ${formatPercent(kellyFractional * 100)} of bankroll`);

  console.log('\n4. BOOKMAKER MARGIN (OVERROUND)');
  console.log('   ------------------------------');
  console.log('   Fair odds (no margin): probabilities sum to 100%');
  console.log('   Bookmaker odds: probabilities sum to > 100%');
  const fairOdds = [2.50, 3.50, 3.00];
  const margin = calculateBookmakerMargin(fairOdds);
  console.log(`   Example odds: ${fairOdds.map(o => formatOdds(o)).join(', ')}`);
  console.log(`   Total implied probability: ${formatPercent(fairOdds.reduce((sum, o) => sum + (1 / o) * 100, 0))}`);
  console.log(`   Bookmaker margin: ${formatPercent(margin)}`);

  console.log('\n5. ARBITRAGE BETTING');
  console.log('   ------------------');
  console.log('   Occurs when sum of (1/odds) < 1 across all outcomes');
  const arbOdds = [3.10, 3.10, 3.20];
  const arbResult = detectArbitrage(arbOdds);
  console.log(`   Example odds: ${arbOdds.map(o => formatOdds(o)).join(', ')}`);
  console.log(`   Is arbitrage? ${arbResult.isArbitrage ? 'YES ✓' : 'NO ✗'}`);
  if (arbResult.isArbitrage) {
    console.log(`   Guaranteed profit: ${formatPercent(arbResult.profitPercentage)}`);
    console.log(`   Optimal stakes: ${arbResult.stakes.map(s => formatPercent(s * 100)).join(', ')}`);
  }
}

function analyzeMatch(matchData: typeof matches[0], bankroll: number) {
  const { name, prediction, marketOdds } = matchData;

  printSection(`MATCH ANALYSIS: ${name}`);

  console.log('\n📊 MODEL PREDICTION:');
  console.log(`   ${prediction.homeTeam.name}: ${formatPercent(prediction.homeWinProb * 100)}`);
  console.log(`   Draw: ${formatPercent(prediction.drawProb * 100)}`);
  console.log(`   ${prediction.awayTeam.name}: ${formatPercent(prediction.awayWinProb * 100)}`);
  console.log(`   Expected Score: ${prediction.expectedHomeScore.toFixed(2)} - ${prediction.expectedAwayScore.toFixed(2)}`);
  console.log(`   Over 2.5 Goals: ${formatPercent(prediction.over25Prob * 100)}`);
  console.log(`   Model Confidence: ${formatPercent(prediction.confidence * 100)}`);

  console.log('\n💰 MARKET ODDS:');
  console.log(`   ${prediction.homeTeam.name}: ${formatOdds(marketOdds.homeWin)} (implied: ${formatPercent((1 / marketOdds.homeWin) * 100)})`);
  console.log(`   Draw: ${formatOdds(marketOdds.draw)} (implied: ${formatPercent((1 / marketOdds.draw) * 100)})`);
  console.log(`   ${prediction.awayTeam.name}: ${formatOdds(marketOdds.awayWin)} (implied: ${formatPercent((1 / marketOdds.awayWin) * 100)})`);
  console.log(`   Over 2.5: ${formatOdds(marketOdds.over25!)} (implied: ${formatPercent((1 / marketOdds.over25!) * 100)})`);

  const margin = calculateBookmakerMargin([marketOdds.homeWin, marketOdds.draw, marketOdds.awayWin]);
  console.log(`\n   Bookmaker Margin: ${formatPercent(margin)}`);

  const analysis = analyzeBettingOpportunities(prediction, marketOdds, bankroll);

  console.log('\n🎯 VALUE BETS IDENTIFIED:');
  if (analysis.topRecommendations.length === 0) {
    console.log('   ⚠️  No positive EV opportunities found');
  } else {
    analysis.topRecommendations.forEach((bet, index) => {
      console.log(`\n   ${index + 1}. ${bet.description}`);
      console.log(`      Market Odds: ${formatOdds(bet.marketOdds)}`);
      console.log(`      Model Probability: ${formatPercent(bet.modelProb * 100)}`);
      console.log(`      Expected Value: ${formatPercent(bet.expectedValue)} ${getValueColor(bet.expectedValue)}`);
      console.log(`      Value Rating: ${bet.valueRating}`);
      console.log(`      Risk Level: ${bet.riskLevel}`);
      console.log(`      Win Probability: ${formatPercent(bet.winProbability * 100)}`);
      console.log(`\n      💡 STAKE RECOMMENDATIONS (Bankroll: ${formatCurrency(bankroll)}):`);
      console.log(`         Full Kelly: ${formatPercent(bet.recommendedStake.kelly * 100)} (${formatCurrency(bet.recommendedStake.kelly * bankroll)})`);
      console.log(`         Quarter Kelly: ${formatPercent(bet.recommendedStake.kellyFractional * 100)} (${formatCurrency(bet.recommendedStake.kellyFractional * bankroll)})`);
      console.log(`         Fixed 1-2%: ${formatPercent(bet.recommendedStake.fixedPercentage)} (${formatCurrency(bet.recommendedStake.fixedAmount!)})`);
    });
  }

  if (analysis.arbitrageOpportunities.length > 0) {
    console.log('\n🚨 ARBITRAGE OPPORTUNITIES:');
    analysis.arbitrageOpportunities.forEach((arb, index) => {
      console.log(`\n   ${index + 1}. ${arb.description}`);
      console.log(`      Guaranteed Profit: ${formatPercent(arb.profitPercentage)}`);
      console.log(`      Stakes:`);
      arb.markets.forEach(market => {
        console.log(`         ${market.outcome}: ${formatCurrency(market.stake)} @ ${formatOdds(market.odds)}`);
      });
    });
  }

  console.log('\n📈 STRATEGY RECOMMENDATIONS:');
  analysis.strategyAdvice.forEach(advice => {
    console.log(`\n   ${advice.strategy}:`);
    console.log(`      Recommended: ${advice.recommended ? '✓ YES' : '✗ NO'}`);
    console.log(`      ${advice.reasoning}`);
    console.log(`      Expected Return: ${formatPercent(advice.expectedReturn)}`);
    console.log(`      Risk Level: ${advice.riskLevel}`);
    console.log(`      Min Bankroll: ${formatCurrency(advice.bankrollRequirement)}`);
  });

  if (analysis.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    analysis.warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
  }

  console.log('\n📊 ANALYSIS SUMMARY:');
  console.log(`   Overall EV: ${formatPercent(analysis.overallEV)}`);
  console.log(`   Value Opportunities: ${analysis.totalOpportunities}`);
  console.log(`   Best Market: ${analysis.bestBetType}`);
  console.log(`   Market Efficiency: ${formatPercent(analysis.marketEfficiency * 100)}`);

  return analysis;
}

function simulateBettingStrategy(
  strategy: 'ValueBetting' | 'KellyCriterion' | 'FixedStake',
  numBets: number,
  startingBankroll: number
) {
  printSection(`STRATEGY SIMULATION: ${strategy}`);

  let bankroll = initializeBankroll(startingBankroll);
  const betHistory: Array<{
    match: string;
    bet: string;
    stake: number;
    result: 'won' | 'lost';
    profit: number;
    bankroll: number;
  }> = [];

  console.log(`\n💰 Starting Bankroll: ${formatCurrency(startingBankroll)}`);
  console.log(`📊 Strategy: ${strategy}`);
  console.log(`🎲 Simulating ${numBets} bets...\n`);

  for (let i = 0; i < numBets; i++) {
    // Randomly select a match
    const matchIndex = Math.floor(Math.random() * matches.length);
    const match = matches[matchIndex];

    // Analyze the match
    const analysis = analyzeBettingOpportunities(
      match.prediction,
      match.marketOdds,
      bankroll.currentBankroll
    );

    // Select best value bet
    if (analysis.topRecommendations.length === 0) continue;

    const bet = analysis.topRecommendations[0];

    // Determine stake based on strategy
    let stake: number;
    switch (strategy) {
      case 'ValueBetting':
        stake = bet.isStrongValue
          ? bankroll.currentBankroll * 0.02
          : bankroll.currentBankroll * 0.01;
        break;
      case 'KellyCriterion':
        stake = bet.recommendedStake.kellyFractional * bankroll.currentBankroll;
        break;
      case 'FixedStake':
        stake = bankroll.currentBankroll * 0.02; // Fixed 2%
        break;
    }

    // Cap stake at 5% of bankroll for safety
    stake = Math.min(stake, bankroll.currentBankroll * 0.05);

    // Skip if stake is too small
    if (stake < 1) continue;

    const previousBankroll = bankroll.currentBankroll;

    // Simulate the bet
    bankroll = simulateBet(bet, stake, bankroll);

    const won = bankroll.currentBankroll > previousBankroll;
    const profit = bankroll.currentBankroll - previousBankroll;

    betHistory.push({
      match: match.name,
      bet: bet.description,
      stake,
      result: won ? 'won' : 'lost',
      profit,
      bankroll: bankroll.currentBankroll,
    });

    // Stop if bankrupt
    if (bankroll.currentBankroll <= 0) {
      console.log('❌ BANKROLL DEPLETED - STOPPING SIMULATION\n');
      break;
    }
  }

  // Print results
  console.log('\n📊 SIMULATION RESULTS:');
  console.log(printSeparator('-', 40));

  const displayBets = betHistory.slice(-10); // Show last 10 bets
  console.log(`\nLast ${displayBets.length} bets:`);
  displayBets.forEach((record, index) => {
    const emoji = record.result === 'won' ? '✅' : '❌';
    console.log(
      `${emoji} ${record.bet} | Stake: ${formatCurrency(record.stake)} | ` +
      `${record.result === 'won' ? 'Won' : 'Lost'}: ${formatCurrency(Math.abs(record.profit))} | ` +
      `Bankroll: ${formatCurrency(record.bankroll)}`
    );
  });

  console.log('\n📈 FINAL STATISTICS:');
  console.log(`   Total Bets: ${bankroll.totalBets}`);
  console.log(`   Won: ${bankroll.wonBets} (${formatPercent(bankroll.winRate)})`);
  console.log(`   Lost: ${bankroll.lostBets}`);
  console.log(`   Starting Bankroll: ${formatCurrency(startingBankroll)}`);
  console.log(`   Final Bankroll: ${formatCurrency(bankroll.currentBankroll)}`);
  console.log(`   Net Profit: ${formatCurrency(bankroll.netProfit)} (${formatPercent(bankroll.roi)})`);
  console.log(`   Peak Bankroll: ${formatCurrency(bankroll.peakBankroll)}`);
  console.log(`   Max Drawdown: ${formatPercent(bankroll.maxDrawdown)}`);
  console.log(`   Longest Win Streak: ${bankroll.longestWinStreak}`);
  console.log(`   Longest Lose Streak: ${bankroll.longestLoseStreak}`);
  console.log(`   Average Odds: ${formatOdds(bankroll.averageOdds)}`);

  const profitLabel = bankroll.netProfit > 0 ? '🎉 PROFIT' : '📉 LOSS';
  console.log(`\n   ${profitLabel}: ${formatCurrency(Math.abs(bankroll.netProfit))}`);

  return bankroll;
}

function compareStrategies() {
  printHeader('STRATEGY COMPARISON');

  const strategies: Array<'ValueBetting' | 'KellyCriterion' | 'FixedStake'> = [
    'ValueBetting',
    'KellyCriterion',
    'FixedStake',
  ];

  const startingBankroll = 1000;
  const numBets = 100;

  const results = strategies.map(strategy => {
    const bankroll = simulateBettingStrategy(strategy, numBets, startingBankroll);
    return {
      strategy,
      finalBankroll: bankroll.currentBankroll,
      roi: bankroll.roi,
      winRate: bankroll.winRate,
      maxDrawdown: bankroll.maxDrawdown,
    };
  });

  printSection('COMPARISON TABLE');

  console.log('\n' + printSeparator('=', 100));
  console.log(
    '| Strategy          | Final Bankroll | ROI      | Win Rate | Max Drawdown |'
  );
  console.log(printSeparator('=', 100));

  results.forEach(result => {
    console.log(
      `| ${result.strategy.padEnd(17)} | ` +
      `${formatCurrency(result.finalBankroll).padStart(14)} | ` +
      `${formatPercent(result.roi).padStart(8)} | ` +
      `${formatPercent(result.winRate).padStart(8)} | ` +
      `${formatPercent(result.maxDrawdown).padStart(12)} |`
    );
  });

  console.log(printSeparator('=', 100));

  // Find best strategy
  const bestStrategy = results.reduce((best, current) =>
    current.roi > best.roi ? current : best
  );

  console.log(`\n🏆 BEST PERFORMING STRATEGY: ${bestStrategy.strategy}`);
  console.log(`   ROI: ${formatPercent(bestStrategy.roi)}`);
  console.log(`   Final Bankroll: ${formatCurrency(bestStrategy.finalBankroll)}`);
}

// ==================== MAIN DEMO ====================

async function main() {
  console.clear();

  printHeader('⚽ FOOTBALL BETTING ANALYSIS SYSTEM - COMPREHENSIVE DEMO');

  console.log('This demo showcases a complete betting analysis system with:');
  console.log('  ✓ Expected Value (EV) calculations');
  console.log('  ✓ Kelly Criterion stake sizing');
  console.log('  ✓ Multiple betting strategies');
  console.log('  ✓ Bankroll management');
  console.log('  ✓ Risk assessment');
  console.log('  ✓ Arbitrage detection');
  console.log('  ✓ Portfolio simulation');
  console.log();

  // Part 1: Basic Concepts
  demonstrateBasicConcepts();

  console.log('\n');
  await sleep(1000);

  // Part 2: Match Analysis
  printHeader('MATCH-BY-MATCH ANALYSIS');

  const bankroll = 1000;
  matches.forEach(match => {
    analyzeMatch(match, bankroll);
    console.log('\n');
  });

  await sleep(1000);

  // Part 3: Strategy Comparison
  compareStrategies();

  // Final Summary
  printHeader('🎓 KEY TAKEAWAYS');

  console.log('1. EXPECTED VALUE (EV) is the foundation');
  console.log('   • Only bet when EV > 0 (model probability > implied probability)');
  console.log('   • Higher EV = better value, but consider sample size and confidence');
  console.log();

  console.log('2. KELLY CRITERION optimizes long-term growth');
  console.log('   • Full Kelly maximizes growth but has high variance');
  console.log('   • Fractional Kelly (1/4 or 1/2) is safer and more practical');
  console.log('   • Never bet more than Kelly suggests');
  console.log();

  console.log('3. BANKROLL MANAGEMENT is crucial');
  console.log('   • Never risk more than 2-5% on a single bet');
  console.log('   • Maintain 20-50x minimum bankroll for your bet size');
  console.log('   • Track all bets and analyze long-term performance');
  console.log();

  console.log('4. UNDERSTAND THE MARKET');
  console.log('   • Bookmaker margins typically 5-10%');
  console.log('   • Lower margins = better odds = easier to find value');
  console.log('   • Look for inefficiencies and arbitrage opportunities');
  console.log();

  console.log('5. RISK MANAGEMENT');
  console.log('   • Diversify across multiple bets');
  console.log('   • Avoid emotional betting and chasing losses');
  console.log('   • Set stop-loss limits (e.g., stop if down 30%)');
  console.log('   • Take breaks after losing streaks');
  console.log();

  console.log('⚠️  IMPORTANT DISCLAIMER:');
  console.log('   This tool is for EDUCATIONAL and ANALYTICAL purposes only.');
  console.log('   Betting involves risk. Never bet more than you can afford to lose.');
  console.log('   Seek help if gambling becomes a problem.');
  console.log();

  printSeparator('=');
  console.log('Demo completed! For more information, see BETTING_ANALYSIS.md');
  printSeparator('=');
}

// Helper function for delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demo
main().catch(console.error);
