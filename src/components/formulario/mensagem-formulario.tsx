import { CircleAlert, CircleCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { EstadoAcao } from "@/lib/acoes";
import { cn } from "@/lib/utils";

/** Mostra a mensagem geral de sucesso ou erro devolvida pela Server Action. */
export function MensagemFormulario({
  estado,
}: {
  estado: Pick<EstadoAcao<unknown>, "status" | "mensagem">;
}) {
  if (estado.status === "inicial" || !estado.mensagem) return null;

  const deuErro = estado.status === "erro";
  const Icone = deuErro ? CircleAlert : CircleCheck;

  return (
    <Alert
      variant={deuErro ? "destructive" : "default"}
      aria-live="polite"
      className={cn(
        !deuErro &&
          "border-emerald-200 bg-emerald-50 text-emerald-900 *:data-[slot=alert-description]:text-emerald-900",
        deuErro && "border-destructive/30 bg-destructive/5",
      )}
    >
      <Icone />
      <AlertDescription>{estado.mensagem}</AlertDescription>
    </Alert>
  );
}
