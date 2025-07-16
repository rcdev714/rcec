import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function testLogin(formData: FormData) {
  "use server";
  
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  const supabase = await createClient();
  
  // Try to sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error("Login error:", error);
    redirect(`/auth/test-login?error=${encodeURIComponent(error.message)}`);
  }
  
  if (data.user) {
    console.log("Login successful for user:", data.user.email);
    // Verify session
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Session exists:", !!session);
    
    redirect("/companies");
  }
  
  redirect("/auth/test-login?error=Unknown+error");
}

export default async function TestLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  
  return (
    <AuthLayout title="Test Login" subtitle="Server-side authentication test">
      <form action={testLogin} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="tu@email.com"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
          />
        </div>
        {params.error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{params.error}</p>
          </div>
        )}
        <Button type="submit" className="w-full">
          Test Login (Server Action)
        </Button>
      </form>
      
      <div className="mt-4 text-center text-sm text-muted-foreground">
        <p>This is a test page using server actions.</p>
        <p>Use your existing credentials to test.</p>
      </div>
    </AuthLayout>
  );
} 