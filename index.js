import {
  createAgent,
  tool,
  createMiddleware,
  ToolMessage,
  dynamicSystemPromptMiddleware,
} from "langchain";
import { ChatOllama } from "@langchain/ollama";
import * as z from "zod";

async function main() {
  const getWeather = tool((city) => `It's always sunny in ${city}`, {
    name: "get_weather",
    description: "Get weather for the given city",
    schema: z.object({
      city: z.string(),
    }),
  });

  const basicModel = new ChatOllama({
    baseUrl: "http://localhost:11434",
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
      const messageCount = request.messages?.length || 0;
      return handler({
        ...request,
        model: messageCount > 10 ? advanceModel : basicModel,
      });
    },
  });

  // Handle the tools error if anything crashes runtime.
  const handleToolError = createMiddleware({
    name: "HandleToolError",
    wrapToolCall: async (request, handler) => {
      try {
        return await handler(request);
      } catch (error) {
        return new ToolMessage({
          content: `Tool error: ${error.message}`,
          tool_call_id: request.toolCall.id,
        });
      }
    },
  });

  // Context schema
  const contextSchema = z.object({
    userRole: z.enum(["expert", "beginner"]).default("beginner"),
  });

  // Dynamic prompt middleware - fixed to properly access state context
  const dynamicPrompt = dynamicSystemPromptMiddleware(
    async (state, _runtime) => {
      // Access userRole from state.context instead of runtime.context
      const role = state?.context?.userRole ?? "beginner";

      const base = "You are a helpful assistant.";

      if (role === "expert") {
        return `${base} Provide detailed technical explanations with precision.`;
      }

      return `${base} Explain things simply and clearly for beginners.`;
    }
  );

  const agent = createAgent({
    model: basicModel,
    tools: [getWeather],
    middleware: [dynamicPrompt, dynamicModelSelection, handleToolError],
    contextSchema,
  });
}

main().catch(console.error);
