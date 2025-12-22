import { ChatOllama } from "@langchain/ollama";
import * as z from "zod";
import { SystemMessage, HumanMessage, AIMessage } from "langchain";

const model = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "gpt-oss:120b-cloud",
});

// const systemmsg = new SystemMessage(
//   "You are a helpful assistant. Answer each question in professional way with example."
// );

const systemMsg = new SystemMessage(`
You are a senior TypeScript developer with expertise in web frameworks.
Always provide code examples and explain your reasoning.
Be concise but thorough in your explanations.
`);

const messages = [systemMsg, new HumanMessage("How do I create a REST API?")];
const response = await model.invoke(messages);

console.log(response.content);
