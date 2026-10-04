/**
 * Verificações de acesso. Sem "server-only" porque o proxy também as usa.
 *
 * - Rotas chamadas por máquinas (GitHub Actions): Authorization: Bearer <CRON_SECRET>.
 * - Dashboard e /api/aggregate/*: Basic auth com DASHBOARD_PASSWORD (utilizador indiferente).
 */

// Comparação em tempo constante, para o tempo de resposta não revelar o segredo.
export function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

export function isBearerAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  return safeEqual(header.slice("Bearer ".length), secret);
}

export function isBasicAuthorized(header: string | null, password: string | undefined): boolean {
  if (!password || !header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice("Basic ".length));
  } catch {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator === -1) return false;
  return safeEqual(decoded.slice(separator + 1), password);
}

export function isCronRequest(request: Request): boolean {
  return isBearerAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET);
}
