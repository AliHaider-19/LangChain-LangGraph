import { ChatOllama } from "@langchain/ollama";

async function main() {
  const model = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "gpt-oss:120b-cloud",
  });

  const questions = [
    "When does first world war happen",
    "Name of all provinces in Canada",
    "Who is the current president of USA",
  ];

  const responses = await model.batch(questions);

  for (const response of responses) {
    console.log(response.content);
  }
}

main().catch(console.error);
