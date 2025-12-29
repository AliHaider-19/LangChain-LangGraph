import { ChatOllama } from "@langchain/ollama";
import { createAgent, createMiddleware } from "langchain";
import { AIMessage } from "langchain";
const basicModel = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "gpt-oss:120b-cloud",
});
const contentFilterMiddleware = (inappropriateText) => {
  const keywords = inappropriateText.map((key) => key.toLowerCase());
  return createMiddleware({
    name: "contentFilterMiddleware",
    beforeAgent: {
      hook: (state) => {
        if (!state.messages || state.messages.length == 0) {
          return;
        }
        const firstMessage = state.messages[0];
        if (firstMessage._getType() !== "human") {
          return;
        }
        const content = firstMessage.content.toString().toLowerCase();

        for (const keyword of keywords) {
          if (content.includes(keyword)) {
            return {
              messages: [
                new AIMessage(
                  "I cannot process requests containing inappropriate content. Please rephrase your request."
                ),
              ],
              jumpTo: "end",
            };
          }
        }
        return;
      },
      canJumpTo: ["end"],
    },
  });
};
const agent = createAgent({
  model: basicModel,
  middleware: [contentFilterMiddleware(["hack", "exploit", "malware"])],
});

// This request will be blocked before any processing
const result = await agent.invoke({
  messages: [{ role: "user", content: "How do I hack into a database?" }],
});

console.log(result.messages[1].content);
