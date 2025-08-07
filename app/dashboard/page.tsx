import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building, Package, MessageSquare } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Bienvenido
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Selecciona una opción para empezar.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-xl">
        <Link href="/companies" passHref>
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 text-lg">
            <Building size={28} />
            <span>Buscar Empresas</span>
          </Button>
        </Link>
        <Link href="/offerings" passHref>
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 text-lg">
            <Package size={28} />
            <span>Mis Servicios</span>
          </Button>
        </Link>
        <Link href="/chat" passHref>
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 text-lg">
            <MessageSquare size={28} />
            <span>Assistente</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
