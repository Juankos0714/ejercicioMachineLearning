/**
 * NOTIFICATION SERVICE
 *
 * Service for sending notifications via different channels
 *
 * Features:
 * - Email notifications
 * - Webhook notifications
 * - Browser push notifications
 * - SMS notifications (via webhook)
 * - Telegram notifications (via webhook)
 */

import { Alert } from './alertSystem';
import { alertHistoryService } from './historicalDataService';

// ==================== TYPES ====================

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface WebhookPayload {
  url: string;
  data: any;
  headers?: Record<string, string>;
}

export interface NotificationResult {
  success: boolean;
  channel: string;
  error?: string;
}

// ==================== EMAIL SERVICE ====================

export class EmailNotificationService {
  /**
   * Send email via backend API
   */
  async sendEmail(payload: EmailPayload): Promise<boolean> {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Email API error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send alert via email
   */
  async sendAlertEmail(alert: Alert, recipientEmail: string): Promise<boolean> {
    const html = this.generateAlertEmailHTML(alert);
    const text = this.generateAlertEmailText(alert);

    return this.sendEmail({
      to: recipientEmail,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      html,
      text,
    });
  }

  /**
   * Generate HTML email for alert
   */
  private generateAlertEmailHTML(alert: Alert): string {
    const severityColors = {
      low: '#3b82f6',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626',
    };

    const severityColor = severityColors[alert.severity];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${alert.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${severityColor} 0%, ${severityColor}dd 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">${alert.title}</h1>
    <p style="margin: 10px 0 0; opacity: 0.9; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">
      ${alert.severity} • ${alert.type.replace(/_/g, ' ')}
    </p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
      <h2 style="margin: 0 0 15px; font-size: 18px; color: #1f2937;">Message</h2>
      <p style="margin: 0; font-size: 16px; color: #4b5563;">${alert.message}</p>
    </div>

    ${alert.data ? `
    <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
      <h2 style="margin: 0 0 15px; font-size: 18px; color: #1f2937;">Details</h2>
      <pre style="background: #f3f4f6; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 13px; margin: 0;">${JSON.stringify(alert.data, null, 2)}</pre>
    </div>
    ` : ''}

    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        Received at ${alert.timestamp.toLocaleString()}
      </p>
      <p style="margin: 10px 0 0; font-size: 11px; color: #9ca3af;">
        Betting Analytics Alert System
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text email for alert
   */
  private generateAlertEmailText(alert: Alert): string {
    let text = `
${alert.title}
${'='.repeat(alert.title.length)}

Severity: ${alert.severity.toUpperCase()}
Type: ${alert.type.replace(/_/g, ' ')}
Time: ${alert.timestamp.toLocaleString()}

Message:
${alert.message}
`;

    if (alert.data) {
      text += `\n\nDetails:\n${JSON.stringify(alert.data, null, 2)}`;
    }

    text += '\n\n---\nBetting Analytics Alert System';

    return text.trim();
  }
}

// ==================== WEBHOOK SERVICE ====================

export class WebhookNotificationService {
  /**
   * Send webhook notification
   */
  async sendWebhook(payload: WebhookPayload): Promise<boolean> {
    try {
      const response = await fetch(payload.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...payload.headers,
        },
        body: JSON.stringify(payload.data),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to send webhook:', error);
      return false;
    }
  }

  /**
   * Send alert via webhook
   */
  async sendAlertWebhook(alert: Alert, webhookUrl: string): Promise<boolean> {
    return this.sendWebhook({
      url: webhookUrl,
      data: {
        type: 'betting_alert',
        alert: {
          id: alert.id,
          timestamp: alert.timestamp.toISOString(),
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          data: alert.data,
        },
      },
    });
  }

  /**
   * Send to Slack
   */
  async sendSlackNotification(alert: Alert, slackWebhookUrl: string): Promise<boolean> {
    const severityEmojis = {
      low: ':information_source:',
      medium: ':warning:',
      high: ':fire:',
      critical: ':rotating_light:',
    };

    const severityColors = {
      low: '#3b82f6',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626',
    };

    return this.sendWebhook({
      url: slackWebhookUrl,
      data: {
        text: `${severityEmojis[alert.severity]} *${alert.title}*`,
        attachments: [
          {
            color: severityColors[alert.severity],
            fields: [
              {
                title: 'Message',
                value: alert.message,
                short: false,
              },
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Type',
                value: alert.type.replace(/_/g, ' '),
                short: true,
              },
            ],
            footer: 'Betting Analytics',
            ts: Math.floor(alert.timestamp.getTime() / 1000),
          },
        ],
      },
    });
  }

  /**
   * Send to Discord
   */
  async sendDiscordNotification(alert: Alert, discordWebhookUrl: string): Promise<boolean> {
    const severityColors = {
      low: 0x3b82f6,
      medium: 0xf59e0b,
      high: 0xef4444,
      critical: 0xdc2626,
    };

    return this.sendWebhook({
      url: discordWebhookUrl,
      data: {
        embeds: [
          {
            title: alert.title,
            description: alert.message,
            color: severityColors[alert.severity],
            fields: [
              {
                name: 'Severity',
                value: alert.severity.toUpperCase(),
                inline: true,
              },
              {
                name: 'Type',
                value: alert.type.replace(/_/g, ' '),
                inline: true,
              },
            ],
            timestamp: alert.timestamp.toISOString(),
            footer: {
              text: 'Betting Analytics',
            },
          },
        ],
      },
    });
  }

  /**
   * Send to Telegram
   */
  async sendTelegramNotification(
    alert: Alert,
    botToken: string,
    chatId: string
  ): Promise<boolean> {
    const severityEmojis = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🔥',
      critical: '🚨',
    };

    const message = `
${severityEmojis[alert.severity]} <b>${alert.title}</b>

${alert.message}

<i>Severity: ${alert.severity.toUpperCase()}</i>
<i>Type: ${alert.type.replace(/_/g, ' ')}</i>
<i>Time: ${alert.timestamp.toLocaleString()}</i>
    `.trim();

    return this.sendWebhook({
      url: `https://api.telegram.org/bot${botToken}/sendMessage`,
      data: {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      },
    });
  }
}

// ==================== INTEGRATED NOTIFICATION SERVICE ====================

export class NotificationService {
  private emailService = new EmailNotificationService();
  private webhookService = new WebhookNotificationService();

  /**
   * Send alert through all configured channels
   */
  async sendAlert(
    alert: Alert,
    config: {
      email?: string;
      webhookUrl?: string;
      slackWebhookUrl?: string;
      discordWebhookUrl?: string;
      telegramBotToken?: string;
      telegramChatId?: string;
    }
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const sentChannels: string[] = [];

    // Email
    if (config.email) {
      const success = await this.emailService.sendAlertEmail(alert, config.email);
      results.push({ success, channel: 'email' });
      if (success) sentChannels.push('email');
    }

    // Generic Webhook
    if (config.webhookUrl) {
      const success = await this.webhookService.sendAlertWebhook(alert, config.webhookUrl);
      results.push({ success, channel: 'webhook' });
      if (success) sentChannels.push('webhook');
    }

    // Slack
    if (config.slackWebhookUrl) {
      const success = await this.webhookService.sendSlackNotification(alert, config.slackWebhookUrl);
      results.push({ success, channel: 'slack' });
      if (success) sentChannels.push('slack');
    }

    // Discord
    if (config.discordWebhookUrl) {
      const success = await this.webhookService.sendDiscordNotification(alert, config.discordWebhookUrl);
      results.push({ success, channel: 'discord' });
      if (success) sentChannels.push('discord');
    }

    // Telegram
    if (config.telegramBotToken && config.telegramChatId) {
      const success = await this.webhookService.sendTelegramNotification(
        alert,
        config.telegramBotToken,
        config.telegramChatId
      );
      results.push({ success, channel: 'telegram' });
      if (success) sentChannels.push('telegram');
    }

    // Store in history
    if (sentChannels.length > 0) {
      try {
        await alertHistoryService.storeAlert(alert, sentChannels);
      } catch (error) {
        console.error('Failed to store alert in history:', error);
      }
    }

    return results;
  }

  /**
   * Test notification channels
   */
  async testChannels(config: {
    email?: string;
    webhookUrl?: string;
    slackWebhookUrl?: string;
    discordWebhookUrl?: string;
  }): Promise<NotificationResult[]> {
    const testAlert: Alert = {
      id: 'test-alert',
      timestamp: new Date(),
      type: 'value_bet',
      severity: 'medium',
      title: 'Test Notification',
      message: 'This is a test notification from Betting Analytics System',
      read: false,
      dismissed: false,
      data: {
        test: true,
      },
    };

    return this.sendAlert(testAlert, config);
  }
}

// ==================== EXPORTS ====================

export const notificationService = new NotificationService();
export const emailService = new EmailNotificationService();
export const webhookService = new WebhookNotificationService();
