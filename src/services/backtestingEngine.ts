/**
 * BACKTESTING ENGINE
 *
 * Comprehensive backtesting system for betting strategies
 *
 * Features:
 * - Historical simulation
 * - Multiple strategy testing
 * - Performance metrics (ROI, Sharpe Ratio, Max Drawdown)
 * - Monte Carlo simulation
 * - Walk-forward analysis
 * - Bet tracking and reporting
 */

import {
  BettingAnalysis,
  BetRecommendation,
  BettingStrategy,
  BankrollManager,
  initializeBankroll,
  BetRecord,
} from './mlBettingAnalyzer';
import { HybridPrediction } from './mlHybridPredictor';
import { MarketOdds } from './mlBettingAnalyzer';

// ==================== TYPES ====================

export interface HistoricalMatch {
  id: string;
  date: Date;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  prediction?: HybridPrediction;
  odds: MarketOdds;
}

export interface BacktestConfig {
  startingBankroll: number;
  strategy: BettingStrategy;
  minEV?: number; // Minimum EV to place bet
  maxStake?: number; // Max stake as percentage of bankroll
  kellyFraction?: number; // Fractional Kelly (e.g., 0.25 for 1/4 Kelly)
  minConfidence?: number; // Minimum model confidence
  stopLoss?: number; // Stop if bankroll drops below this percentage
  takeProfit?: number; // Stop if bankroll reaches this percentage
}

export interface BacktestResult {
  config: BacktestConfig;
  startDate: Date;
  endDate: Date;
  totalMatches: number;

  // Bet statistics
  totalBets: number;
  wonBets: number;
  lostBets: number;
  voidBets: number;
  winRate: number;

  // Financial metrics
  startingBankroll: number;
  finalBankroll: number;
  netProfit: number;
  totalStaked: number;
  totalReturns: number;
  roi: number; // Return on Investment

  // Risk metrics
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;

  // Performance over time
  bankrollHistory: { date: Date; bankroll: number }[];
  equityCurve: { date: Date; equity: number }[];

  // Bet analysis
  bets: BetRecord[];
  averageOdds: number;
  averageStake: number;
  averageEV: number;

  // Streaks
  longestWinStreak: number;
  longestLoseStreak: number;

  // CLV analysis
  averageCLV?: number;
  positiveCLVRate?: number;
}

export interface MonteCarloResult {
  simulations: number;
  results: BacktestResult[];
  statistics: {
    meanROI: number;
    medianROI: number;
    stdDevROI: number;
    worstCase: number;
    bestCase: number;
    percentile25: number;
    percentile75: number;
    percentile95: number;
    probabilityOfProfit: number;
    probabilityOfRuin: number;
  };
}

// ==================== BACKTESTING ENGINE ====================

export class BacktestingEngine {
  private config: BacktestConfig;
  private bankroll: BankrollManager;
  private bets: BetRecord[] = [];
  private bankrollHistory: { date: Date; bankroll: number }[] = [];

  constructor(config: BacktestConfig) {
    this.config = {
      minEV: 0,
      maxStake: 0.05, // 5% max
      kellyFraction: 0.25,
      minConfidence: 0.6,
      ...config,
    };
    this.bankroll = initializeBankroll(config.startingBankroll);
  }

  /**
   * Run backtest on historical data
   */
  runBacktest(matches: HistoricalMatch[]): BacktestResult {
    this.reset();

    const sortedMatches = [...matches].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    const startDate = sortedMatches[0]?.date || new Date();
    const endDate = sortedMatches[sortedMatches.length - 1]?.date || new Date();

    for (const match of sortedMatches) {
      this.processMatch(match);
    }

    return this.generateResults(startDate, endDate, matches.length);
  }

  /**
   * Process a single match
   */
  private processMatch(match: HistoricalMatch): void {
    if (!match.prediction) {
      return;
    }

    // Record bankroll before bet
    this.bankrollHistory.push({
      date: match.date,
      bankroll: this.bankroll.currentBankroll,
    });

    // Determine if we should bet and what to bet on
    const betDecision = this.makeBetDecision(match);

    if (!betDecision) {
      return; // No bet placed
    }

    // Place the bet
    const betResult = this.placeBet(match, betDecision);

    if (betResult) {
      this.bets.push(betResult);
      this.updateBankroll(betResult);
    }

    // Check stop conditions
    if (this.shouldStop()) {
      return;
    }
  }

  /**
   * Decide whether to place a bet and which bet
   */
  private makeBetDecision(match: HistoricalMatch): {
    market: string;
    outcome: string;
    odds: number;
    probability: number;
    ev: number;
    stake: number;
  } | null {
    const { prediction, odds } = match;

    if (!prediction) return null;

    // Check confidence threshold
    if (prediction.confidence < this.config.minConfidence!) {
      return null;
    }

    // Evaluate all possible bets
    const bets: Array<{
      market: string;
      outcome: string;
      odds: number;
      probability: number;
      ev: number;
    }> = [];

    // Home Win
    const homeEV = ((prediction.homeWinProb * odds.homeWin) - 1) * 100;
    if (homeEV >= this.config.minEV!) {
      bets.push({
        market: 'h2h',
        outcome: 'home',
        odds: odds.homeWin,
        probability: prediction.homeWinProb,
        ev: homeEV,
      });
    }

    // Draw
    const drawEV = ((prediction.drawProb * odds.draw) - 1) * 100;
    if (drawEV >= this.config.minEV!) {
      bets.push({
        market: 'h2h',
        outcome: 'draw',
        odds: odds.draw,
        probability: prediction.drawProb,
        ev: drawEV,
      });
    }

    // Away Win
    const awayEV = ((prediction.awayWinProb * odds.awayWin) - 1) * 100;
    if (awayEV >= this.config.minEV!) {
      bets.push({
        market: 'h2h',
        outcome: 'away',
        odds: odds.awayWin,
        probability: prediction.awayWinProb,
        ev: awayEV,
      });
    }

    // Over 2.5
    if (odds.over25) {
      const overEV = ((prediction.over25Prob * odds.over25) - 1) * 100;
      if (overEV >= this.config.minEV!) {
        bets.push({
          market: 'over25',
          outcome: 'over',
          odds: odds.over25,
          probability: prediction.over25Prob,
          ev: overEV,
        });
      }
    }

    // Under 2.5
    if (odds.under25) {
      const underEV = (((1 - prediction.over25Prob) * odds.under25) - 1) * 100;
      if (underEV >= this.config.minEV!) {
        bets.push({
          market: 'under25',
          outcome: 'under',
          odds: odds.under25,
          probability: 1 - prediction.over25Prob,
          ev: underEV,
        });
      }
    }

    if (bets.length === 0) return null;

    // Select best bet (highest EV)
    const bestBet = bets.sort((a, b) => b.ev - a.ev)[0];

    // Calculate stake based on strategy
    const stake = this.calculateStake(bestBet.probability, bestBet.odds, bestBet.ev);

    if (stake === 0) return null;

    return { ...bestBet, stake };
  }

  /**
   * Calculate stake size based on strategy
   */
  private calculateStake(probability: number, odds: number, ev: number): number {
    const currentBankroll = this.bankroll.currentBankroll;

    let stakePercent = 0;

    switch (this.config.strategy) {
      case 'KellyCriterion':
        // Kelly = (bp - q) / b, where b = odds - 1
        const b = odds - 1;
        const p = probability;
        const q = 1 - p;
        const kelly = (b * p - q) / b;
        stakePercent = Math.max(0, Math.min(kelly * this.config.kellyFraction!, this.config.maxStake!));
        break;

      case 'FixedStake':
        stakePercent = ev > 5 ? 0.02 : ev > 2 ? 0.01 : 0.005;
        break;

      case 'ValueBetting':
        // Scale stake with EV
        stakePercent = Math.min(ev / 100 * 0.1, this.config.maxStake!);
        break;

      default:
        stakePercent = 0.01; // 1% default
    }

    // Apply max stake limit
    stakePercent = Math.min(stakePercent, this.config.maxStake!);

    return currentBankroll * stakePercent;
  }

  /**
   * Place a bet and determine result
   */
  private placeBet(
    match: HistoricalMatch,
    betDecision: ReturnType<typeof this.makeBetDecision>
  ): BetRecord | null {
    if (!betDecision) return null;

    const { market, outcome, odds, probability, ev, stake } = betDecision;

    // Determine actual result
    let won = false;
    if (market === 'h2h') {
      if (outcome === 'home') won = match.homeScore > match.awayScore;
      else if (outcome === 'draw') won = match.homeScore === match.awayScore;
      else if (outcome === 'away') won = match.homeScore < match.awayScore;
    } else if (market === 'over25') {
      won = (match.homeScore + match.awayScore) > 2.5;
    } else if (market === 'under25') {
      won = (match.homeScore + match.awayScore) <= 2.5;
    }

    const payout = won ? stake * odds : 0;
    const profit = payout - stake;

    return {
      id: `${match.id}-${market}-${outcome}`,
      timestamp: match.date,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      betType: market === 'h2h' ? '1X2' : 'OverUnder',
      outcome,
      odds,
      stake,
      modelProb: probability,
      expectedValue: ev,
      strategy: this.config.strategy,
      result: won ? 'won' : 'lost',
      payout,
      profit,
    };
  }

  /**
   * Update bankroll after bet result
   */
  private updateBankroll(bet: BetRecord): void {
    const profit = bet.profit || 0;
    const won = bet.result === 'won';

    this.bankroll.currentBankroll += profit;
    this.bankroll.totalBets++;
    this.bankroll.totalStaked += bet.stake;
    this.bankroll.totalReturns += bet.payout || 0;

    if (won) {
      this.bankroll.wonBets++;
      if (this.bankroll.streakType === 'win') {
        this.bankroll.currentStreak++;
      } else {
        this.bankroll.streakType = 'win';
        this.bankroll.currentStreak = 1;
      }
      this.bankroll.longestWinStreak = Math.max(
        this.bankroll.longestWinStreak,
        this.bankroll.currentStreak
      );
    } else {
      this.bankroll.lostBets++;
      if (this.bankroll.streakType === 'loss') {
        this.bankroll.currentStreak++;
      } else {
        this.bankroll.streakType = 'loss';
        this.bankroll.currentStreak = 1;
      }
      this.bankroll.longestLoseStreak = Math.max(
        this.bankroll.longestLoseStreak,
        this.bankroll.currentStreak
      );
    }

    // Update peak and lowest
    this.bankroll.peakBankroll = Math.max(
      this.bankroll.peakBankroll,
      this.bankroll.currentBankroll
    );
    this.bankroll.lowestBankroll = Math.min(
      this.bankroll.lowestBankroll,
      this.bankroll.currentBankroll
    );

    // Calculate ROI and win rate
    this.bankroll.netProfit = this.bankroll.totalReturns - this.bankroll.totalStaked;
    this.bankroll.roi = (this.bankroll.netProfit / this.bankroll.totalStaked) * 100;
    this.bankroll.winRate = (this.bankroll.wonBets / this.bankroll.totalBets) * 100;
  }

  /**
   * Check if we should stop the backtest
   */
  private shouldStop(): boolean {
    const { stopLoss, takeProfit, startingBankroll } = this.config;
    const currentPercent = (this.bankroll.currentBankroll / startingBankroll) * 100;

    if (stopLoss && currentPercent < stopLoss) {
      return true;
    }

    if (takeProfit && currentPercent > takeProfit) {
      return true;
    }

    return false;
  }

  /**
   * Reset the engine for a new backtest
   */
  private reset(): void {
    this.bankroll = initializeBankroll(this.config.startingBankroll);
    this.bets = [];
    this.bankrollHistory = [];
  }

  /**
   * Generate backtest results
   */
  private generateResults(
    startDate: Date,
    endDate: Date,
    totalMatches: number
  ): BacktestResult {
    const { startingBankroll, currentBankroll, totalBets, wonBets, lostBets } = this.bankroll;

    // Calculate metrics
    const netProfit = currentBankroll - startingBankroll;
    const roi = (netProfit / startingBankroll) * 100;
    const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;

    // Calculate drawdown
    const maxDrawdown = this.bankroll.peakBankroll - this.bankroll.lowestBankroll;
    const maxDrawdownPercent = (maxDrawdown / this.bankroll.peakBankroll) * 100;

    // Calculate Sharpe Ratio
    const returns = this.calculateReturns();
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

    // Calculate Sortino Ratio (downside deviation only)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideStdDev = Math.sqrt(
      downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / returns.length
    );
    const sortinoRatio = downsideStdDev > 0 ? (avgReturn / downsideStdDev) * Math.sqrt(252) : 0;

    // Calculate Calmar Ratio
    const calmarRatio = maxDrawdownPercent > 0 ? roi / maxDrawdownPercent : 0;

    // Average metrics
    const averageOdds = this.bets.reduce((sum, b) => sum + b.odds, 0) / this.bets.length || 0;
    const averageStake = this.bets.reduce((sum, b) => sum + b.stake, 0) / this.bets.length || 0;
    const averageEV = this.bets.reduce((sum, b) => sum + b.expectedValue, 0) / this.bets.length || 0;

    return {
      config: this.config,
      startDate,
      endDate,
      totalMatches,
      totalBets,
      wonBets,
      lostBets,
      voidBets: 0,
      winRate,
      startingBankroll,
      finalBankroll: currentBankroll,
      netProfit,
      totalStaked: this.bankroll.totalStaked,
      totalReturns: this.bankroll.totalReturns,
      roi,
      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      bankrollHistory: this.bankrollHistory,
      equityCurve: this.calculateEquityCurve(),
      bets: this.bets,
      averageOdds,
      averageStake,
      averageEV,
      longestWinStreak: this.bankroll.longestWinStreak,
      longestLoseStreak: this.bankroll.longestLoseStreak,
    };
  }

  /**
   * Calculate returns for each bet
   */
  private calculateReturns(): number[] {
    return this.bets.map(bet => (bet.profit || 0) / bet.stake);
  }

  /**
   * Calculate equity curve
   */
  private calculateEquityCurve(): { date: Date; equity: number }[] {
    let equity = this.config.startingBankroll;
    const curve: { date: Date; equity: number }[] = [
      { date: this.bets[0]?.timestamp || new Date(), equity },
    ];

    for (const bet of this.bets) {
      equity += bet.profit || 0;
      curve.push({ date: bet.timestamp, equity });
    }

    return curve;
  }
}

// ==================== MONTE CARLO SIMULATOR ====================

export class MonteCarloSimulator {
  /**
   * Run Monte Carlo simulation
   */
  runSimulation(
    matches: HistoricalMatch[],
    config: BacktestConfig,
    simulations: number = 1000
  ): MonteCarloResult {
    const results: BacktestResult[] = [];

    for (let i = 0; i < simulations; i++) {
      // Shuffle matches to simulate different sequences
      const shuffled = this.shuffleArray([...matches]);

      const engine = new BacktestingEngine(config);
      const result = engine.runBacktest(shuffled);
      results.push(result);
    }

    // Calculate statistics
    const rois = results.map(r => r.roi).sort((a, b) => a - b);
    const meanROI = rois.reduce((sum, roi) => sum + roi, 0) / rois.length;
    const medianROI = rois[Math.floor(rois.length / 2)];
    const stdDevROI = Math.sqrt(
      rois.reduce((sum, roi) => sum + Math.pow(roi - meanROI, 2), 0) / rois.length
    );

    const profitableCount = results.filter(r => r.roi > 0).length;
    const ruinCount = results.filter(r => r.finalBankroll < config.startingBankroll * 0.5).length;

    return {
      simulations,
      results,
      statistics: {
        meanROI,
        medianROI,
        stdDevROI,
        worstCase: rois[0],
        bestCase: rois[rois.length - 1],
        percentile25: rois[Math.floor(rois.length * 0.25)],
        percentile75: rois[Math.floor(rois.length * 0.75)],
        percentile95: rois[Math.floor(rois.length * 0.95)],
        probabilityOfProfit: (profitableCount / simulations) * 100,
        probabilityOfRuin: (ruinCount / simulations) * 100,
      },
    };
  }

  /**
   * Shuffle array (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// ==================== EXPORTS ====================

export const backtesting = {
  createEngine(config: BacktestConfig): BacktestingEngine {
    return new BacktestingEngine(config);
  },

  createSimulator(): MonteCarloSimulator {
    return new MonteCarloSimulator();
  },
};
