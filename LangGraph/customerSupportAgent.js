import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import * as z from "zod";
import { ChatOllama } from "@langchain/ollama";

/**
 * CUSTOMER SUPPORT AGENT - LangGraph Thinking Process Demonstration
 *
 * This agent demonstrates key LangGraph concepts:
 * 1. State Management: Track email data through the workflow
 * 2. Conditional Routing: Route based on urgency and complexity
 * 3. Multi-Node Processing: Specialized nodes for different tasks
 * 4. Human-in-the-Loop: Escalation pattern for complex issues
 * 5. Memory/Checkpoints: Save state for follow-ups
 */

// ============================================================================
// STEP 1: DEFINE THE STATE SCHEMA
// ============================================================================
// The State defines what information flows through the graph
// Each node can read from and write to this shared state

const SupportState = z.object({
  // Input data
  emailContent: z.string(),
  customerEmail: z.string(),

  // Classification results
  urgency: z.enum(["low", "medium", "high", "critical"]).optional(),
  topic: z
    .enum([
      "password_reset",
      "bug_report",
      "billing",
      "feature_request",
      "technical_issue",
      "general_inquiry",
    ])
    .optional(),

  // Processing results
  relevantDocs: z.array(z.string()).register(registry, {
    reducer: { fn: (x, y) => x.concat(y) },
    default: () => [],
  }),

  draftResponse: z.string().optional(),

  // Routing decisions
  needsEscalation: z.boolean().register(registry, {
    default: () => false,
  }),

  needsFollowUp: z.boolean().register(registry, {
    default: () => false,
  }),

  // Human review
  humanReviewed: z.boolean().register(registry, {
    default: () => false,
  }),

  humanFeedback: z.string().optional(),

  // Final output
  finalResponse: z.string().optional(),
  actionsTaken: z.array(z.string()).register(registry, {
    reducer: { fn: (x, y) => x.concat(y) },
    default: () => [],
  }),
});

// ============================================================================
// STEP 2: CREATE SPECIALIZED NODES
// ============================================================================
// Each node performs a specific task and updates the state

/**
 * NODE: Email Classifier
 * THINKING: Analyze the email to determine urgency and topic
 * This helps route the request to the appropriate handling logic
 */
async function classifyEmail(state) {
  console.log("\n🔍 [CLASSIFIER] Analyzing email...");

  const llm = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "gpt-oss:120b-cloud",
  });

  const classificationPrompt = `Analyze this customer email and classify it:

Email: ${state.emailContent}

Provide:
1. Urgency (low/medium/high/critical)
2. Topic (password_reset/bug_report/billing/feature_request/technical_issue/general_inquiry)

Format: urgency:topic`;

  const result = await llm.invoke(classificationPrompt);
  const [urgency, topic] = result.content.toLowerCase().split(":");

  console.log(`  ↳ Urgency: ${urgency.trim()}`);
  console.log(`  ↳ Topic: ${topic.trim()}`);

  return {
    urgency: urgency.trim(),
    topic: topic.trim(),
    actionsTaken: ["Email classified"],
  };
}

/**
 * NODE: Documentation Search
 * THINKING: Search for relevant docs based on the classified topic
 * In production, this would query a vector database or knowledge base
 */
async function searchDocumentation(state) {
  console.log("\n📚 [DOC SEARCH] Finding relevant documentation...");

  // Mock documentation database
  const docDatabase = {
    password_reset: [
      "Users can reset passwords via 'Forgot Password' link on login page",
      "Password reset links expire after 24 hours",
      "Admins can manually reset passwords from user management panel",
    ],
    bug_report: [
      "Log bugs in our issue tracker with steps to reproduce",
      "Include browser version, OS, and error messages",
      "Critical bugs are prioritized within 24 hours",
    ],
    billing: [
      "Billing cycles on the 1st of each month",
      "Double charges are automatically refunded within 3-5 business days",
      "Contact billing@company.com for urgent billing issues",
    ],
    feature_request: [
      "Feature requests are reviewed quarterly by product team",
      "Vote on existing requests at feedback.company.com",
      "Popular requests are prioritized in our roadmap",
    ],
    technical_issue: [
      "Check system status at status.company.com",
      "API rate limits: 1000 requests/hour for standard tier",
      "504 errors indicate timeout - check request payload size",
    ],
    general_inquiry: [
      "FAQ available at help.company.com",
      "Live chat available Mon-Fri 9am-5pm EST",
      "Email support: support@company.com",
    ],
  };

  const docs = docDatabase[state.topic] || [];
  console.log(`  ↳ Found ${docs.length} relevant documents`);

  return {
    relevantDocs: docs,
    actionsTaken: [`Searched ${state.topic} documentation`],
  };
}

/**
 * NODE: Response Drafter
 * THINKING: Generate a response using the email content and relevant docs
 * Uses LLM to craft appropriate, empathetic responses
 */
async function draftResponse(state) {
  console.log("\n✍️  [RESPONSE DRAFTER] Generating response...");

  const llm = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "gpt-oss:120b-cloud",
  });

  const responsePrompt = `Draft a customer support response:

Customer Email: ${state.emailContent}
Urgency: ${state.urgency}
Topic: ${state.topic}

Relevant Documentation:
${state.relevantDocs.join("\n")}

Guidelines:
- Be empathetic and professional
- Address the specific issue
- Provide actionable steps when possible
- Include relevant documentation references
- Match the urgency level in your tone

Draft Response:`;

  const result = await llm.invoke(responsePrompt);
  console.log("  ↳ Response drafted");

  return {
    draftResponse: result.content,
    actionsTaken: ["Response drafted"],
  };
}

/**
 * NODE: Escalation Decision
 * THINKING: Determine if the issue needs human review
 * High urgency or complex issues should be escalated
 */
function decideEscalation(state) {
  console.log("\n🚦 [ESCALATION DECISION] Evaluating escalation need...");

  const needsEscalation =
    state.urgency === "critical" ||
    state.urgency === "high" ||
    state.topic === "billing" ||
    (state.topic === "technical_issue" &&
      state.emailContent.toLowerCase().includes("api"));

  console.log(`  ↳ Needs escalation: ${needsEscalation}`);

  return {
    needsEscalation,
    actionsTaken: [`Escalation decision: ${needsEscalation ? "YES" : "NO"}`],
  };
}

/**
 * NODE: Human Review (Simulated)
 * THINKING: Allow human agent to review and modify response
 * In production, this would pause workflow for human input
 */
async function humanReview(state) {
  console.log("\n👤 [HUMAN REVIEW] Awaiting human agent review...");
  console.log("  (In production, workflow would pause here)");

  // Simulate human review
  const humanFeedback = `Reviewed by Agent Sarah.
Added: "We're prioritizing this issue and will have an engineer look at it within 2 hours."`;

  console.log(`  ↳ Human feedback received`);

  return {
    humanReviewed: true,
    humanFeedback,
    actionsTaken: ["Human agent reviewed"],
  };
}

/**
 * NODE: Follow-up Scheduler
 * THINKING: Determine if follow-up is needed based on issue type
 */
function scheduleFollowUp(state) {
  console.log("\n📅 [FOLLOW-UP SCHEDULER] Checking follow-up needs...");

  const needsFollowUp =
    state.topic === "bug_report" ||
    state.topic === "technical_issue" ||
    state.urgency === "high" ||
    state.urgency === "critical";

  if (needsFollowUp) {
    console.log("  ↳ Follow-up scheduled for 48 hours");
  } else {
    console.log("  ↳ No follow-up needed");
  }

  return {
    needsFollowUp,
    actionsTaken: [
      needsFollowUp ? "Follow-up scheduled" : "No follow-up needed",
    ],
  };
}

/**
 * NODE: Finalize Response
 * THINKING: Combine draft response with human feedback (if any)
 * and prepare final output
 */
function finalizeResponse(state) {
  console.log("\n✅ [FINALIZER] Preparing final response...");

  let finalResponse = state.draftResponse;

  if (state.humanReviewed && state.humanFeedback) {
    finalResponse += `\n\n${state.humanFeedback}`;
  }

  finalResponse += `\n\nBest regards,\nCustomer Support Team`;

  console.log("  ↳ Response finalized");

  return {
    finalResponse,
    actionsTaken: ["Response finalized"],
  };
}

// ============================================================================
// STEP 3: BUILD THE GRAPH WITH CONDITIONAL ROUTING
// ============================================================================
// This is where LangGraph's thinking process really shines!
// The graph automatically routes based on state conditions

const workflow = new StateGraph(SupportState)
  // Add all nodes
  .addNode("classifier", classifyEmail)
  .addNode("docSearch", searchDocumentation)
  .addNode("responseDrafter", draftResponse)
  .addNode("escalationDecision", decideEscalation)
  .addNode("humanReview", humanReview)
  .addNode("followUpScheduler", scheduleFollowUp)
  .addNode("finalizer", finalizeResponse)

  // Define the flow
  .addEdge(START, "classifier")
  .addEdge("classifier", "docSearch")
  .addEdge("docSearch", "responseDrafter")
  .addEdge("responseDrafter", "escalationDecision")

  // CONDITIONAL ROUTING: Route based on escalation need
  .addConditionalEdges("escalationDecision", (state) => {
    // If needs escalation, go to human review
    // Otherwise, skip to follow-up scheduler
    return state.needsEscalation ? "humanReview" : "followUpScheduler";
  })

  .addEdge("humanReview", "followUpScheduler")
  .addEdge("followUpScheduler", "finalizer")
  .addEdge("finalizer", END);

// ============================================================================
// STEP 4: COMPILE AND RUN
// ============================================================================

// Add checkpointer for state persistence
const checkpointer = new MemorySaver();
const graph = workflow.compile({ checkpointer });

// ============================================================================
// TEST SCENARIOS
// ============================================================================

console.log("=".repeat(80));
console.log("CUSTOMER SUPPORT AGENT - LANGGRAPH DEMONSTRATION");
console.log("=".repeat(80));

// Scenario 1: Simple password reset (low urgency)
console.log("\n\n" + "=".repeat(80));
console.log("SCENARIO 1: Simple Product Question");
console.log("=".repeat(80));

const scenario1 = await graph.invoke(
  {
    emailContent:
      "Hi, I forgot my password and can't log in. How do I reset it?",
    customerEmail: "john@example.com",
  },
  { configurable: { thread_id: "scenario1" } }
);

console.log("\n📧 FINAL RESPONSE:");
console.log(scenario1.finalResponse);
console.log("\n📊 Actions Taken:", scenario1.actionsTaken);

// Scenario 2: Bug report (medium urgency)
console.log("\n\n" + "=".repeat(80));
console.log("SCENARIO 2: Bug Report");
console.log("=".repeat(80));

const scenario2 = await graph.invoke(
  {
    emailContent:
      "The export feature crashes when I select PDF format. I tried multiple times and it happens every time.",
    customerEmail: "sarah@example.com",
  },
  { configurable: { thread_id: "scenario2" } }
);

console.log("\n📧 FINAL RESPONSE:");
console.log(scenario2.finalResponse);
console.log("\n📊 Actions Taken:", scenario2.actionsTaken);

// Scenario 3: Urgent billing issue (high urgency)
console.log("\n\n" + "=".repeat(80));
console.log("SCENARIO 3: Urgent Billing Issue");
console.log("=".repeat(80));

const scenario3 = await graph.invoke(
  {
    emailContent:
      "I was charged twice for my subscription! This is unacceptable, I need this fixed immediately!",
    customerEmail: "angry@example.com",
  },
  { configurable: { thread_id: "scenario3" } }
);

console.log("\n📧 FINAL RESPONSE:");
console.log(scenario3.finalResponse);
console.log("\n📊 Actions Taken:", scenario3.actionsTaken);

// Scenario 4: Feature request (low urgency)
console.log("\n\n" + "=".repeat(80));
console.log("SCENARIO 4: Feature Request");
console.log("=".repeat(80));

const scenario4 = await graph.invoke(
  {
    emailContent:
      "Can you add dark mode to the mobile app? It would be much easier on the eyes at night.",
    customerEmail: "developer@example.com",
  },
  { configurable: { thread_id: "scenario4" } }
);

console.log("\n📧 FINAL RESPONSE:");
console.log(scenario4.finalResponse);
console.log("\n📊 Actions Taken:", scenario4.actionsTaken);

// Scenario 5: Complex technical issue (high urgency)
console.log("\n\n" + "=".repeat(80));
console.log("SCENARIO 5: Complex Technical Issue");
console.log("=".repeat(80));

const scenario5 = await graph.invoke(
  {
    emailContent:
      "Our API integration fails intermittently with 504 errors. This is affecting our production system!",
    customerEmail: "tech@bigclient.com",
  },
  { configurable: { thread_id: "scenario5" } }
);

console.log("\n📧 FINAL RESPONSE:");
console.log(scenario5.finalResponse);
console.log("\n📊 Actions Taken:", scenario5.actionsTaken);

// ============================================================================
// DEMONSTRATE STATE INSPECTION
// ============================================================================

console.log("\n\n" + "=".repeat(80));
console.log("STATE INSPECTION EXAMPLE (Scenario 5)");
console.log("=".repeat(80));

const state = await graph.getState({
  configurable: { thread_id: "scenario5" },
});
console.log("\nFinal State Values:");
console.log("  - Urgency:", state.values.urgency);
console.log("  - Topic:", state.values.topic);
console.log("  - Needs Escalation:", state.values.needsEscalation);
console.log("  - Human Reviewed:", state.values.humanReviewed);
console.log("  - Needs Follow-up:", state.values.needsFollowUp);
console.log("  - Total Actions:", state.values.actionsTaken.length);

// ============================================================================
// KEY TAKEAWAYS
// ============================================================================

console.log("\n\n" + "=".repeat(80));
console.log("KEY LANGGRAPH CONCEPTS DEMONSTRATED");
console.log("=".repeat(80));
console.log(`
1. STATE MANAGEMENT
   - Defined shared state schema with Zod
   - Each node reads and updates state
   - State flows automatically through the graph

2. CONDITIONAL ROUTING
   - Decisions based on urgency and complexity
   - Different paths for escalated vs normal issues
   - Automatic routing without manual if/else chains

3. SPECIALIZED NODES
   - Each node has a single responsibility
   - Classifier, DocSearch, Drafter, Reviewer, Finalizer
   - Easy to test, maintain, and extend

4. HUMAN-IN-THE-LOOP
   - Escalation pattern for complex issues
   - Workflow can pause for human input
   - State preserved across interruptions

5. REDUCERS
   - Arrays automatically concatenate (relevantDocs, actionsTaken)
   - No need to manually merge arrays
   - Clean, declarative state updates

6. CHECKPOINTING
   - State persisted with MemorySaver
   - Can resume workflows later
   - Perfect for follow-ups and long-running processes

7. OBSERVABILITY
   - Console logs show thinking at each step
   - State inspection shows decision trail
   - Easy to debug and monitor
`);

console.log("=".repeat(80));
