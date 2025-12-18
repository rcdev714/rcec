import { NextResponse } from "next/server";
import { wait } from "@trigger.dev/sdk";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tokenId, approved } = await req.json();

    if (!tokenId) {
      return NextResponse.json({ error: "Token ID is required" }, { status: 400 });
    }

    // Complete the token
    // The payload schema matches what the agent expects: { status: 'approved' | 'rejected' }
    await wait.completeToken(tokenId, { 
      status: approved ? 'approved' : 'rejected' 
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing wait token:", error);
    return NextResponse.json(
      { error: "Failed to complete token" },
      { status: 500 }
    );
  }
}

