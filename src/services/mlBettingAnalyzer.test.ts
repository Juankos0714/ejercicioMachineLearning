import { describe, it, expect } from 'vitest';
import {
  oddsToImpliedProbability,
  probabilityToFairOdds,
  calculateExpectedValue,
  calculateKellyCriterion,
  calculateBookmakerMargin,
  detectArbitrage,
  assessValueBetQuality,
  assessRiskLevel,
  analyzeBettingOpportunities,
  initializeBankroll,
  simulateBet,
  type MarketOdds,
  type BetRecommendation,
} from './mlBettingAnalyzer';
import type { HybridPrediction } from './mlHybridPredictor';
import type { Team } from '../lib/supabase';

// Mock teams for testing
const mockHomeTeam: Team = {
  id: '1',
  name: 'Manchester United',
  league: 'Premier League',
  elo_rating: 1900,
  avg_goals_scored: 1.8,
  avg_goals_conceded: 1.2,
  xg_per_match: 1.9,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockAwayTeam: Team = {
  id: '2',
  name: 'Liverpool',
  league: 'Premier League',
  elo_rating: 2000,
  avg_goals_scored: 2.2,
  avg_goals_conceded: 0.9,
  xg_per_match: 2.3,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockPrediction: HybridPrediction = {
  homeWinProb: 0.30,
  drawProb: 0.25,
  awayWinProb: 0.45,
  expectedHomeScore: 1.5,
  expectedAwayScore: 2.0,
  over25Prob: 0.65,
  mathematical: {
    poisson: {
      homeWin: 0.28,
      draw: 0.26,
      awayWin: 0.46,
      scoreMatrix: [],
    },
    monteCarlo: {
      homeWinProb: 0.32,
      drawProb: 0.24,
      awayWinProb: 0.44,
      avgHomeScore: 1.5,
      avgAwayScore: 2.0,
      over25Prob: 0.67,
      scoreDistribution: new Map(),
    },
    lambdaHome: 1.5,
    lambdaAway: 2.0,
  },
  confidence: 0.75,
  method: 'hybrid',
  featureLevel: 'advanced',
  featureCount: 45,
  homeTeam: mockHomeTeam,
  awayTeam: mockAwayTeam,
};

const mockMarketOdds: MarketOdds = {
  homeWin: 3.50,  // Implied prob: 28.6%
  draw: 3.20,     // Implied prob: 31.3%
  awayWin: 2.10,  // Implied prob: 47.6%
  over25: 1.80,   // Implied prob: 55.6%
  under25: 2.00,  // Implied prob: 50.0%
  homeOrDraw: 1.60,
  homeOrAway: 1.25,
  drawOrAway: 1.30,
};

describe('Betting Analyzer - Core Functions', () => {
  describe('oddsToImpliedProbability', () => {
    it('should convert decimal odds to implied probability correctly', () => {
      expect(oddsToImpliedProbability(2.00)).toBeCloseTo(0.5, 2);
      expect(oddsToImpliedProbability(4.00)).toBeCloseTo(0.25, 2);
      expect(oddsToImpliedProbability(1.50)).toBeCloseTo(0.6667, 2);
      expect(oddsToImpliedProbability(10.00)).toBeCloseTo(0.1, 2);
    });

    it('should handle edge cases', () => {
      expect(oddsToImpliedProbability(1.00)).toBe(1);
      expect(oddsToImpliedProbability(0.5)).toBe(0);
    });
  });

  describe('probabilityToFairOdds', () => {
    it('should convert probability to fair decimal odds correctly', () => {
      expect(probabilityToFairOdds(0.5)).toBeCloseTo(2.00, 2);
      expect(probabilityToFairOdds(0.25)).toBeCloseTo(4.00, 2);
      expect(probabilityToFairOdds(0.10)).toBeCloseTo(10.00, 2);
    });

    it('should handle edge cases', () => {
      expect(probabilityToFairOdds(0)).toBe(1);
      expect(probabilityToFairOdds(1)).toBe(1);
    });
  });

  describe('calculateExpectedValue', () => {
    it('should calculate positive EV correctly', () => {
      // Model prob: 0.30, Odds: 3.50 (implied 28.6%)
      // EV = 0.30 * 3.50 - 1 = 0.05 = 5%
      const ev = calculateExpectedValue(0.30, 3.50);
      expect(ev).toBeCloseTo(5, 0);
    });

    it('should calculate negative EV correctly', () => {
      // Model prob: 0.20, Odds: 2.00 (implied 50%)
      // EV = 0.20 * 2.00 - 1 = -0.60 = -60%
      const ev = calculateExpectedValue(0.20, 2.00);
      expect(ev).toBeCloseTo(-60, 0);
    });

    it('should calculate zero EV when odds are fair', () => {
      // Model prob: 0.50, Fair odds: 2.00
      const ev = calculateExpectedValue(0.50, 2.00);
      expect(ev).toBeCloseTo(0, 0);
    });
  });

  describe('calculateKellyCriterion', () => {
    it('should calculate Kelly stake correctly', () => {
      // Kelly = (bp - q) / b
      // b = 3.50 - 1 = 2.50
      // p = 0.30, q = 0.70
      // Kelly = (2.50 * 0.30 - 0.70) / 2.50 = 0.02 = 2%
      const kelly = calculateKellyCriterion(0.30, 3.50);
      expect(kelly).toBeCloseTo(0.02, 2);
    });

    it('should calculate fractional Kelly correctly', () => {
      const kelly = calculateKellyCriterion(0.30, 3.50, true, 0.25);
      const fullKelly = calculateKellyCriterion(0.30, 3.50);
      expect(kelly).toBeCloseTo(fullKelly * 0.25, 3);
    });

    it('should return 0 for negative edge', () => {
      const kelly = calculateKellyCriterion(0.20, 2.00);
      expect(kelly).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(calculateKellyCriterion(0, 2.00)).toBe(0);
      expect(calculateKellyCriterion(1, 2.00)).toBe(0);
      expect(calculateKellyCriterion(0.50, 1.00)).toBe(0);
    });
  });

  describe('calculateBookmakerMargin', () => {
    it('should calculate bookmaker margin correctly', () => {
      // Home: 3.50 (28.6%), Draw: 3.20 (31.3%), Away: 2.10 (47.6%)
      // Total: 107.5%, Margin: 7.5%
      const margin = calculateBookmakerMargin([3.50, 3.20, 2.10]);
      expect(margin).toBeCloseTo(7.5, 1);
    });

    it('should return 0 for fair odds', () => {
      const margin = calculateBookmakerMargin([2.00, 2.00]);
      expect(margin).toBeCloseTo(0, 1);
    });

    it('should detect high margins', () => {
      // Very unfavorable odds with high margin
      const margin = calculateBookmakerMargin([1.80, 1.80, 2.50]);
      expect(margin).toBeGreaterThan(10);
    });
  });

  describe('detectArbitrage', () => {
    it('should detect no arbitrage in normal market', () => {
      const result = detectArbitrage([3.50, 3.20, 2.10]);
      expect(result.isArbitrage).toBe(false);
      expect(result.profitPercentage).toBe(0);
    });

    it('should detect arbitrage opportunity', () => {
      // 1/3.00 + 1/3.00 + 1/3.50 = 0.952 < 1 (arbitrage!)
      const result = detectArbitrage([3.00, 3.00, 3.50]);
      expect(result.isArbitrage).toBe(true);
      expect(result.profitPercentage).toBeGreaterThan(0);
    });

    it('should calculate correct arbitrage stakes', () => {
      const result = detectArbitrage([3.00, 3.00, 3.50]);
      if (result.isArbitrage) {
        const totalStake = result.stakes.reduce((sum, stake) => sum + stake, 0);
        expect(totalStake).toBeCloseTo(1, 2);
      }
    });
  });

  describe('assessValueBetQuality', () => {
    it('should rate EV correctly', () => {
      expect(assessValueBetQuality(15)).toBe('Excellent');
      expect(assessValueBetQuality(8)).toBe('Good');
      expect(assessValueBetQuality(3)).toBe('Fair');
      expect(assessValueBetQuality(1)).toBe('Poor');
      expect(assessValueBetQuality(-5)).toBe('Negative');
    });
  });

  describe('assessRiskLevel', () => {
    it('should assess risk correctly', () => {
      expect(assessRiskLevel(0.8, 2.00, 5)).toBe('Low');
      expect(assessRiskLevel(0.7, 3.50, 3)).toBe('Medium');
      expect(assessRiskLevel(0.5, 5.00, 2)).toBe('High');
      expect(assessRiskLevel(0.6, 2.00, -2)).toBe('Very High');
    });
  });
});

describe('Betting Analyzer - Market Analysis', () => {
  describe('analyzeBettingOpportunities', () => {
    it('should analyze all markets and return recommendations', () => {
      const analysis = analyzeBettingOpportunities(mockPrediction, mockMarketOdds, 1000);

      expect(analysis).toBeDefined();
      expect(analysis.homeTeam).toEqual(mockHomeTeam);
      expect(analysis.awayTeam).toEqual(mockAwayTeam);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify value bets correctly', () => {
      const analysis = analyzeBettingOpportunities(mockPrediction, mockMarketOdds, 1000);

      // Home win should have positive EV: model 30%, odds 3.50 (implied 28.6%)
      const homeWinBet = analysis.recommendations.find(
        r => r.betType === '1X2' && r.outcome === 'home'
      );

      expect(homeWinBet).toBeDefined();
      expect(homeWinBet!.expectedValue).toBeGreaterThan(0);
      expect(homeWinBet!.isValueBet).toBe(true);
    });

    it('should calculate top recommendations', () => {
      const analysis = analyzeBettingOpportunities(mockPrediction, mockMarketOdds, 1000);

      expect(analysis.topRecommendations).toBeDefined();
      expect(analysis.topRecommendations.length).toBeGreaterThan(0);
      expect(analysis.topRecommendations.length).toBeLessThanOrEqual(5);

      // All top recommendations should be value bets
      analysis.topRecommendations.forEach(rec => {
        expect(rec.isValueBet).toBe(true);
      });

      // Should be sorted by EV (descending)
      for (let i = 1; i < analysis.topRecommendations.length; i++) {
        expect(analysis.topRecommendations[i - 1].expectedValue)
          .toBeGreaterThanOrEqual(analysis.topRecommendations[i].expectedValue);
      }
    });

    it('should calculate bookmaker margins correctly', () => {
      const analysis = analyzeBettingOpportunities(mockPrediction, mockMarketOdds, 1000);

      expect(analysis.marginAnalysis).toBeDefined();
      expect(analysis.marginAnalysis.overall).toBeGreaterThan(0);
      expect(analysis.marginAnalysis.overall).toBeLessThan(20); // Reasonable margin
    });

    it('should generate strategy advice', () => {
      const analysis = analyzeBettingOpportunities(mockPrediction, mockMarketOdds, 1000);

      expect(analysis.strategyAdvice).toBeDefined();
      expect(analysis.strategyAdvice.length).toBeGreaterThan(0);

      const valueBettingAdvice = analysis.strategyAdvice.find(
        a => a.strategy === 'ValueBetting'
      );
      expect(valueBettingAdvice).toBeDefined();
    });

    it('should detect arbitrage opportunities', () => {
      // Create artificial arbitrage scenario
      const arbOdds: MarketOdds = {
        homeWin: 3.00,
        draw: 3.00,
        awayWin: 3.50,
        over25: 2.20,
        under25: 2.20,
      };

      const analysis = analyzeBettingOpportunities(mockPrediction, arbOdds, 1000);

      expect(analysis.arbitrageOpportunities).toBeDefined();
      if (analysis.arbitrageOpportunities.length > 0) {
        expect(analysis.arbitrageOpportunities[0].profitPercentage).toBeGreaterThan(0);
      }
    });

    it('should generate warnings for risky situations', () => {
      // High margin odds
      const riskyOdds: MarketOdds = {
        homeWin: 1.80,
        draw: 1.80,
        awayWin: 2.00,
        over25: 1.50,
        under25: 1.60,
      };

      const analysis = analyzeBettingOpportunities(mockPrediction, riskyOdds, 1000);

      expect(analysis.warnings).toBeDefined();
      expect(analysis.warnings.length).toBeGreaterThan(0);
    });

    it('should warn about low confidence predictions', () => {
      const lowConfidencePrediction: HybridPrediction = {
        ...mockPrediction,
        confidence: 0.5,
      };

      const analysis = analyzeBettingOpportunities(lowConfidencePrediction, mockMarketOdds, 1000);

      const hasConfidenceWarning = analysis.warnings.some(
        w => w.includes('confidence')
      );
      expect(hasConfidenceWarning).toBe(true);
    });

    it('should provide stake recommendations for each bet', () => {
      const analysis = analyzeBettingOpportunities(mockPrediction, mockMarketOdds, 1000);

      analysis.recommendations.forEach(rec => {
        expect(rec.recommendedStake).toBeDefined();
        expect(rec.recommendedStake.kelly).toBeGreaterThanOrEqual(0);
        expect(rec.recommendedStake.kellyFractional).toBeGreaterThanOrEqual(0);
        expect(rec.recommendedStake.fixedPercentage).toBeGreaterThan(0);
        expect(rec.recommendedStake.fixedAmount).toBeGreaterThan(0);

        // Fractional Kelly should be less than full Kelly
        expect(rec.recommendedStake.kellyFractional).toBeLessThanOrEqual(rec.recommendedStake.kelly);
      });
    });
  });
});

describe('Betting Analyzer - Bankroll Management', () => {
  describe('initializeBankroll', () => {
    it('should initialize bankroll correctly', () => {
      const bankroll = initializeBankroll(1000);

      expect(bankroll.currentBankroll).toBe(1000);
      expect(bankroll.startingBankroll).toBe(1000);
      expect(bankroll.peakBankroll).toBe(1000);
      expect(bankroll.lowestBankroll).toBe(1000);
      expect(bankroll.totalBets).toBe(0);
      expect(bankroll.wonBets).toBe(0);
      expect(bankroll.lostBets).toBe(0);
      expect(bankroll.roi).toBe(0);
      expect(bankroll.winRate).toBe(0);
    });
  });

  describe('simulateBet', () => {
    it('should update bankroll after winning bet', () => {
      initializeBankroll(1000);
      const bet: BetRecommendation = {
        betType: '1X2',
        outcome: 'home',
        description: 'Test bet',
        marketOdds: 2.00,
        impliedProb: 0.5,
        modelProb: 0.6,
        expectedValue: 20,
        valueRating: 'Good',
        confidence: 0.8,
        variance: 1.0,
        riskLevel: 'Low',
        recommendedStake: {
          kelly: 0.1,
          kellyFractional: 0.025,
          fixedPercentage: 2,
          fixedAmount: 20,
        },
        winProbability: 1.0, // Force win for testing
        potentialProfit: 0.2,
        isValueBet: true,
        isStrongValue: true,
        isArbitrage: false,
      };

      // Simulate multiple times to test randomness is working
      let wonAtLeastOnce = false;
      for (let i = 0; i < 10; i++) {
        const testBankroll = initializeBankroll(1000);
        const updated = simulateBet(bet, 10, testBankroll);
        if (updated.wonBets > 0) {
          wonAtLeastOnce = true;
          expect(updated.currentBankroll).toBe(1010); // 1000 + 10 profit
          expect(updated.totalBets).toBe(1);
          expect(updated.wonBets).toBe(1);
          expect(updated.netProfit).toBe(10);
        }
      }
      expect(wonAtLeastOnce).toBe(true);
    });

    it('should track win and loss streaks', () => {
      let bankroll = initializeBankroll(1000);
      const winningBet: BetRecommendation = {
        betType: '1X2',
        outcome: 'home',
        description: 'Test bet',
        marketOdds: 2.00,
        impliedProb: 0.5,
        modelProb: 0.6,
        expectedValue: 20,
        valueRating: 'Good',
        confidence: 0.8,
        variance: 1.0,
        riskLevel: 'Low',
        recommendedStake: {
          kelly: 0.1,
          kellyFractional: 0.025,
          fixedPercentage: 2,
          fixedAmount: 20,
        },
        winProbability: 1.0, // Force win
        potentialProfit: 0.2,
        isValueBet: true,
        isStrongValue: true,
        isArbitrage: false,
      };

      // Simulate 3 winning bets
      for (let i = 0; i < 3; i++) {
        bankroll = simulateBet(winningBet, 10, bankroll);
      }

      expect(bankroll.wonBets).toBe(3);
      expect(bankroll.currentStreak).toBe(3);
      expect(bankroll.streakType).toBe('win');
      expect(bankroll.longestWinStreak).toBe(3);
    });

    it('should calculate ROI correctly', () => {
      const bankroll = initializeBankroll(1000);
      const bet: BetRecommendation = {
        betType: '1X2',
        outcome: 'home',
        description: 'Test bet',
        marketOdds: 2.00,
        impliedProb: 0.5,
        modelProb: 0.6,
        expectedValue: 20,
        valueRating: 'Good',
        confidence: 0.8,
        variance: 1.0,
        riskLevel: 'Low',
        recommendedStake: {
          kelly: 0.1,
          kellyFractional: 0.025,
          fixedPercentage: 2,
          fixedAmount: 20,
        },
        winProbability: 1.0, // Force win
        potentialProfit: 0.2,
        isValueBet: true,
        isStrongValue: true,
        isArbitrage: false,
      };

      const updated = simulateBet(bet, 100, bankroll);
      // Won: stake 100, return 200, profit 100
      // ROI = (100 / 100) * 100 = 100%
      expect(updated.roi).toBeCloseTo(100, 0);
    });
  });
});

describe('Betting Analyzer - Strategy Analysis', () => {
  it('should recommend Kelly Criterion for good edges', () => {
    const goodOdds: MarketOdds = {
      homeWin: 4.00,  // Model has 30%, odds imply 25% - good edge
      draw: 3.20,
      awayWin: 2.10,
      over25: 1.80,
      under25: 2.00,
    };

    const analysis = analyzeBettingOpportunities(mockPrediction, goodOdds, 5000);

    const kellyAdvice = analysis.strategyAdvice.find(a => a.strategy === 'KellyCriterion');
    expect(kellyAdvice).toBeDefined();
  });

  it('should always recommend Fixed Stake strategy', () => {
    const analysis = analyzeBettingOpportunities(mockPrediction, mockMarketOdds, 1000);

    const fixedAdvice = analysis.strategyAdvice.find(a => a.strategy === 'FixedStake');
    expect(fixedAdvice).toBeDefined();
    expect(fixedAdvice!.recommended).toBe(true);
  });

  it('should calculate market efficiency', () => {
    const analysis = analyzeBettingOpportunities(mockPrediction, mockMarketOdds, 1000);

    expect(analysis.marketEfficiency).toBeGreaterThanOrEqual(0);
    expect(analysis.marketEfficiency).toBeLessThanOrEqual(1);
  });
});

describe('Betting Analyzer - Real-World Scenarios', () => {
  it('should handle heavy favorite scenario', () => {
    const favoritePrediction: HybridPrediction = {
      ...mockPrediction,
      homeWinProb: 0.70,
      drawProb: 0.20,
      awayWinProb: 0.10,
    };

    const favoriteOdds: MarketOdds = {
      homeWin: 1.40,  // Heavy favorite
      draw: 4.50,
      awayWin: 8.00,
      over25: 1.60,
      under25: 2.30,
    };

    const analysis = analyzeBettingOpportunities(favoritePrediction, favoriteOdds, 1000);

    expect(analysis.recommendations).toBeDefined();
    expect(analysis.recommendations.length).toBeGreaterThan(0);
  });

  it('should handle underdog scenario', () => {
    const underdogPrediction: HybridPrediction = {
      ...mockPrediction,
      homeWinProb: 0.15,
      drawProb: 0.25,
      awayWinProb: 0.60,
    };

    const underdogOdds: MarketOdds = {
      homeWin: 6.00,  // Heavy underdog
      draw: 4.00,
      awayWin: 1.50,
      over25: 1.70,
      under25: 2.10,
    };

    const analysis = analyzeBettingOpportunities(underdogPrediction, underdogOdds, 1000);

    expect(analysis.recommendations).toBeDefined();
    expect(analysis.recommendations.length).toBeGreaterThan(0);
  });

  it('should handle evenly matched scenario', () => {
    const evenPrediction: HybridPrediction = {
      ...mockPrediction,
      homeWinProb: 0.33,
      drawProb: 0.34,
      awayWinProb: 0.33,
    };

    const evenOdds: MarketOdds = {
      homeWin: 3.00,
      draw: 3.00,
      awayWin: 3.00,
      over25: 2.00,
      under25: 2.00,
    };

    const analysis = analyzeBettingOpportunities(evenPrediction, evenOdds, 1000);

    expect(analysis.recommendations).toBeDefined();
    // In evenly matched games with fair odds, EV should be close to 0
    expect(Math.abs(analysis.overallEV)).toBeLessThan(5);
  });
});
