import { simpleChat } from "@/lib/chat-agent";

export const runtime = "edge";

export async function POST(req: Request) {
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
}
