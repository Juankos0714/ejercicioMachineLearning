import Plot from 'react-plotly.js';
import { PoissonProbabilities, MonteCarloResult } from '../utils/mathUtils';

interface PredictionChartProps {
  poissonResult: PoissonProbabilities;
  monteCarloResult: MonteCarloResult;
  homeTeamName: string;
  awayTeamName: string;
}

export function PredictionChart({
  poissonResult,
  monteCarloResult,
  homeTeamName,
  awayTeamName
}: PredictionChartProps) {
  const probData = [
    {
      x: [`${homeTeamName} Win`, 'Draw', `${awayTeamName} Win`],
      y: [
        poissonResult.homeWin * 100,
        poissonResult.draw * 100,
        poissonResult.awayWin * 100
      ],
      type: 'bar' as const,
      name: 'Poisson Model',
      marker: { color: '#3b82f6' }
    },
    {
      x: [`${homeTeamName} Win`, 'Draw', `${awayTeamName} Win`],
      y: [
        monteCarloResult.homeWinProb * 100,
        monteCarloResult.drawProb * 100,
        monteCarloResult.awayWinProb * 100
      ],
      type: 'bar' as const,
      name: 'Monte Carlo (10k simulations)',
      marker: { color: '#10b981' }
    }
  ];

  const topScores = Array.from(monteCarloResult.scoreDistribution.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const scoreData = [{
    x: topScores.map(([score]) => score),
    y: topScores.map(([, count]) => (count / 10000) * 100),
    type: 'bar' as const,
    marker: { color: '#8b5cf6' }
  }];

  const heatmapData = [{
    z: poissonResult.scoreMatrix.map(row => row.map(val => val * 100)),
    x: Array.from({ length: 11 }, (_, i) => i.toString()),
    y: Array.from({ length: 11 }, (_, i) => i.toString()),
    type: 'heatmap' as const,
    colorscale: 'Blues' as const,
    showscale: true,
    colorbar: {
      title: 'Probability %'
    }
  }];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Match Outcome Probabilities</h3>
        <Plot
          data={probData}
          layout={{
            barmode: 'group',
            xaxis: { title: 'Outcome' },
            yaxis: { title: 'Probability (%)' },
            height: 400,
            margin: { t: 20, b: 60, l: 60, r: 20 }
          }}
          config={{ responsive: true }}
          className="w-full"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Top 10 Most Likely Scores</h3>
        <Plot
          data={scoreData}
          layout={{
            xaxis: { title: 'Score' },
            yaxis: { title: 'Probability (%)' },
            height: 300,
            margin: { t: 20, b: 60, l: 60, r: 20 }
          }}
          config={{ responsive: true }}
          className="w-full"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Score Probability Matrix (Poisson)</h3>
        <Plot
          data={heatmapData}
          layout={{
            xaxis: { title: `${awayTeamName} Goals`, side: 'bottom' },
            yaxis: { title: `${homeTeamName} Goals` },
            height: 500,
            margin: { t: 20, b: 80, l: 80, r: 20 }
          }}
          config={{ responsive: true }}
          className="w-full"
        />
      </div>
    </div>
  );
}
