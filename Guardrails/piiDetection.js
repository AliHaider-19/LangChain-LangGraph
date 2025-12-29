import { ChatOllama } from "@langchain/ollama";
import { createAgent, createMiddleware, piiMiddleware } from "langchain";

const basicModel = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "gpt-oss:120b-cloud",
});

// Create separate middleware instances
const emailRedactionMiddleware = createMiddleware(
  piiMiddleware("email", { strategy: "mask", applyToOutput: true })
);

const creditCardMaskingMiddleware = createMiddleware(
  piiMiddleware("credit_card", { strategy: "mask", applyToInput: true })
);

const apiKeyBlockingMiddleware = createMiddleware(
  piiMiddleware("api_key", {
    detector: /sk-[a-zA-Z0-9]{32}/,
    strategy: "block",
    applyToInput: true,
  })
);

// Create agent with separate middleware
const agent = createAgent({
  model: basicModel,
  middleware: [
    emailRedactionMiddleware,
    creditCardMaskingMiddleware,
    apiKeyBlockingMiddleware,
  ],
});

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "provide me 5 gmail addresses",
    },
  ],
});

const userMessage = result.messages[result.messages.length - 1].content;
console.log("\nRedacted User Input:", userMessage);
