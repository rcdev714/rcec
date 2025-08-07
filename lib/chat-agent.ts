import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-2.5-flash",
});

async function simpleChat(message: string) {
  const stream = await model.stream([new HumanMessage(message)]);
  return stream;
}

export { simpleChat };
