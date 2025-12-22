import { createAgent, createMiddleware } from "langchain";
import { MemorySaver, REMOVE_ALL_MESSAGES } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import z from "zod";
import { RemoveMessage } from "@langchain/core/messages";

const checkpointer = new MemorySaver();

const basicModel = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "gpt-oss:120b-cloud",
});

// ============================================
// 1. STATE EXTENSION MIDDLEWARE TEST
// ============================================
const customStateSchema = z.object({
  userId: z.string(),
  preferences: z.record(z.string(), z.any()),
});

const stateExtensionMiddleware = createMiddleware({
  name: "StateExtension",
  stateSchema: customStateSchema,
});

export async function testStateExtension() {
  console.log("\n=== Testing State Extension Middleware ===");

  const agent = createAgent({
    model: basicModel,
    middleware: [stateExtensionMiddleware],
    checkpointer,
  });

  const config = { configurable: { thread_id: "state-extension-test" } };

  const result = await agent.invoke(
    {
      messages: [{ role: "user", content: "Hello, my name is Alice" }],
      userId: "user_123",
      preferences: { theme: "dark", language: "en" },
    },
    config
  );

  console.log("Custom State Fields:");
  console.log("- UserId:", result.userId);
  console.log("- Preferences:", result.preferences);
  console.log("- Messages count:", result.messages.length);

  return result;
}

// ============================================
// 2. TRIM MESSAGES MIDDLEWARE TEST
// ============================================
const trimMessagesMiddleware = createMiddleware({
  name: "TrimMessages",
  beforeModel: (state) => {
    const messages = state.messages;
    console.log(`[TrimMessages] Before trim: ${messages.length} messages`);

    if (messages.length <= 3) {
      console.log("[TrimMessages] Not enough messages to trim");
      return;
    }

    const firstMsg = messages[0];
    const recentMessages =
      messages.length % 2 === 0 ? messages.slice(-3) : messages.slice(-4);
    const newMessages = [firstMsg, ...recentMessages];

    console.log(
      `[TrimMessages] After trim: ${newMessages.length} messages (kept first + last ${recentMessages.length})`
    );

    return {
      messages: [
        new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
        ...newMessages,
      ],
    };
  },
});

export async function testTrimMessages() {
  console.log("\n=== Testing Trim Messages Middleware ===");
  console.log(
    "This middleware keeps the first message and the last 3-4 messages"
  );

  const agent = createAgent({
    model: basicModel,
    middleware: [trimMessagesMiddleware],
    checkpointer,
  });

  const config = { configurable: { thread_id: "trim-test" } };

  // Send 6 messages to see trimming in action
  const messages = [
    "Message 1: Hello",
    "Message 2: How are you?",
    "Message 3: Tell me about AI",
    "Message 4: What's the weather?",
    "Message 5: Thanks",
    "Message 6: Goodbye",
  ];

  let result;
  for (let i = 0; i < messages.length; i++) {
    console.log(`\n--- Sending message ${i + 1}/${messages.length} ---`);
    result = await agent.invoke(
      {
        messages: [{ role: "user", content: messages[i] }],
      },
      config
    );
    console.log(`Total messages in state: ${result.messages.length}`);
  }

  console.log("\n--- Final State ---");
  console.log("Messages in final state:");
  result.messages.forEach((msg, idx) => {
    console.log(
      `  ${idx + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`
    );
  });

  return result;
}

// ============================================
// 3. DELETE OLD MESSAGES MIDDLEWARE TEST
// ============================================
const deleteOldMessagesMiddleware = createMiddleware({
  name: "DeleteOldMessages",
  afterModel: (state) => {
    const messages = state.messages;
    console.log(`[DeleteOldMessages] Total messages: ${messages.length}`);

    if (messages.length > 2) {
      const toDelete = messages.slice(0, 2);
      console.log(`[DeleteOldMessages] Deleting 2 oldest messages`);

      return {
        messages: toDelete.map((m) => new RemoveMessage({ id: m.id })),
      };
    } else {
      console.log("[DeleteOldMessages] Not enough messages to delete");
    }
  },
});

export async function testDeleteOldMessages() {
  console.log("\n=== Testing Delete Old Messages Middleware ===");
  console.log(
    "This middleware deletes the 2 oldest messages after each model response"
  );

  const agent = createAgent({
    model: basicModel,
    middleware: [deleteOldMessagesMiddleware],
    checkpointer,
  });

  const config = { configurable: { thread_id: "delete-test" } };

  const messages = [
    "First message",
    "Second message",
    "Third message",
    "Fourth message",
  ];

  let result;
  for (let i = 0; i < messages.length; i++) {
    console.log(
      `\n--- Sending message ${i + 1}/${messages.length}: "${messages[i]}" ---`
    );
    result = await agent.invoke(
      {
        messages: [{ role: "user", content: messages[i] }],
      },
      config
    );
    console.log(`Messages remaining: ${result.messages.length}`);
  }

  console.log("\n--- Final State ---");
  console.log("Messages in final state:");
  result.messages.forEach((msg, idx) => {
    console.log(
      `  ${idx + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`
    );
  });

  return result;
}

// ============================================
// 4. COMBINED MIDDLEWARE TEST
// ============================================
export async function testCombinedMiddleware() {
  console.log("\n=== Testing Combined Middleware ===");
  console.log("Using: StateExtension + TrimMessages + DeleteOldMessages");

  const agent = createAgent({
    model: basicModel,
    middleware: [
      stateExtensionMiddleware,
      trimMessagesMiddleware,
      deleteOldMessagesMiddleware,
    ],
    checkpointer,
  });

  const config = { configurable: { thread_id: "combined-test" } };

  const result = await agent.invoke(
    {
      messages: [{ role: "user", content: "Test combined middleware" }],
      userId: "user_456",
      preferences: { theme: "light" },
    },
    config
  );

  console.log("\nResult:");
  console.log("- UserId:", result.userId);
  console.log("- Preferences:", result.preferences);
  console.log("- Messages count:", result.messages.length);

  return result;
}

// ============================================
// RUN ALL TESTS
// ============================================
export async function runAllTests() {
  try {
    console.log("\n╔════════════════════════════════════════╗");
    console.log("║   MIDDLEWARE TESTING SUITE            ║");
    console.log("╚════════════════════════════════════════╝");

    await testStateExtension();
    await testTrimMessages();
    await testDeleteOldMessages();
    await testCombinedMiddleware();

    console.log("\n\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    throw error;
  }
}

// Uncomment to run all tests automatically
runAllTests();
