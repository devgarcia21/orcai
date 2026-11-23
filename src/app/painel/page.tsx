import { ArrowRight, FileText, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { obterPrestadorAtual, perfilCompleto } from "@/lib/dados/prestador";
import { ROTAS } from "@/lib/rotas";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Painel" };

export default async function PainelPage() {
  const prestador = await obterPrestadorAtual();
  const primeiroNome = prestador.nome.split(" ")[0] || "prestador";
  const completo = perfilCompleto(prestador);

  const faltando = [
    !prestador.telefone && "telefone",
    !prestador.chave_pix && "chave PIX",
  ].filter(Boolean);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {primeiroNome}! 👋</h1>
        <p className="mt-1 text-muted-foreground">
          Bem-vindo ao Orçaí. Aqui você vai criar orçamentos profissionais e receber o
          sinal por PIX.
        </p>
      </div>

      {!completo && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 *:data-[slot=alert-description]:text-amber-900">
          <TriangleAlert />
          <AlertTitle>Complete seu perfil</AlertTitle>
          <AlertDescription>
            <p>
              Falta informar {faltando.join(" e ")}. Esses dados aparecem nos orçamentos
              que você enviar.
            </p>
            <Link href={ROTAS.perfil} className="font-medium">
              Completar perfil agora
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-5" aria-hidden />
          </div>
          <CardTitle>Orçamentos</CardTitle>
          <CardDescription>
            Em breve você poderá cadastrar clientes, montar orçamentos com itens e enviar
            pelo WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={ROTAS.perfil}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 w-full sm:w-auto",
            )}
          >
            Revisar meu perfil
            <ArrowRight aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
