import { Plus } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROTAS } from "@/lib/rotas";
import { cn } from "@/lib/utils";

export function BotaoNovoOrcamento({
  href = ROTAS.novoOrcamento,
  className,
  texto = "Novo orçamento",
}: {
  href?: string;
  className?: string;
  texto?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ size: "lg" }), "h-11 px-5", className)}
    >
      <Plus aria-hidden />
      {texto}
    </Link>
  );
}
