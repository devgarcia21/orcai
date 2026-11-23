import Link from "next/link";

import { ROTAS } from "@/lib/rotas";
import { cn } from "@/lib/utils";

/** Logotipo textual do Orçaí. */
export function Marca({
  href = ROTAS.inicio,
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("text-xl font-bold tracking-tight text-foreground", className)}
      aria-label="Orçaí — página inicial"
    >
      Orça<span className="text-primary">í</span>
    </Link>
  );
}
