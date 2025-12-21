import { ChatOllama } from "@langchain/ollama";
import { createAgent } from "langchain";
import * as z from "zod";

async function main() {
  const personalInformation = z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
  });

  const model = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "gpt-oss:120b-cloud",
  });

  const agent = createAgent({
    model,
    responseFormat: personalInformation,
  });

  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content:
          "Extract information from Ali Haider, alihaider@gmail.com where my phone number is 0300 1112345",
      },
    ],
  });

  console.log(result.structuredResponse);
}

main().catch(console.error);
