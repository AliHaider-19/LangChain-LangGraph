import { createAgent, tool, createMiddleware, ToolMessage } from "langchain";
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

  let messeges = [{}];
  // Configuration of the model
  const model = new ChatOllama({
    baseUrl: "https://localhost:11434",
    model: "gpt-oss:120b-cloud",
  });
  const basicModel = new ChatOllama({
    baseUrl: "https://localhost:11434",
    model: "gpt-oss:120b-cloud",
  });
  const advanceModel = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "qwen3-coder:480b-cloud",
  });

  // Handle dynamic model selection based on number of request.
  const dynamicModelSelection = createMiddleware({
    name: "DynamicModelSelection",
    wrapModelCall: (request, handler) => {
      const messegeCount = result.messeges.lenght;
      return handler({
        ...request,
        model: messegeCount > 10 ? advanceModel : basicModel,
      });
    },
  });

  // Handle the tools error if anything crashes runtime.

  const handleToolError = createMiddleware({
    wrapToolCall: async (request, handler) => {
      try {
        return await handler(request);
      } catch (error) {
        return new ToolMessage({
          content: `Tool error: Please check your input and try again. (${error})`,
          tool_call_id,
        });
      }
    },
  });

  const agent = createAgent({
    model,
    tools: [add, subtract, divide, getWeather],
    middleware: [dynamicModelSelection, handleToolError],
  });
}

main().catch(console.error);
