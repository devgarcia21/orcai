import { Marca } from "@/components/marca";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center bg-muted/30 px-4 py-10 sm:justify-center">
      <Marca className="mb-8 text-2xl" />
      {children}
    </div>
  );
}
