/**
 * BETTING CONTEXT
 *
 * Global state management for betting activities
 * Provides shared state for active bets, settled bets, and betting operations
 * across all components in the application
 */

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { BetRecord, BetRecommendation } from '../services/mlBettingAnalyzer';
import type { HybridPrediction } from '../services/mlHybridPredictor';

interface LiveBet extends BetRecord {
  isLive: boolean;
  currentOdds?: number;
  potentialPayout: number;
  potentialProfit: number;
  matchId: string;
  prediction?: HybridPrediction;
}

interface BettingContextType {
  activeBets: LiveBet[];
  settledBets: BetRecord[];
  addBet: (bet: BetRecommendation, prediction: HybridPrediction, stake: number) => void;
  settleBet: (betId: string, result: 'won' | 'lost' | 'void') => void;
  getBetsByMatch: (matchId: string) => LiveBet[];
  clearAllBets: () => void;
}

const BettingContext = createContext<BettingContextType | undefined>(undefined);

export function BettingProvider({ children }: { children: ReactNode }) {
  const [activeBets, setActiveBets] = useState<LiveBet[]>([]);
  const [settledBets, setSettledBets] = useState<BetRecord[]>([]);

  // Generate a match ID from team names
  const generateMatchId = useCallback((homeTeam: string, awayTeam: string): string => {
    return `${homeTeam.toLowerCase().replace(/\s+/g, '-')}-vs-${awayTeam.toLowerCase().replace(/\s+/g, '-')}`;
  }, []);

  // Add a new bet
  const addBet = useCallback((bet: BetRecommendation, prediction: HybridPrediction, stake: number) => {
    const matchId = generateMatchId(prediction.homeTeam.name, prediction.awayTeam.name);

    const newBet: LiveBet = {
      id: `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      homeTeam: prediction.homeTeam.name,
      awayTeam: prediction.awayTeam.name,
      betType: bet.betType,
      outcome: bet.outcome,
      odds: bet.marketOdds,
      stake: stake,
      result: 'pending',
      isLive: true,
      potentialPayout: stake * bet.marketOdds,
      potentialProfit: (stake * bet.marketOdds) - stake,
      matchId: matchId,
      prediction: prediction,
    };

    setActiveBets(prev => [...prev, newBet]);
  }, [generateMatchId]);

  // Settle a bet (move from active to settled)
  const settleBet = useCallback((betId: string, result: 'won' | 'lost' | 'void') => {
    setActiveBets(prev => {
      const bet = prev.find(b => b.id === betId);
      if (!bet) return prev;

      const settledBet: BetRecord = {
        ...bet,
        result: result,
        profit: result === 'won' ? bet.potentialProfit :
                result === 'lost' ? -bet.stake :
                0,
      };

      setSettledBets(prevSettled => [...prevSettled, settledBet]);

      return prev.filter(b => b.id !== betId);
    });
  }, []);

  // Get bets for a specific match
  const getBetsByMatch = useCallback((matchId: string): LiveBet[] => {
    return activeBets.filter(bet => bet.matchId === matchId);
  }, [activeBets]);

  // Clear all bets (for testing purposes)
  const clearAllBets = useCallback(() => {
    setActiveBets([]);
    setSettledBets([]);
  }, []);

  const value: BettingContextType = {
    activeBets,
    settledBets,
    addBet,
    settleBet,
    getBetsByMatch,
    clearAllBets,
  };

  return (
    <BettingContext.Provider value={value}>
      {children}
    </BettingContext.Provider>
  );
}

export function useBetting() {
  const context = useContext(BettingContext);
  if (context === undefined) {
    throw new Error('useBetting must be used within a BettingProvider');
  }
  return context;
}
