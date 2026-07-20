/**
 * Deterministic per-channel color mapping.
 * Each unique channel ID gets a consistent color from a palette
 * that works well on both light and dark backgrounds.
 */

const CHANNEL_COLORS = [
  { bg: "bg-emerald-500/15", text: "text-emerald-600", border: "border-emerald-500/20", dot: "bg-emerald-500", bubble: "bg-emerald-600", bubbleText: "text-white", bubbleTimestamp: "text-emerald-100/70" },
  { bg: "bg-violet-500/15", text: "text-violet-600", border: "border-violet-500/20", dot: "bg-violet-500", bubble: "bg-violet-600", bubbleText: "text-white", bubbleTimestamp: "text-violet-100/70" },
  { bg: "bg-sky-500/15", text: "text-sky-600", border: "border-sky-500/20", dot: "bg-sky-500", bubble: "bg-sky-600", bubbleText: "text-white", bubbleTimestamp: "text-sky-100/70" },
  { bg: "bg-rose-500/15", text: "text-rose-600", border: "border-rose-500/20", dot: "bg-rose-500", bubble: "bg-rose-600", bubbleText: "text-white", bubbleTimestamp: "text-rose-100/70" },
  { bg: "bg-amber-500/15", text: "text-amber-600", border: "border-amber-500/20", dot: "bg-amber-500", bubble: "bg-amber-600", bubbleText: "text-white", bubbleTimestamp: "text-amber-100/70" },
  { bg: "bg-teal-500/15", text: "text-teal-600", border: "border-teal-500/20", dot: "bg-teal-500", bubble: "bg-teal-600", bubbleText: "text-white", bubbleTimestamp: "text-teal-100/70" },
  { bg: "bg-fuchsia-500/15", text: "text-fuchsia-600", border: "border-fuchsia-500/20", dot: "bg-fuchsia-500", bubble: "bg-fuchsia-600", bubbleText: "text-white", bubbleTimestamp: "text-fuchsia-100/70" },
  { bg: "bg-indigo-500/15", text: "text-indigo-600", border: "border-indigo-500/20", dot: "bg-indigo-500", bubble: "bg-indigo-600", bubbleText: "text-white", bubbleTimestamp: "text-indigo-100/70" },
  { bg: "bg-orange-500/15", text: "text-orange-600", border: "border-orange-500/20", dot: "bg-orange-500", bubble: "bg-orange-600", bubbleText: "text-white", bubbleTimestamp: "text-orange-100/70" },
  { bg: "bg-cyan-500/15", text: "text-cyan-600", border: "border-cyan-500/20", dot: "bg-cyan-500", bubble: "bg-cyan-600", bubbleText: "text-white", bubbleTimestamp: "text-cyan-100/70" },
  { bg: "bg-lime-500/15", text: "text-lime-600", border: "border-lime-500/20", dot: "bg-lime-500", bubble: "bg-lime-600", bubbleText: "text-white", bubbleTimestamp: "text-lime-100/70" },
  { bg: "bg-pink-500/15", text: "text-pink-600", border: "border-pink-500/20", dot: "bg-pink-500", bubble: "bg-pink-600", bubbleText: "text-white", bubbleTimestamp: "text-pink-100/70" },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getChannelColor(channelId: string | undefined | null) {
  if (!channelId) return CHANNEL_COLORS[0];
  return CHANNEL_COLORS[hashString(channelId) % CHANNEL_COLORS.length];
}

export function getChannelColorClasses(channelId: string | undefined | null): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  badge: string;
  bubble: string;
  bubbleText: string;
  bubbleTimestamp: string;
} {
  const color = getChannelColor(channelId);
  return {
    ...color,
    badge: `${color.bg} ${color.text}`,
  };
}
