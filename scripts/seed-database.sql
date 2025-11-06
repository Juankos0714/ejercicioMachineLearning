-- Sample teams data for testing
-- Premier League Teams
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Manchester City', 'Premier League', 2100, 2.5, 0.8, 2.7),
('Arsenal', 'Premier League', 2050, 2.3, 1.0, 2.4),
('Liverpool', 'Premier League', 2080, 2.4, 0.9, 2.6),
('Manchester United', 'Premier League', 1900, 1.8, 1.3, 1.9),
('Chelsea', 'Premier League', 1920, 1.9, 1.2, 2.0),
('Tottenham', 'Premier League', 1880, 2.0, 1.4, 2.1);

-- La Liga Teams
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Real Madrid', 'La Liga', 2120, 2.6, 0.9, 2.8),
('Barcelona', 'La Liga', 2090, 2.5, 1.0, 2.7),
('Atletico Madrid', 'La Liga', 1950, 1.9, 0.8, 1.8),
('Real Sociedad', 'La Liga', 1850, 1.7, 1.3, 1.8),
('Real Betis', 'La Liga', 1820, 1.6, 1.4, 1.7),
('Villarreal', 'La Liga', 1840, 1.7, 1.3, 1.8);

-- Serie A Teams
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Inter Milan', 'Serie A', 2070, 2.3, 0.9, 2.5),
('AC Milan', 'Serie A', 2000, 2.0, 1.1, 2.2),
('Juventus', 'Serie A', 1980, 1.9, 1.0, 2.0),
('Napoli', 'Serie A', 2040, 2.2, 1.0, 2.4),
('Roma', 'Serie A', 1900, 1.8, 1.2, 1.9),
('Lazio', 'Serie A', 1880, 1.9, 1.3, 2.0);

-- Bundesliga Teams
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('Bayern Munich', 'Bundesliga', 2150, 2.8, 0.9, 3.0),
('Borussia Dortmund', 'Bundesliga', 2020, 2.3, 1.2, 2.5),
('RB Leipzig', 'Bundesliga', 1950, 2.0, 1.1, 2.2),
('Bayer Leverkusen', 'Bundesliga', 1920, 2.1, 1.3, 2.3),
('Union Berlin', 'Bundesliga', 1850, 1.7, 1.2, 1.8),
('Eintracht Frankfurt', 'Bundesliga', 1840, 1.8, 1.4, 1.9);

-- Ligue 1 Teams
INSERT INTO teams (name, league, elo_rating, avg_goals_scored, avg_goals_conceded, xg_per_match) VALUES
('PSG', 'Ligue 1', 2110, 2.7, 0.9, 2.9),
('Marseille', 'Ligue 1', 1900, 1.9, 1.2, 2.0),
('Monaco', 'Ligue 1', 1880, 1.8, 1.3, 1.9),
('Lyon', 'Ligue 1', 1860, 1.7, 1.3, 1.8),
('Lille', 'Ligue 1', 1840, 1.6, 1.2, 1.7),
('Lens', 'Ligue 1', 1820, 1.7, 1.4, 1.8);
