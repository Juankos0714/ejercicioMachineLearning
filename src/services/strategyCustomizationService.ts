/**
 * STRATEGY CUSTOMIZATION SERVICE
 *
 * Service for creating and managing custom betting strategies
 *
 * Features:
 * - Custom strategy builder
 * - Strategy templates
 * - Risk profile configuration
 * - Market selection rules
 * - Stake sizing customization
 * - Strategy backtesting
 */

import { BettingStrategy, BetRecommendation, MarketOdds } from './mlBettingAnalyzer';
import { HybridPrediction } from './mlHybridPredictor';
import { UserPreferences, userPreferencesService } from './historicalDataService';

// ==================== TYPES ====================

export interface StrategyRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: RuleCondition;
  action: RuleAction;
}

export interface RuleCondition {
  type: 'ev' | 'confidence' | 'odds' | 'market' | 'team' | 'league' | 'composite';
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number | string | boolean;
  logicOperator?: 'AND' | 'OR'; // For composite conditions
  conditions?: RuleCondition[]; // For composite conditions
}

export interface RuleAction {
  type: 'bet' | 'skip' | 'adjust_stake' | 'alert';
  stakeMultiplier?: number; // For adjust_stake
  minStake?: number;
  maxStake?: number;
}

export interface CustomStrategy {
  id: string;
  name: string;
  description: string;
  baseStrategy: BettingStrategy;

  // Risk management
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  maxStakePercent: number;
  kellyFraction: number;
  stopLossPercent: number;

  // Betting criteria
  minExpectedValue: number;
  minConfidence: number;
  minOdds?: number;
  maxOdds?: number;

  // Market preferences
  enabledMarkets: string[];
  favoriteLeagues: string[];
  excludedTeams: string[];

  // Custom rules
  rules: StrategyRule[];

  // Advanced settings
  hedgingEnabled: boolean;
  arbitrageEnabled: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  strategy: Partial<CustomStrategy>;
}

export interface StrategyPerformance {
  strategyId: string;
  totalBets: number;
  winRate: number;
  roi: number;
  avgCLV: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

// ==================== STRATEGY TEMPLATES ====================

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'conservative-value',
    name: 'Conservative Value Betting',
    description: 'Low-risk strategy focusing on high-confidence bets with positive EV',
    category: 'beginner',
    strategy: {
      name: 'Conservative Value Betting',
      baseStrategy: 'ValueBetting',
      riskProfile: 'conservative',
      maxStakePercent: 2,
      kellyFraction: 0.1,
      stopLossPercent: 15,
      minExpectedValue: 5,
      minConfidence: 0.75,
      minOdds: 1.5,
      maxOdds: 3.0,
      enabledMarkets: ['1X2'],
      rules: [
        {
          id: 'rule-1',
          name: 'High confidence only',
          enabled: true,
          condition: {
            type: 'confidence',
            operator: '>=',
            value: 0.75,
          },
          action: {
            type: 'bet',
          },
        },
      ],
      hedgingEnabled: false,
      arbitrageEnabled: false,
    },
  },
  {
    id: 'kelly-criterion',
    name: 'Kelly Criterion Strategy',
    description: 'Optimal stake sizing based on Kelly Criterion for long-term growth',
    category: 'intermediate',
    strategy: {
      name: 'Kelly Criterion Strategy',
      baseStrategy: 'KellyCriterion',
      riskProfile: 'moderate',
      maxStakePercent: 5,
      kellyFraction: 0.25,
      stopLossPercent: 20,
      minExpectedValue: 3,
      minConfidence: 0.65,
      minOdds: 1.4,
      enabledMarkets: ['1X2', 'OverUnder'],
      rules: [
        {
          id: 'rule-1',
          name: 'Higher stakes for higher EV',
          enabled: true,
          condition: {
            type: 'ev',
            operator: '>=',
            value: 10,
          },
          action: {
            type: 'adjust_stake',
            stakeMultiplier: 1.5,
          },
        },
      ],
      hedgingEnabled: false,
      arbitrageEnabled: false,
    },
  },
  {
    id: 'aggressive-value',
    name: 'Aggressive Value Hunting',
    description: 'High-volume strategy targeting all value opportunities',
    category: 'advanced',
    strategy: {
      name: 'Aggressive Value Hunting',
      baseStrategy: 'ValueBetting',
      riskProfile: 'aggressive',
      maxStakePercent: 10,
      kellyFraction: 0.5,
      stopLossPercent: 30,
      minExpectedValue: 2,
      minConfidence: 0.55,
      enabledMarkets: ['1X2', 'OverUnder', 'BTTS', 'DoubleChance'],
      rules: [
        {
          id: 'rule-1',
          name: 'Bet on any positive EV',
          enabled: true,
          condition: {
            type: 'ev',
            operator: '>',
            value: 0,
          },
          action: {
            type: 'bet',
          },
        },
      ],
      hedgingEnabled: true,
      arbitrageEnabled: true,
    },
  },
  {
    id: 'arbitrage-hunter',
    name: 'Arbitrage Hunter',
    description: 'Risk-free betting strategy focusing on arbitrage opportunities',
    category: 'professional',
    strategy: {
      name: 'Arbitrage Hunter',
      baseStrategy: 'ArbitrageBetting',
      riskProfile: 'conservative',
      maxStakePercent: 10,
      kellyFraction: 1.0,
      stopLossPercent: 5,
      minExpectedValue: 0,
      minConfidence: 0.0,
      enabledMarkets: ['1X2', 'OverUnder', 'BTTS', 'DoubleChance'],
      rules: [
        {
          id: 'rule-1',
          name: 'Only arbitrage bets',
          enabled: true,
          condition: {
            type: 'ev',
            operator: '>=',
            value: 0,
          },
          action: {
            type: 'bet',
          },
        },
      ],
      hedgingEnabled: true,
      arbitrageEnabled: true,
    },
  },
  {
    id: 'high-odds-value',
    name: 'High Odds Value',
    description: 'Target undervalued underdogs with high potential returns',
    category: 'advanced',
    strategy: {
      name: 'High Odds Value',
      baseStrategy: 'ValueBetting',
      riskProfile: 'aggressive',
      maxStakePercent: 3,
      kellyFraction: 0.2,
      stopLossPercent: 25,
      minExpectedValue: 10,
      minConfidence: 0.6,
      minOdds: 3.0,
      maxOdds: 10.0,
      enabledMarkets: ['1X2'],
      rules: [
        {
          id: 'rule-1',
          name: 'High odds value bets',
          enabled: true,
          condition: {
            type: 'composite',
            operator: '>=',
            value: 0,
            logicOperator: 'AND',
            conditions: [
              { type: 'odds', operator: '>=', value: 3.0 },
              { type: 'ev', operator: '>=', value: 10 },
            ],
          },
          action: {
            type: 'bet',
          },
        },
      ],
      hedgingEnabled: false,
      arbitrageEnabled: false,
    },
  },
];

// ==================== STRATEGY SERVICE ====================

export class StrategyCustomizationService {
  private strategies: Map<string, CustomStrategy> = new Map();

  constructor() {
    this.loadStrategies();
  }

  /**
   * Load strategies from preferences or create defaults
   */
  private async loadStrategies(): Promise<void> {
    // In a real app, load from Supabase or local storage
    // For now, just initialize with templates
    STRATEGY_TEMPLATES.forEach(template => {
      const strategy = this.createStrategyFromTemplate(template);
      this.strategies.set(strategy.id, strategy);
    });
  }

  /**
   * Create strategy from template
   */
  createStrategyFromTemplate(template: StrategyTemplate): CustomStrategy {
    const now = new Date();
    return {
      id: template.id,
      name: template.strategy.name || template.name,
      description: template.description,
      baseStrategy: template.strategy.baseStrategy || 'ValueBetting',
      riskProfile: template.strategy.riskProfile || 'moderate',
      maxStakePercent: template.strategy.maxStakePercent || 5,
      kellyFraction: template.strategy.kellyFraction || 0.25,
      stopLossPercent: template.strategy.stopLossPercent || 20,
      minExpectedValue: template.strategy.minExpectedValue || 2,
      minConfidence: template.strategy.minConfidence || 0.6,
      minOdds: template.strategy.minOdds,
      maxOdds: template.strategy.maxOdds,
      enabledMarkets: template.strategy.enabledMarkets || ['1X2'],
      favoriteLeagues: template.strategy.favoriteLeagues || [],
      excludedTeams: template.strategy.excludedTeams || [],
      rules: template.strategy.rules || [],
      hedgingEnabled: template.strategy.hedgingEnabled || false,
      arbitrageEnabled: template.strategy.arbitrageEnabled || false,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Create custom strategy
   */
  createStrategy(params: Partial<CustomStrategy>): CustomStrategy {
    const now = new Date();
    const id = params.id || `strategy-${Date.now()}`;

    const strategy: CustomStrategy = {
      id,
      name: params.name || 'Custom Strategy',
      description: params.description || '',
      baseStrategy: params.baseStrategy || 'ValueBetting',
      riskProfile: params.riskProfile || 'moderate',
      maxStakePercent: params.maxStakePercent || 5,
      kellyFraction: params.kellyFraction || 0.25,
      stopLossPercent: params.stopLossPercent || 20,
      minExpectedValue: params.minExpectedValue || 2,
      minConfidence: params.minConfidence || 0.6,
      minOdds: params.minOdds,
      maxOdds: params.maxOdds,
      enabledMarkets: params.enabledMarkets || ['1X2'],
      favoriteLeagues: params.favoriteLeagues || [],
      excludedTeams: params.excludedTeams || [],
      rules: params.rules || [],
      hedgingEnabled: params.hedgingEnabled || false,
      arbitrageEnabled: params.arbitrageEnabled || false,
      createdAt: now,
      updatedAt: now,
    };

    this.strategies.set(id, strategy);
    return strategy;
  }

  /**
   * Get strategy by ID
   */
  getStrategy(id: string): CustomStrategy | undefined {
    return this.strategies.get(id);
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): CustomStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Update strategy
   */
  updateStrategy(id: string, updates: Partial<CustomStrategy>): CustomStrategy {
    const existing = this.strategies.get(id);
    if (!existing) {
      throw new Error(`Strategy ${id} not found`);
    }

    const updated: CustomStrategy = {
      ...existing,
      ...updates,
      id: existing.id, // Preserve ID
      updatedAt: new Date(),
    };

    this.strategies.set(id, updated);
    return updated;
  }

  /**
   * Delete strategy
   */
  deleteStrategy(id: string): boolean {
    return this.strategies.delete(id);
  }

  /**
   * Evaluate if a bet should be placed according to strategy
   */
  evaluateBet(
    strategy: CustomStrategy,
    prediction: HybridPrediction,
    odds: MarketOdds,
    recommendation: BetRecommendation
  ): {
    shouldBet: boolean;
    reason: string;
    adjustedStake?: number;
  } {
    // Check basic criteria
    if (recommendation.expectedValue < strategy.minExpectedValue) {
      return {
        shouldBet: false,
        reason: `EV ${recommendation.expectedValue.toFixed(2)}% is below minimum ${strategy.minExpectedValue}%`,
      };
    }

    if (prediction.confidence < strategy.minConfidence) {
      return {
        shouldBet: false,
        reason: `Confidence ${(prediction.confidence * 100).toFixed(1)}% is below minimum ${(strategy.minConfidence * 100).toFixed(1)}%`,
      };
    }

    // Check odds range
    if (strategy.minOdds && recommendation.marketOdds < strategy.minOdds) {
      return {
        shouldBet: false,
        reason: `Odds ${recommendation.marketOdds.toFixed(2)} below minimum ${strategy.minOdds.toFixed(2)}`,
      };
    }

    if (strategy.maxOdds && recommendation.marketOdds > strategy.maxOdds) {
      return {
        shouldBet: false,
        reason: `Odds ${recommendation.marketOdds.toFixed(2)} above maximum ${strategy.maxOdds.toFixed(2)}`,
      };
    }

    // Check market is enabled
    if (!strategy.enabledMarkets.includes(recommendation.betType)) {
      return {
        shouldBet: false,
        reason: `Market ${recommendation.betType} not enabled in strategy`,
      };
    }

    // Evaluate custom rules
    let stakeMultiplier = 1.0;
    for (const rule of strategy.rules) {
      if (!rule.enabled) continue;

      const conditionMet = this.evaluateCondition(rule.condition, {
        ev: recommendation.expectedValue,
        confidence: prediction.confidence,
        odds: recommendation.marketOdds,
      });

      if (conditionMet) {
        if (rule.action.type === 'skip') {
          return {
            shouldBet: false,
            reason: `Rule "${rule.name}" triggered skip action`,
          };
        } else if (rule.action.type === 'adjust_stake' && rule.action.stakeMultiplier) {
          stakeMultiplier *= rule.action.stakeMultiplier;
        }
      }
    }

    // Calculate adjusted stake
    const baseStake = recommendation.recommendedStake.kellyFractional;
    const adjustedStake = baseStake * stakeMultiplier;

    return {
      shouldBet: true,
      reason: 'All strategy criteria met',
      adjustedStake,
    };
  }

  /**
   * Evaluate a rule condition
   */
  private evaluateCondition(
    condition: RuleCondition,
    context: { ev: number; confidence: number; odds: number }
  ): boolean {
    if (condition.type === 'composite' && condition.conditions) {
      const results = condition.conditions.map(c => this.evaluateCondition(c, context));
      return condition.logicOperator === 'AND'
        ? results.every(r => r)
        : results.some(r => r);
    }

    let actualValue: number | string | boolean = 0;

    switch (condition.type) {
      case 'ev':
        actualValue = context.ev;
        break;
      case 'confidence':
        actualValue = context.confidence;
        break;
      case 'odds':
        actualValue = context.odds;
        break;
      default:
        return false;
    }

    const expectedValue = condition.value;

    switch (condition.operator) {
      case '>':
        return actualValue > expectedValue;
      case '<':
        return actualValue < expectedValue;
      case '>=':
        return actualValue >= expectedValue;
      case '<=':
        return actualValue <= expectedValue;
      case '==':
        return actualValue === expectedValue;
      case '!=':
        return actualValue !== expectedValue;
      default:
        return false;
    }
  }

  /**
   * Get strategy recommendations
   */
  getStrategyRecommendation(userPrefs: UserPreferences): StrategyTemplate {
    // Simple recommendation based on risk tolerance
    const bankroll = userPrefs.defaultBankroll;

    if (bankroll < 500) {
      return STRATEGY_TEMPLATES.find(t => t.id === 'conservative-value')!;
    } else if (bankroll < 2000) {
      return STRATEGY_TEMPLATES.find(t => t.id === 'kelly-criterion')!;
    } else {
      return STRATEGY_TEMPLATES.find(t => t.id === 'aggressive-value')!;
    }
  }

  /**
   * Clone strategy
   */
  cloneStrategy(id: string, newName: string): CustomStrategy {
    const original = this.strategies.get(id);
    if (!original) {
      throw new Error(`Strategy ${id} not found`);
    }

    const cloned: CustomStrategy = {
      ...original,
      id: `strategy-${Date.now()}`,
      name: newName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.strategies.set(cloned.id, cloned);
    return cloned;
  }
}

// ==================== EXPORTS ====================

export const strategyService = new StrategyCustomizationService();
