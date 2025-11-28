/**
 * REAL-TIME BETTING DASHBOARD
 *
 * Live tracking dashboard for betting activities
 *
 * Features:
 * - Live odds updates
 * - Active bet tracking
 * - Performance metrics in real-time
 * - Value bet alerts
 * - Odds movement tracking
 * - CLV analysis
 */

import { useState, useEffect, useMemo } from 'react';
import { OddsSnapshot } from '../services/oddsApiService';
import { BankrollManager, initializeBankroll } from '../services/mlBettingAnalyzer';
import { ClosingLineValue } from '../services/oddsApiService';
import { useBetting } from '../contexts/BettingContext';

interface RealTimeDashboardProps {
  apiKey?: string;
  initialBankroll?: number;
}

interface Alert {
  id: string;
  timestamp: Date;
  type: 'value_bet' | 'odds_movement' | 'clv' | 'profit_target' | 'stop_loss';
  severity: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  message: string;
  match?: string;
  read: boolean;
}

export function RealTimeDashboard({ apiKey, initialBankroll = 1000 }: RealTimeDashboardProps) {
  // Get bets from context
  const { activeBets, settledBets, settleBet } = useBetting();

  // State
  const [bankroll, setBankroll] = useState<BankrollManager>(initializeBankroll(initialBankroll));
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [liveOdds, setLiveOdds] = useState<OddsSnapshot[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval] = useState(30); // seconds
  const [clvData] = useState<ClosingLineValue[]>([]);

  // Refresh odds when active bets change
  useEffect(() => {
    refreshOdds();
  }, [activeBets.length]);

  // Auto-refresh odds
  useEffect(() => {
    if (!autoRefresh) return;

    // Initial refresh
    refreshOdds();

    const interval = setInterval(() => {
      refreshOdds();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, activeBets]);

  // Refresh odds (updated to use real match data)
  const refreshOdds = async () => {
    // In production, this would call the actual Odds API
    // For now, generate mock data for each active bet's match
    if (activeBets.length === 0) {
      setLiveOdds([]);
      return;
    }

    // Get unique matches from active bets
    const uniqueMatches = new Map<string, typeof activeBets[0]>();
    activeBets.forEach(bet => {
      if (!uniqueMatches.has(bet.matchId)) {
        uniqueMatches.set(bet.matchId, bet);
      }
    });

    // Generate odds for each match
    const oddsSnapshots: OddsSnapshot[] = Array.from(uniqueMatches.values()).map(bet => {
      // Use prediction probabilities if available to generate more realistic odds
      const prediction = bet.prediction;
      const baseHomeOdds = prediction ? 1 / prediction.homeWinProb : 2.5;
      const baseDrawOdds = prediction ? 1 / prediction.drawProb : 3.3;
      const baseAwayOdds = prediction ? 1 / prediction.awayWinProb : 2.8;
      const baseOver25Odds = prediction ? 1 / prediction.over25Prob : 1.9;

      return {
        timestamp: new Date(),
        matchId: bet.matchId,
        homeTeam: bet.homeTeam,
        awayTeam: bet.awayTeam,
        bookmakers: [],
        bestOdds: {
          homeWin: baseHomeOdds + (Math.random() - 0.5) * 0.2,
          draw: baseDrawOdds + (Math.random() - 0.5) * 0.3,
          awayWin: baseAwayOdds + (Math.random() - 0.5) * 0.2,
          over25: baseOver25Odds + (Math.random() - 0.5) * 0.2,
          under25: (1 / (1 - (prediction?.over25Prob || 0.5))) + (Math.random() - 0.5) * 0.2,
        },
        avgOdds: {
          homeWin: baseHomeOdds * 0.95 + (Math.random() - 0.5) * 0.1,
          draw: baseDrawOdds * 0.95 + (Math.random() - 0.5) * 0.2,
          awayWin: baseAwayOdds * 0.95 + (Math.random() - 0.5) * 0.1,
          over25: baseOver25Odds * 0.95 + (Math.random() - 0.5) * 0.1,
          under25: (1 / (1 - (prediction?.over25Prob || 0.5))) * 0.95 + (Math.random() - 0.5) * 0.1,
        },
      };
    });

    setLiveOdds(oddsSnapshots);
  };


  // Mark alert as read
  const markAlertRead = (id: string) => {
    setAlerts(prev =>
      prev.map(alert => (alert.id === id ? { ...alert, read: true } : alert))
    );
  };

  // Clear all alerts
  const clearAlerts = () => {
    setAlerts([]);
  };

  // Update bankroll based on settled bets
  useEffect(() => {
    const totalProfit = settledBets.reduce((sum, bet) => sum + (bet.profit || 0), 0);
    const wonBets = settledBets.filter(bet => bet.result === 'won').length;
    const lostBets = settledBets.filter(bet => bet.result === 'lost').length;
    const winRate = settledBets.length > 0 ? (wonBets / settledBets.length) * 100 : 0;

    setBankroll(prev => ({
      ...prev,
      currentBankroll: initialBankroll + totalProfit,
      netProfit: totalProfit,
      wonBets,
      lostBets,
      winRate,
    }));
  }, [settledBets, initialBankroll]);

  // Calculate real-time metrics
  const metrics = useMemo(() => {
    const totalActiveBets = activeBets.length;
    const totalActiveStake = activeBets.reduce((sum, bet) => sum + bet.stake, 0);
    const potentialPayout = activeBets.reduce((sum, bet) => sum + bet.potentialPayout, 0);
    const potentialProfit = activeBets.reduce((sum, bet) => sum + bet.potentialProfit, 0);

    const todaysBets = settledBets.filter(bet => {
      const today = new Date();
      const betDate = new Date(bet.timestamp);
      return betDate.toDateString() === today.toDateString();
    });

    const todaysProfit = todaysBets.reduce((sum, bet) => sum + (bet.profit || 0), 0);
    const todaysROI = todaysBets.length > 0
      ? (todaysProfit / todaysBets.reduce((sum, bet) => sum + bet.stake, 0)) * 100
      : 0;

    return {
      totalActiveBets,
      totalActiveStake,
      potentialPayout,
      potentialProfit,
      todaysProfit,
      todaysROI,
      todaysBetsCount: todaysBets.length,
    };
  }, [activeBets, settledBets]);

  // Unread alerts
  const unreadAlerts = alerts.filter(a => !a.read);

  // Format functions
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'value_bet': return '💎';
      case 'odds_movement': return '📈';
      case 'clv': return '🎯';
      case 'profit_target': return '🎉';
      case 'stop_loss': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Real-Time Betting Dashboard</h1>
        <p className="text-gray-600">Live tracking and analytics for your betting activity</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bankroll</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(bankroll.currentBankroll)}
              </p>
              <p className={`text-sm mt-1 ${bankroll.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {bankroll.netProfit >= 0 ? '+' : ''}{formatCurrency(bankroll.netProfit)}
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Bets</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalActiveBets}</p>
              <p className="text-sm text-gray-500 mt-1">
                Staked: {formatCurrency(metrics.totalActiveStake)}
              </p>
            </div>
            <div className="text-4xl">🎲</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's P/L</p>
              <p className={`text-2xl font-bold mt-1 ${metrics.todaysProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.todaysProfit)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {metrics.todaysBetsCount} bets • ROI: {formatPercent(metrics.todaysROI)}
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatPercent(bankroll.winRate)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {bankroll.wonBets}W / {bankroll.lostBets}L
              </p>
            </div>
            <div className="text-4xl">🏆</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Bets */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Active Bets</h2>
            </div>
            <div className="p-6">
              {activeBets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No active bets</p>
                  <p className="text-sm text-gray-400 mt-1">Place a bet to see it here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeBets.map((bet) => (
                    <div key={bet.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {bet.homeTeam} vs {bet.awayTeam}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              {bet.betType}
                            </span>
                            {bet.isLive && (
                              <span className="flex items-center gap-1 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                LIVE
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                            <span>Outcome: <strong>{bet.outcome}</strong></span>
                            <span>Odds: <strong>{bet.odds.toFixed(2)}</strong></span>
                            <span>Stake: <strong>{formatCurrency(bet.stake)}</strong></span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => settleBet(bet.id, 'won')}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                            >
                              Won ✓
                            </button>
                            <button
                              onClick={() => settleBet(bet.id, 'lost')}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                            >
                              Lost ✗
                            </button>
                            <button
                              onClick={() => settleBet(bet.id, 'void')}
                              className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                            >
                              Void
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(bet.potentialPayout)}
                          </div>
                          <div className="text-xs text-gray-500">Potential Payout</div>
                          <div className="text-sm text-gray-600 mt-1">
                            Profit: {formatCurrency(bet.potentialProfit)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live Odds */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Live Odds</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={refreshOdds}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Refresh
                </button>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded"
                  />
                  Auto-refresh
                </label>
              </div>
            </div>
            <div className="p-6">
              {liveOdds.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No live odds data</p>
                  <p className="text-sm text-gray-400 mt-1">Configure API key to see live odds</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {liveOdds.map((odds, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-900">
                          {odds.homeTeam} vs {odds.awayTeam}
                        </span>
                        <span className="text-xs text-gray-500">
                          Updated {formatTime(odds.timestamp)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-xs text-gray-600 mb-1">Home</div>
                          <div className="text-lg font-bold">{odds.bestOdds.homeWin.toFixed(2)}</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-xs text-gray-600 mb-1">Draw</div>
                          <div className="text-lg font-bold">{odds.bestOdds.draw.toFixed(2)}</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-xs text-gray-600 mb-1">Away</div>
                          <div className="text-lg font-bold">{odds.bestOdds.awayWin.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Alerts & CLV */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">Alerts</h2>
                {unreadAlerts.length > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {unreadAlerts.length}
                  </span>
                )}
              </div>
              {alerts.length > 0 && (
                <button
                  onClick={clearAlerts}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No alerts</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 ${!alert.read ? 'bg-blue-50' : ''}`}
                      onClick={() => markAlertRead(alert.id)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 text-sm">{alert.title}</p>
                            {!alert.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatTime(alert.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CLV Performance */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">CLV Performance</h2>
            </div>
            <div className="p-6">
              {clvData.length === 0 ? (
                <div className="text-center text-gray-500">
                  <p className="text-sm">No CLV data yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clvData.map((clv, idx) => (
                    <div key={idx} className="border-l-4 border-green-500 pl-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{clv.outcome}</span>
                        <span className={`text-sm font-bold ${clv.clv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {clv.clv >= 0 ? '+' : ''}{formatPercent(clv.clv)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {clv.clvRating} • Bet: {clv.betOdds.toFixed(2)} → Close: {clv.closingOdds.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Performance Chart Placeholder */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Bankroll Chart</h2>
            </div>
            <div className="p-6">
              <div className="h-48 flex items-center justify-center bg-gray-50 rounded">
                <p className="text-gray-400 text-sm">Chart visualization coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
