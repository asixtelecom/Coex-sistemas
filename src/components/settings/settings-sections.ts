import {
  Banknote,
  Box,
  Phone,
  Camera,
  Coins,
  Database,
  FileText,
  Globe,
  LayoutGrid,
  Mail,
  MessageSquare,
  Palette,
  PlugZap,
  Send,
  Shield,
  Tags,
  User,
  UsersRound,
  Video,
  Music,
  type LucideIcon,
} from "lucide-react"

export const SETTINGS_SECTIONS = [
  "overview",
  "profile",
  "security",
  "appearance",
  "whatsapp",
  "instagram",
  "messenger",
  "telegram",
  "webchat",
  "linkedin",
  "email",
  "pix",
  "zapsign",
  "templates",
  "fields",
  "deals",
  "members",
  "cubagem",
  "backup",
  "telefonia",
  "tiktok",
  "youtube",
] as const

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

export const DEFAULT_SECTION: SettingsSection = "overview"

export interface SectionMeta {
  id: SettingsSection
  label: string
  icon: LucideIcon
  group: "top" | "account" | "workspace"
}

export const SECTION_META: Record<SettingsSection, SectionMeta> = {
  overview: { id: "overview", label: "Visão Geral", icon: LayoutGrid, group: "top" },
  profile: { id: "profile", label: "Seu perfil", icon: User, group: "account" },
  security: { id: "security", label: "Login e segurança", icon: Shield, group: "account" },
  appearance: { id: "appearance", label: "Aparência", icon: Palette, group: "account" },
  whatsapp: { id: "whatsapp", label: "WhatsApp", icon: PlugZap, group: "workspace" },
  instagram: { id: "instagram", label: "Instagram", icon: Camera, group: "workspace" },
  messenger: { id: "messenger", label: "Messenger", icon: MessageSquare, group: "workspace" },
  telegram: { id: "telegram", label: "Telegram", icon: Send, group: "workspace" },
  webchat: { id: "webchat", label: "Webchat", icon: Globe, group: "workspace" },
  linkedin: { id: "linkedin", label: "LinkedIn", icon: UsersRound, group: "workspace" },
  email: { id: "email", label: "E-mail", icon: Mail, group: "workspace" },
  pix: { id: "pix", label: "PIX", icon: Banknote, group: "workspace" },
  zapsign: { id: "zapsign", label: "Zapsign", icon: FileText, group: "workspace" },
  templates: { id: "templates", label: "Modelos", icon: FileText, group: "workspace" },
  fields: { id: "fields", label: "Campos e tags", icon: Tags, group: "workspace" },
  deals: { id: "deals", label: "Negócios e moeda", icon: Coins, group: "workspace" },
  members: { id: "members", label: "Membros da equipe", icon: UsersRound, group: "workspace" },
  cubagem: { id: "cubagem", label: "Inventários", icon: Box, group: "workspace" },
  backup: { id: "backup", label: "Backup", icon: Database, group: "workspace" },
  telefonia: { id: "telefonia", label: "Telefonia", icon: Phone, group: "workspace" },
  tiktok: { id: "tiktok", label: "TikTok", icon: Music, group: "workspace" },
  youtube: { id: "youtube", label: "YouTube", icon: Video, group: "workspace" },
}

export const AGENT_SECTIONS: readonly SettingsSection[] = [
  "overview",
  "profile",
  "security",
] as const

/** Channel sections grouped under the "Canais" dropdown in the rail. */
export const CHANNEL_SECTIONS: readonly SettingsSection[] = [
  "whatsapp",
  "instagram",
  "messenger",
  "telegram",
  "webchat",
  "linkedin",
  "tiktok",
  "youtube",
] as const

export const RAIL_GROUPS: { label: string | null; group: SectionMeta["group"] }[] = [
  { label: null, group: "top" },
  { label: "Conta", group: "account" },
  { label: "Espaço de trabalho", group: "workspace" },
]

function isSection(value: string | null): value is SettingsSection {
  return !!value && (SETTINGS_SECTIONS as readonly string[]).includes(value)
}

export function resolveSection(raw: string | null): SettingsSection {
  if (raw === "tags" || raw === "custom-fields") return "fields"
  if (isSection(raw)) return raw
  return DEFAULT_SECTION
}
