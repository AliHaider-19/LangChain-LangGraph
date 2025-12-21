import { createAgent, tool } from "langchain";
import { ChatOllama } from "@langchain/ollama";
import * as z from "zod";

async function main() {
  const add = tool(({ a, b }) => a + b, {
    name: "add",
    description: "Adds two numbers",
    schema: z.object({
      a: z.number(),
      b: z.number(),
    }),
  });

  const subtract = tool(({ a, b }) => a - b, {
    name: "subtract",
    description: "Subtracts b from a",
    schema: z.object({
      a: z.number(),
      b: z.number(),
    }),
  });

  const divide = tool(
    ({ a, b }) => {
      if (b === 0) {
        throw new Error("Cannot divide by zero");
      }
      return a / b;
    },
    {
      name: "divide",
      description: "Divides a by b",
      schema: z.object({
        a: z.number(),
        b: z.number(),
      }),
    }
  );
  const basicModel = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "gpt-oss:120b-cloud",
  });
  const agent = createAgent({
    model: basicModel,
    tools: [add, subtract, divide],
  });

  // Test with expert
  const expertResult = await agent.invoke({
    messages: [{ role: "user", content: "What is 10 divided by 2?" }],
  });
  console.log(expertResult.messages.at(-1).content);
}

main().catch(console.error);
