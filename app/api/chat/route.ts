import { simpleChat } from "@/lib/chat-agent";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function POST(req: Request) {
  if (!process.env.GOOGLE_API_KEY) {
    return new Response("Missing GOOGLE_API_KEY", { status: 500 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { message } = await req.json();

    const stream = await simpleChat(message);

    const textEncoder = new TextEncoder();
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        controller.enqueue(textEncoder.encode(chunk.content));
      },
    });

    return new Response(stream.pipeThrough(transformStream), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
}
