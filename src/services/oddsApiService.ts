/**
 * ODDS API SERVICE
 *
 * Integration with The Odds API (https://the-odds-api.com/)
 * Supports fetching live odds from multiple bookmakers
 *
 * Features:
 * - Live odds fetching
 * - Multiple bookmaker support
 * - Historical odds tracking
 * - Closing line value calculation
 * - Odds movement tracking
 */

import { MarketOdds } from './mlBettingAnalyzer';

// ==================== TYPES ====================

export interface OddsAPIConfig {
  apiKey: string;
  baseUrl?: string;
  sport?: string;
  regions?: string[]; // e.g., ['us', 'uk', 'eu', 'au']
  markets?: string[]; // e.g., ['h2h', 'spreads', 'totals']
  oddsFormat?: 'decimal' | 'american' | 'fractional';
}

export interface BookmakerOdds {
  bookmaker: string;
  lastUpdate: Date;
  markets: {
    h2h?: {
      home: number;
      draw?: number;
      away: number;
    };
    totals?: {
      over: { point: number; odds: number };
      under: { point: number; odds: number };
    };
    spreads?: {
      home: { point: number; odds: number };
      away: { point: number; odds: number };
    };
  };
}

export interface OddsSnapshot {
  timestamp: Date;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  bookmakers: BookmakerOdds[];
  bestOdds: MarketOdds;
  avgOdds: MarketOdds;
}

export interface OddsMovement {
  bookmaker: string;
  market: string;
  outcome: string;
  previousOdds: number;
  currentOdds: number;
  change: number;
  changePercent: number;
  timestamp: Date;
}

export interface ClosingLineValue {
  market: string;
  outcome: string;
  openingOdds: number;
  closingOdds: number;
  betOdds: number; // The odds you actually bet at
  clv: number; // CLV as percentage (positive = beat closing line)
  clvRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

// ==================== API CLIENT ====================

export class OddsAPIClient {
  private config: OddsAPIConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(config: OddsAPIConfig) {
    this.config = {
      baseUrl: 'https://api.the-odds-api.com/v4',
      sport: 'soccer_epl', // English Premier League by default
      regions: ['uk', 'us'],
      markets: ['h2h', 'totals'],
      oddsFormat: 'decimal',
      ...config,
    };
  }

  /**
   * Fetch live odds for upcoming matches
   */
  async fetchLiveOdds(matchId?: string): Promise<OddsSnapshot[]> {
    try {
      const url = matchId
        ? `${this.config.baseUrl}/sports/${this.config.sport}/events/${matchId}/odds`
        : `${this.config.baseUrl}/sports/${this.config.sport}/odds`;

      const params = new URLSearchParams({
        apiKey: this.config.apiKey,
        regions: this.config.regions!.join(','),
        markets: this.config.markets!.join(','),
        oddsFormat: this.config.oddsFormat!,
      });

      const response = await fetch(`${url}?${params}`);

      if (!response.ok) {
        throw new Error(`Odds API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseOddsResponse(data);
    } catch (error) {
      console.error('Failed to fetch odds:', error);
      throw error;
    }
  }

  /**
   * Parse API response into OddsSnapshot format
   */
  private parseOddsResponse(data: any[]): OddsSnapshot[] {
    return data.map(event => {
      const bookmakers: BookmakerOdds[] = event.bookmakers.map((bm: any) => ({
        bookmaker: bm.key,
        lastUpdate: new Date(bm.last_update),
        markets: this.parseMarkets(bm.markets),
      }));

      return {
        timestamp: new Date(),
        matchId: event.id,
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        bookmakers,
        bestOdds: this.calculateBestOdds(bookmakers),
        avgOdds: this.calculateAvgOdds(bookmakers),
      };
    });
  }

  /**
   * Parse bookmaker markets
   */
  private parseMarkets(markets: any[]): BookmakerOdds['markets'] {
    const result: BookmakerOdds['markets'] = {};

    for (const market of markets) {
      if (market.key === 'h2h') {
        const outcomes = market.outcomes;
        result.h2h = {
          home: outcomes.find((o: any) => o.name === market.home_team)?.price || 0,
          draw: outcomes.find((o: any) => o.name === 'Draw')?.price,
          away: outcomes.find((o: any) => o.name === market.away_team)?.price || 0,
        };
      } else if (market.key === 'totals') {
        const over = market.outcomes.find((o: any) => o.name === 'Over');
        const under = market.outcomes.find((o: any) => o.name === 'Under');
        if (over && under) {
          result.totals = {
            over: { point: over.point, odds: over.price },
            under: { point: under.point, odds: under.price },
          };
        }
      }
    }

    return result;
  }

  /**
   * Calculate best odds across all bookmakers
   */
  private calculateBestOdds(bookmakers: BookmakerOdds[]): MarketOdds {
    let bestHomeWin = 0;
    let bestDraw = 0;
    let bestAwayWin = 0;
    let bestOver25 = 0;
    let bestUnder25 = 0;

    for (const bm of bookmakers) {
      if (bm.markets.h2h) {
        bestHomeWin = Math.max(bestHomeWin, bm.markets.h2h.home || 0);
        bestDraw = Math.max(bestDraw, bm.markets.h2h.draw || 0);
        bestAwayWin = Math.max(bestAwayWin, bm.markets.h2h.away || 0);
      }
      if (bm.markets.totals?.over.point === 2.5) {
        bestOver25 = Math.max(bestOver25, bm.markets.totals.over.odds);
        bestUnder25 = Math.max(bestUnder25, bm.markets.totals.under.odds);
      }
    }

    return {
      homeWin: bestHomeWin || 2.0,
      draw: bestDraw || 3.0,
      awayWin: bestAwayWin || 2.0,
      over25: bestOver25 || 2.0,
      under25: bestUnder25 || 2.0,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate average odds across all bookmakers
   */
  private calculateAvgOdds(bookmakers: BookmakerOdds[]): MarketOdds {
    let sumHomeWin = 0, sumDraw = 0, sumAwayWin = 0, sumOver25 = 0, sumUnder25 = 0;
    let countH2H = 0, countTotals = 0;

    for (const bm of bookmakers) {
      if (bm.markets.h2h) {
        sumHomeWin += bm.markets.h2h.home || 0;
        sumDraw += bm.markets.h2h.draw || 0;
        sumAwayWin += bm.markets.h2h.away || 0;
        countH2H++;
      }
      if (bm.markets.totals?.over.point === 2.5) {
        sumOver25 += bm.markets.totals.over.odds;
        sumUnder25 += bm.markets.totals.under.odds;
        countTotals++;
      }
    }

    return {
      homeWin: countH2H > 0 ? sumHomeWin / countH2H : 2.0,
      draw: countH2H > 0 ? sumDraw / countH2H : 3.0,
      awayWin: countH2H > 0 ? sumAwayWin / countH2H : 2.0,
      over25: countTotals > 0 ? sumOver25 / countTotals : 2.0,
      under25: countTotals > 0 ? sumUnder25 / countTotals : 2.0,
      timestamp: new Date(),
    };
  }

  /**
   * Track odds movements over time
   */
  async trackOddsMovement(matchId: string): Promise<OddsMovement[]> {
    const movements: OddsMovement[] = [];
    const previousSnapshot = this.cache.get(matchId);
    const currentSnapshot = (await this.fetchLiveOdds(matchId))[0];

    if (!previousSnapshot || !currentSnapshot) {
      // Store current snapshot for future comparison
      this.cache.set(matchId, { data: currentSnapshot, timestamp: Date.now() });
      return movements;
    }

    const prevData = previousSnapshot.data as OddsSnapshot;

    // Compare each bookmaker's odds
    for (const currentBM of currentSnapshot.bookmakers) {
      const prevBM = prevData.bookmakers.find(b => b.bookmaker === currentBM.bookmaker);
      if (!prevBM) continue;

      // Check H2H market movements
      if (currentBM.markets.h2h && prevBM.markets.h2h) {
        const h2h = currentBM.markets.h2h;
        const prevH2h = prevBM.markets.h2h;

        if (h2h.home !== prevH2h.home) {
          movements.push({
            bookmaker: currentBM.bookmaker,
            market: 'h2h',
            outcome: 'home',
            previousOdds: prevH2h.home || 0,
            currentOdds: h2h.home || 0,
            change: (h2h.home || 0) - (prevH2h.home || 0),
            changePercent: ((h2h.home || 0) - (prevH2h.home || 0)) / (prevH2h.home || 1) * 100,
            timestamp: new Date(),
          });
        }
      }
    }

    // Update cache
    this.cache.set(matchId, { data: currentSnapshot, timestamp: Date.now() });

    return movements;
  }
}

// ==================== CLOSING LINE VALUE CALCULATOR ====================

export class CLVCalculator {
  private oddsHistory: Map<string, OddsSnapshot[]> = new Map();

  /**
   * Record odds snapshot for CLV tracking
   */
  recordOdds(snapshot: OddsSnapshot): void {
    const key = `${snapshot.homeTeam}-${snapshot.awayTeam}`;
    const history = this.oddsHistory.get(key) || [];
    history.push(snapshot);
    this.oddsHistory.set(key, history);
  }

  /**
   * Calculate Closing Line Value
   * CLV = ((betOdds - closingOdds) / closingOdds) * 100
   */
  calculateCLV(
    homeTeam: string,
    awayTeam: string,
    market: string,
    outcome: string,
    betOdds: number
  ): ClosingLineValue | null {
    const key = `${homeTeam}-${awayTeam}`;
    const history = this.oddsHistory.get(key);

    if (!history || history.length === 0) {
      return null;
    }

    // Sort by timestamp to get opening and closing lines
    const sorted = [...history].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const opening = sorted[0];
    const closing = sorted[sorted.length - 1];

    let openingOdds = 0;
    let closingOdds = 0;

    // Extract odds based on market and outcome
    if (market === 'h2h') {
      if (outcome === 'home') {
        openingOdds = opening.avgOdds.homeWin;
        closingOdds = closing.avgOdds.homeWin;
      } else if (outcome === 'draw') {
        openingOdds = opening.avgOdds.draw;
        closingOdds = closing.avgOdds.draw;
      } else if (outcome === 'away') {
        openingOdds = opening.avgOdds.awayWin;
        closingOdds = closing.avgOdds.awayWin;
      }
    } else if (market === 'over25') {
      openingOdds = opening.avgOdds.over25 || 0;
      closingOdds = closing.avgOdds.over25 || 0;
    } else if (market === 'under25') {
      openingOdds = opening.avgOdds.under25 || 0;
      closingOdds = closing.avgOdds.under25 || 0;
    }

    if (closingOdds === 0) {
      return null;
    }

    // Calculate CLV
    const clv = ((betOdds - closingOdds) / closingOdds) * 100;

    // Rate the CLV
    let clvRating: ClosingLineValue['clvRating'];
    if (clv >= 5) clvRating = 'Excellent';
    else if (clv >= 2) clvRating = 'Good';
    else if (clv >= 0) clvRating = 'Fair';
    else clvRating = 'Poor';

    return {
      market,
      outcome,
      openingOdds,
      closingOdds,
      betOdds,
      clv,
      clvRating,
    };
  }

  /**
   * Get odds movement trend
   */
  getOddsMovement(homeTeam: string, awayTeam: string): OddsSnapshot[] {
    const key = `${homeTeam}-${awayTeam}`;
    return this.oddsHistory.get(key) || [];
  }

  /**
   * Clear history for a match (after it's settled)
   */
  clearHistory(homeTeam: string, awayTeam: string): void {
    const key = `${homeTeam}-${awayTeam}`;
    this.oddsHistory.delete(key);
  }
}

// ==================== MOCK DATA FOR TESTING ====================

/**
 * Generate mock odds data for testing without API key
 */
export function generateMockOdds(homeTeam: string, awayTeam: string): OddsSnapshot {
  const bookmakerNames = ['bet365', 'pinnacle', 'betfair', 'william_hill', 'unibet'];

  const bookmakers: BookmakerOdds[] = bookmakerNames.map(name => ({
    bookmaker: name,
    lastUpdate: new Date(),
    markets: {
      h2h: {
        home: 1.8 + Math.random() * 0.4,
        draw: 3.2 + Math.random() * 0.6,
        away: 2.1 + Math.random() * 0.4,
      },
      totals: {
        over: { point: 2.5, odds: 1.85 + Math.random() * 0.3 },
        under: { point: 2.5, odds: 1.95 + Math.random() * 0.3 },
      },
    },
  }));

  const client = new OddsAPIClient({ apiKey: 'mock' });

  return {
    timestamp: new Date(),
    matchId: `${homeTeam}-${awayTeam}`,
    homeTeam,
    awayTeam,
    bookmakers,
    bestOdds: (client as any).calculateBestOdds(bookmakers),
    avgOdds: (client as any).calculateAvgOdds(bookmakers),
  };
}

// ==================== EXPORTS ====================

export const oddsAPI = {
  /**
   * Create a new Odds API client
   */
  createClient(apiKey: string, options?: Partial<OddsAPIConfig>): OddsAPIClient {
    return new OddsAPIClient({ apiKey, ...options });
  },

  /**
   * Create CLV calculator
   */
  createCLVCalculator(): CLVCalculator {
    return new CLVCalculator();
  },

  /**
   * Generate mock data for testing
   */
  generateMockOdds,
};
