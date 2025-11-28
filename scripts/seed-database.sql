-- Sample teams data for testing - Updated for 2025-26 Season (as of Nov 2025, Gameweek 11)
-- Premier League Teams
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Manchester City', 'Premier League', 2080, 2.2, 0.9, 2.4),
('Arsenal', 'Premier League', 2100, 2.1, 0.8, 2.3),
('Liverpool', 'Premier League', 1980, 1.7, 1.2, 1.9),
('Manchester United', 'Premier League', 1900, 1.6, 1.3, 1.7),
('Chelsea', 'Premier League', 2020, 2.0, 1.0, 2.1),
('Tottenham', 'Premier League', 1950, 1.8, 1.2, 1.9);

-- La Liga Teams - Updated for 2025-26 Season (Barcelona defending champions)
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Real Madrid', 'La Liga', 2100, 2.2, 1.0, 2.4),
('Barcelona', 'La Liga', 2120, 2.5, 0.9, 2.7),
('Atletico Madrid', 'La Liga', 2000, 2.0, 0.8, 2.0),
('Real Sociedad', 'La Liga', 1880, 1.8, 1.2, 1.9),
('Real Betis', 'La Liga', 1840, 1.6, 1.3, 1.7),
('Villarreal', 'La Liga', 1860, 1.7, 1.2, 1.8);

-- Serie A Teams - Updated for 2025-26 Season (Napoli defending champions, leading table)
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Inter Milan', 'Serie A', 2090, 2.4, 0.8, 2.6),
('AC Milan', 'Serie A', 1980, 1.9, 1.1, 2.1),
('Juventus', 'Serie A', 2020, 2.0, 0.9, 2.2),
('Napoli', 'Serie A', 2100, 1.8, 0.7, 2.0),
('Roma', 'Serie A', 1920, 1.7, 1.2, 1.9),
('Lazio', 'Serie A', 1900, 1.8, 1.2, 2.0);

-- Bundesliga Teams - Updated for 2025-26 Season (Bayern dominant with 28/30 points)
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Bayern Munich', 'Bundesliga', 2180, 3.4, 0.7, 3.6),
('Borussia Dortmund', 'Bundesliga', 2000, 2.4, 1.1, 2.6),
('RB Leipzig', 'Bundesliga', 2050, 2.5, 0.9, 2.7),
('Bayer Leverkusen', 'Bundesliga', 1980, 2.0, 1.2, 2.2),
('Union Berlin', 'Bundesliga', 1880, 1.8, 1.1, 1.9),
('Eintracht Frankfurt', 'Bundesliga', 1860, 1.9, 1.3, 2.0);

-- Ligue 1 Teams - Updated for 2025-26 Season (PSG leading with 8W-3D-1L)
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('PSG', 'Ligue 1', 2100, 2.0, 0.8, 2.1),
('Marseille', 'Ligue 1', 1920, 1.8, 1.1, 1.9),
('Monaco', 'Ligue 1', 1900, 1.9, 1.2, 2.0),
('Lyon', 'Ligue 1', 1880, 1.7, 1.2, 1.8),
('Lille', 'Ligue 1', 1860, 1.7, 1.1, 1.8),
('Lens', 'Ligue 1', 1840, 1.8, 1.3, 1.9);
