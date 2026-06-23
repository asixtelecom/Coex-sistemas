import type { ChannelType } from '@/types';

export interface SendMessageArgs {
  channelConfig: Record<string, unknown>;
  to: string;
  text: string;
  mediaUrl?: string;
  mediaType?: string;
  templateName?: string;
  templateParams?: Record<string, unknown>;
  contextMessageId?: string;
}

export interface SendMessageResult {
  messageId: string;
}

export interface ChannelProvider {
  type: ChannelType;
  sendText(args: SendMessageArgs): Promise<SendMessageResult>;
  sendMedia?(args: SendMessageArgs): Promise<SendMessageResult>;
  sendTemplate?(args: SendMessageArgs): Promise<SendMessageResult>;
  verifyWebhook(request: Request): Promise<{ valid: boolean; challenge?: string }>;
  processWebhook?(payload: unknown, channelId: string, accountId: string): Promise<void>;
}