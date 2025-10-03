import type { Metadata } from "next";
import CarrerasContent from "@/components/carreras-content";

export const metadata: Metadata = {
  title: "Carreras | Camella",
  description: "Únete al equipo de Camella. Descubre oportunidades de trabajo en una empresa innovadora que revoluciona el B2B en Ecuador.",
};

export default function Carreras() {
  return <CarrerasContent />;
}
