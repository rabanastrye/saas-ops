import { NextResponse, type NextRequest } from "next/server";

import { isBasicAuthorized } from "@/server/auth";

/**
 * Basic auth no dashboard e nas rotas de leitura. Sem DASHBOARD_PASSWORD
 * definida, fica tudo fechado (nunca aberto por engano).
 */
export function proxy(request: NextRequest) {
  if (isBasicAuthorized(request.headers.get("authorization"), process.env.DASHBOARD_PASSWORD)) {
    return NextResponse.next();
  }
  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="saas-ops", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/api/aggregate/:path*"],
};
