/**
 * HISTORICAL DATA SERVICE
 *
 * Service for storing and retrieving historical betting data from Supabase
 *
 * Features:
 * - Store odds snapshots
 * - Track bet history
 * - Record bankroll changes
 * - Store alerts
 * - Manage user preferences
 * - Query performance metrics
 */

import { supabase } from '../lib/supabase';
import { OddsSnapshot } from './oddsApiService';
import { BettingStrategy } from './mlBettingAnalyzer';
import { Alert } from './alertSystem';

// ==================== TYPES ====================

export interface StoredBet {
  id: string;
  userId?: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  matchDate?: Date;
  betType: string;
  outcome: string;
  stake: number;
  odds: number;
  bookmaker?: string;
  predictedProbability?: number;
  expectedValue?: number;
  modelConfidence?: number;
  status: 'pending' | 'won' | 'lost' | 'void' | 'cancelled';
  resultHomeScore?: number;
  resultAwayScore?: number;
  payout?: number;
  profitLoss?: number;
  strategy?: string;
  kellyFraction?: number;
  closingOdds?: number;
  clvPercent?: number;
  placedAt: Date;
  settledAt?: Date;
}

export interface UserPreferences {
  id?: string;
  userId: string;
  defaultBankroll: number;
  maxStakePercent: number;
  preferredStrategy: BettingStrategy;
  kellyFraction: number;
  minExpectedValue: number;
  minConfidence: number;
  enabledMarkets: string[];
  favoriteBookmakers: string[];
  maxDailyBets: number;
  maxDailyLoss?: number;
  stopLossPercent: number;
  alertEmail?: string;
  alertWebhookUrl?: string;
  alertChannels: string[];
  minAlertEV: number;
}

export interface PerformanceMetrics {
  date: Date;
  betsPlaced: number;
  betsWon: number;
  betsLost: number;
  betsVoid: number;
  totalStaked: number;
  totalPayout: number;
  netProfit: number;
  roiPercent: number;
  startingBankroll?: number;
  endingBankroll?: number;
  avgOdds?: number;
  avgExpectedValue?: number;
  avgClv?: number;
}

// ==================== ODDS HISTORY ====================

export class OddsHistoryService {
  /**
   * Store odds snapshot
   */
  async storeOddsSnapshot(snapshot: OddsSnapshot): Promise<void> {
    const records = snapshot.bookmakers.map(bm => ({
      match_id: snapshot.matchId,
      home_team: snapshot.homeTeam,
      away_team: snapshot.awayTeam,
      bookmaker: bm.bookmaker,
      home_win_odds: bm.markets.h2h?.home,
      draw_odds: bm.markets.h2h?.draw,
      away_win_odds: bm.markets.h2h?.away,
      over_25_odds: bm.markets.totals?.over.odds,
      under_25_odds: bm.markets.totals?.under.odds,
      snapshot_timestamp: snapshot.timestamp.toISOString(),
      is_closing_line: false,
    }));

    const { error } = await supabase
      .from('odds_history')
      .insert(records);

    if (error) {
      console.error('Failed to store odds snapshot:', error);
      throw error;
    }
  }

  /**
   * Mark latest odds as closing line
   */
  async markClosingLine(matchId: string): Promise<void> {
    // Get the latest odds for this match
    const { data, error: fetchError } = await supabase
      .from('odds_history')
      .select('*')
      .eq('match_id', matchId)
      .order('snapshot_timestamp', { ascending: false })
      .limit(1);

    if (fetchError || !data || data.length === 0) {
      console.error('Failed to fetch latest odds:', fetchError);
      return;
    }

    // Mark as closing line
    const { error: updateError } = await supabase
      .from('odds_history')
      .update({ is_closing_line: true })
      .eq('id', data[0].id);

    if (updateError) {
      console.error('Failed to mark closing line:', updateError);
      throw updateError;
    }
  }

  /**
   * Get odds history for a match
   */
  async getOddsHistory(matchId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('odds_history')
      .select('*')
      .eq('match_id', matchId)
      .order('snapshot_timestamp', { ascending: true });

    if (error) {
      console.error('Failed to fetch odds history:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get closing line odds
   */
  async getClosingOdds(matchId: string, bookmaker?: string): Promise<any | null> {
    let query = supabase
      .from('odds_history')
      .select('*')
      .eq('match_id', matchId)
      .eq('is_closing_line', true);

    if (bookmaker) {
      query = query.eq('bookmaker', bookmaker);
    }

    const { data, error } = await query.limit(1).single();

    if (error) {
      console.error('Failed to fetch closing odds:', error);
      return null;
    }

    return data;
  }
}

// ==================== BET HISTORY ====================

export class BetHistoryService {
  /**
   * Record a placed bet
   */
  async recordBet(bet: Partial<StoredBet>): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();

    const record = {
      user_id: user?.id,
      match_id: bet.matchId,
      home_team: bet.homeTeam,
      away_team: bet.awayTeam,
      match_date: bet.matchDate?.toISOString(),
      bet_type: bet.betType,
      outcome: bet.outcome,
      stake: bet.stake,
      odds: bet.odds,
      bookmaker: bet.bookmaker,
      predicted_probability: bet.predictedProbability,
      expected_value: bet.expectedValue,
      model_confidence: bet.modelConfidence,
      status: bet.status || 'pending',
      strategy: bet.strategy,
      kelly_fraction: bet.kellyFraction,
      placed_at: (bet.placedAt || new Date()).toISOString(),
    };

    const { data, error } = await supabase
      .from('bet_history')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Failed to record bet:', error);
      throw error;
    }

    return data.id;
  }

  /**
   * Update bet result
   */
  async settleBet(
    betId: string,
    result: {
      status: 'won' | 'lost' | 'void' | 'cancelled';
      homeScore?: number;
      awayScore?: number;
      payout?: number;
      profitLoss?: number;
      closingOdds?: number;
      clvPercent?: number;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('bet_history')
      .update({
        status: result.status,
        result_home_score: result.homeScore,
        result_away_score: result.awayScore,
        payout: result.payout,
        profit_loss: result.profitLoss,
        closing_odds: result.closingOdds,
        clv_percent: result.clvPercent,
        settled_at: new Date().toISOString(),
      })
      .eq('id', betId);

    if (error) {
      console.error('Failed to settle bet:', error);
      throw error;
    }
  }

  /**
   * Get user's bet history
   */
  async getBetHistory(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    strategy?: string;
    limit?: number;
  }): Promise<StoredBet[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('bet_history')
      .select('*')
      .eq('user_id', user.id)
      .order('placed_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('placed_at', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte('placed_at', filters.endDate.toISOString());
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.strategy) {
      query = query.eq('strategy', filters.strategy);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch bet history:', error);
      throw error;
    }

    return (data || []).map(this.mapBetFromDB);
  }

  /**
   * Get pending bets
   */
  async getPendingBets(): Promise<StoredBet[]> {
    return this.getBetHistory({ status: 'pending' });
  }

  /**
   * Get bet statistics
   */
  async getBetStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalBets: number;
    wonBets: number;
    lostBets: number;
    voidBets: number;
    winRate: number;
    totalStaked: number;
    totalPayout: number;
    netProfit: number;
    roi: number;
    avgOdds: number;
    avgEV: number;
    avgCLV: number;
  }> {
    const bets = await this.getBetHistory({ startDate, endDate });

    const stats = {
      totalBets: bets.length,
      wonBets: bets.filter(b => b.status === 'won').length,
      lostBets: bets.filter(b => b.status === 'lost').length,
      voidBets: bets.filter(b => b.status === 'void').length,
      winRate: 0,
      totalStaked: 0,
      totalPayout: 0,
      netProfit: 0,
      roi: 0,
      avgOdds: 0,
      avgEV: 0,
      avgCLV: 0,
    };

    if (stats.totalBets === 0) return stats;

    stats.winRate = (stats.wonBets / stats.totalBets) * 100;
    stats.totalStaked = bets.reduce((sum, b) => sum + (b.stake || 0), 0);
    stats.totalPayout = bets.reduce((sum, b) => sum + (b.payout || 0), 0);
    stats.netProfit = stats.totalPayout - stats.totalStaked;
    stats.roi = (stats.netProfit / stats.totalStaked) * 100;
    stats.avgOdds = bets.reduce((sum, b) => sum + (b.odds || 0), 0) / stats.totalBets;

    const betsWithEV = bets.filter(b => b.expectedValue !== undefined);
    if (betsWithEV.length > 0) {
      stats.avgEV = betsWithEV.reduce((sum, b) => sum + (b.expectedValue || 0), 0) / betsWithEV.length;
    }

    const betsWithCLV = bets.filter(b => b.clvPercent !== undefined);
    if (betsWithCLV.length > 0) {
      stats.avgCLV = betsWithCLV.reduce((sum, b) => sum + (b.clvPercent || 0), 0) / betsWithCLV.length;
    }

    return stats;
  }

  private mapBetFromDB(dbBet: any): StoredBet {
    return {
      id: dbBet.id,
      userId: dbBet.user_id,
      matchId: dbBet.match_id,
      homeTeam: dbBet.home_team,
      awayTeam: dbBet.away_team,
      matchDate: dbBet.match_date ? new Date(dbBet.match_date) : undefined,
      betType: dbBet.bet_type,
      outcome: dbBet.outcome,
      stake: dbBet.stake,
      odds: dbBet.odds,
      bookmaker: dbBet.bookmaker,
      predictedProbability: dbBet.predicted_probability,
      expectedValue: dbBet.expected_value,
      modelConfidence: dbBet.model_confidence,
      status: dbBet.status,
      resultHomeScore: dbBet.result_home_score,
      resultAwayScore: dbBet.result_away_score,
      payout: dbBet.payout,
      profitLoss: dbBet.profit_loss,
      strategy: dbBet.strategy,
      kellyFraction: dbBet.kelly_fraction,
      closingOdds: dbBet.closing_odds,
      clvPercent: dbBet.clv_percent,
      placedAt: new Date(dbBet.placed_at),
      settledAt: dbBet.settled_at ? new Date(dbBet.settled_at) : undefined,
    };
  }
}

// ==================== BANKROLL HISTORY ====================

export class BankrollHistoryService {
  /**
   * Record bankroll change
   */
  async recordChange(
    bankroll: number,
    eventType: 'bet_placed' | 'bet_won' | 'bet_lost' | 'deposit' | 'withdrawal',
    changeAmount: number,
    eventId?: string,
    notes?: string
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const record = {
      user_id: user?.id,
      bankroll,
      change_amount: changeAmount,
      change_percent: (changeAmount / (bankroll - changeAmount)) * 100,
      event_type: eventType,
      event_id: eventId,
      notes,
    };

    const { error } = await supabase
      .from('bankroll_history')
      .insert(record);

    if (error) {
      console.error('Failed to record bankroll change:', error);
      throw error;
    }
  }

  /**
   * Get bankroll history
   */
  async getHistory(startDate?: Date, endDate?: Date): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('bankroll_history')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: true });

    if (startDate) {
      query = query.gte('timestamp', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('timestamp', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch bankroll history:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get current bankroll
   */
  async getCurrentBankroll(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase
      .from('bankroll_history')
      .select('bankroll')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // If no history, return default from preferences
      const prefs = await userPreferencesService.getPreferences();
      return prefs?.defaultBankroll || 1000;
    }

    return data.bankroll;
  }
}

// ==================== USER PREFERENCES ====================

export class UserPreferencesService {
  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_betting_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found, return defaults
        return this.getDefaultPreferences(user.id);
      }
      console.error('Failed to fetch preferences:', error);
      throw error;
    }

    return this.mapPreferencesFromDB(data);
  }

  /**
   * Save user preferences
   */
  async savePreferences(prefs: Partial<UserPreferences>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const record = {
      user_id: user.id,
      default_bankroll: prefs.defaultBankroll,
      max_stake_percent: prefs.maxStakePercent,
      preferred_strategy: prefs.preferredStrategy,
      kelly_fraction: prefs.kellyFraction,
      min_expected_value: prefs.minExpectedValue,
      min_confidence: prefs.minConfidence,
      enabled_markets: prefs.enabledMarkets,
      favorite_bookmakers: prefs.favoriteBookmakers,
      max_daily_bets: prefs.maxDailyBets,
      max_daily_loss: prefs.maxDailyLoss,
      stop_loss_percent: prefs.stopLossPercent,
      alert_email: prefs.alertEmail,
      alert_webhook_url: prefs.alertWebhookUrl,
      alert_channels: prefs.alertChannels,
      min_alert_ev: prefs.minAlertEV,
    };

    const { error } = await supabase
      .from('user_betting_preferences')
      .upsert(record, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to save preferences:', error);
      throw error;
    }
  }

  private getDefaultPreferences(userId: string): UserPreferences {
    return {
      userId,
      defaultBankroll: Number(import.meta.env.VITE_DEFAULT_BANKROLL) || 1000,
      maxStakePercent: Number(import.meta.env.VITE_MAX_STAKE_PERCENT) || 5,
      preferredStrategy: 'KellyCriterion' as BettingStrategy,
      kellyFraction: Number(import.meta.env.VITE_KELLY_FRACTION) || 0.25,
      minExpectedValue: Number(import.meta.env.VITE_MIN_EXPECTED_VALUE) || 2,
      minConfidence: 0.6,
      enabledMarkets: ['1X2', 'OverUnder'],
      favoriteBookmakers: [],
      maxDailyBets: 10,
      stopLossPercent: 20,
      alertChannels: ['browser'],
      minAlertEV: 5,
    };
  }

  private mapPreferencesFromDB(data: any): UserPreferences {
    return {
      id: data.id,
      userId: data.user_id,
      defaultBankroll: data.default_bankroll,
      maxStakePercent: data.max_stake_percent,
      preferredStrategy: data.preferred_strategy,
      kellyFraction: data.kelly_fraction,
      minExpectedValue: data.min_expected_value,
      minConfidence: data.min_confidence,
      enabledMarkets: data.enabled_markets,
      favoriteBookmakers: data.favorite_bookmakers || [],
      maxDailyBets: data.max_daily_bets,
      maxDailyLoss: data.max_daily_loss,
      stopLossPercent: data.stop_loss_percent,
      alertEmail: data.alert_email,
      alertWebhookUrl: data.alert_webhook_url,
      alertChannels: data.alert_channels,
      minAlertEV: data.min_alert_ev,
    };
  }
}

// ==================== ALERT HISTORY ====================

export class AlertHistoryService {
  /**
   * Store alert
   */
  async storeAlert(alert: Alert, sentVia: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const record = {
      user_id: user?.id,
      alert_type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      data: alert.data,
      sent_via: sentVia,
      read: alert.read,
      dismissed: alert.dismissed,
    };

    const { error } = await supabase
      .from('alert_history')
      .insert(record);

    if (error) {
      console.error('Failed to store alert:', error);
      throw error;
    }
  }

  /**
   * Get alert history
   */
  async getAlerts(filters?: {
    unreadOnly?: boolean;
    types?: string[];
    limit?: number;
  }): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('alert_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filters?.unreadOnly) {
      query = query.eq('read', false);
    }

    if (filters?.types && filters.types.length > 0) {
      query = query.in('alert_type', filters.types);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch alerts:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Mark alert as read
   */
  async markAsRead(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('alert_history')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', alertId);

    if (error) {
      console.error('Failed to mark alert as read:', error);
      throw error;
    }
  }
}

// ==================== EXPORTS ====================

export const oddsHistoryService = new OddsHistoryService();
export const betHistoryService = new BetHistoryService();
export const bankrollHistoryService = new BankrollHistoryService();
export const userPreferencesService = new UserPreferencesService();
export const alertHistoryService = new AlertHistoryService();
