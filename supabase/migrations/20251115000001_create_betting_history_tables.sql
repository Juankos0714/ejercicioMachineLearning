-- =====================================================
-- BETTING HISTORY TABLES
-- Tables for storing historical odds, bets, and performance
-- =====================================================

-- Historical Odds Snapshots
CREATE TABLE IF NOT EXISTS odds_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  bookmaker TEXT NOT NULL,

  -- Market odds
  home_win_odds DECIMAL(10, 2),
  draw_odds DECIMAL(10, 2),
  away_win_odds DECIMAL(10, 2),
  over_25_odds DECIMAL(10, 2),
  under_25_odds DECIMAL(10, 2),

  -- Metadata
  snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_closing_line BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for odds_history
CREATE INDEX idx_odds_history_match_id ON odds_history(match_id);
CREATE INDEX idx_odds_history_timestamp ON odds_history(snapshot_timestamp DESC);
CREATE INDEX idx_odds_history_bookmaker ON odds_history(bookmaker);
CREATE INDEX idx_odds_history_closing_line ON odds_history(is_closing_line) WHERE is_closing_line = true;

-- Bet History
CREATE TABLE IF NOT EXISTS bet_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),

  -- Match information
  match_id TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  match_date TIMESTAMPTZ,

  -- Bet details
  bet_type TEXT NOT NULL, -- '1X2', 'OverUnder', 'BTTS', etc.
  outcome TEXT NOT NULL, -- 'home', 'draw', 'over2.5', etc.
  stake DECIMAL(10, 2) NOT NULL,
  odds DECIMAL(10, 2) NOT NULL,
  bookmaker TEXT,

  -- Predictions
  predicted_probability DECIMAL(5, 4),
  expected_value DECIMAL(10, 2),
  model_confidence DECIMAL(5, 4),

  -- Result
  status TEXT DEFAULT 'pending', -- 'pending', 'won', 'lost', 'void', 'cancelled'
  result_home_score INTEGER,
  result_away_score INTEGER,
  payout DECIMAL(10, 2),
  profit_loss DECIMAL(10, 2),

  -- Strategy
  strategy TEXT, -- 'ValueBetting', 'KellyCriterion', etc.
  kelly_fraction DECIMAL(5, 4),

  -- CLV tracking
  closing_odds DECIMAL(10, 2),
  clv_percent DECIMAL(10, 2),

  -- Timestamps
  placed_at TIMESTAMPTZ DEFAULT NOW(),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bet_history
CREATE INDEX idx_bet_history_user_id ON bet_history(user_id);
CREATE INDEX idx_bet_history_match_id ON bet_history(match_id);
CREATE INDEX idx_bet_history_status ON bet_history(status);
CREATE INDEX idx_bet_history_placed_at ON bet_history(placed_at DESC);
CREATE INDEX idx_bet_history_strategy ON bet_history(strategy);

-- Bankroll History
CREATE TABLE IF NOT EXISTS bankroll_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),

  -- Bankroll info
  bankroll DECIMAL(10, 2) NOT NULL,
  change_amount DECIMAL(10, 2),
  change_percent DECIMAL(10, 2),

  -- Context
  event_type TEXT, -- 'bet_placed', 'bet_won', 'bet_lost', 'deposit', 'withdrawal'
  event_id UUID, -- Reference to bet_history.id if applicable
  notes TEXT,

  -- Timestamps
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bankroll_history
CREATE INDEX idx_bankroll_history_user_id ON bankroll_history(user_id);
CREATE INDEX idx_bankroll_history_timestamp ON bankroll_history(timestamp DESC);

-- Performance Metrics (aggregated daily)
CREATE TABLE IF NOT EXISTS daily_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,

  -- Daily stats
  bets_placed INTEGER DEFAULT 0,
  bets_won INTEGER DEFAULT 0,
  bets_lost INTEGER DEFAULT 0,
  bets_void INTEGER DEFAULT 0,

  -- Financial
  total_staked DECIMAL(10, 2) DEFAULT 0,
  total_payout DECIMAL(10, 2) DEFAULT 0,
  net_profit DECIMAL(10, 2) DEFAULT 0,
  roi_percent DECIMAL(10, 2),

  -- Bankroll
  starting_bankroll DECIMAL(10, 2),
  ending_bankroll DECIMAL(10, 2),

  -- Quality metrics
  avg_odds DECIMAL(10, 2),
  avg_expected_value DECIMAL(10, 2),
  avg_clv DECIMAL(10, 2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

-- Indexes for daily_performance
CREATE INDEX idx_daily_performance_user_id ON daily_performance(user_id);
CREATE INDEX idx_daily_performance_date ON daily_performance(date DESC);

-- Alert History
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),

  -- Alert details
  alert_type TEXT NOT NULL, -- 'value_bet', 'arbitrage', 'odds_movement', etc.
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,

  -- Status
  sent_via TEXT[], -- ['email', 'webhook', 'browser']
  read BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,

  -- Related entities
  match_id TEXT,
  bet_id UUID REFERENCES bet_history(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- Indexes for alert_history
CREATE INDEX idx_alert_history_user_id ON alert_history(user_id);
CREATE INDEX idx_alert_history_type ON alert_history(alert_type);
CREATE INDEX idx_alert_history_created_at ON alert_history(created_at DESC);
CREATE INDEX idx_alert_history_read ON alert_history(read) WHERE read = false;

-- User Betting Preferences
CREATE TABLE IF NOT EXISTS user_betting_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,

  -- Bankroll settings
  default_bankroll DECIMAL(10, 2) DEFAULT 1000,
  max_stake_percent DECIMAL(5, 2) DEFAULT 5,

  -- Strategy preferences
  preferred_strategy TEXT DEFAULT 'KellyCriterion',
  kelly_fraction DECIMAL(5, 4) DEFAULT 0.25,
  min_expected_value DECIMAL(10, 2) DEFAULT 2,
  min_confidence DECIMAL(5, 4) DEFAULT 0.6,

  -- Market preferences
  enabled_markets TEXT[] DEFAULT ARRAY['1X2', 'OverUnder'],
  favorite_bookmakers TEXT[],

  -- Risk management
  max_daily_bets INTEGER DEFAULT 10,
  max_daily_loss DECIMAL(10, 2),
  stop_loss_percent DECIMAL(5, 2) DEFAULT 20,

  -- Alert preferences
  alert_email TEXT,
  alert_webhook_url TEXT,
  alert_channels TEXT[] DEFAULT ARRAY['browser'],
  min_alert_ev DECIMAL(10, 2) DEFAULT 5,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user_betting_preferences
CREATE INDEX idx_user_preferences_user_id ON user_betting_preferences(user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_odds_history_updated_at BEFORE UPDATE ON odds_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bet_history_updated_at BEFORE UPDATE ON bet_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_performance_updated_at BEFORE UPDATE ON daily_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_betting_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update daily performance when bet is settled
CREATE OR REPLACE FUNCTION update_daily_performance_on_bet_settle()
RETURNS TRIGGER AS $$
DECLARE
  bet_date DATE;
BEGIN
  -- Only process when bet status changes to won/lost/void
  IF NEW.status IN ('won', 'lost', 'void') AND OLD.status = 'pending' THEN
    bet_date := DATE(NEW.settled_at);

    INSERT INTO daily_performance (user_id, date, bets_placed, bets_won, bets_lost, bets_void, total_staked, total_payout, net_profit)
    VALUES (
      NEW.user_id,
      bet_date,
      0, -- Will be updated by aggregation
      CASE WHEN NEW.status = 'won' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'lost' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'void' THEN 1 ELSE 0 END,
      NEW.stake,
      COALESCE(NEW.payout, 0),
      COALESCE(NEW.profit_loss, 0)
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      bets_won = daily_performance.bets_won + CASE WHEN NEW.status = 'won' THEN 1 ELSE 0 END,
      bets_lost = daily_performance.bets_lost + CASE WHEN NEW.status = 'lost' THEN 1 ELSE 0 END,
      bets_void = daily_performance.bets_void + CASE WHEN NEW.status = 'void' THEN 1 ELSE 0 END,
      total_staked = daily_performance.total_staked + NEW.stake,
      total_payout = daily_performance.total_payout + COALESCE(NEW.payout, 0),
      net_profit = daily_performance.net_profit + COALESCE(NEW.profit_loss, 0),
      roi_percent = CASE
        WHEN daily_performance.total_staked + NEW.stake > 0
        THEN ((daily_performance.net_profit + COALESCE(NEW.profit_loss, 0)) / (daily_performance.total_staked + NEW.stake)) * 100
        ELSE 0
      END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for daily performance update
CREATE TRIGGER update_daily_performance_on_settle AFTER UPDATE ON bet_history
  FOR EACH ROW EXECUTE FUNCTION update_daily_performance_on_bet_settle();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE bet_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankroll_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_betting_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for bet_history
CREATE POLICY "Users can view their own bets" ON bet_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bets" ON bet_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bets" ON bet_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for bankroll_history
CREATE POLICY "Users can view their own bankroll history" ON bankroll_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bankroll records" ON bankroll_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for daily_performance
CREATE POLICY "Users can view their own performance" ON daily_performance
  FOR SELECT USING (auth.uid() = user_id);

-- Policies for alert_history
CREATE POLICY "Users can view their own alerts" ON alert_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" ON alert_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for user_betting_preferences
CREATE POLICY "Users can view their own preferences" ON user_betting_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_betting_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_betting_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Public read access for odds_history (no personal data)
ALTER TABLE odds_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view odds history" ON odds_history
  FOR SELECT USING (true);

-- Only authenticated users can insert odds
CREATE POLICY "Authenticated users can insert odds" ON odds_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
