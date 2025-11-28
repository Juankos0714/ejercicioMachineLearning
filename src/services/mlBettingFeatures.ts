/**
 * MACHINE LEARNING BETTING FEATURES
 *
 * Advanced feature engineering specifically for betting analytics
 *
 * Features:
 * - Odds-based features
 * - Market efficiency indicators
 * - Sharp money indicators
 * - Closing line movement patterns
 * - Public betting percentage
 * - Steam moves and reverse line movement
 */

import { Team } from '../lib/supabase';
import { MarketOdds } from './mlBettingAnalyzer';

// ==================== TYPES ====================

export interface BettingFeatures {
  // Odds-derived features
  impliedProbHome: number;
  impliedProbDraw: number;
  impliedProbAway: number;
  bookmakMargin: number;
  overround: number;

  // Market efficiency
  marketEfficiency: number;
  priceDiscrepancy: number;

  // Odds movement
  oddsMovementHome: number;
  oddsMovementAway: number;
  closingLineMomentum: number;

  // Value indicators
  expectedValueHome: number;
  expectedValueAway: number;
  expectedValueDraw: number;

  // Sharp money indicators
  sharpMoneyIndicator: number;
  reversLineMovement: boolean;
  steamMove: boolean;

  // Public betting (simulated for now)
  publicPercentageHome: number;
  publicPercentageAway: number;

  // Arbitrage indicators
  arbitrageOpportunity: boolean;
  arbitrageProfit: number;

  // Advanced metrics
  kellyCriterionHome: number;
  kellyCriterionAway: number;
  sharpeRatioEstimate: number;
}

export interface OddsHistory {
  timestamp: Date;
  odds: MarketOdds;
}

// ==================== FEATURE EXTRACTORS ====================

/**
 * Extract betting-specific features from odds and teams
 */
export function extractBettingFeatures(
  _homeTeam: Team,
  _awayTeam: Team,
  currentOdds: MarketOdds,
  oddsHistory?: OddsHistory[],
  modelProbabilities?: { home: number; draw: number; away: number }
): BettingFeatures {
  // Implied probabilities from odds
  const impliedProbHome = 1 / currentOdds.homeWin;
  const impliedProbDraw = 1 / currentOdds.draw;
  const impliedProbAway = 1 / currentOdds.awayWin;

  // Bookmaker margin and overround
  const totalImpliedProb = impliedProbHome + impliedProbDraw + impliedProbAway;
  const bookmakMargin = (totalImpliedProb - 1) * 100;
  const overround = totalImpliedProb;

  // Market efficiency (lower margin = more efficient)
  const marketEfficiency = 1 - Math.min(bookmakMargin / 10, 1);

  // Price discrepancy (variance in implied probabilities)
  const avgProb = (impliedProbHome + impliedProbDraw + impliedProbAway) / 3;
  const priceDiscrepancy = Math.sqrt(
    (Math.pow(impliedProbHome - avgProb, 2) +
      Math.pow(impliedProbDraw - avgProb, 2) +
      Math.pow(impliedProbAway - avgProb, 2)) /
      3
  );

  // Odds movement (if history available)
  let oddsMovementHome = 0;
  let oddsMovementAway = 0;
  let closingLineMomentum = 0;
  let steamMove = false;
  let reversLineMovement = false;

  if (oddsHistory && oddsHistory.length > 0) {
    const opening = oddsHistory[0].odds;
    const closing = currentOdds;

    oddsMovementHome = ((closing.homeWin - opening.homeWin) / opening.homeWin) * 100;
    oddsMovementAway = ((closing.awayWin - opening.awayWin) / opening.awayWin) * 100;

    // Closing line momentum (positive = closing odds increased)
    closingLineMomentum = (oddsMovementHome + oddsMovementAway) / 2;

    // Steam move: rapid odds movement (>5% in short time)
    if (oddsHistory.length >= 2) {
      const recent = oddsHistory[oddsHistory.length - 2].odds;
      const recentMovement = Math.abs(
        ((closing.homeWin - recent.homeWin) / recent.homeWin) * 100
      );
      steamMove = recentMovement > 5;
    }

    // Reverse line movement: public on one side, line moves opposite
    // (simplified simulation)
    reversLineMovement = oddsMovementHome < 0 && oddsMovementAway > 0;
  }

  // Expected value (if model probabilities provided)
  let expectedValueHome = 0;
  let expectedValueAway = 0;
  let expectedValueDraw = 0;

  if (modelProbabilities) {
    expectedValueHome = (modelProbabilities.home * currentOdds.homeWin - 1) * 100;
    expectedValueDraw = (modelProbabilities.draw * currentOdds.draw - 1) * 100;
    expectedValueAway = (modelProbabilities.away * currentOdds.awayWin - 1) * 100;
  }

  // Sharp money indicator (combination of factors)
  const sharpMoneyIndicator = calculateSharpMoneyIndicator({
    reversLineMovement,
    steamMove,
    oddsMovementHome,
    oddsMovementAway,
    marketEfficiency,
  });

  // Public betting percentage (simulated)
  const publicPercentageHome = 50 + Math.random() * 40 - 20; // 30-70%
  const publicPercentageAway = 100 - publicPercentageHome;

  // Arbitrage detection
  const totalInverse = 1 / currentOdds.homeWin + 1 / currentOdds.draw + 1 / currentOdds.awayWin;
  const arbitrageOpportunity = totalInverse < 1;
  const arbitrageProfit = arbitrageOpportunity ? ((1 / totalInverse - 1) * 100) : 0;

  // Kelly Criterion (if model probabilities provided)
  let kellyCriterionHome = 0;
  let kellyCriterionAway = 0;

  if (modelProbabilities) {
    const bHome = currentOdds.homeWin - 1;
    const pHome = modelProbabilities.home;
    const qHome = 1 - pHome;
    kellyCriterionHome = Math.max(0, (bHome * pHome - qHome) / bHome);

    const bAway = currentOdds.awayWin - 1;
    const pAway = modelProbabilities.away;
    const qAway = 1 - pAway;
    kellyCriterionAway = Math.max(0, (bAway * pAway - qAway) / bAway);
  }

  // Sharpe ratio estimate (simplified)
  const sharpeRatioEstimate = modelProbabilities
    ? calculateSharpeEstimate(
        modelProbabilities,
        { home: currentOdds.homeWin, draw: currentOdds.draw, away: currentOdds.awayWin }
      )
    : 0;

  return {
    impliedProbHome,
    impliedProbDraw,
    impliedProbAway,
    bookmakMargin,
    overround,
    marketEfficiency,
    priceDiscrepancy,
    oddsMovementHome,
    oddsMovementAway,
    closingLineMomentum,
    expectedValueHome,
    expectedValueAway,
    expectedValueDraw,
    sharpMoneyIndicator,
    reversLineMovement,
    steamMove,
    publicPercentageHome,
    publicPercentageAway,
    arbitrageOpportunity,
    arbitrageProfit,
    kellyCriterionHome,
    kellyCriterionAway,
    sharpeRatioEstimate,
  };
}

/**
 * Calculate sharp money indicator
 */
function calculateSharpMoneyIndicator(params: {
  reversLineMovement: boolean;
  steamMove: boolean;
  oddsMovementHome: number;
  oddsMovementAway: number;
  marketEfficiency: number;
}): number {
  let score = 0;

  // Reverse line movement is a strong sharp indicator
  if (params.reversLineMovement) score += 40;

  // Steam moves indicate sharp action
  if (params.steamMove) score += 30;

  // Significant line movement
  const avgMovement = Math.abs((params.oddsMovementHome + params.oddsMovementAway) / 2);
  if (avgMovement > 5) score += 20;

  // Market efficiency
  score += params.marketEfficiency * 10;

  return Math.min(score, 100);
}

/**
 * Calculate estimated Sharpe ratio from probabilities and odds
 */
function calculateSharpeEstimate(
  probabilities: { home: number; draw: number; away: number },
  odds: { home: number; draw: number; away: number }
): number {
  // Expected return
  const evHome = (probabilities.home * odds.home - 1) * 100;
  const evDraw = (probabilities.draw * odds.draw - 1) * 100;
  const evAway = (probabilities.away * odds.away - 1) * 100;

  const maxEV = Math.max(evHome, evDraw, evAway);

  // Estimate volatility based on odds
  const avgOdds = (odds.home + odds.draw + odds.away) / 3;
  const volatility = Math.sqrt(avgOdds) * 10;

  // Sharpe = (Return - RiskFreeRate) / Volatility
  // Assuming risk-free rate = 0 for simplicity
  return volatility > 0 ? maxEV / volatility : 0;
}

/**
 * Detect line shopping opportunities across multiple bookmakers
 */
export function detectLineShoppingOpportunities(
  oddsFromBookmakers: { bookmaker: string; odds: MarketOdds }[]
): {
  bestHomeOdds: { bookmaker: string; odds: number };
  bestDrawOdds: { bookmaker: string; odds: number };
  bestAwayOdds: { bookmaker: string; odds: number };
  improvementPercent: number;
} {
  let bestHome = { bookmaker: '', odds: 0 };
  let bestDraw = { bookmaker: '', odds: 0 };
  let bestAway = { bookmaker: '', odds: 0 };

  for (const bm of oddsFromBookmakers) {
    if (bm.odds.homeWin > bestHome.odds) {
      bestHome = { bookmaker: bm.bookmaker, odds: bm.odds.homeWin };
    }
    if (bm.odds.draw > bestDraw.odds) {
      bestDraw = { bookmaker: bm.bookmaker, odds: bm.odds.draw };
    }
    if (bm.odds.awayWin > bestAway.odds) {
      bestAway = { bookmaker: bm.bookmaker, odds: bm.odds.awayWin };
    }
  }

  // Calculate average improvement from line shopping
  const avgOdds =
    oddsFromBookmakers.reduce(
      (sum, bm) => sum + (bm.odds.homeWin + bm.odds.draw + bm.odds.awayWin),
      0
    ) /
    (oddsFromBookmakers.length * 3);
  const bestAvgOdds = (bestHome.odds + bestDraw.odds + bestAway.odds) / 3;
  const improvementPercent = ((bestAvgOdds - avgOdds) / avgOdds) * 100;

  return {
    bestHomeOdds: bestHome,
    bestDrawOdds: bestDraw,
    bestAwayOdds: bestAway,
    improvementPercent,
  };
}

/**
 * Analyze public vs sharp money divergence
 */
export function analyzePublicSharpDivergence(
  publicPercentage: number,
  lineMovement: number
): {
  divergence: 'aligned' | 'minor' | 'significant' | 'extreme';
  sharpSide: 'home' | 'away' | 'neutral';
  confidence: number;
} {
  // If public is heavily on home (>60%) but line moves toward away, that's sharp money on away
  const publicOnHome = publicPercentage > 50;
  const lineMovingTowardAway = lineMovement < 0;

  const divergenceScore = Math.abs(publicPercentage - 50) * Math.abs(lineMovement);

  let divergence: 'aligned' | 'minor' | 'significant' | 'extreme';
  if (divergenceScore < 100) divergence = 'aligned';
  else if (divergenceScore < 300) divergence = 'minor';
  else if (divergenceScore < 600) divergence = 'significant';
  else divergence = 'extreme';

  let sharpSide: 'home' | 'away' | 'neutral';
  if (publicOnHome && lineMovingTowardAway) sharpSide = 'away';
  else if (!publicOnHome && !lineMovingTowardAway) sharpSide = 'home';
  else sharpSide = 'neutral';

  const confidence = Math.min(divergenceScore / 1000, 1);

  return { divergence, sharpSide, confidence };
}

/**
 * Feature vector for ML models (normalized)
 */
export function createBettingFeatureVector(features: BettingFeatures): number[] {
  return [
    features.impliedProbHome,
    features.impliedProbDraw,
    features.impliedProbAway,
    features.bookmakMargin / 100,
    features.overround - 1,
    features.marketEfficiency,
    features.priceDiscrepancy,
    features.oddsMovementHome / 100,
    features.oddsMovementAway / 100,
    features.closingLineMomentum / 100,
    features.expectedValueHome / 100,
    features.expectedValueAway / 100,
    features.expectedValueDraw / 100,
    features.sharpMoneyIndicator / 100,
    features.reversLineMovement ? 1 : 0,
    features.steamMove ? 1 : 0,
    features.publicPercentageHome / 100,
    features.publicPercentageAway / 100,
    features.arbitrageOpportunity ? 1 : 0,
    features.arbitrageProfit / 100,
    features.kellyCriterionHome,
    features.kellyCriterionAway,
    features.sharpeRatioEstimate,
  ];
}

/**
 * Feature importance for betting models
 */
export const BETTING_FEATURE_IMPORTANCE = {
  impliedProbHome: 0.95,
  impliedProbDraw: 0.85,
  impliedProbAway: 0.95,
  bookmakMargin: 0.75,
  overround: 0.70,
  marketEfficiency: 0.80,
  priceDiscrepancy: 0.65,
  oddsMovementHome: 0.85,
  oddsMovementAway: 0.85,
  closingLineMomentum: 0.90,
  expectedValueHome: 1.0,
  expectedValueAway: 1.0,
  expectedValueDraw: 0.95,
  sharpMoneyIndicator: 0.92,
  reversLineMovement: 0.88,
  steamMove: 0.85,
  publicPercentageHome: 0.70,
  publicPercentageAway: 0.70,
  arbitrageOpportunity: 1.0,
  arbitrageProfit: 0.98,
  kellyCriterionHome: 0.93,
  kellyCriterionAway: 0.93,
  sharpeRatioEstimate: 0.87,
};

export default {
  extractBettingFeatures,
  detectLineShoppingOpportunities,
  analyzePublicSharpDivergence,
  createBettingFeatureVector,
  BETTING_FEATURE_IMPORTANCE,
};
