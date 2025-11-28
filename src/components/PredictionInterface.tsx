import { useState, useEffect, lazy, Suspense } from 'react';
import { Calculator, TrendingUp, Target, Percent } from 'lucide-react';
import { getTeamsByLeague, predictMatch, type PredictionResult } from '../services/predictionService';
import { Team } from '../lib/supabase';
import type { HybridPrediction } from '../services/mlHybridPredictor';

// Lazy load the chart component to reduce initial bundle size
const PredictionChart = lazy(() => import('./PredictionChart').then(module => ({ default: module.PredictionChart })));

const LEAGUES = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'];

interface PredictionInterfaceProps {
  onPredictionChange?: (prediction: HybridPrediction | null) => void;
}

export function PredictionInterface({ onPredictionChange }: PredictionInterfaceProps) {
  const [selectedLeague, setSelectedLeague] = useState<string>('Premier League');
  const [teams, setTeams] = useState<Team[]>([]);
  const [homeTeamId, setHomeTeamId] = useState<string>('');
  const [awayTeamId, setAwayTeamId] = useState<string>('');
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadTeams();
  }, [selectedLeague]);

  const loadTeams = async () => {
    try {
      const data = await getTeamsByLeague(selectedLeague);
      setTeams(data);
      setHomeTeamId('');
      setAwayTeamId('');
      setPrediction(null);
      if (onPredictionChange) {
        onPredictionChange(null);
      }
    } catch {
      setError('Failed to load teams');
    }
  };

  const handlePredict = async () => {
    if (!homeTeamId || !awayTeamId) {
      setError('Please select both teams');
      return;
    }

    if (homeTeamId === awayTeamId) {
      setError('Please select different teams');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await predictMatch(homeTeamId, awayTeamId);
      setPrediction(result);

      // Convert PredictionResult to HybridPrediction for compatibility
      if (onPredictionChange) {
        const hybridPrediction: HybridPrediction = {
          homeWinProb: result.homeWinProb,
          drawProb: result.drawProb,
          awayWinProb: result.awayWinProb,
          expectedHomeScore: result.expectedHomeScore,
          expectedAwayScore: result.expectedAwayScore,
          over25Prob: result.over25Prob,
          mathematical: {
            poisson: result.poissonResult,
            monteCarlo: result.monteCarloResult,
            lambdaHome: result.expectedHomeScore,
            lambdaAway: result.expectedAwayScore,
          },
          confidence: 0.75, // Default confidence for mathematical predictions
          method: 'mathematical',
          featureLevel: 'basic',
          featureCount: 6,
          homeTeam: result.homeTeam,
          awayTeam: result.awayTeam,
        };
        onPredictionChange(hybridPrediction);
      }
    } catch {
      setError('Failed to generate prediction');
      if (onPredictionChange) {
        onPredictionChange(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Calculator className="w-8 h-8 text-blue-600" />
          Football Match Predictor
        </h1>
        <p className="text-gray-600 mb-6">
          Mathematical predictions using Elo ratings, Poisson distribution, and Monte Carlo simulation
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              League
            </label>
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {LEAGUES.map(league => (
                <option key={league} value={league}>{league}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Home Team
            </label>
            <select
              value={homeTeamId}
              onChange={(e) => setHomeTeamId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={teams.length === 0}
            >
              <option value="">Select home team</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Away Team
            </label>
            <select
              value={awayTeamId}
              onChange={(e) => setAwayTeamId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={teams.length === 0}
            >
              <option value="">Select away team</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handlePredict}
          disabled={loading || !homeTeamId || !awayTeamId}
          className="mt-6 w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Calculating...' : 'Generate Prediction'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {prediction && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold">Match Outcome</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{prediction.homeTeam.name} Win</span>
                    <span className="font-bold text-green-600">
                      {(prediction.homeWinProb * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${prediction.homeWinProb * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Draw</span>
                    <span className="font-bold text-gray-600">
                      {(prediction.drawProb * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-600 h-2 rounded-full"
                      style={{ width: `${prediction.drawProb * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{prediction.awayTeam.name} Win</span>
                    <span className="font-bold text-blue-600">
                      {(prediction.awayWinProb * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${prediction.awayWinProb * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-6 h-6 text-orange-600" />
                <h3 className="text-lg font-semibold">Expected Score</h3>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-800 mb-2">
                  {prediction.expectedHomeScore.toFixed(2)} - {prediction.expectedAwayScore.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  Calculated using Poisson λ parameters
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Home λ</div>
                    <div className="font-bold">{prediction.expectedHomeScore.toFixed(3)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Away λ</div>
                    <div className="font-bold">{prediction.expectedAwayScore.toFixed(3)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Percent className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-semibold">Goals Market</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {(prediction.over25Prob * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Over 2.5 Goals</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600 mb-1">
                    {((1 - prediction.over25Prob) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Under 2.5 Goals</div>
                </div>
                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-600">Monte Carlo Avg</div>
                  <div className="font-bold">
                    {prediction.monteCarloResult.avgHomeScore.toFixed(2)} - {prediction.monteCarloResult.avgAwayScore.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">Team Statistics</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-lg mb-3">{prediction.homeTeam.name}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Elo Rating:</span>
                    <span className="font-bold">{prediction.homeTeam.elo_rating.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Goals Scored:</span>
                    <span className="font-bold">{prediction.homeTeam.avg_goals_scored.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Goals Conceded:</span>
                    <span className="font-bold">{prediction.homeTeam.avg_goals_conceded.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">xG per Match:</span>
                    <span className="font-bold">{prediction.homeTeam.xg_per_match.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-3">{prediction.awayTeam.name}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Elo Rating:</span>
                    <span className="font-bold">{prediction.awayTeam.elo_rating.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Goals Scored:</span>
                    <span className="font-bold">{prediction.awayTeam.avg_goals_scored.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Goals Conceded:</span>
                    <span className="font-bold">{prediction.awayTeam.avg_goals_conceded.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">xG per Match:</span>
                    <span className="font-bold">{prediction.awayTeam.xg_per_match.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-6">Mathematical Analysis</h3>
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading charts...</div>
              </div>
            }>
              <PredictionChart
                poissonResult={prediction.poissonResult}
                monteCarloResult={prediction.monteCarloResult}
                homeTeamName={prediction.homeTeam.name}
                awayTeamName={prediction.awayTeam.name}
              />
            </Suspense>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-sm text-gray-700">
              <strong>Disclaimer:</strong> These predictions are based on precise mathematical models including Elo ratings,
              Poisson distributions, and Monte Carlo simulations (10,000 iterations). While mathematically rigorous,
              predictions are not infallible and should not be used for irresponsible betting. Football matches involve
              unpredictable human factors that mathematical models cannot fully capture.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
