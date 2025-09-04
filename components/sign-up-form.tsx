"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card as UICard } from "@/components/ui/card";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [userType, setUserType] = useState<"individual" | "enterprise">("individual");
  const [enterpriseRole, setEnterpriseRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const enterpriseRoles = [
    "CEO/Presidente",
    "CFO/Director Financiero", 
    "COO/Director de Operaciones",
    "Director General",
    "Gerente General",
    "Director de Análisis",
    "Analista Senior",
    "Analista Financiero",
    "Consultor",
    "Otro"
  ];

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    // Validate enterprise role if user type is enterprise
    if (userType === "enterprise") {
      const roleToSave = enterpriseRole === "Otro" ? customRole : enterpriseRole;
      if (!roleToSave) {
        setError("Por favor selecciona o ingresa tu rol empresarial");
        setIsLoading(false);
        return;
      }
    }

    try {
      // Since email confirmation is disabled in Supabase settings,
      // we no longer need to specify an email redirect URL.
      // const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL
      //   ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`
      //   : process.env.NODE_ENV === 'production'
      //     ? 'https://unibrokers.netlify.app/auth/confirm'
      //     : `${window.location.origin}/auth/confirm`;

      // Prepare role data
      const roleToSave = userType === "enterprise" 
        ? (enterpriseRole === "Otro" ? customRole : enterpriseRole)
        : null;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // emailRedirectTo: redirectUrl,
          data: {
            user_type: userType,
            enterprise_role: roleToSave,
          },
        },
      });
      if (error) throw error;

      // The profile creation is now handled by a database trigger (create_user_profile)
      // on the auth.users table, so this client-side insertion is no longer needed.

      router.push("/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repeat-password" className="text-sm font-medium text-foreground">Confirmar contraseña</Label>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="h-10"
                />
              </div>

              {/* User Type Selection */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-foreground">Tipo de usuario</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <UICard 
                    className={cn(
                      "cursor-pointer transition-all border hover:shadow-md bg-white",
                      userType === "individual" 
                        ? "border-gray-800 border-2" 
                        : "border-gray-200 hover:border-gray-400"
                    )}
                    onClick={() => setUserType("individual")}
                  >
                    <div className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                          userType === "individual" 
                            ? "border-gray-800 bg-gray-800" 
                            : "border-gray-400"
                        )}>
                          {userType === "individual" && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Usuario Regular</h3>
                        </div>
                      </div>
                    </div>
                  </UICard>

                  <UICard 
                    className={cn(
                      "cursor-pointer transition-all border hover:shadow-md bg-white",
                      userType === "enterprise" 
                        ? "border-gray-800 border-2" 
                        : "border-gray-200 hover:border-gray-400"
                    )}
                    onClick={() => setUserType("enterprise")}
                  >
                    <div className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                          userType === "enterprise" 
                            ? "border-gray-800 bg-gray-800" 
                            : "border-gray-400"
                        )}>
                          {userType === "enterprise" && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Usuario Empresarial</h3>
                        </div>
                      </div>
                    </div>
                  </UICard>
                </div>
              </div>

              {/* Enterprise Role Selection */}
              {userType === "enterprise" && (
                <div className="space-y-3">
                  <Label htmlFor="enterprise-role" className="text-sm font-medium text-foreground">
                    Rol en tu empresa
                  </Label>
                  <select
                    id="enterprise-role"
                    value={enterpriseRole}
                    onChange={(e) => setEnterpriseRole(e.target.value)}
                    className="w-full h-10 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required={userType === "enterprise"}
                  >
                    <option value="">Selecciona tu rol</option>
                    {enterpriseRoles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  
                  {enterpriseRole === "Otro" && (
                    <div className="mt-3">
                      <Label htmlFor="custom-role" className="text-sm font-medium text-foreground">
                        Especifica tu rol
                      </Label>
                      <Input
                        id="custom-role"
                        type="text"
                        placeholder="Ingresa tu rol"
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        className="h-10 mt-1"
                        required={enterpriseRole === "Otro"}
                      />
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                {isLoading ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </div>
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">¿Ya tienes una cuenta?</span>{" "}
              <Link href="/auth/login" className="text-foreground hover:text-muted-foreground underline underline-offset-4">
                Iniciar sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
