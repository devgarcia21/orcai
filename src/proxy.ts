import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// No Next.js 16 o antigo "middleware" passou a se chamar "proxy" (mesma função).
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Roda em tudo, exceto arquivos estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
