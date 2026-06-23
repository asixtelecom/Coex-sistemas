import type { ChannelProvider } from './provider';

const registry = new Map<string, ChannelProvider>();

export function registerChannelProvider(provider: ChannelProvider): void {
  registry.set(provider.type, provider);
}

export function getChannelProvider(type: string): ChannelProvider | undefined {
  return registry.get(type);
}

export function getAllProviders(): ChannelProvider[] {
  return Array.from(registry.values());
}