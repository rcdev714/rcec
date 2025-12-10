"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface AdminPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminPasswordModal({ open, onOpenChange }: AdminPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        // Store verification in sessionStorage for client-side checks
        sessionStorage.setItem("admin_password_verified", "true");
        // Store timestamp to expire after 1 hour
        sessionStorage.setItem("admin_password_timestamp", Date.now().toString());
        // Cookie is set by the API route
        onOpenChange(false);
        setPassword("");
        router.push("/admin");
      } else {
        setError("Contraseña incorrecta. Intenta nuevamente.");
        setPassword("");
      }
    } catch (err) {
      setError("Error al verificar la contraseña. Intenta nuevamente.");
      console.error("Password verification error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setPassword("");
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Acceso de Administrador
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-2">
              Ingresa la contraseña de administrador
            </label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Contraseña"
              className="w-full"
              autoFocus
              disabled={isLoading}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isLoading || !password}
            >
              {isLoading ? "Verificando..." : "Acceder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

