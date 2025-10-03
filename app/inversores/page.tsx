import type { Metadata } from "next";
import InvestorsContent from "@/components/investors-content";

export const metadata: Metadata = {
  title: "Inversores | Camella",
  description: "Oportunidades de inversión en Camella. Estamos revolucionando la comunicación B2B con inteligencia artificial. Contáctanos para explorar oportunidades de partnership.",
};

export default function Inversores() {
  return <InvestorsContent />;
}
