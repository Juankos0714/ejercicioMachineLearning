/**
 * BETTING ANALYSIS SYSTEM
 *
 * Comprehensive betting analysis system with advanced strategies and risk management.
 *
 * Features:
 * - Expected Value (EV) calculation
 * - Kelly Criterion for optimal stake sizing
 * - Multiple betting strategies (Value Betting, Arbitrage, Hedging)
 * - Bankroll management
 * - Risk assessment
 * - Odds comparison and analysis
 * - Historical performance tracking
 * - Statistical arbitrage detection
 */

import { Team } from '../lib/supabase';
import { HybridPrediction } from './mlHybridPredictor';

// ==================== TYPES AND INTERFACES ====================

/**
 * Market odds for different bet types
 */
export interface MarketOdds {
  // Main markets
  homeWin: number;          // Decimal odds for home win (e.g., 2.50)
  draw: number;             // Decimal odds for draw
  awayWin: number;          // Decimal odds for away win

  // Over/Under markets
  over25?: number;          // Odds for over 2.5 goals
  under25?: number;         // Odds for under 2.5 goals
  over15?: number;          // Odds for over 1.5 goals
  under15?: number;         // Odds for under 1.5 goals
  over35?: number;          // Odds for over 3.5 goals
  under35?: number;         // Odds for under 3.5 goals

  // Both Teams to Score (BTTS)
  bttsYes?: number;         // Both teams to score - Yes
  bttsNo?: number;          // Both teams to score - No

  // Double Chance
  homeOrDraw?: number;      // Home or Draw
  homeOrAway?: number;      // Home or Away
  drawOrAway?: number;      // Draw or Away

  // Asian Handicap
  asianHandicap?: {
    line: number;           // Handicap line (e.g., -1.5, 0, +0.5)
    homeOdds: number;
    awayOdds: number;
  };

  // Correct Score (most common scores)
  correctScore?: {
    [score: string]: number; // e.g., "1-0": 7.50, "2-1": 9.00
  };

  // Bookmaker and timestamp
  bookmaker?: string;
  timestamp?: Date;
}

/**
 * Bet type classification
 */
export type BetType =
  | '1X2'                   // Match result
  | 'OverUnder'             // Total goals
  | 'BTTS'                  // Both teams to score
  | 'DoubleChance'          // Two outcomes covered
  | 'AsianHandicap'         // Handicap betting
  | 'CorrectScore'          // Exact score
  | 'HalfTime'              // Half-time result
  | 'Combo';                // Combined bet

/**
 * Betting strategy types
 */
export type BettingStrategy =
  | 'ValueBetting'          // Bet when EV > 0
  | 'KellyCriterion'        // Optimal stake sizing
  | 'FixedStake'            // Fixed percentage of bankroll
  | 'MartingaleModified'    // Modified Martingale (careful!)
  | 'ArbitrageBetting'      // Risk-free arbitrage
  | 'HedgeBetting'          // Hedging positions
  | 'DutchingBetting'       // Multiple outcomes
  | 'Statistical';          // Statistical edge-based

/**
 * Individual bet recommendation
 */
export interface BetRecommendation {
  // Bet identification
  betType: BetType;
  outcome: string;          // e.g., "home", "draw", "over2.5", "1-1"
  description: string;      // Human-readable description

  // Odds and probabilities
  marketOdds: number;       // Bookmaker odds (decimal)
  impliedProb: number;      // Implied probability from odds
  modelProb: number;        // Our model's probability

  // Value analysis
  expectedValue: number;    // EV as percentage (e.g., 15.5 means 15.5% EV)
  valueRating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Negative';

  // Risk assessment
  confidence: number;       // Model confidence (0-1)
  variance: number;         // Expected variance
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';

  // Stake recommendations
  recommendedStake: {
    kelly: number;          // Kelly Criterion stake (% of bankroll)
    kellyFractional: number; // Fractional Kelly (safer, usually 0.25x or 0.5x Kelly)
    fixedPercentage: number; // Fixed % strategy
    fixedAmount?: number;   // Suggested fixed amount (if bankroll provided)
  };

  // Performance metrics
  winProbability: number;   // Probability of winning the bet
  potentialProfit: number;  // Expected profit per unit stake

  // Flags
  isValueBet: boolean;      // EV > 0
  isStrongValue: boolean;   // EV > threshold (e.g., 5%)
  isArbitrage: boolean;     // Part of arbitrage opportunity
}

/**
 * Complete betting analysis for a match
 */
export interface BettingAnalysis {
  // Match info
  homeTeam: Team;
  awayTeam: Team;
  prediction: HybridPrediction;
  marketOdds: MarketOdds;

  // Analysis timestamp
  analyzedAt: Date;

  // Recommended bets
  recommendations: BetRecommendation[];
  topRecommendations: BetRecommendation[]; // Top 3-5 value bets

  // Overall assessment
  overallEV: number;        // Average EV across all recommendations
  totalOpportunities: number; // Number of value bets found
  bestBetType: BetType;     // Most valuable bet type

  // Market efficiency
  marketEfficiency: number;  // How efficient the market is (0-1)
  marginAnalysis: {
    homeWin: number;        // Bookmaker margin on home win
    draw: number;
    awayWin: number;
    overall: number;        // Overall margin
  };

  // Arbitrage opportunities
  arbitrageOpportunities: ArbitrageOpportunity[];

  // Strategy recommendations
  strategyAdvice: StrategyAdvice[];

  // Risk warnings
  warnings: string[];
}

/**
 * Arbitrage opportunity (risk-free profit)
 */
export interface ArbitrageOpportunity {
  description: string;
  markets: {
    outcome: string;
    odds: number;
    bookmaker?: string;
    stake: number;          // Optimal stake for this outcome
  }[];
  totalStake: number;       // Total stake required
  guaranteedProfit: number; // Guaranteed profit amount
  profitPercentage: number; // Profit as % of total stake
  riskLevel: 'None' | 'Low'; // Arbitrage should be risk-free
}

/**
 * Strategy-specific advice
 */
export interface StrategyAdvice {
  strategy: BettingStrategy;
  recommended: boolean;
  reasoning: string;
  expectedReturn: number;   // Expected return using this strategy
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  bankrollRequirement: number; // Minimum bankroll for safety
}

/**
 * Bankroll management
 */
export interface BankrollManager {
  currentBankroll: number;
  startingBankroll: number;
  peakBankroll: number;
  lowestBankroll: number;
  totalBets: number;
  wonBets: number;
  lostBets: number;
  totalStaked: number;
  totalReturns: number;
  netProfit: number;
  roi: number;              // Return on Investment
  winRate: number;          // Percentage of bets won
  averageOdds: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  currentStreak: number;
  streakType: 'win' | 'loss' | 'none';

  // Risk metrics
  sharpeRatio?: number;     // Risk-adjusted return
  maxDrawdown: number;      // Maximum drawdown from peak
  kellyCriterionSize: number; // Current Kelly stake size

  // Recommendations
  suggestedMaxStake: number; // Max stake per bet
  riskTolerance: 'Conservative' | 'Moderate' | 'Aggressive';
}

/**
 * Historical bet record
 */
export interface BetRecord {
  id: string;
  timestamp: Date;
  homeTeam: string;
  awayTeam: string;
  betType: BetType;
  outcome: string;
  odds: number;
  stake: number;
  modelProb: number;
  expectedValue: number;
  strategy: BettingStrategy;
  result?: 'won' | 'lost' | 'void' | 'pending';
  payout?: number;
  profit?: number;
}

// ==================== CORE FUNCTIONS ====================

/**
 * Convert decimal odds to implied probability
 */
export function oddsToImpliedProbability(odds: number): number {
  if (odds <= 1) return 0;
  return 1 / odds;
}

/**
 * Convert probability to fair decimal odds
 */
export function probabilityToFairOdds(probability: number): number {
  if (probability <= 0 || probability >= 1) return 1;
  return 1 / probability;
}

/**
 * Calculate expected value (EV) of a bet
 * EV = (probability × profit if win) - (probability of loss × stake)
 * Expressed as percentage
 */
export function calculateExpectedValue(
  modelProbability: number,
  marketOdds: number
): number {
  // EV = (model_prob * (odds - 1)) - ((1 - model_prob) * 1)
  // Simplified: EV = model_prob * odds - 1
  const ev = (modelProbability * marketOdds) - 1;

  // Return as percentage
  return ev * 100;
}

/**
 * Calculate Kelly Criterion stake size
 * Kelly % = (bp - q) / b
 * where:
 *   b = decimal odds - 1 (net odds)
 *   p = probability of winning
 *   q = probability of losing (1 - p)
 */
export function calculateKellyCriterion(
  probability: number,
  odds: number,
  fractional: boolean = false,
  fraction: number = 0.25
): number {
  if (probability <= 0 || probability >= 1 || odds <= 1) return 0;

  const b = odds - 1;
  const p = probability;
  const q = 1 - p;

  const kelly = (b * p - q) / b;

  // Kelly can be negative (don't bet) or > 1 (very rare)
  const clampedKelly = Math.max(0, Math.min(kelly, 1));

  // Fractional Kelly is safer (reduces volatility)
  return fractional ? clampedKelly * fraction : clampedKelly;
}

/**
 * Calculate bookmaker margin (overround)
 * Margin = (sum of implied probabilities) - 1
 */
export function calculateBookmakerMargin(odds: number[]): number {
  const totalImpliedProb = odds.reduce((sum, odd) => sum + oddsToImpliedProbability(odd), 0);
  return (totalImpliedProb - 1) * 100; // Return as percentage
}

/**
 * Detect arbitrage opportunity
 * Arbitrage exists when: 1/odds1 + 1/odds2 + ... < 1
 */
export function detectArbitrage(odds: number[]): {
  isArbitrage: boolean;
  profitPercentage: number;
  stakes: number[];
} {
  const totalImpliedProb = odds.reduce((sum, odd) => sum + oddsToImpliedProbability(odd), 0);
  const isArbitrage = totalImpliedProb < 1;

  if (!isArbitrage) {
    return {
      isArbitrage: false,
      profitPercentage: 0,
      stakes: odds.map(() => 0),
    };
  }

  // Calculate optimal stakes for each outcome
  // Stake_i = (1 / odds_i) / sum(1 / all_odds)
  const stakes = odds.map(odd => oddsToImpliedProbability(odd) / totalImpliedProb);

  // Profit percentage
  const profitPercentage = ((1 / totalImpliedProb) - 1) * 100;

  return {
    isArbitrage: true,
    profitPercentage,
    stakes,
  };
}

/**
 * Assess value bet quality
 */
export function assessValueBetQuality(ev: number): BetRecommendation['valueRating'] {
  if (ev >= 10) return 'Excellent';
  if (ev >= 5) return 'Good';
  if (ev >= 2) return 'Fair';
  if (ev >= 0) return 'Poor';
  return 'Negative';
}

/**
 * Assess risk level based on various factors
 */
export function assessRiskLevel(
  confidence: number,
  odds: number,
  ev: number
): BetRecommendation['riskLevel'] {
  // High odds = higher risk
  // Low confidence = higher risk
  // Negative EV = very high risk

  if (ev < 0) return 'Very High';
  if (confidence < 0.6 || odds > 5) return 'High';
  if (confidence < 0.75 || odds > 3) return 'Medium';
  return 'Low';
}

// ==================== BET ANALYSIS FUNCTIONS ====================

/**
 * Analyze 1X2 market (Match Result)
 */
export function analyze1X2Market(
  prediction: HybridPrediction,
  marketOdds: MarketOdds,
  bankroll?: number
): BetRecommendation[] {
  const recommendations: BetRecommendation[] = [];

  // Home Win
  const homeEV = calculateExpectedValue(prediction.homeWinProb, marketOdds.homeWin);
  recommendations.push({
    betType: '1X2',
    outcome: 'home',
    description: `${prediction.homeTeam.name} to Win`,
    marketOdds: marketOdds.homeWin,
    impliedProb: oddsToImpliedProbability(marketOdds.homeWin),
    modelProb: prediction.homeWinProb,
    expectedValue: homeEV,
    valueRating: assessValueBetQuality(homeEV),
    confidence: prediction.confidence,
    variance: calculateVariance(prediction.homeWinProb, marketOdds.homeWin),
    riskLevel: assessRiskLevel(prediction.confidence, marketOdds.homeWin, homeEV),
    recommendedStake: {
      kelly: calculateKellyCriterion(prediction.homeWinProb, marketOdds.homeWin),
      kellyFractional: calculateKellyCriterion(prediction.homeWinProb, marketOdds.homeWin, true, 0.25),
      fixedPercentage: homeEV > 5 ? 2 : homeEV > 2 ? 1 : 0.5,
      fixedAmount: bankroll ? bankroll * (homeEV > 5 ? 0.02 : homeEV > 2 ? 0.01 : 0.005) : undefined,
    },
    winProbability: prediction.homeWinProb,
    potentialProfit: homeEV / 100,
    isValueBet: homeEV > 0,
    isStrongValue: homeEV > 5,
    isArbitrage: false,
  });

  // Draw
  const drawEV = calculateExpectedValue(prediction.drawProb, marketOdds.draw);
  recommendations.push({
    betType: '1X2',
    outcome: 'draw',
    description: 'Draw',
    marketOdds: marketOdds.draw,
    impliedProb: oddsToImpliedProbability(marketOdds.draw),
    modelProb: prediction.drawProb,
    expectedValue: drawEV,
    valueRating: assessValueBetQuality(drawEV),
    confidence: prediction.confidence,
    variance: calculateVariance(prediction.drawProb, marketOdds.draw),
    riskLevel: assessRiskLevel(prediction.confidence, marketOdds.draw, drawEV),
    recommendedStake: {
      kelly: calculateKellyCriterion(prediction.drawProb, marketOdds.draw),
      kellyFractional: calculateKellyCriterion(prediction.drawProb, marketOdds.draw, true, 0.25),
      fixedPercentage: drawEV > 5 ? 2 : drawEV > 2 ? 1 : 0.5,
      fixedAmount: bankroll ? bankroll * (drawEV > 5 ? 0.02 : drawEV > 2 ? 0.01 : 0.005) : undefined,
    },
    winProbability: prediction.drawProb,
    potentialProfit: drawEV / 100,
    isValueBet: drawEV > 0,
    isStrongValue: drawEV > 5,
    isArbitrage: false,
  });

  // Away Win
  const awayEV = calculateExpectedValue(prediction.awayWinProb, marketOdds.awayWin);
  recommendations.push({
    betType: '1X2',
    outcome: 'away',
    description: `${prediction.awayTeam.name} to Win`,
    marketOdds: marketOdds.awayWin,
    impliedProb: oddsToImpliedProbability(marketOdds.awayWin),
    modelProb: prediction.awayWinProb,
    expectedValue: awayEV,
    valueRating: assessValueBetQuality(awayEV),
    confidence: prediction.confidence,
    variance: calculateVariance(prediction.awayWinProb, marketOdds.awayWin),
    riskLevel: assessRiskLevel(prediction.confidence, marketOdds.awayWin, awayEV),
    recommendedStake: {
      kelly: calculateKellyCriterion(prediction.awayWinProb, marketOdds.awayWin),
      kellyFractional: calculateKellyCriterion(prediction.awayWinProb, marketOdds.awayWin, true, 0.25),
      fixedPercentage: awayEV > 5 ? 2 : awayEV > 2 ? 1 : 0.5,
      fixedAmount: bankroll ? bankroll * (awayEV > 5 ? 0.02 : awayEV > 2 ? 0.01 : 0.005) : undefined,
    },
    winProbability: prediction.awayWinProb,
    potentialProfit: awayEV / 100,
    isValueBet: awayEV > 0,
    isStrongValue: awayEV > 5,
    isArbitrage: false,
  });

  return recommendations;
}

/**
 * Analyze Over/Under 2.5 goals market
 */
export function analyzeOverUnderMarket(
  prediction: HybridPrediction,
  marketOdds: MarketOdds,
  bankroll?: number
): BetRecommendation[] {
  const recommendations: BetRecommendation[] = [];

  if (!marketOdds.over25 || !marketOdds.under25) {
    return recommendations;
  }

  const under25Prob = 1 - prediction.over25Prob;

  // Over 2.5
  const overEV = calculateExpectedValue(prediction.over25Prob, marketOdds.over25);
  recommendations.push({
    betType: 'OverUnder',
    outcome: 'over2.5',
    description: 'Over 2.5 Goals',
    marketOdds: marketOdds.over25,
    impliedProb: oddsToImpliedProbability(marketOdds.over25),
    modelProb: prediction.over25Prob,
    expectedValue: overEV,
    valueRating: assessValueBetQuality(overEV),
    confidence: prediction.confidence,
    variance: calculateVariance(prediction.over25Prob, marketOdds.over25),
    riskLevel: assessRiskLevel(prediction.confidence, marketOdds.over25, overEV),
    recommendedStake: {
      kelly: calculateKellyCriterion(prediction.over25Prob, marketOdds.over25),
      kellyFractional: calculateKellyCriterion(prediction.over25Prob, marketOdds.over25, true, 0.25),
      fixedPercentage: overEV > 5 ? 2 : overEV > 2 ? 1 : 0.5,
      fixedAmount: bankroll ? bankroll * (overEV > 5 ? 0.02 : overEV > 2 ? 0.01 : 0.005) : undefined,
    },
    winProbability: prediction.over25Prob,
    potentialProfit: overEV / 100,
    isValueBet: overEV > 0,
    isStrongValue: overEV > 5,
    isArbitrage: false,
  });

  // Under 2.5
  const underEV = calculateExpectedValue(under25Prob, marketOdds.under25);
  recommendations.push({
    betType: 'OverUnder',
    outcome: 'under2.5',
    description: 'Under 2.5 Goals',
    marketOdds: marketOdds.under25,
    impliedProb: oddsToImpliedProbability(marketOdds.under25),
    modelProb: under25Prob,
    expectedValue: underEV,
    valueRating: assessValueBetQuality(underEV),
    confidence: prediction.confidence,
    variance: calculateVariance(under25Prob, marketOdds.under25),
    riskLevel: assessRiskLevel(prediction.confidence, marketOdds.under25, underEV),
    recommendedStake: {
      kelly: calculateKellyCriterion(under25Prob, marketOdds.under25),
      kellyFractional: calculateKellyCriterion(under25Prob, marketOdds.under25, true, 0.25),
      fixedPercentage: underEV > 5 ? 2 : underEV > 2 ? 1 : 0.5,
      fixedAmount: bankroll ? bankroll * (underEV > 5 ? 0.02 : underEV > 2 ? 0.01 : 0.005) : undefined,
    },
    winProbability: under25Prob,
    potentialProfit: underEV / 100,
    isValueBet: underEV > 0,
    isStrongValue: underEV > 5,
    isArbitrage: false,
  });

  return recommendations;
}

/**
 * Calculate variance for risk assessment
 */
function calculateVariance(probability: number, odds: number): number {
  // Variance = p(1-p)(win_amount - loss_amount)^2
  const winAmount = odds - 1;
  const lossAmount = -1;
  return probability * (1 - probability) * Math.pow(winAmount - lossAmount, 2);
}

/**
 * Analyze double chance markets
 */
export function analyzeDoubleChanceMarket(
  prediction: HybridPrediction,
  marketOdds: MarketOdds,
  bankroll?: number
): BetRecommendation[] {
  const recommendations: BetRecommendation[] = [];

  if (!marketOdds.homeOrDraw || !marketOdds.homeOrAway || !marketOdds.drawOrAway) {
    return recommendations;
  }

  // Home or Draw
  const homeOrDrawProb = prediction.homeWinProb + prediction.drawProb;
  const homeOrDrawEV = calculateExpectedValue(homeOrDrawProb, marketOdds.homeOrDraw);
  recommendations.push({
    betType: 'DoubleChance',
    outcome: 'homeOrDraw',
    description: `${prediction.homeTeam.name} or Draw`,
    marketOdds: marketOdds.homeOrDraw,
    impliedProb: oddsToImpliedProbability(marketOdds.homeOrDraw),
    modelProb: homeOrDrawProb,
    expectedValue: homeOrDrawEV,
    valueRating: assessValueBetQuality(homeOrDrawEV),
    confidence: prediction.confidence,
    variance: calculateVariance(homeOrDrawProb, marketOdds.homeOrDraw),
    riskLevel: assessRiskLevel(prediction.confidence, marketOdds.homeOrDraw, homeOrDrawEV),
    recommendedStake: {
      kelly: calculateKellyCriterion(homeOrDrawProb, marketOdds.homeOrDraw),
      kellyFractional: calculateKellyCriterion(homeOrDrawProb, marketOdds.homeOrDraw, true, 0.25),
      fixedPercentage: homeOrDrawEV > 5 ? 2 : homeOrDrawEV > 2 ? 1 : 0.5,
      fixedAmount: bankroll ? bankroll * (homeOrDrawEV > 5 ? 0.02 : homeOrDrawEV > 2 ? 0.01 : 0.005) : undefined,
    },
    winProbability: homeOrDrawProb,
    potentialProfit: homeOrDrawEV / 100,
    isValueBet: homeOrDrawEV > 0,
    isStrongValue: homeOrDrawEV > 5,
    isArbitrage: false,
  });

  // Similar for other double chance bets...
  const drawOrAwayProb = prediction.drawProb + prediction.awayWinProb;
  const drawOrAwayEV = calculateExpectedValue(drawOrAwayProb, marketOdds.drawOrAway);
  recommendations.push({
    betType: 'DoubleChance',
    outcome: 'drawOrAway',
    description: `Draw or ${prediction.awayTeam.name}`,
    marketOdds: marketOdds.drawOrAway,
    impliedProb: oddsToImpliedProbability(marketOdds.drawOrAway),
    modelProb: drawOrAwayProb,
    expectedValue: drawOrAwayEV,
    valueRating: assessValueBetQuality(drawOrAwayEV),
    confidence: prediction.confidence,
    variance: calculateVariance(drawOrAwayProb, marketOdds.drawOrAway),
    riskLevel: assessRiskLevel(prediction.confidence, marketOdds.drawOrAway, drawOrAwayEV),
    recommendedStake: {
      kelly: calculateKellyCriterion(drawOrAwayProb, marketOdds.drawOrAway),
      kellyFractional: calculateKellyCriterion(drawOrAwayProb, marketOdds.drawOrAway, true, 0.25),
      fixedPercentage: drawOrAwayEV > 5 ? 2 : drawOrAwayEV > 2 ? 1 : 0.5,
      fixedAmount: bankroll ? bankroll * (drawOrAwayEV > 5 ? 0.02 : drawOrAwayEV > 2 ? 0.01 : 0.005) : undefined,
    },
    winProbability: drawOrAwayProb,
    potentialProfit: drawOrAwayEV / 100,
    isValueBet: drawOrAwayEV > 0,
    isStrongValue: drawOrAwayEV > 5,
    isArbitrage: false,
  });

  return recommendations;
}

/**
 * Detect arbitrage opportunities across all markets
 */
export function detectArbitrageOpportunities(
  marketOdds: MarketOdds
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];

  // Check 1X2 market
  const main1x2Arb = detectArbitrage([
    marketOdds.homeWin,
    marketOdds.draw,
    marketOdds.awayWin,
  ]);

  if (main1x2Arb.isArbitrage) {
    opportunities.push({
      description: 'Arbitrage on Match Result (1X2)',
      markets: [
        {
          outcome: 'Home Win',
          odds: marketOdds.homeWin,
          stake: main1x2Arb.stakes[0] * 100,
        },
        {
          outcome: 'Draw',
          odds: marketOdds.draw,
          stake: main1x2Arb.stakes[1] * 100,
        },
        {
          outcome: 'Away Win',
          odds: marketOdds.awayWin,
          stake: main1x2Arb.stakes[2] * 100,
        },
      ],
      totalStake: 100,
      guaranteedProfit: main1x2Arb.profitPercentage,
      profitPercentage: main1x2Arb.profitPercentage,
      riskLevel: 'None',
    });
  }

  // Check Over/Under market
  if (marketOdds.over25 && marketOdds.under25) {
    const ouArb = detectArbitrage([marketOdds.over25, marketOdds.under25]);
    if (ouArb.isArbitrage) {
      opportunities.push({
        description: 'Arbitrage on Over/Under 2.5 Goals',
        markets: [
          {
            outcome: 'Over 2.5',
            odds: marketOdds.over25,
            stake: ouArb.stakes[0] * 100,
          },
          {
            outcome: 'Under 2.5',
            odds: marketOdds.under25,
            stake: ouArb.stakes[1] * 100,
          },
        ],
        totalStake: 100,
        guaranteedProfit: ouArb.profitPercentage,
        profitPercentage: ouArb.profitPercentage,
        riskLevel: 'None',
      });
    }
  }

  return opportunities;
}

/**
 * Generate strategy advice based on analysis
 */
export function generateStrategyAdvice(
  recommendations: BetRecommendation[],
  bankroll: number
): StrategyAdvice[] {
  const advice: StrategyAdvice[] = [];

  const valueBets = recommendations.filter(r => r.isValueBet);
  const avgEV = valueBets.reduce((sum, r) => sum + r.expectedValue, 0) / (valueBets.length || 1);

  // Value Betting Strategy
  advice.push({
    strategy: 'ValueBetting',
    recommended: valueBets.length > 0,
    reasoning: valueBets.length > 0
      ? `Found ${valueBets.length} value bet(s) with average EV of ${avgEV.toFixed(2)}%`
      : 'No positive EV opportunities found',
    expectedReturn: avgEV,
    riskLevel: avgEV > 10 ? 'Low' : avgEV > 5 ? 'Medium' : 'High',
    bankrollRequirement: bankroll * 20, // Suggest 20x bankroll for variance
  });

  // Kelly Criterion Strategy
  const maxKelly = Math.max(...recommendations.map(r => r.recommendedStake.kelly));
  advice.push({
    strategy: 'KellyCriterion',
    recommended: maxKelly > 0.01 && maxKelly < 0.2,
    reasoning: maxKelly > 0.2
      ? 'Kelly stake too high - suggests either huge edge or overconfidence. Use fractional Kelly.'
      : maxKelly > 0.01
      ? `Kelly suggests ${(maxKelly * 100).toFixed(2)}% stake - optimal for long-term growth`
      : 'Kelly stake too small - edge is minimal',
    expectedReturn: avgEV,
    riskLevel: maxKelly > 0.15 ? 'High' : maxKelly > 0.05 ? 'Medium' : 'Low',
    bankrollRequirement: bankroll * 30, // Kelly requires larger bankroll
  });

  // Fixed Stake Strategy
  advice.push({
    strategy: 'FixedStake',
    recommended: true,
    reasoning: 'Conservative approach - good for beginners. Stake 1-2% of bankroll per bet.',
    expectedReturn: avgEV * 0.8, // Slightly lower due to not optimizing stake
    riskLevel: 'Low',
    bankrollRequirement: bankroll * 10,
  });

  return advice;
}

/**
 * MAIN FUNCTION: Complete betting analysis
 */
export function analyzeBettingOpportunities(
  prediction: HybridPrediction,
  marketOdds: MarketOdds,
  bankroll: number = 1000
): BettingAnalysis {
  const recommendations: BetRecommendation[] = [];

  // Analyze all available markets
  recommendations.push(...analyze1X2Market(prediction, marketOdds, bankroll));
  recommendations.push(...analyzeOverUnderMarket(prediction, marketOdds, bankroll));
  recommendations.push(...analyzeDoubleChanceMarket(prediction, marketOdds, bankroll));

  // Filter and sort by EV
  const sortedRecs = recommendations
    .filter(r => r.expectedValue > -10) // Filter out terrible bets
    .sort((a, b) => b.expectedValue - a.expectedValue);

  // Get top recommendations (value bets only)
  const topRecommendations = sortedRecs
    .filter(r => r.isValueBet)
    .slice(0, 5);

  // Calculate overall metrics
  const overallEV = sortedRecs.reduce((sum, r) => sum + r.expectedValue, 0) / sortedRecs.length;
  const totalOpportunities = recommendations.filter(r => r.isValueBet).length;

  // Find best bet type
  const betTypeEVs = new Map<BetType, number>();
  for (const rec of recommendations.filter(r => r.isValueBet)) {
    const current = betTypeEVs.get(rec.betType) || 0;
    betTypeEVs.set(rec.betType, current + rec.expectedValue);
  }
  const bestBetType = Array.from(betTypeEVs.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '1X2';

  // Calculate bookmaker margins
  const marginAnalysis = {
    homeWin: (oddsToImpliedProbability(marketOdds.homeWin) - prediction.homeWinProb) * 100,
    draw: (oddsToImpliedProbability(marketOdds.draw) - prediction.drawProb) * 100,
    awayWin: (oddsToImpliedProbability(marketOdds.awayWin) - prediction.awayWinProb) * 100,
    overall: calculateBookmakerMargin([marketOdds.homeWin, marketOdds.draw, marketOdds.awayWin]),
  };

  // Market efficiency (lower is better for bettors)
  const marketEfficiency = 1 - (Math.abs(overallEV) / 100);

  // Detect arbitrage
  const arbitrageOpportunities = detectArbitrageOpportunities(marketOdds);

  // Generate strategy advice
  const strategyAdvice = generateStrategyAdvice(recommendations, bankroll);

  // Warnings
  const warnings: string[] = [];
  if (marginAnalysis.overall > 10) {
    warnings.push('High bookmaker margin detected - market is expensive');
  }
  if (prediction.confidence < 0.6) {
    warnings.push('Low model confidence - predictions may be unreliable');
  }
  if (topRecommendations.some(r => r.riskLevel === 'Very High')) {
    warnings.push('Some recommendations have very high risk');
  }
  if (bankroll < 500) {
    warnings.push('Small bankroll - variance can be problematic');
  }

  return {
    homeTeam: prediction.homeTeam,
    awayTeam: prediction.awayTeam,
    prediction,
    marketOdds,
    analyzedAt: new Date(),
    recommendations: sortedRecs,
    topRecommendations,
    overallEV,
    totalOpportunities,
    bestBetType,
    marketEfficiency,
    marginAnalysis,
    arbitrageOpportunities,
    strategyAdvice,
    warnings,
  };
}

/**
 * Simulate bet outcome and update bankroll
 */
export function simulateBet(
  bet: BetRecommendation,
  stake: number,
  bankroll: BankrollManager
): BankrollManager {
  // Simulate outcome based on model probability
  const won = Math.random() < bet.winProbability;

  const payout = won ? stake * bet.marketOdds : 0;
  const profit = payout - stake;

  // Update bankroll
  const newBankroll = bankroll.currentBankroll + profit;
  const newTotalReturns = bankroll.totalReturns + payout;
  const newTotalStaked = bankroll.totalStaked + stake;
  const newNetProfit = newTotalReturns - newTotalStaked;

  // Update streak
  let newStreak = bankroll.currentStreak;
  let newStreakType = bankroll.streakType;
  if (won) {
    newStreak = bankroll.streakType === 'win' ? bankroll.currentStreak + 1 : 1;
    newStreakType = 'win';
  } else {
    newStreak = bankroll.streakType === 'loss' ? bankroll.currentStreak + 1 : 1;
    newStreakType = 'loss';
  }

  return {
    ...bankroll,
    currentBankroll: newBankroll,
    peakBankroll: Math.max(bankroll.peakBankroll, newBankroll),
    lowestBankroll: Math.min(bankroll.lowestBankroll, newBankroll),
    totalBets: bankroll.totalBets + 1,
    wonBets: won ? bankroll.wonBets + 1 : bankroll.wonBets,
    lostBets: won ? bankroll.lostBets : bankroll.lostBets + 1,
    totalStaked: newTotalStaked,
    totalReturns: newTotalReturns,
    netProfit: newNetProfit,
    roi: (newNetProfit / newTotalStaked) * 100,
    winRate: ((won ? bankroll.wonBets + 1 : bankroll.wonBets) / (bankroll.totalBets + 1)) * 100,
    averageOdds: (bankroll.averageOdds * bankroll.totalBets + bet.marketOdds) / (bankroll.totalBets + 1),
    longestWinStreak: newStreakType === 'win' ? Math.max(bankroll.longestWinStreak, newStreak) : bankroll.longestWinStreak,
    longestLoseStreak: newStreakType === 'loss' ? Math.max(bankroll.longestLoseStreak, newStreak) : bankroll.longestLoseStreak,
    currentStreak: newStreak,
    streakType: newStreakType,
    maxDrawdown: Math.max(bankroll.maxDrawdown, ((bankroll.peakBankroll - newBankroll) / bankroll.peakBankroll) * 100),
    kellyCriterionSize: calculateKellyCriterion(bet.winProbability, bet.marketOdds, true, 0.25) * newBankroll,
    suggestedMaxStake: newBankroll * 0.05, // 5% max
    riskTolerance: newBankroll > bankroll.startingBankroll * 1.5 ? 'Aggressive' :
                   newBankroll > bankroll.startingBankroll * 0.8 ? 'Moderate' : 'Conservative',
  };
}

/**
 * Initialize bankroll manager
 */
export function initializeBankroll(startingAmount: number): BankrollManager {
  return {
    currentBankroll: startingAmount,
    startingBankroll: startingAmount,
    peakBankroll: startingAmount,
    lowestBankroll: startingAmount,
    totalBets: 0,
    wonBets: 0,
    lostBets: 0,
    totalStaked: 0,
    totalReturns: 0,
    netProfit: 0,
    roi: 0,
    winRate: 0,
    averageOdds: 0,
    longestWinStreak: 0,
    longestLoseStreak: 0,
    currentStreak: 0,
    streakType: 'none',
    maxDrawdown: 0,
    kellyCriterionSize: 0,
    suggestedMaxStake: startingAmount * 0.05,
    riskTolerance: 'Moderate',
  };
}
