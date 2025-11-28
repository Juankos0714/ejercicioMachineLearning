import { supabase } from '../lib/supabase';
import { predictHybrid, type HybridPrediction } from './mlHybridPredictor';
import { loadNeuralNetwork } from './mlNeuralNetwork';
import { trainAllModels, type TrainedModels, AutoRetrainingScheduler } from './mlTrainingSystem';
import {
  calculateRecentForm
} from './mlRealDataLoader';
import {
  mockAdvancedStats,
  type FormData,
  type TeamAdvancedStats
} from './mlAdvancedFeatures';

/**
 * Production ML Prediction API
 * Manages trained models and provides prediction endpoints
 */
export class MLPredictionAPI {
  private models?: TrainedModels;
  private scheduler?: AutoRetrainingScheduler;
  private isInitialized: boolean = false;

  constructor() {}

  /**
   * Initialize the API with trained models
   */
  async initialize(autoRetrain: boolean = true): Promise<void> {
    console.log('\n🚀 Initializing ML Prediction API...\n');

    try {
      // Try to load existing trained models
      console.log('📦 Loading existing models...');
      await loadNeuralNetwork('localstorage://football-predictor-trained');

      // TODO: Load RF model (currently no persistence for RF)
      // For now, we'll need to retrain
      console.log('⚠️  Random Forest not found, training new models...\n');
      this.models = await trainAllModels({
        useRealData: true,
        optimizeWeights: true
      });

    } catch {
      console.log('📚 No existing models found, training initial models...\n');
      this.models = await trainAllModels({
        useRealData: true,
        optimizeWeights: true
      });
    }

    // Start auto-retraining if enabled
    if (autoRetrain) {
      this.scheduler = new AutoRetrainingScheduler(24);  // Check daily
      await this.scheduler.start(this.models);
    }

    this.isInitialized = true;
    console.log('✅ ML Prediction API initialized successfully!\n');
  }

  /**
   * Make a prediction for a match
   */
  async predict(
    homeTeamId: string,
    awayTeamId: string,
    options: {
      includeAdvancedFeatures?: boolean;
      useHybrid?: boolean;
    } = {}
  ): Promise<HybridPrediction> {
    if (!this.isInitialized) {
      throw new Error('API not initialized. Call initialize() first.');
    }

    // Load teams
    const { data: homeTeam, error: homeError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', homeTeamId)
      .single();

    const { data: awayTeam, error: awayError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', awayTeamId)
      .single();

    if (homeError || awayError || !homeTeam || !awayTeam) {
      throw new Error('Teams not found');
    }

    const league = homeTeam.league;

    // Make prediction
    if (options.useHybrid !== false && this.models) {
      return await predictHybrid(
        homeTeam,
        awayTeam,
        league,
        {
          randomForest: this.models.randomForest,
          neuralNetwork: this.models.neuralNetwork
        },
        this.models.trainingMetadata.optimalWeights
      );
    } else {
      // Mathematical only
      return await predictHybrid(homeTeam, awayTeam, league);
    }
  }

  /**
   * Make an advanced prediction with all features
   */
  async predictAdvanced(
    homeTeamId: string,
    awayTeamId: string
  ): Promise<{
    prediction: HybridPrediction;
    features: {
      homeForm: FormData;
      awayForm: FormData;
      homeStats: TeamAdvancedStats;
      awayStats: TeamAdvancedStats;
    };
  }> {
    if (!this.isInitialized) {
      throw new Error('API not initialized. Call initialize() first.');
    }

    // Load teams
    const { data: homeTeam } = await supabase
      .from('teams')
      .select('*')
      .eq('id', homeTeamId)
      .single();

    const { data: awayTeam } = await supabase
      .from('teams')
      .select('*')
      .eq('id', awayTeamId)
      .single();

    if (!homeTeam || !awayTeam) {
      throw new Error('Teams not found');
    }

    // Calculate recent form
    const homeForm = await calculateRecentForm(homeTeamId);
    const awayForm = await calculateRecentForm(awayTeamId);

    // Get advanced stats (mock for now, implement real stats later)
    const homeStats = mockAdvancedStats();
    const awayStats = mockAdvancedStats();

    // Make prediction
    const prediction = await this.predict(homeTeamId, awayTeamId, {
      useHybrid: true
    });

    return {
      prediction,
      features: {
        homeForm,
        awayForm,
        homeStats,
        awayStats
      }
    };
  }

  /**
   * Batch predict multiple matches
   */
  async predictBatch(
    matches: Array<{ homeTeamId: string; awayTeamId: string }>
  ): Promise<HybridPrediction[]> {
    const predictions: HybridPrediction[] = [];

    for (const match of matches) {
      try {
        const prediction = await this.predict(match.homeTeamId, match.awayTeamId);
        predictions.push(prediction);
      } catch (error) {
        console.error(`Failed to predict match ${match.homeTeamId} vs ${match.awayTeamId}:`, error);
      }
    }

    return predictions;
  }

  /**
   * Get upcoming matches and their predictions
   */
  async predictUpcomingMatches(league?: string): Promise<
    Array<{
      match: any;
      prediction: HybridPrediction;
    }>
  > {
    let query = supabase
      .from('matches')
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
      .is('home_score', null)
      .is('away_score', null)
      .gte('match_date', new Date().toISOString())
      .order('match_date', { ascending: true })
      .limit(20);

    if (league) {
      query = query.eq('league', league);
    }

    const { data: matches, error } = await query;

    if (error || !matches) {
      return [];
    }

    const results = [];

    for (const match of matches) {
      try {
        const prediction = await this.predict(
          match.home_team_id,
          match.away_team_id
        );

        results.push({ match, prediction });
      } catch (error) {
        console.error(`Failed to predict match ${match.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Get model performance metrics
   */
  getPerformanceMetrics(): any {
    if (!this.models) {
      return null;
    }

    return {
      trainedAt: this.models.trainingMetadata.trainedAt,
      trainSize: this.models.trainingMetadata.trainSize,
      testSize: this.models.trainingMetadata.testSize,
      dataSource: this.models.trainingMetadata.dataSource,
      performance: this.models.trainingMetadata.performance,
      optimalWeights: this.models.trainingMetadata.optimalWeights
    };
  }

  /**
   * Manually trigger retraining
   */
  async retrain(): Promise<void> {
    console.log('\n🔄 Manually triggering model retraining...\n');

    const { retrainModels } = await import('./mlTrainingSystem');
    this.models = await retrainModels(this.models);

    console.log('✅ Retraining complete!\n');
  }

  /**
   * Stop the API and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.scheduler) {
      this.scheduler.stop();
    }

    this.isInitialized = false;
    console.log('🛑 ML Prediction API shut down');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    if (!this.isInitialized) {
      return {
        status: 'unhealthy',
        details: { error: 'API not initialized' }
      };
    }

    if (!this.models) {
      return {
        status: 'degraded',
        details: { warning: 'Models not loaded' }
      };
    }

    const performance = this.models.trainingMetadata.performance.hybrid;

    const status = performance.accuracy > 0.40 ? 'healthy' :
                   performance.accuracy > 0.30 ? 'degraded' : 'unhealthy';

    return {
      status,
      details: {
        initialized: this.isInitialized,
        hasModels: !!this.models,
        accuracy: performance.accuracy,
        trainedAt: this.models.trainingMetadata.trainedAt,
        autoRetrainEnabled: !!this.scheduler
      }
    };
  }
}

/**
 * Singleton instance for global use
 */
export const mlAPI = new MLPredictionAPI();

/**
 * Initialize the API (call once on app startup)
 */
export async function initializeMLAPI(autoRetrain: boolean = true): Promise<void> {
  await mlAPI.initialize(autoRetrain);
}

/**
 * Quick prediction function
 */
export async function quickPredict(
  homeTeamId: string,
  awayTeamId: string
): Promise<HybridPrediction> {
  return await mlAPI.predict(homeTeamId, awayTeamId);
}

/**
 * Get predictions for all upcoming matches
 */
export async function predictAllUpcoming(league?: string): Promise<any[]> {
  return await mlAPI.predictUpcomingMatches(league);
}
