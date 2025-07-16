import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { AuthLayout } from "@/components/auth-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DebugPage() {
  const supabase = await createClient();
  
  // Get user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  // Get cookies
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const supabaseCookies = allCookies.filter(cookie => 
    cookie.name.includes('supabase') || cookie.name.includes('auth')
  );
  
  // Environment check
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  
  return (
    <AuthLayout title="Debug Auth" subtitle="Authentication status and configuration">
      <div className="space-y-4">
        {/* User Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Status</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Confirmed:</strong> {user.email_confirmed_at ? 'Yes' : 'No'}</p>
                <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No user logged in
                {userError && <span className="block text-red-600">Error: {userError.message}</span>}
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Session Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session Status</CardTitle>
          </CardHeader>
          <CardContent>
            {session ? (
              <div className="space-y-2 text-sm">
                <p><strong>Active:</strong> Yes</p>
                <p><strong>Expires:</strong> {new Date(session.expires_at!).toLocaleString()}</p>
                <p><strong>Provider:</strong> {session.user?.app_metadata?.provider || 'email'}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active session
                {sessionError && <span className="block text-red-600">Error: {sessionError.message}</span>}
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Cookies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Auth Cookies</CardTitle>
          </CardHeader>
          <CardContent>
            {supabaseCookies.length > 0 ? (
              <div className="space-y-2 text-sm">
                {supabaseCookies.map((cookie) => (
                  <div key={cookie.name}>
                    <strong>{cookie.name}:</strong> {cookie.value.substring(0, 20)}...
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No auth cookies found</p>
            )}
          </CardContent>
        </Card>
        
        {/* Environment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Environment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {Object.entries(envVars).map(([key, value]) => (
                <p key={key}>
                  <strong>{key}:</strong> {value ? '✅ Set' : '❌ Not set'}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/auth/login">Go to Login</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auth/test-login">Try Test Login</Link>
          </Button>
          {user && (
            <Button asChild variant="outline">
              <Link href="/companies">Go to Companies</Link>
            </Button>
          )}
        </div>
      </div>
    </AuthLayout>
  );
} 