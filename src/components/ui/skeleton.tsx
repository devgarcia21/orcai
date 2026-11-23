import { cn } from "@/lib/utils";

/** Bloco cinza animado usado como placeholder enquanto os dados carregam. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
