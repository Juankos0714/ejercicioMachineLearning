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

import React, { useState, useEffect, useMemo } from 'react';
import { OddsSnapshot, OddsMovement } from '../services/oddsApiService';
import { BetRecord, BankrollManager, initializeBankroll } from '../services/mlBettingAnalyzer';
import { ClosingLineValue } from '../services/oddsApiService';

interface RealTimeDashboardProps {
  apiKey?: string;
  initialBankroll?: number;
}

interface LiveBet extends BetRecord {
  isLive: boolean;
  currentOdds?: number;
  potentialPayout: number;
  potentialProfit: number;
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
  // State
  const [bankroll, setBankroll] = useState<BankrollManager>(initializeBankroll(initialBankroll));
  const [activeBets, setActiveBets] = useState<LiveBet[]>([]);
  const [settledBets, setSettledBets] = useState<BetRecord[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [liveOdds, setLiveOdds] = useState<OddsSnapshot[]>([]);
  const [oddsMovements, setOddsMovements] = useState<OddsMovement[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [clvData, setCLVData] = useState<ClosingLineValue[]>([]);

  // Auto-refresh odds
  useEffect(() => {
    if (!autoRefresh || !apiKey) return;

    const interval = setInterval(() => {
      refreshOdds();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, apiKey]);

  // Refresh odds (mock implementation)
  const refreshOdds = async () => {
    // In production, this would call the actual Odds API
    // For now, simulate with mock data
    const mockOdds: OddsSnapshot = {
      timestamp: new Date(),
      matchId: 'match-1',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      bookmakers: [],
      bestOdds: {
        homeWin: 2.1 + Math.random() * 0.2,
        draw: 3.3 + Math.random() * 0.3,
        awayWin: 3.5 + Math.random() * 0.3,
        over25: 1.9 + Math.random() * 0.2,
        under25: 2.0 + Math.random() * 0.2,
      },
      avgOdds: {
        homeWin: 2.0 + Math.random() * 0.2,
        draw: 3.2 + Math.random() * 0.3,
        awayWin: 3.4 + Math.random() * 0.3,
        over25: 1.85 + Math.random() * 0.2,
        under25: 1.95 + Math.random() * 0.2,
      },
    };

    setLiveOdds([mockOdds]);
  };

  // Add alert
  const addAlert = (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}`,
      timestamp: new Date(),
      read: false,
    };
    setAlerts(prev => [newAlert, ...prev]);
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

  // Alert severity colors
  const getAlertColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'success': return 'bg-green-100 border-green-500 text-green-900';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'danger': return 'bg-red-100 border-red-500 text-red-900';
      default: return 'bg-blue-100 border-blue-500 text-blue-900';
    }
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
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(bet.potentialPayout)}
                          </div>
                          <div className="text-xs text-gray-500">Potential Payout</div>
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
