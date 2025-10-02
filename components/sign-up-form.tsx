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
import { GoogleSignInButton } from "@/components/google-signin-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

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
          {/* Google Sign In */}
          <div className="mb-6 flex justify-center">
            <GoogleSignInButton />
          </div>
          
          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                O crea una cuenta con correo
              </span>
            </div>
          </div>
          
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
                  className="h-10 transition-all duration-200"
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
                  className="h-10 transition-all duration-200"
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
                  className="h-10 transition-all duration-200"
                />
              </div>

              {/* User Type Selection */}
              <div className="flex w-full rounded-md border bg-muted p-0.5">
                <Button
                  type="button"
                  variant={userType === "individual" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-1/2 rounded-sm"
                  onClick={() => setUserType("individual")}
                >
                  Regular
                </Button>
                <Button
                  type="button"
                  variant={userType === "enterprise" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-1/2 rounded-sm"
                  onClick={() => setUserType("enterprise")}
                >
                  Empresarial
                </Button>
              </div>

              {/* Enterprise Role Selection */}
              {userType === "enterprise" && (
                <div className="space-y-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between h-10 font-normal"
                      >
                        {enterpriseRole || "Rol en tu empresa"}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                      {enterpriseRoles.map((role) => (
                        <DropdownMenuItem
                          key={role}
                          onSelect={() => setEnterpriseRole(role)}
                        >
                          {role}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {enterpriseRole === "Otro" && (
                    <Input
                      id="custom-role"
                      type="text"
                      placeholder="Especifica tu rol"
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      className="h-10 transition-all duration-200"
                      required={enterpriseRole === "Otro"}
                    />
                  )}
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full bg-indigo-500 text-white hover:bg-indigo-600" disabled={isLoading}>
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
