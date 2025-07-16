import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/companies";
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");
  
  // Handle error cases from Supabase
  if (error) {
    console.error("Auth error:", error, error_description);
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(error_description || '')}`
    );
  }

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${origin}/auth/error?error=missing_parameters&description=${encodeURIComponent('Missing token_hash or type parameter')}`
    );
  }

  try {
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (verifyError) {
      console.error("Verification error:", verifyError);
      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent(verifyError.message)}`
      );
    }

    // Successful verification
    // Use NextResponse.redirect instead of Next.js redirect
    return NextResponse.redirect(`${origin}${next}`);
  } catch (err) {
    console.error("Unexpected error during verification:", err);
    return NextResponse.redirect(
      `${origin}/auth/error?error=unexpected_error&description=${encodeURIComponent('An unexpected error occurred')}`
    );
  }
}
