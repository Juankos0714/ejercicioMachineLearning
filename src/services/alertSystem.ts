/**
 * AUTOMATIC ALERT SYSTEM
 *
 * Real-time alert system for betting opportunities and events
 *
 * Features:
 * - Value bet detection and alerts
 * - Odds movement alerts
 * - Closing line value alerts
 * - Bankroll threshold alerts
 * - Multiple notification channels (console, browser, email, webhook)
 * - Alert filtering and prioritization
 */

import { BetRecommendation, BettingAnalysis } from './mlBettingAnalyzer';
import { OddsMovement, ClosingLineValue } from './oddsApiService';

// ==================== TYPES ====================

export type AlertType =
  | 'value_bet'
  | 'strong_value_bet'
  | 'arbitrage'
  | 'odds_movement'
  | 'closing_line'
  | 'bankroll_threshold'
  | 'profit_target'
  | 'stop_loss'
  | 'model_confidence'
  | 'market_inefficiency';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type NotificationChannel = 'console' | 'browser' | 'email' | 'webhook' | 'sound';

export interface Alert {
  id: string;
  timestamp: Date;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  dismissed: boolean;
}

export interface AlertRule {
  id: string;
  type: AlertType;
  enabled: boolean;
  conditions: {
    minEV?: number;
    minConfidence?: number;
    maxRisk?: string;
    minOddsMovement?: number;
    minCLV?: number;
    bankrollThreshold?: number;
  };
  channels: NotificationChannel[];
  priority: AlertSeverity;
}

export interface AlertConfig {
  enabled: boolean;
  rules: AlertRule[];
  channels: {
    browser: {
      enabled: boolean;
      permission: NotificationPermission;
    };
    email: {
      enabled: boolean;
      address?: string;
    };
    webhook: {
      enabled: boolean;
      url?: string;
    };
    sound: {
      enabled: boolean;
      volume: number;
    };
  };
  rateLimit: {
    enabled: boolean;
    maxAlertsPerHour: number;
  };
}

export interface NotificationPayload {
  alert: Alert;
  channels: NotificationChannel[];
}

// ==================== ALERT SYSTEM ====================

export class AlertSystem {
  private config: AlertConfig;
  private alerts: Alert[] = [];
  private listeners: Array<(alert: Alert) => void> = [];
  private alertCount: Map<string, number> = new Map(); // For rate limiting

  constructor(config?: Partial<AlertConfig>) {
    this.config = {
      enabled: true,
      rules: this.getDefaultRules(),
      channels: {
        browser: {
          enabled: true,
          permission: 'default',
        },
        email: {
          enabled: false,
        },
        webhook: {
          enabled: false,
        },
        sound: {
          enabled: true,
          volume: 0.5,
        },
      },
      rateLimit: {
        enabled: true,
        maxAlertsPerHour: 20,
      },
      ...config,
    };

    // Request browser notification permission (only in browser)
    if (typeof window !== 'undefined' && this.config.channels.browser.enabled && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        this.config.channels.browser.permission = permission;
      });
    }
  }

  /**
   * Get default alert rules
   */
  private getDefaultRules(): AlertRule[] {
    return [
      {
        id: 'value-bet',
        type: 'value_bet',
        enabled: true,
        conditions: { minEV: 2, minConfidence: 0.6 },
        channels: ['console', 'browser'],
        priority: 'medium',
      },
      {
        id: 'strong-value-bet',
        type: 'strong_value_bet',
        enabled: true,
        conditions: { minEV: 5, minConfidence: 0.7 },
        channels: ['console', 'browser', 'sound'],
        priority: 'high',
      },
      {
        id: 'arbitrage',
        type: 'arbitrage',
        enabled: true,
        conditions: {},
        channels: ['console', 'browser', 'sound'],
        priority: 'critical',
      },
      {
        id: 'odds-movement',
        type: 'odds_movement',
        enabled: true,
        conditions: { minOddsMovement: 5 },
        channels: ['console'],
        priority: 'low',
      },
      {
        id: 'closing-line',
        type: 'closing_line',
        enabled: true,
        conditions: { minCLV: 2 },
        channels: ['console', 'browser'],
        priority: 'medium',
      },
      {
        id: 'stop-loss',
        type: 'stop_loss',
        enabled: true,
        conditions: { bankrollThreshold: 80 }, // Alert if bankroll drops below 80%
        channels: ['console', 'browser', 'sound'],
        priority: 'critical',
      },
    ];
  }

  /**
   * Analyze betting opportunities and trigger alerts
   */
  analyzeBettingOpportunities(analysis: BettingAnalysis): void {
    if (!this.config.enabled) return;

    // Check for value bets
    for (const bet of analysis.topRecommendations) {
      if (bet.isStrongValue) {
        this.createAlert({
          type: 'strong_value_bet',
          severity: 'high',
          title: '🔥 Strong Value Bet Detected!',
          message: `${bet.description} - EV: ${bet.expectedValue.toFixed(1)}% @ ${bet.marketOdds.toFixed(2)}`,
          data: bet,
        });
      } else if (bet.isValueBet) {
        this.createAlert({
          type: 'value_bet',
          severity: 'medium',
          title: '💎 Value Bet Found',
          message: `${bet.description} - EV: ${bet.expectedValue.toFixed(1)}% @ ${bet.marketOdds.toFixed(2)}`,
          data: bet,
        });
      }
    }

    // Check for arbitrage
    if (analysis.arbitrageOpportunities.length > 0) {
      for (const arb of analysis.arbitrageOpportunities) {
        this.createAlert({
          type: 'arbitrage',
          severity: 'critical',
          title: '🚨 Arbitrage Opportunity!',
          message: `${arb.description} - Guaranteed ${arb.profitPercentage.toFixed(2)}% profit`,
          data: arb,
        });
      }
    }

    // Check for market inefficiency
    if (analysis.marketEfficiency < 0.7) {
      this.createAlert({
        type: 'market_inefficiency',
        severity: 'medium',
        title: '📊 Inefficient Market Detected',
        message: `Market efficiency: ${(analysis.marketEfficiency * 100).toFixed(1)}% - Good opportunity for value betting`,
        data: { efficiency: analysis.marketEfficiency },
      });
    }
  }

  /**
   * Analyze odds movements
   */
  analyzeOddsMovement(movements: OddsMovement[]): void {
    if (!this.config.enabled) return;

    for (const movement of movements) {
      const rule = this.config.rules.find(r => r.type === 'odds_movement' && r.enabled);
      if (!rule) continue;

      const minMovement = rule.conditions.minOddsMovement || 5;
      if (Math.abs(movement.changePercent) >= minMovement) {
        this.createAlert({
          type: 'odds_movement',
          severity: Math.abs(movement.changePercent) >= 10 ? 'high' : 'medium',
          title: '📈 Significant Odds Movement',
          message: `${movement.bookmaker} - ${movement.outcome}: ${movement.previousOdds.toFixed(2)} → ${movement.currentOdds.toFixed(2)} (${movement.changePercent >= 0 ? '+' : ''}${movement.changePercent.toFixed(1)}%)`,
          data: movement,
        });
      }
    }
  }

  /**
   * Analyze CLV
   */
  analyzeCLV(clv: ClosingLineValue): void {
    if (!this.config.enabled) return;

    const rule = this.config.rules.find(r => r.type === 'closing_line' && r.enabled);
    if (!rule) return;

    const minCLV = rule.conditions.minCLV || 2;
    if (clv.clv >= minCLV) {
      this.createAlert({
        type: 'closing_line',
        severity: clv.clv >= 5 ? 'high' : 'medium',
        title: '🎯 Positive CLV!',
        message: `${clv.outcome} - Beat closing line by ${clv.clv.toFixed(1)}% (${clv.clvRating})`,
        data: clv,
      });
    }
  }

  /**
   * Check bankroll thresholds
   */
  checkBankroll(currentBankroll: number, startingBankroll: number): void {
    if (!this.config.enabled) return;

    const percentage = (currentBankroll / startingBankroll) * 100;

    // Stop loss
    const stopLossRule = this.config.rules.find(r => r.type === 'stop_loss' && r.enabled);
    if (stopLossRule && percentage <= (stopLossRule.conditions.bankrollThreshold || 80)) {
      this.createAlert({
        type: 'stop_loss',
        severity: 'critical',
        title: '⚠️ Stop Loss Alert',
        message: `Bankroll at ${percentage.toFixed(1)}% of starting value. Consider stopping.`,
        data: { currentBankroll, startingBankroll, percentage },
      });
    }

    // Profit target
    const profitTargetRule = this.config.rules.find(r => r.type === 'profit_target' && r.enabled);
    if (profitTargetRule && percentage >= 150) {
      this.createAlert({
        type: 'profit_target',
        severity: 'high',
        title: '🎉 Profit Target Reached!',
        message: `Bankroll at ${percentage.toFixed(1)}% - Great performance!`,
        data: { currentBankroll, startingBankroll, percentage },
      });
    }
  }

  /**
   * Create and dispatch alert
   */
  private createAlert(params: {
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    data?: any;
  }): void {
    const rule = this.config.rules.find(r => r.type === params.type && r.enabled);
    if (!rule) return;

    // Rate limiting
    if (this.config.rateLimit.enabled) {
      const now = Date.now();
      const hourAgo = now - 3600000;

      // Clean old counts
      for (const [key, timestamp] of this.alertCount.entries()) {
        if (timestamp < hourAgo) {
          this.alertCount.delete(key);
        }
      }

      const currentCount = this.alertCount.size;
      if (currentCount >= this.config.rateLimit.maxAlertsPerHour) {
        console.warn('Alert rate limit reached');
        return;
      }
    }

    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: params.type,
      severity: params.severity,
      title: params.title,
      message: params.message,
      data: params.data,
      read: false,
      dismissed: false,
    };

    this.alerts.push(alert);
    this.alertCount.set(alert.id, Date.now());

    // Dispatch notifications
    this.dispatch(alert, rule.channels);

    // Notify listeners
    this.listeners.forEach(listener => listener(alert));
  }

  /**
   * Dispatch alert to configured channels
   */
  private dispatch(alert: Alert, channels: NotificationChannel[]): void {
    for (const channel of channels) {
      switch (channel) {
        case 'console':
          this.sendConsole(alert);
          break;
        case 'browser':
          this.sendBrowser(alert);
          break;
        case 'sound':
          this.playSound(alert);
          break;
        case 'email':
          this.sendEmail(alert);
          break;
        case 'webhook':
          this.sendWebhook(alert);
          break;
      }
    }
  }

  /**
   * Console notification
   */
  private sendConsole(alert: Alert): void {
    const emoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🔥',
      critical: '🚨',
    }[alert.severity];

    console.log(`${emoji} [${alert.type}] ${alert.title}`);
    console.log(alert.message);
    if (alert.data) {
      console.log('Data:', alert.data);
    }
  }

  /**
   * Browser notification
   */
  private sendBrowser(alert: Alert): void {
    if (typeof window === 'undefined') return; // Not in browser
    if (!this.config.channels.browser.enabled) return;
    if (this.config.channels.browser.permission !== 'granted') return;

    new Notification(alert.title, {
      body: alert.message,
      icon: '/betting-icon.png', // Add your icon
      badge: '/badge-icon.png',
      tag: alert.type,
      requireInteraction: alert.severity === 'critical',
    });
  }

  /**
   * Play alert sound
   */
  private playSound(alert: Alert): void {
    if (typeof window === 'undefined') return; // Not in browser
    if (!this.config.channels.sound.enabled) return;

    const audio = new Audio();

    // Different sounds for different severities
    const soundMap = {
      low: '/sounds/notification-low.mp3',
      medium: '/sounds/notification-medium.mp3',
      high: '/sounds/notification-high.mp3',
      critical: '/sounds/notification-critical.mp3',
    };

    audio.src = soundMap[alert.severity];
    audio.volume = this.config.channels.sound.volume;
    audio.play().catch(err => console.error('Failed to play sound:', err));
  }

  /**
   * Email notification (requires backend)
   */
  private async sendEmail(alert: Alert): Promise<void> {
    if (!this.config.channels.email.enabled || !this.config.channels.email.address) return;

    try {
      await fetch('/api/send-alert-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: this.config.channels.email.address,
          subject: alert.title,
          body: alert.message,
          data: alert.data,
        }),
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  /**
   * Webhook notification
   */
  private async sendWebhook(alert: Alert): Promise<void> {
    if (!this.config.channels.webhook.enabled || !this.config.channels.webhook.url) return;

    try {
      await fetch(this.config.channels.webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      console.error('Failed to send webhook:', error);
    }
  }

  /**
   * Subscribe to alerts
   */
  subscribe(callback: (alert: Alert) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Get all alerts
   */
  getAlerts(filter?: { unreadOnly?: boolean; types?: AlertType[] }): Alert[] {
    let filtered = this.alerts;

    if (filter?.unreadOnly) {
      filtered = filtered.filter(a => !a.read);
    }

    if (filter?.types && filter.types.length > 0) {
      filtered = filtered.filter(a => filter.types!.includes(a.type));
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Mark alert as read
   */
  markAsRead(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.read = true;
    }
  }

  /**
   * Dismiss alert
   */
  dismiss(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
    }
  }

  /**
   * Clear all alerts
   */
  clearAll(): void {
    this.alerts = [];
    this.alertCount.clear();
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Enable/disable system
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}

// ==================== EXPORTS ====================

export const alertSystem = {
  /**
   * Create alert system instance
   */
  create(config?: Partial<AlertConfig>): AlertSystem {
    return new AlertSystem(config);
  },
};

// Global singleton instance (optional)
export const globalAlertSystem = new AlertSystem();
