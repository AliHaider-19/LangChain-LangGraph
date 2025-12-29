import { ChatOllama } from "@langchain/ollama";
import {
  createAgent,
  llmToolSelectorMiddleware,
  modelCallLimitMiddleware,
  modelFallbackMiddleware,
  summarizationMiddleware,
  todoListMiddleware,
  toolCallLimitMiddleware,
} from "langchain";

const model = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "gpt-oss:120b-cloud",
});
// Single condition
// Automatically summarize conversation history when approaching token limits, preserving recent messages while compressing older context.
//  Summarization is useful for the following:

const agent = createAgent({
  model,
  middleware: [
    summarizationMiddleware({
      model: "gpt-4o-mini",
      trigger: { tokens: 4000, messages: 10 },
      keep: { messages: 20 },
    }),
  ],
});

// Model Call Limit
// Limit the number of model calls to prevent infinite loops or excessive costs. Model call limit is useful for the following:
const limitedAgent = createAgent({
  model,
  middleware: [
    modelCallLimitMiddleware({
      threadLimit: 10,
      runLimit: 5,
      exitBehavior: "end",
    }),
  ],
});

const toolCallLimitAgent = createAgent({
  model,
  middleware: [
    toolCallLimitMiddleware({ threadLimit: 20, runLimit: 10 }),
    toolCallLimitMiddleware({
      toolName: "search",
      threadLimit: 5,
      runLimit: 3,
    }),
  ],
});

// Model fallback
// Automatically fallback to alternative models when the primary model fails. Model fallback is useful for the following:

const modelFallBackAgent = createAgent({
  model,
  middleware: [modelFallbackMiddleware("qwen3-coder:480b-cloud")],
});

// PII detection
// Detect and handle Personally Identifiable Information (PII) in conversations using configurable strategies. PII detection is useful for the following:
// Healthcare and financial applications with compliance requirements.
// Customer service agents that need to sanitize logs.
// Any application handling sensitive user data.

const piiMiddleware = createAgent({
  model: "gpt-4o",
  tools: [],
  middleware: [
    piiMiddleware("email", { strategy: "redact", applyToInput: true }),
    piiMiddleware("credit_card", { strategy: "mask", applyToInput: true }),
  ],
});
const agent1 = createAgent({
  model: "gpt-4o",
  tools: [],
  middleware: [
    piiMiddleware("api_key", {
      detector: "sk-[a-zA-Z0-9]{32}",
      strategy: "block",
    }),
  ],
});

// Method 2: RegExp object
const agent2 = createAgent({
  model: "gpt-4o",
  tools: [],
  middleware: [
    piiMiddleware("phone_number", {
      detector: /\+?\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{4}/,
      strategy: "mask",
    }),
  ],
});
// Use an LLM to intelligently select relevant tools before calling the main model. LLM tool selectors are useful for the following:
// Agents with many tools (10+) where most aren’t relevant per query.
// Reducing token usage by filtering irrelevant tools.
// Improving model focus and accuracy.

const llmToolSelectorMiddleware = createAgent({
  model: "gpt-4o",
  tools: [tool1, tool2, tool3, tool4, tool5],
  middleware: [
    llmToolSelectorMiddleware({
      model: "gpt-4o-mini",
      maxTools: 3,
      alwaysInclude: ["search"],
    }),
  ],
});

// TodoList middleware
const todoListMiddleware = createAgent({
  model: "gpt-4o",
  tools: [readFile, writeFile, runTests],
  middleware: [todoListMiddleware()],
});
