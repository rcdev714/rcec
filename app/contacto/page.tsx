import type { Metadata } from "next";
import ContactContent from "@/components/contact-content";

export const metadata: Metadata = {
  title: "Contacto | Camella",
  description: "Ponte en contacto con el equipo de Camella. Estamos aquí para ayudarte con tus necesidades de prospección B2B en Ecuador.",
};

export default function Contacto() {
  return <ContactContent />;
}
