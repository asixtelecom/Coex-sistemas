// ============================================================
// Feature permissions
//
// Granular per-feature toggles that can be set per member.
// Admins/owners always see all features; agents/viewers can be
// granted individual features.
// ============================================================

export type FeaturePermission =
  | 'broadcasts'
  | 'automations'
  | 'flows'
  | 'pedidos'
  | 'pagamentos'
  | 'assinaturas'
  | 'inventario'
  | 'dashboard'
  | 'inbox'
  | 'email'
  | 'agenda'
  | 'contacts'
  | 'pipelines'
  | 'guarda-volume'
  | 'vistoria';

export const FEATURE_PERMISSIONS: readonly FeaturePermission[] = [
  'broadcasts',
  'automations',
  'flows',
  'pedidos',
  'pagamentos',
  'assinaturas',
  'inventario',
  'dashboard',
  'inbox',
  'email',
  'agenda',
  'contacts',
  'pipelines',
  'guarda-volume',
  'vistoria',
] as const;

export type FeaturePermissions = Record<FeaturePermission, boolean>;

export function getDefaultPermissions(role: AccountRole): FeaturePermissions {
  const allTrue: FeaturePermissions = {
    broadcasts: true,
    automations: true,
    flows: true,
    pedidos: true,
    pagamentos: true,
    assinaturas: true,
    inventario: true,
    dashboard: true,
    inbox: true,
    email: true,
    agenda: true,
    contacts: true,
    pipelines: true,
    'guarda-volume': true,
    vistoria: true,
  };
  const allFalse: FeaturePermissions = {
    broadcasts: false,
    automations: false,
    flows: false,
    pedidos: false,
    pagamentos: false,
    assinaturas: false,
    inventario: false,
    dashboard: false,
    inbox: false,
    email: false,
    agenda: false,
    contacts: false,
    pipelines: false,
    'guarda-volume': false,
    vistoria: false,
  };
  if (role === 'owner' || role === 'admin') return allTrue;
  if (role === 'vistoria') {
    return { ...allFalse, agenda: true, dashboard: true, contacts: true, inbox: false, pipelines: true, vistoria: true };
  }
  return allFalse;
}
export function hasFeaturePermission(
  permissions: FeaturePermissions | null | undefined,
  feature: FeaturePermission,
): boolean {
  return permissions?.[feature] ?? false;
}

// ============================================================
// Account role helpers — pure, unit-testable, no I/O.
//
// Mirrors the `account_role_enum` Postgres type from migration
// 017_account_sharing.sql. The hierarchy is intentionally a flat
// ordinal (owner=4 … viewer=1) — it matches the same CASE
// expression the `is_account_member(account_id, min_role)` SQL
// helper uses, so server-side TypeScript guards and database-side
// RLS speak the same language.
//
// Predicates (`canManageMembers`, `canEditSettings`, …) are the
// single source of truth for "what can this role do?" — both
// API route guards and UI gates should call them rather than
// open-coding their own role checks. That keeps role-policy
// changes a one-file diff.
// ============================================================

export type AccountRole = "owner" | "admin" | "agent" | "vistoria" | "viewer";

/** Ordered list of every valid role, lowest privilege first. */
export const ACCOUNT_ROLES: readonly AccountRole[] = [
  "viewer",
  "vistoria",
  "agent",
  "admin",
  "owner",
] as const;

/**
 * Numeric rank of a role. Higher = more privileged. Mirrors the
 * CASE expression in `is_account_member` so JS/SQL stay aligned.
 */
export function roleRank(role: AccountRole): number {
  switch (role) {
    case "owner":
      return 4;
    case "admin":
      return 3;
    case "agent":
      return 2;
    case "vistoria":
      return 1.5;
    case "viewer":
      return 1;
  }
}

/**
 * True iff `role` is at least as privileged as `min`. Use this
 * for any "user has at least admin" / "at least agent" checks.
 */
export function hasMinRole(role: AccountRole, min: AccountRole): boolean {
  return roleRank(role) >= roleRank(min);
}

/** Type-narrow an unknown string into a valid `AccountRole`. */
export function isAccountRole(value: unknown): value is AccountRole {
  return (
    typeof value === "string" &&
    (ACCOUNT_ROLES as readonly string[]).includes(value)
  );
}

// ============================================================
// Capability predicates
//
// Every UI gate and API route guard should call one of these
// instead of comparing role strings inline. Adding a capability
// = one new predicate here + one call site change per consumer.
// ============================================================

/** Owner / admin: invite, remove, change roles. */
export function canManageMembers(role: AccountRole): boolean {
  return hasMinRole(role, "admin");
}

/**
 * Owner / admin: edit account-wide settings (WhatsApp config,
 * message templates, pipelines, tags, custom fields, account
 * name). Excludes per-user settings like avatar or own password.
 */
export function canEditSettings(role: AccountRole): boolean {
  return hasMinRole(role, "admin");
}

/**
 * Owner / admin / agent: write operational data — send messages,
 * create contacts, move deals, run broadcasts, edit automations.
 * Viewers are read-only.
 */
export function canSendMessages(role: AccountRole): boolean {
  return hasMinRole(role, "agent");
}

/**
 * Viewer: read-only across everything. Provided as a positive
 * predicate so UI gates read naturally (`if (canViewOnly(role))`
 * shows the "Read-only" tooltip without inverting `canSendMessages`).
 */
export function canViewOnly(role: AccountRole): boolean {
  return role === "viewer" || role === "vistoria";
}

/** Owner only: irreversible destructive operations. */
export function canDeleteAccount(role: AccountRole): boolean {
  return role === "owner";
}

/** Owner only: hand the account to another member. */
export function canTransferOwnership(role: AccountRole): boolean {
  return role === "owner";
}

/**
 * Agent+: edit own profile (name, avatar, email, password,
 * appearance). Separate from `canEditSettings` so agents can
 * reach the profile/security panels in Settings without being
 * able to touch workspace- or account-level config.
 */
export function canEditOwnProfile(role: AccountRole): boolean {
  return hasMinRole(role, "agent");
}
