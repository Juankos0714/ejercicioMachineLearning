import { describe, it, expect } from 'vitest';
import {
  extractUltraFeatures,
  ultraFeaturesToArray,
  getUltraFeatureNames,
  mockUltraStats,
  type UltraMatchFeatures,
  type UltraTeamStats,
} from './mlUltraFeatures';
import { mockFormData, mockHeadToHeadData, mockAdvancedStats, extractAdvancedFeatures } from './mlAdvancedFeatures';
import { Team } from '../lib/supabase';

describe('Ultra Features for Maximum Accuracy', () => {
  const mockHomeTeam: Team = {
    id: '1',
    name: 'Manchester United',
    league: 'Premier League',
    elo_rating: 1950,
    avg_goals_scored: 1.8,
    avg_goals_conceded: 1.2,
    xg_per_match: 2.0,
    created_at: new Date().toISOString(),
  };

  const mockAwayTeam: Team = {
    id: '2',
    name: 'Liverpool',
    league: 'Premier League',
    elo_rating: 2050,
    avg_goals_scored: 2.2,
    avg_goals_conceded: 0.9,
    xg_per_match: 2.5,
    created_at: new Date().toISOString(),
  };

  describe('Feature Extraction', () => {
    it('should extract ultra features with all 112 features', () => {
      const homeUltraStats = mockUltraStats();
      const awayUltraStats = mockUltraStats();
      const advancedFeatures = extractAdvancedFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        mockFormData(),
        mockFormData(),
        mockHeadToHeadData(),
        mockAdvancedStats(),
        mockAdvancedStats()
      );

      const ultraFeatures = extractUltraFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        homeUltraStats,
        awayUltraStats,
        advancedFeatures
      );

      // Verify all ultra-specific features exist
      expect(ultraFeatures.homeWinRateAtHome).toBeDefined();
      expect(ultraFeatures.homeCornersPerMatch).toBeDefined();
      expect(ultraFeatures.homeYellowCardsPerMatch).toBeDefined();
      expect(ultraFeatures.homeCleanSheetRate).toBeDefined();
      expect(ultraFeatures.homeGoalConversionRate).toBeDefined();
      expect(ultraFeatures.homeLeaguePosition).toBeDefined();
      expect(ultraFeatures.homeForm3Matches).toBeDefined();
      expect(ultraFeatures.homeScoredFirstRate).toBeDefined();
      expect(ultraFeatures.homeSquadValue).toBeDefined();
      expect(ultraFeatures.homeManagerWinRate).toBeDefined();
    });

    it('should convert ultra features to array of 112 elements', () => {
      const homeUltraStats = mockUltraStats();
      const awayUltraStats = mockUltraStats();
      const advancedFeatures = extractAdvancedFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        mockFormData(),
        mockFormData(),
        mockHeadToHeadData(),
        mockAdvancedStats(),
        mockAdvancedStats()
      );

      const ultraFeatures = extractUltraFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        homeUltraStats,
        awayUltraStats,
        advancedFeatures
      );

      const featuresArray = ultraFeaturesToArray(ultraFeatures);

      expect(featuresArray).toHaveLength(112);
      expect(featuresArray.every(f => typeof f === 'number')).toBe(true);
      expect(featuresArray.every(f => !isNaN(f))).toBe(true);
    });

    it('should have 112 feature names', () => {
      const names = getUltraFeatureNames();
      expect(names).toHaveLength(112);
      expect(names).toContain('homeWinRateAtHome');
      expect(names).toContain('homeCornersPerMatch');
      expect(names).toContain('homeCleanSheetRate');
      expect(names).toContain('homeLeaguePosition');
      expect(names).toContain('squadValueRatio');
      expect(names).toContain('homeManagerWinRate');
    });
  });

  describe('Home/Away Splits', () => {
    it('should calculate home/away performance correctly', () => {
      const homeStats: UltraTeamStats = {
        ...mockUltraStats(),
        homeMatches: 10,
        homeWins: 7,
        homeGoalsScored: 20,
        awayMatches: 10,
        awayWins: 3,
        awayGoalsScored: 12,
      };

      const awayStats: UltraTeamStats = {
        ...mockUltraStats(),
        homeMatches: 10,
        homeWins: 6,
        homeGoalsScored: 18,
        awayMatches: 10,
        awayWins: 4,
        awayGoalsScored: 14,
      };

      const advancedFeatures = extractAdvancedFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        mockFormData(),
        mockFormData(),
        mockHeadToHeadData(),
        mockAdvancedStats(),
        mockAdvancedStats()
      );

      const features = extractUltraFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        homeStats,
        awayStats,
        advancedFeatures
      );

      // Home team should have better home record (7/10 = 0.7)
      expect(features.homeWinRateAtHome).toBeCloseTo(0.7, 2);
      expect(features.homeGoalsScoredAtHome).toBe(2.0); // 20/10

      // Away team should have decent away record (4/10 = 0.4)
      expect(features.awayWinRateAway).toBeCloseTo(0.4, 2);
      expect(features.awayGoalsScoredAway).toBe(1.4); // 14/10
    });
  });

  describe('Corners and Set Pieces', () => {
    it('should calculate corner conversion rates', () => {
      const stats: UltraTeamStats = {
        ...mockUltraStats(),
        avgCorners: 6.0,
        cornerGoals: 4,
        setPieceGoals: 8,
        homeMatches: 10,
        awayMatches: 10,
      };

      const advancedFeatures = extractAdvancedFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        mockFormData(),
        mockFormData(),
        mockHeadToHeadData(),
        mockAdvancedStats(),
        mockAdvancedStats()
      );

      const features = extractUltraFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        stats,
        stats,
        advancedFeatures
      );

      expect(features.homeCornersPerMatch).toBe(6.0);
      expect(features.homeSetPieceGoals).toBe(8);
      expect(features.homeCornerConversionRate).toBeGreaterThan(0);
    });
  });

  describe('Defensive Metrics', () => {
    it('should calculate clean sheet rates correctly', () => {
      const strongDefense: UltraTeamStats = {
        ...mockUltraStats(),
        cleanSheets: 12,
        homeMatches: 10,
        awayMatches: 10,
        avgTackles: 18.5,
        avgInterceptions: 14.2,
      };

      const advancedFeatures = extractAdvancedFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        mockFormData(),
        mockFormData(),
        mockHeadToHeadData(),
        mockAdvancedStats(),
        mockAdvancedStats()
      );

      const features = extractUltraFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        strongDefense,
        mockUltraStats(),
        advancedFeatures
      );

      // 12 clean sheets in 20 matches = 0.6
      expect(features.homeCleanSheetRate).toBeCloseTo(0.6, 2);
      expect(features.homeTacklesPerMatch).toBe(18.5);
      expect(features.homeInterceptionsPerMatch).toBe(14.2);
    });
  });

  describe('League Position and Form', () => {
    it('should calculate position differences correctly', () => {
      const homeStats: UltraTeamStats = {
        ...mockUltraStats(),
        leaguePosition: 3,
        leaguePoints: 58,
        last3Points: 9, // 3 wins
        last10Points: 24,
      };

      const awayStats: UltraTeamStats = {
        ...mockUltraStats(),
        leaguePosition: 8,
        leaguePoints: 45,
        last3Points: 4, // 1 win, 1 draw
        last10Points: 18,
      };

      const advancedFeatures = extractAdvancedFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        mockFormData(),
        mockFormData(),
        mockHeadToHeadData(),
        mockAdvancedStats(),
        mockAdvancedStats()
      );

      const features = extractUltraFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        homeStats,
        awayStats,
        advancedFeatures
      );

      expect(features.homeLeaguePosition).toBe(3);
      expect(features.awayLeaguePosition).toBe(8);
      expect(features.positionDifference).toBe(-5); // Home team is 5 positions higher
      expect(features.pointsDifference).toBe(13); // Home team has 13 more points
      expect(features.homeForm3Matches).toBe(9);
      expect(features.awayForm3Matches).toBe(4);
    });

    it('should calculate form trends (improving vs declining)', () => {
      const improvingTeam: UltraTeamStats = {
        ...mockUltraStats(),
        last3Points: 9, // Recent: 3 wins
        last5Points: 12, // 5 matches: 4 wins
        last10Points: 20, // 10 matches
      };

      const advancedFeatures = extractAdvancedFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        mockFormData(),
        mockFormData(),
        mockHeadToHeadData(),
        mockAdvancedStats(),
        mockAdvancedStats()
      );

      const features = extractUltraFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        improvingTeam,
        mockUltraStats(),
        advancedFeatures
      );

      // Form trend should be positive (recent form better than 5-match average)
      // Last 3: 9/3 = 3.0 points per game
      // Last 5: 12/5 = 2.4 points per game
      // Trend = 3.0 - 2.4 = +0.6 (improving)
      expect(features.homeFormTrend).toBeGreaterThan(0);
    });
  });

  describe('Performance Patterns', () => {
    it('should calculate scoring first statistics', () => {
      const stats: UltraTeamStats = {
        ...mockUltraStats(),
        scoredFirstCount: 15,
        wonWhenScoredFirst: 12,
        comebackWins: 3,
        homeMatches: 10,
        awayMatches: 10,
      };

      const advancedFeatures = extractAdvancedFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        mockFormData(),
        mockFormData(),
        mockHeadToHeadData(),
        mockAdvancedStats(),
        mockAdvancedStats()
      );

      const features = extractUltraFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        stats,
        mockUltraStats(),
        advancedFeatures
      );

      // Scored first in 15/20 = 0.75
      expect(features.homeScoredFirstRate).toBeCloseTo(0.75, 2);
      // Won 12/15 when scoring first = 0.8
      expect(features.homeWonWhenScoredFirst).toBeCloseTo(0.8, 2);
      expect(features.homeComebackWins).toBe(3);
    });

    it('should track first and second half performance', () => {
      const stats: UltraTeamStats = {
        ...mockUltraStats(),
        firstHalfGoals: 18,
        secondHalfGoals: 24,
      };

      const advancedFeatures = extractAdvancedFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        mockFormData(),
        mockFormData(),
        mockHeadToHeadData(),
        mockAdvancedStats(),
        mockAdvancedStats()
      );

      const features = extractUltraFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        stats,
        mockUltraStats(),
        advancedFeatures
      );

      expect(features.homeFirstHalfGoals).toBe(18);
      expect(features.homeSecondHalfGoals).toBe(24);
      // Team scores more in second half (stronger finisher)
    });
  });

  describe('Squad and Management', () => {
    it('should calculate squad value ratios', () => {
      const richTeam: UltraTeamStats = {
        ...mockUltraStats(),
        squadValue: 800, // 800 million
      };

      const normalTeam: UltraTeamStats = {
        ...mockUltraStats(),
        squadValue: 200, // 200 million
      };

      const advancedFeatures = extractAdvancedFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        mockFormData(),
        mockFormData(),
        mockHeadToHeadData(),
        mockAdvancedStats(),
        mockAdvancedStats()
      );

      const features = extractUltraFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        richTeam,
        normalTeam,
        advancedFeatures
      );

      // Squad value ratio should be 800/200 = 4.0
      expect(features.squadValueRatio).toBeCloseTo(4.0, 1);
      expect(features.homeSquadValue).toBe(800);
      expect(features.awaySquadValue).toBe(200);
    });

    it('should calculate manager statistics', () => {
      const experiencedManager: UltraTeamStats = {
        ...mockUltraStats(),
        managerMonths: 36, // 3 years
        managerWins: 72,
        managerMatches: 150,
      };

      const advancedFeatures = extractAdvancedFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        mockFormData(),
        mockFormData(),
        mockHeadToHeadData(),
        mockAdvancedStats(),
        mockAdvancedStats()
      );

      const features = extractUltraFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        experiencedManager,
        mockUltraStats(),
        advancedFeatures
      );

      expect(features.homeManagerTenure).toBe(36);
      // Win rate should be 72/150 = 0.48
      expect(features.homeManagerWinRate).toBeCloseTo(0.48, 2);
    });

    it('should track injuries and rotation', () => {
      const tiredTeam: UltraTeamStats = {
        ...mockUltraStats(),
        squadRotation: 0.65, // High rotation
        injuries: 5, // Many injuries
      };

      const advancedFeatures = extractAdvancedFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        mockFormData(),
        mockFormData(),
        mockHeadToHeadData(),
        mockAdvancedStats(),
        mockAdvancedStats()
      );

      const features = extractUltraFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        tiredTeam,
        mockUltraStats(),
        advancedFeatures
      );

      expect(features.homeSquadRotationIndex).toBe(0.65);
      expect(features.homeInjuriesCount).toBe(5);
    });
  });

  describe('Feature Importance', () => {
    it('should include all critical predictive features', () => {
      const names = getUltraFeatureNames();

      // Critical features for accuracy
      const criticalFeatures = [
        'homeWinRateAtHome',
        'awayWinRateAway',
        'homeCleanSheetRate',
        'homeLeaguePosition',
        'positionDifference',
        'homeForm3Matches',
        'homeFormTrend',
        'homeScoredFirstRate',
        'homeGoalConversionRate',
        'squadValueRatio',
      ];

      criticalFeatures.forEach(feature => {
        expect(names).toContain(feature);
      });
    });
  });

  describe('Data Quality', () => {
    it('should handle edge cases gracefully', () => {
      const edgeCaseStats: UltraTeamStats = {
        ...mockUltraStats(),
        homeMatches: 0, // No home matches yet
        awayMatches: 0, // No away matches yet
        avgShots: 0, // No shots data
        scoredFirstCount: 0, // Never scored first
      };

      const advancedFeatures = extractAdvancedFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        mockFormData(),
        mockFormData(),
        mockHeadToHeadData(),
        mockAdvancedStats(),
        mockAdvancedStats()
      );

      const features = extractUltraFeatures(
        mockHomeTeam,
        mockAwayTeam,
        'Premier League',
        edgeCaseStats,
        edgeCaseStats,
        advancedFeatures
      );

      // Should use fallback values
      expect(features.homeWinRateAtHome).toBeGreaterThanOrEqual(0);
      expect(features.homeWinRateAtHome).toBeLessThanOrEqual(1);

      const featuresArray = ultraFeaturesToArray(features);
      // No NaN or Infinity values
      expect(featuresArray.every(f => isFinite(f))).toBe(true);
    });
  });
});
