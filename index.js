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

  const getWeather = tool((city) => `It's always sunny in ${city}`, {
    name: "get_weather",
    description: "Get weather for the given city",
    schema: z.object({
      city: z.string(),
    }),
  });

  // Configuration of the model
  const model = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "qwen3-coder:480b-cloud",
    temperature: 0.2,
    numCtx: 2048,
  });

  const agent = createAgent({
    model,
    tools: [add, subtract, divide, getWeather],
  });
}

main().catch(console.error);
