// Helper para lidar com serviços (multi-seleção)
// Serviços são armazenados como JSON array no campo title do deal

export const SERVICE_TYPES = [
  "Mudança residencial",
  "Mudança Comercial",
  "Mudança Iterestadual",
  "Içamento",
  "Storage",
  "Transportes de Cargas",
  "Montagem + Desmontagem",
  "Montagem",
  "Desmontagem",
  "armazenamento",
  "Transporte",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

// Cores para cada tipo de serviço
export const SERVICE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Mudança residencial": { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  "Mudança Comercial": { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30" },
  "Mudança Iterestadual": { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30" },
  "Içamento": { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  "Storage": { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  "Transportes de Cargas": { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" },
  "Montagem + Desmontagem": { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30" },
  "Montagem": { bg: "bg-teal-500/15", text: "text-teal-400", border: "border-teal-500/30" },
  "Desmontagem": { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30" },
  "armazenamento": { bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/30" },
  "Transporte": { bg: "bg-lime-500/15", text: "text-lime-400", border: "border-lime-500/30" },
};

export const DEFAULT_SERVICE_COLOR = { bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/30" };

/**
 * Parse o título do deal para extrair serviços
 * Suporta formato legado (string simples) e novo (JSON array)
 */
export function parseServices(title: string | null | undefined): string[] {
  if (!title) return [];
  
  // Tentar parsear como JSON (novo formato)
  try {
    const parsed = JSON.parse(title);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === "string" && s.length > 0);
    }
  } catch {
    // Não é JSON, usar como string simples (formato legado)
  }
  
  // Formato legado: string simples
  return title.trim() ? [title.trim()] : [];
}

/**
 * Converte array de serviços para string JSON para armazenamento
 */
export function servicesToString(services: string[]): string {
  if (services.length === 0) return "";
  if (services.length === 1) return services[0];
  return JSON.stringify(services);
}

/**
 * Retorna as cores de um serviço
 */
export function getServiceColor(service: string) {
  return SERVICE_COLORS[service] || DEFAULT_SERVICE_COLOR;
}
