/**
 * LIVE MARKETS EXECUTION SCRIPT
 *
 * Run betting analysis on live markets using real Odds API data
 *
 * Features:
 * - Fetch live odds from The Odds API
 * - Generate ML predictions
 * - Identify value bets and arbitrage opportunities
 * - Send real-time alerts
 * - Store data in Supabase
 * - Track performance metrics
 *
 * Usage:
 *   npm run markets:live
 *   npm run markets:live -- --sport soccer_epl --interval 300
 */

import { oddsAPI, OddsAPIClient } from '../src/services/oddsApiService';
import { predictHybrid } from '../src/services/mlHybridPredictor';
import { analyzeBettingOpportunities } from '../src/services/mlBettingAnalyzer';
import { AlertSystem, alertSystem } from '../src/services/alertSystem';
import { notificationService } from '../src/services/notificationService';
import {
  oddsHistoryService,
  betHistoryService,
  bankrollHistoryService,
  userPreferencesService,
} from '../src/services/historicalDataService';
import { strategyService, CustomStrategy } from '../src/services/strategyCustomizationService';
import { Team } from '../src/lib/supabase';

// ==================== CONFIGURATION ====================

interface LiveMarketConfig {
  apiKey: string;
  sport: string;
  regions: string[];
  markets: string[];
  updateInterval: number; // seconds
  enableAlerts: boolean;
  enableAutoStoring: boolean;
  strategy?: string; // Strategy ID to use
}

function getConfig(): LiveMarketConfig {
  const apiKey = import.meta.env.VITE_ODDS_API_KEY;

  if (!apiKey || apiKey === 'your_odds_api_key_here') {
    console.error('❌ ERROR: The Odds API key not configured!');
    console.error('Please set VITE_ODDS_API_KEY in your .env file');
    console.error('Get your API key from: https://the-odds-api.com/');
    process.exit(1);
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const sport = args.find(arg => arg.startsWith('--sport='))?.split('=')[1] || 'soccer_epl';
  const interval = parseInt(args.find(arg => arg.startsWith('--interval='))?.split('=')[1] || '300');

  return {
    apiKey,
    sport,
    regions: ['uk', 'us', 'eu'],
    markets: ['h2h', 'totals'],
    updateInterval: interval,
    enableAlerts: true,
    enableAutoStoring: true,
  };
}

// ==================== UTILITIES ====================

function log(section: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  console.log(`\n${icons[type]} [${section}] ${message}`);
}

function logDivider() {
  console.log('\n' + '─'.repeat(80));
}

// ==================== MOCK TEAM DATA ====================

// In a real application, this would come from your database
function createMockTeam(name: string): Team {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    league: 'Premier League',
    country: 'England',
    created_at: new Date().toISOString(),
  };
}

// ==================== MAIN EXECUTION ====================

class LiveMarketRunner {
  private config: LiveMarketConfig;
  private oddsClient: OddsAPIClient;
  private alertSystem: AlertSystem;
  private strategy?: CustomStrategy;
  private isRunning: boolean = false;
  private processedMatches: Set<string> = new Set();

  constructor(config: LiveMarketConfig) {
    this.config = config;
    this.oddsClient = oddsAPI.createClient(config.apiKey, {
      sport: config.sport,
      regions: config.regions,
      markets: config.markets,
    });
    this.alertSystem = alertSystem.create();

    // Subscribe to alerts
    if (config.enableAlerts) {
      this.setupAlertHandlers();
    }
  }

  /**
   * Setup alert handlers
   */
  private setupAlertHandlers(): void {
    this.alertSystem.subscribe(async alert => {
      // Get user preferences for notification channels
      const prefs = await userPreferencesService.getPreferences();

      if (prefs) {
        await notificationService.sendAlert(alert, {
          email: prefs.alertEmail,
          webhookUrl: prefs.alertWebhookUrl,
        });
      }
    });
  }

  /**
   * Load strategy
   */
  private async loadStrategy(): Promise<void> {
    if (this.config.strategy) {
      this.strategy = strategyService.getStrategy(this.config.strategy);
      if (this.strategy) {
        log('STRATEGY', `Loaded strategy: ${this.strategy.name}`, 'success');
      } else {
        log('STRATEGY', `Strategy ${this.config.strategy} not found, using defaults`, 'warning');
      }
    } else {
      // Use default strategy from user preferences
      const prefs = await userPreferencesService.getPreferences();
      if (prefs) {
        this.strategy = strategyService.getStrategy(prefs.preferredStrategy);
      }
    }
  }

  /**
   * Process a single match
   */
  private async processMatch(oddsSnapshot: any): Promise<void> {
    const matchId = oddsSnapshot.matchId;

    // Skip if already processed recently
    if (this.processedMatches.has(matchId)) {
      return;
    }

    logDivider();
    log('MATCH', `${oddsSnapshot.homeTeam} vs ${oddsSnapshot.awayTeam}`, 'info');

    try {
      // Store odds snapshot
      if (this.config.enableAutoStoring) {
        await oddsHistoryService.storeOddsSnapshot(oddsSnapshot);
        log('DATABASE', 'Odds snapshot stored', 'success');
      }

      // Create team objects (in real app, fetch from database)
      const homeTeam = createMockTeam(oddsSnapshot.homeTeam);
      const awayTeam = createMockTeam(oddsSnapshot.awayTeam);

      // Generate ML prediction
      log('ML', 'Generating prediction...', 'info');
      const prediction = await predictHybrid(homeTeam, awayTeam, 'Premier League');

      console.log(`   Home Win: ${(prediction.homeWinProb * 100).toFixed(1)}%`);
      console.log(`   Draw:     ${(prediction.drawProb * 100).toFixed(1)}%`);
      console.log(`   Away Win: ${(prediction.awayWinProb * 100).toFixed(1)}%`);
      console.log(`   Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);

      // Analyze betting opportunities
      log('ANALYSIS', 'Analyzing betting opportunities...', 'info');
      const analysis = analyzeBettingOpportunities(
        prediction,
        oddsSnapshot.bestOdds,
        await bankrollHistoryService.getCurrentBankroll()
      );

      console.log(`   Total Opportunities: ${analysis.totalOpportunities}`);
      console.log(`   Average EV: ${analysis.overallEV.toFixed(2)}%`);
      console.log(`   Market Efficiency: ${(analysis.marketEfficiency * 100).toFixed(1)}%`);

      // Apply strategy filters if available
      if (this.strategy) {
        log('STRATEGY', `Applying ${this.strategy.name} filters...`, 'info');

        const filteredRecommendations = analysis.topRecommendations.filter(rec => {
          const evaluation = strategyService.evaluateBet(
            this.strategy!,
            prediction,
            oddsSnapshot.bestOdds,
            rec
          );
          return evaluation.shouldBet;
        });

        console.log(`   Filtered to ${filteredRecommendations.length} recommendations`);

        if (filteredRecommendations.length > 0) {
          log('RECOMMENDATIONS', 'Top filtered recommendations:', 'success');
          filteredRecommendations.slice(0, 3).forEach((rec, idx) => {
            console.log(`\n   ${idx + 1}. ${rec.description}`);
            console.log(`      EV: ${rec.expectedValue.toFixed(2)}% | Odds: ${rec.marketOdds.toFixed(2)}`);
            console.log(`      Kelly Stake: ${(rec.recommendedStake.kellyFractional * 100).toFixed(2)}%`);
            console.log(`      Risk: ${rec.riskLevel} | Rating: ${rec.valueRating}`);
          });
        }
      } else {
        // Show top recommendations without filtering
        if (analysis.topRecommendations.length > 0) {
          log('RECOMMENDATIONS', 'Top recommendations:', 'success');
          analysis.topRecommendations.slice(0, 3).forEach((rec, idx) => {
            console.log(`\n   ${idx + 1}. ${rec.description}`);
            console.log(`      EV: ${rec.expectedValue.toFixed(2)}% | Odds: ${rec.marketOdds.toFixed(2)}`);
            console.log(`      Kelly Stake: ${(rec.recommendedStake.kellyFractional * 100).toFixed(2)}%`);
            console.log(`      Risk: ${rec.riskLevel} | Rating: ${rec.valueRating}`);
          });
        }
      }

      // Check for arbitrage
      if (analysis.arbitrageOpportunities.length > 0) {
        log('ARBITRAGE', `${analysis.arbitrageOpportunities.length} arbitrage opportunities found!`, 'success');
        analysis.arbitrageOpportunities.forEach(arb => {
          console.log(`   ${arb.description}`);
          console.log(`   Guaranteed Profit: ${arb.profitPercentage.toFixed(2)}%`);
        });
      }

      // Trigger alerts
      if (this.config.enableAlerts) {
        this.alertSystem.analyzeBettingOpportunities(analysis);
      }

      // Mark as processed
      this.processedMatches.add(matchId);

      // Clean up old processed matches (keep last 100)
      if (this.processedMatches.size > 100) {
        const toDelete = Array.from(this.processedMatches).slice(0, 10);
        toDelete.forEach(id => this.processedMatches.delete(id));
      }
    } catch (error) {
      log('ERROR', `Failed to process match: ${error}`, 'error');
      console.error(error);
    }
  }

  /**
   * Fetch and process all live matches
   */
  private async fetchAndProcessMatches(): Promise<void> {
    try {
      log('FETCHING', 'Fetching live odds from The Odds API...', 'info');
      const oddsSnapshots = await this.oddsClient.fetchLiveOdds();

      if (oddsSnapshots.length === 0) {
        log('FETCHING', 'No live matches found', 'warning');
        return;
      }

      log('FETCHING', `Found ${oddsSnapshots.length} live matches`, 'success');

      // Process each match
      for (const snapshot of oddsSnapshots) {
        await this.processMatch(snapshot);
      }
    } catch (error) {
      log('ERROR', `Failed to fetch odds: ${error}`, 'error');
      console.error(error);
    }
  }

  /**
   * Start the live market runner
   */
  async start(): Promise<void> {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          LIVE BETTING MARKETS - REAL-TIME ANALYSIS         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    log('CONFIG', `Sport: ${this.config.sport}`, 'info');
    log('CONFIG', `Regions: ${this.config.regions.join(', ')}`, 'info');
    log('CONFIG', `Markets: ${this.config.markets.join(', ')}`, 'info');
    log('CONFIG', `Update Interval: ${this.config.updateInterval}s`, 'info');
    log('CONFIG', `Alerts: ${this.config.enableAlerts ? 'Enabled' : 'Disabled'}`, 'info');

    // Load strategy
    await this.loadStrategy();

    this.isRunning = true;

    // Initial fetch
    await this.fetchAndProcessMatches();

    // Set up interval for continuous updates
    const intervalId = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(intervalId);
        return;
      }

      logDivider();
      log('UPDATE', `Checking for updates (every ${this.config.updateInterval}s)...`, 'info');
      await this.fetchAndProcessMatches();
    }, this.config.updateInterval * 1000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      log('SHUTDOWN', 'Stopping live market runner...', 'warning');
      this.stop();
      clearInterval(intervalId);
      process.exit(0);
    });

    log('RUNNING', 'Live market runner is active. Press Ctrl+C to stop.', 'success');
  }

  /**
   * Stop the runner
   */
  stop(): void {
    this.isRunning = false;
    log('STOPPED', 'Live market runner stopped', 'info');
  }
}

// ==================== SCRIPT EXECUTION ====================

async function main() {
  try {
    const config = getConfig();
    const runner = new LiveMarketRunner(config);
    await runner.start();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { LiveMarketRunner, getConfig };
