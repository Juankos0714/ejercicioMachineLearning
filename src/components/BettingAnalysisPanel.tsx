/**
 * BETTING ANALYSIS PANEL COMPONENT
 *
 * React component for displaying comprehensive betting analysis including:
 * - Value bet recommendations
 * - Expected value calculations
 * - Stake size recommendations (Kelly, Fixed, etc.)
 * - Risk assessment
 * - Arbitrage opportunities
 * - Strategy advice
 * - Bankroll management tips
 */

import React, { useState, useMemo } from 'react';
import type { HybridPrediction } from '../services/mlHybridPredictor';
import {
  analyzeBettingOpportunities,
  type MarketOdds,
  type BettingAnalysis,
  type BetRecommendation,
} from '../services/mlBettingAnalyzer';

interface BettingAnalysisPanelProps {
  prediction: HybridPrediction;
  marketOdds?: MarketOdds;
  defaultBankroll?: number;
  showAdvanced?: boolean;
}

export function BettingAnalysisPanel({
  prediction,
  marketOdds,
  defaultBankroll = 1000,
  showAdvanced = false,
}: BettingAnalysisPanelProps) {
  const [bankroll, setBankroll] = useState(defaultBankroll);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedBet, setSelectedBet] = useState<BetRecommendation | null>(null);

  // Default market odds if not provided (example odds)
  const defaultOdds: MarketOdds = useMemo(() => ({
    homeWin: 1 / prediction.homeWinProb,
    draw: 1 / prediction.drawProb,
    awayWin: 1 / prediction.awayWinProb,
    over25: 1 / prediction.over25Prob,
    under25: 1 / (1 - prediction.over25Prob),
  }), [prediction]);

  const odds = marketOdds || defaultOdds;

  // Perform betting analysis
  const analysis: BettingAnalysis = useMemo(
    () => analyzeBettingOpportunities(prediction, odds, bankroll),
    [prediction, odds, bankroll]
  );

  // Helper functions
  const formatPercent = (value: number, decimals: number = 1): string => {
    return `${value.toFixed(decimals)}%`;
  };

  const formatCurrency = (value: number): string => {
    return `$${value.toFixed(2)}`;
  };

  const formatOdds = (value: number): string => {
    return value.toFixed(2);
  };

  const getValueColor = (ev: number): string => {
    if (ev >= 10) return 'bg-green-500';
    if (ev >= 5) return 'bg-green-400';
    if (ev >= 2) return 'bg-yellow-400';
    if (ev >= 0) return 'bg-gray-400';
    return 'bg-red-400';
  };

  const getValueTextColor = (ev: number): string => {
    if (ev >= 10) return 'text-green-600';
    if (ev >= 5) return 'text-green-500';
    if (ev >= 2) return 'text-yellow-600';
    if (ev >= 0) return 'text-gray-600';
    return 'text-red-600';
  };

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-orange-600 bg-orange-100';
      case 'Very High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!marketOdds && !showAdvanced) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
        <p className="text-yellow-800 font-medium">
          ⚠️ Betting analysis requires market odds from bookmakers
        </p>
        <p className="text-yellow-700 text-sm mt-2">
          Enter actual market odds to see value betting opportunities and recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          💰 Betting Analysis
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Bankroll:</label>
            <input
              type="number"
              value={bankroll}
              onChange={(e) => setBankroll(Number(e.target.value))}
              className="w-32 px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              min="100"
              step="100"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-900">Value Opportunities</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {analysis.totalOpportunities}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-900">Average EV</div>
          <div className={`text-2xl font-bold mt-1 ${getValueTextColor(analysis.overallEV)}`}>
            {formatPercent(analysis.overallEV)}
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm font-medium text-purple-900">Best Market</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            {analysis.bestBetType}
          </div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-sm font-medium text-orange-900">Bookmaker Margin</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">
            {formatPercent(analysis.marginAnalysis.overall)}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
            ⚠️ Warnings
          </h3>
          <ul className="list-disc list-inside space-y-1">
            {analysis.warnings.map((warning, index) => (
              <li key={index} className="text-yellow-800 text-sm">{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Top Recommendations */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          🎯 Top Value Bets
        </h3>

        {analysis.topRecommendations.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-600">No positive expected value opportunities found</p>
            <p className="text-gray-500 text-sm mt-2">
              Try analyzing a different match or waiting for better odds
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {analysis.topRecommendations.map((bet, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedBet(selectedBet === bet ? null : bet)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-gray-700">#{index + 1}</span>
                      <div>
                        <h4 className="font-semibold text-gray-900">{bet.description}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          <span>Odds: {formatOdds(bet.marketOdds)}</span>
                          <span>•</span>
                          <span>Win Prob: {formatPercent(bet.winProbability * 100)}</span>
                          <span>•</span>
                          <span className={getRiskColor(bet.riskLevel) + ' px-2 py-0.5 rounded text-xs font-medium'}>
                            {bet.riskLevel} Risk
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getValueTextColor(bet.expectedValue)}`}>
                      {formatPercent(bet.expectedValue)}
                    </div>
                    <div className="text-sm text-gray-500">EV</div>
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getValueColor(bet.expectedValue)} text-white`}>
                      {bet.valueRating}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedBet === bet && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="font-semibold text-gray-900 mb-3">💡 Stake Recommendations</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded p-3">
                        <div className="text-xs font-medium text-blue-900 mb-1">Kelly Criterion</div>
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(bet.recommendedStake.kelly * bankroll)}
                        </div>
                        <div className="text-xs text-blue-700 mt-1">
                          {formatPercent(bet.recommendedStake.kelly * 100)} of bankroll
                        </div>
                      </div>
                      <div className="bg-green-50 rounded p-3">
                        <div className="text-xs font-medium text-green-900 mb-1">Fractional Kelly (Safer)</div>
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(bet.recommendedStake.kellyFractional * bankroll)}
                        </div>
                        <div className="text-xs text-green-700 mt-1">
                          {formatPercent(bet.recommendedStake.kellyFractional * 100)} of bankroll
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded p-3">
                        <div className="text-xs font-medium text-purple-900 mb-1">Fixed Percentage</div>
                        <div className="text-lg font-bold text-purple-600">
                          {formatCurrency(bet.recommendedStake.fixedAmount!)}
                        </div>
                        <div className="text-xs text-purple-700 mt-1">
                          {formatPercent(bet.recommendedStake.fixedPercentage)} of bankroll
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Model Probability:</span>
                        <span className="font-semibold text-gray-900 ml-2">
                          {formatPercent(bet.modelProb * 100)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Implied Probability:</span>
                        <span className="font-semibold text-gray-900 ml-2">
                          {formatPercent(bet.impliedProb * 100)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-semibold text-gray-900 ml-2">
                          {formatPercent(bet.confidence * 100)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Potential Profit:</span>
                        <span className="font-semibold text-green-600 ml-2">
                          {formatPercent(bet.potentialProfit * 100)} per unit
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Arbitrage Opportunities */}
      {analysis.arbitrageOpportunities.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            🚨 Arbitrage Opportunities
          </h3>
          <div className="space-y-4">
            {analysis.arbitrageOpportunities.map((arb, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">{arb.description}</h4>
                <div className="text-2xl font-bold text-red-600 mb-3">
                  {formatPercent(arb.profitPercentage)} Guaranteed Profit
                </div>
                <div className="space-y-2">
                  {arb.markets.map((market, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700">{market.outcome} @ {formatOdds(market.odds)}</span>
                      <span className="font-semibold text-gray-900">
                        Stake: {formatCurrency(market.stake)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-red-200 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total Stake:</span>
                    <span className="font-semibold">{formatCurrency(arb.totalStake)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-700">Guaranteed Return:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(arb.totalStake + arb.guaranteedProfit)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Advice */}
      <div className="mb-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4 hover:text-blue-600 transition-colors"
        >
          📈 Strategy Recommendations
          <span className="text-sm">{showDetails ? '▼' : '▶'}</span>
        </button>

        {showDetails && (
          <div className="space-y-4">
            {analysis.strategyAdvice.map((advice, index) => (
              <div
                key={index}
                className={`rounded-lg p-4 ${
                  advice.recommended ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      {advice.strategy}
                      {advice.recommended && <span className="text-green-600">✓</span>}
                    </h4>
                    <p className="text-sm text-gray-700 mt-1">{advice.reasoning}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-gray-600">
                        Expected Return: <span className="font-semibold">{formatPercent(advice.expectedReturn)}</span>
                      </span>
                      <span className={getRiskColor(advice.riskLevel) + ' px-2 py-1 rounded text-xs font-medium'}>
                        {advice.riskLevel} Risk
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm text-gray-600">Min Bankroll</div>
                    <div className="font-bold text-gray-900">{formatCurrency(advice.bankrollRequirement)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Market Analysis */}
      {showAdvanced && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Market Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Bookmaker Margins</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Home Win:</span>
                  <span className="font-semibold">{formatPercent(analysis.marginAnalysis.homeWin)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Draw:</span>
                  <span className="font-semibold">{formatPercent(analysis.marginAnalysis.draw)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Away Win:</span>
                  <span className="font-semibold">{formatPercent(analysis.marginAnalysis.awayWin)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="font-semibold">Overall:</span>
                  <span className="font-bold">{formatPercent(analysis.marginAnalysis.overall)}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Market Efficiency</h4>
              <div className="flex items-center justify-center h-20">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatPercent(analysis.marketEfficiency * 100)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {analysis.marketEfficiency > 0.9 ? 'Very Efficient' :
                     analysis.marketEfficiency > 0.7 ? 'Efficient' :
                     analysis.marketEfficiency > 0.5 ? 'Moderately Efficient' : 'Inefficient'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded p-4 text-xs text-gray-600">
        <p className="font-semibold mb-1">⚠️ Important Disclaimer:</p>
        <p>
          This analysis is for educational and informational purposes only. Betting involves risk and you may lose money.
          Never bet more than you can afford to lose. Past performance does not guarantee future results.
          Please gamble responsibly and seek help if gambling becomes a problem.
        </p>
      </div>
    </div>
  );
}
