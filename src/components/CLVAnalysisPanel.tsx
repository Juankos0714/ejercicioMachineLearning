/**
 * CLOSING LINE VALUE (CLV) ANALYSIS PANEL
 *
 * Component for analyzing and displaying Closing Line Value metrics
 *
 * Features:
 * - CLV tracking per bet
 * - Historical CLV performance
 * - CLV distribution charts
 * - Bookmaker comparison
 * - Sharp money indicators
 */

import { useMemo } from 'react';
import { ClosingLineValue } from '../services/oddsApiService';

interface CLVAnalysisPanelProps {
  clvHistory: ClosingLineValue[];
  showCharts?: boolean;
}

interface CLVStatistics {
  totalBets: number;
  averageCLV: number;
  medianCLV: number;
  positiveCLVCount: number;
  positiveCLVRate: number;
  excellentCount: number;
  goodCount: number;
  fairCount: number;
  poorCount: number;
  bestCLV: number;
  worstCLV: number;
  byMarket: Map<string, { avgCLV: number; count: number }>;
}

export function CLVAnalysisPanel({ clvHistory }: CLVAnalysisPanelProps) {
  // Calculate statistics
  const stats = useMemo<CLVStatistics>(() => {
    if (clvHistory.length === 0) {
      return {
        totalBets: 0,
        averageCLV: 0,
        medianCLV: 0,
        positiveCLVCount: 0,
        positiveCLVRate: 0,
        excellentCount: 0,
        goodCount: 0,
        fairCount: 0,
        poorCount: 0,
        bestCLV: 0,
        worstCLV: 0,
        byMarket: new Map(),
      };
    }

    const clvValues = clvHistory.map(c => c.clv).sort((a, b) => a - b);
    const avgCLV = clvValues.reduce((sum, v) => sum + v, 0) / clvValues.length;
    const medianCLV = clvValues[Math.floor(clvValues.length / 2)];
    const positiveCLV = clvHistory.filter(c => c.clv >= 0);

    // Count by rating
    const ratings = {
      excellent: clvHistory.filter(c => c.clvRating === 'Excellent').length,
      good: clvHistory.filter(c => c.clvRating === 'Good').length,
      fair: clvHistory.filter(c => c.clvRating === 'Fair').length,
      poor: clvHistory.filter(c => c.clvRating === 'Poor').length,
    };

    // By market
    const byMarket = new Map<string, { avgCLV: number; count: number }>();
    for (const clv of clvHistory) {
      const existing = byMarket.get(clv.market) || { avgCLV: 0, count: 0 };
      existing.avgCLV = (existing.avgCLV * existing.count + clv.clv) / (existing.count + 1);
      existing.count++;
      byMarket.set(clv.market, existing);
    }

    return {
      totalBets: clvHistory.length,
      averageCLV: avgCLV,
      medianCLV: medianCLV,
      positiveCLVCount: positiveCLV.length,
      positiveCLVRate: (positiveCLV.length / clvHistory.length) * 100,
      excellentCount: ratings.excellent,
      goodCount: ratings.good,
      fairCount: ratings.fair,
      poorCount: ratings.poor,
      bestCLV: clvValues[clvValues.length - 1],
      worstCLV: clvValues[0],
      byMarket,
    };
  }, [clvHistory]);

  // Format functions
  const formatPercent = (value: number, decimals: number = 1): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
  };

  const formatOdds = (value: number): string => {
    return value.toFixed(2);
  };

  // Color helpers
  const getCLVColor = (clv: number): string => {
    if (clv >= 5) return 'text-green-600';
    if (clv >= 2) return 'text-green-500';
    if (clv >= 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCLVBgColor = (clv: number): string => {
    if (clv >= 5) return 'bg-green-100';
    if (clv >= 2) return 'bg-green-50';
    if (clv >= 0) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getRatingColor = (rating: ClosingLineValue['clvRating']): string => {
    switch (rating) {
      case 'Excellent': return 'bg-green-500 text-white';
      case 'Good': return 'bg-green-400 text-white';
      case 'Fair': return 'bg-yellow-400 text-gray-900';
      case 'Poor': return 'bg-red-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">📊 Closing Line Value Analysis</h2>
        <p className="text-gray-600 text-sm">
          CLV measures how well you beat the closing odds. Positive CLV indicates sharp betting.
        </p>
      </div>

      {clvHistory.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 text-lg mb-2">No CLV data available yet</p>
          <p className="text-gray-500 text-sm">
            Place some bets and settle them to see your CLV performance
          </p>
        </div>
      ) : (
        <>
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-900 mb-1">Total Bets</div>
              <div className="text-3xl font-bold text-blue-600">{stats.totalBets}</div>
            </div>

            <div className={`rounded-lg p-4 ${getCLVBgColor(stats.averageCLV)}`}>
              <div className="text-sm font-medium text-gray-900 mb-1">Average CLV</div>
              <div className={`text-3xl font-bold ${getCLVColor(stats.averageCLV)}`}>
                {formatPercent(stats.averageCLV)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="text-sm font-medium text-purple-900 mb-1">Positive CLV Rate</div>
              <div className="text-3xl font-bold text-purple-600">
                {formatPercent(stats.positiveCLVRate, 0)}
              </div>
              <div className="text-xs text-purple-700 mt-1">
                {stats.positiveCLVCount} / {stats.totalBets} bets
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="text-sm font-medium text-green-900 mb-1">Best CLV</div>
              <div className="text-3xl font-bold text-green-600">
                {formatPercent(stats.bestCLV)}
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">CLV Rating Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Excellent</span>
                  <span className="text-lg font-bold text-green-600">{stats.excellentCount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${(stats.excellentCount / stats.totalBets) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Good</span>
                  <span className="text-lg font-bold text-green-500">{stats.goodCount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-400 h-2 rounded-full"
                    style={{ width: `${(stats.goodCount / stats.totalBets) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Fair</span>
                  <span className="text-lg font-bold text-yellow-600">{stats.fairCount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full"
                    style={{ width: `${(stats.fairCount / stats.totalBets) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Poor</span>
                  <span className="text-lg font-bold text-red-600">{stats.poorCount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${(stats.poorCount / stats.totalBets) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance by Market */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">CLV by Market</h3>
            <div className="space-y-2">
              {Array.from(stats.byMarket.entries()).map(([market, data]) => (
                <div key={market} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900 uppercase text-sm">{market}</span>
                    <span className="text-sm text-gray-500">{data.count} bets</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${data.avgCLV >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{
                          width: `${Math.min(Math.abs(data.avgCLV) * 10, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span className={`font-bold text-lg ${getCLVColor(data.avgCLV)}`}>
                      {formatPercent(data.avgCLV)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent CLV History */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Recent CLV Performance</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {clvHistory.slice(0, 20).map((clv, idx) => (
                <div
                  key={idx}
                  className={`border-l-4 ${clv.clv >= 0 ? 'border-green-500' : 'border-red-500'} bg-gray-50 rounded-r-lg p-3`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{clv.outcome}</span>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                          {clv.market}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getRatingColor(clv.clvRating)}`}>
                          {clv.clvRating}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>
                          Opening: <strong>{formatOdds(clv.openingOdds)}</strong>
                        </span>
                        <span>→</span>
                        <span>
                          Bet: <strong>{formatOdds(clv.betOdds)}</strong>
                        </span>
                        <span>→</span>
                        <span>
                          Closing: <strong>{formatOdds(clv.closingOdds)}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className={`text-2xl font-bold ${getCLVColor(clv.clv)}`}>
                        {formatPercent(clv.clv)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">💡 CLV Insights</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              {stats.averageCLV > 0 ? (
                <li className="flex items-start gap-2">
                  <span>✅</span>
                  <span>
                    Excellent! You're consistently beating the closing line with an average CLV of{' '}
                    <strong>{formatPercent(stats.averageCLV)}</strong>. This indicates sharp betting and
                    good line value identification.
                  </span>
                </li>
              ) : (
                <li className="flex items-start gap-2">
                  <span>⚠️</span>
                  <span>
                    Your average CLV is negative ({formatPercent(stats.averageCLV)}). Focus on finding
                    better closing line value by betting earlier on sharp moves or waiting for better numbers.
                  </span>
                </li>
              )}

              {stats.positiveCLVRate >= 60 ? (
                <li className="flex items-start gap-2">
                  <span>✅</span>
                  <span>
                    Strong performance with {formatPercent(stats.positiveCLVRate, 0)} positive CLV rate.
                    You're beating the closing line more often than not.
                  </span>
                </li>
              ) : (
                <li className="flex items-start gap-2">
                  <span>📈</span>
                  <span>
                    Aim for a 60%+ positive CLV rate. Currently at {formatPercent(stats.positiveCLVRate, 0)}.
                  </span>
                </li>
              )}

              <li className="flex items-start gap-2">
                <span>💡</span>
                <span>
                  CLV is a better predictor of long-term profitability than win rate. Keep tracking and
                  optimizing for positive CLV.
                </span>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
