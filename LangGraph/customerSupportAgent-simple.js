import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import * as z from "zod";

/**
 * SIMPLIFIED CUSTOMER SUPPORT AGENT
 * Demonstrates LangGraph thinking process without external API calls
 * Perfect for learning the core concepts!
 */

// ============================================================================
// STATE DEFINITION - The "Memory" of Your Agent
// ============================================================================

const SupportState = z.object({
  emailContent: z.string(),
  customerEmail: z.string(),
  urgency: z.string().optional(),
  topic: z.string().optional(),
  relevantDocs: z.array(z.string()).register(registry, {
    reducer: { fn: (x, y) => x.concat(y) },
    default: () => []
  }),
  draftResponse: z.string().optional(),
  needsEscalation: z.boolean().register(registry, {
    default: () => false
  }),
  humanReviewed: z.boolean().register(registry, {
    default: () => false
  }),
  finalResponse: z.string().optional(),
  actionsTaken: z.array(z.string()).register(registry, {
    reducer: { fn: (x, y) => x.concat(y) },
    default: () => []
  })
});

// ============================================================================
// NODES - Each Node is a "Thought" in the Agent's Mind
// ============================================================================

/**
 * THINKING STEP 1: Classify the email
 * "What is this email about and how urgent is it?"
 */
function classifyEmail(state) {
  console.log("\n🔍 [THINKING] What is this email about?");
  console.log(`   Analyzing: "${state.emailContent.substring(0, 50)}..."`);

  const email = state.emailContent.toLowerCase();

  let urgency = "low";
  let topic = "general_inquiry";

  // Simple rule-based classification
  if (email.includes("charged twice") || email.includes("billing")) {
    urgency = "high";
    topic = "billing";
  } else if (email.includes("api") || email.includes("504") || email.includes("error")) {
    urgency = "high";
    topic = "technical_issue";
  } else if (email.includes("crash") || email.includes("bug")) {
    urgency = "medium";
    topic = "bug_report";
  } else if (email.includes("password") || email.includes("reset")) {
    urgency = "low";
    topic = "password_reset";
  } else if (email.includes("dark mode") || email.includes("feature")) {
    urgency = "low";
    topic = "feature_request";
  }

  console.log(`   ↳ Decision: ${topic} (${urgency} urgency)`);

  return {
    urgency,
    topic,
    actionsTaken: [`Classified as ${topic} with ${urgency} urgency`]
  };
}

/**
 * THINKING STEP 2: Find relevant information
 * "What do I know about this topic?"
 */
function searchDocumentation(state) {
  console.log("\n📚 [THINKING] What information can help here?");

  const docDatabase = {
    password_reset: [
      "Password reset link available on login page",
      "Reset links expire after 24 hours",
      "Contact admin if link doesn't work"
    ],
    bug_report: [
      "Report bugs with steps to reproduce",
      "Include browser and OS information",
      "Critical bugs fixed within 24 hours"
    ],
    billing: [
      "Billing happens on 1st of month",
      "Double charges refunded in 3-5 days",
      "Contact billing@company.com for urgent issues"
    ],
    feature_request: [
      "Feature requests reviewed quarterly",
      "Vote at feedback.company.com",
      "Popular requests prioritized"
    ],
    technical_issue: [
      "Check status at status.company.com",
      "API limit: 1000 requests/hour",
      "504 errors mean timeout - check payload size"
    ],
    general_inquiry: [
      "FAQ at help.company.com",
      "Chat available Mon-Fri 9am-5pm",
      "Email: support@company.com"
    ]
  };

  const docs = docDatabase[state.topic] || docDatabase.general_inquiry;
  console.log(`   ↳ Found ${docs.length} relevant knowledge articles`);

  return {
    relevantDocs: docs,
    actionsTaken: [`Retrieved ${docs.length} documentation articles`]
  };
}

/**
 * THINKING STEP 3: Draft a response
 * "How should I respond to this customer?"
 */
function draftResponse(state) {
  console.log("\n✍️  [THINKING] How should I respond?");

  const templates = {
    password_reset: `Dear customer,

I understand you're having trouble accessing your account. ${state.relevantDocs[0]}.

${state.relevantDocs[1]}. If you don't receive the email, ${state.relevantDocs[2]}.

We're here to help!`,

    bug_report: `Dear customer,

Thank you for reporting this issue. We take bugs seriously and appreciate your detailed feedback.

To help us investigate, please:
- ${state.relevantDocs[0]}
- ${state.relevantDocs[1]}

${state.relevantDocs[2]}.`,

    billing: `Dear customer,

I sincerely apologize for the billing issue. I understand how frustrating this must be.

Good news: ${state.relevantDocs[1]}. ${state.relevantDocs[0]}.

For immediate assistance, ${state.relevantDocs[2]}.`,

    feature_request: `Dear customer,

Thank you for this great suggestion! We love hearing ideas from our users.

${state.relevantDocs[0]}. ${state.relevantDocs[1]}.

${state.relevantDocs[2]}.`,

    technical_issue: `Dear customer,

I understand you're experiencing technical difficulties. Let's resolve this quickly.

First, ${state.relevantDocs[0]}. ${state.relevantDocs[1]}.

For 504 errors specifically: ${state.relevantDocs[2]}.

If the issue persists, our engineering team will investigate immediately.`,

    general_inquiry: `Dear customer,

Thank you for reaching out. I'm happy to help!

For quick answers: ${state.relevantDocs[0]}.
For live support: ${state.relevantDocs[1]}.
Or email us at: ${state.relevantDocs[2]}.`
  };

  const draft = templates[state.topic] || templates.general_inquiry;
  console.log("   ↳ Response drafted using best practices");

  return {
    draftResponse: draft,
    actionsTaken: ["Drafted initial response"]
  };
}

/**
 * THINKING STEP 4: Decide if escalation needed
 * "Is this too complex for me to handle alone?"
 */
function decideEscalation(state) {
  console.log("\n🚦 [THINKING] Should a human review this?");

  const needsEscalation =
    state.urgency === "high" ||
    state.topic === "billing" ||
    state.topic === "technical_issue";

  console.log(`   ↳ Decision: ${needsEscalation ? "YES - needs human review" : "NO - can handle automatically"}`);

  return {
    needsEscalation,
    actionsTaken: [`Escalation ${needsEscalation ? "required" : "not required"}`]
  };
}

/**
 * THINKING STEP 5: Human review (simulated)
 * "Let me check with a human agent..."
 */
function humanReview(state) {
  console.log("\n👤 [THINKING] Getting human agent input...");

  const humanAdditions = {
    billing: "Priority escalation: Refund will be processed today, not 3-5 days. You'll receive confirmation within 2 hours.",
    technical_issue: "Engineering team notified. Senior engineer will investigate within 1 hour and provide update.",
    bug_report: "Ticket created: #12345. Developer assigned and will contact you within 24 hours."
  };

  const addition = humanAdditions[state.topic] || "Reviewed and approved by support manager.";
  console.log(`   ↳ Human agent added: "${addition.substring(0, 40)}..."`);

  return {
    humanReviewed: true,
    actionsTaken: ["Human agent reviewed and enhanced response"]
  };
}

/**
 * THINKING STEP 6: Finalize the response
 * "Put it all together for the customer"
 */
function finalizeResponse(state) {
  console.log("\n✅ [THINKING] Finalizing response...");

  let finalResponse = state.draftResponse;

  if (state.humanReviewed) {
    const humanAdditions = {
      billing: "\n\n⚡ URGENT UPDATE: Refund will be processed today. Confirmation within 2 hours.",
      technical_issue: "\n\n⚡ URGENT: Engineering team notified. Senior engineer investigating within 1 hour.",
      bug_report: "\n\nTicket #12345 created. Developer assigned and will contact you within 24 hours."
    };
    const addition = humanAdditions[state.topic] || "\n\nReviewed by support manager.";
    finalResponse += addition;
  }

  finalResponse += `\n\nBest regards,\nCustomer Support Team\n\nUrgency: ${state.urgency.toUpperCase()}\nTopic: ${state.topic}`;

  console.log("   ↳ Final response ready to send");

  return {
    finalResponse,
    actionsTaken: ["Response finalized and ready"]
  };
}

// ============================================================================
// BUILD THE GRAPH - The "Thought Process"
// ============================================================================

console.log("\n" + "=".repeat(80));
console.log("🧠 LANGGRAPH THINKING PROCESS DEMONSTRATION");
console.log("=".repeat(80));

const workflow = new StateGraph(SupportState)
  .addNode("classifier", classifyEmail)
  .addNode("docSearch", searchDocumentation)
  .addNode("responseDrafter", draftResponse)
  .addNode("escalationDecision", decideEscalation)
  .addNode("humanReview", humanReview)
  .addNode("finalizer", finalizeResponse)

  .addEdge(START, "classifier")
  .addEdge("classifier", "docSearch")
  .addEdge("docSearch", "responseDrafter")
  .addEdge("responseDrafter", "escalationDecision")

  // CONDITIONAL ROUTING - The key to intelligent behavior!
  .addConditionalEdges(
    "escalationDecision",
    (state) => state.needsEscalation ? "humanReview" : "finalizer"
  )

  .addEdge("humanReview", "finalizer")
  .addEdge("finalizer", END);

const checkpointer = new MemorySaver();
const graph = workflow.compile({ checkpointer });

// ============================================================================
// RUN TEST SCENARIOS
// ============================================================================

const scenarios = [
  {
    name: "Simple Password Reset",
    email: "Hi, I forgot my password and can't log in. How do I reset it?",
    customer: "john@example.com"
  },
  {
    name: "Bug Report",
    email: "The export feature crashes when I select PDF format. Happens every time!",
    customer: "sarah@example.com"
  },
  {
    name: "Urgent Billing Issue",
    email: "I was charged twice for my subscription! This is unacceptable!",
    customer: "angry@example.com"
  },
  {
    name: "Feature Request",
    email: "Can you add dark mode to the mobile app? Would be great at night.",
    customer: "developer@example.com"
  },
  {
    name: "Complex Technical Issue",
    email: "Our API integration fails intermittently with 504 errors. Production is affected!",
    customer: "tech@bigclient.com"
  }
];

for (let i = 0; i < scenarios.length; i++) {
  const scenario = scenarios[i];

  console.log("\n\n" + "=".repeat(80));
  console.log(`SCENARIO ${i + 1}: ${scenario.name}`);
  console.log("=".repeat(80));
  console.log(`📧 Incoming: "${scenario.email}"`);

  const result = await graph.invoke({
    emailContent: scenario.email,
    customerEmail: scenario.customer
  }, { configurable: { thread_id: `scenario${i + 1}` } });

  console.log("\n" + "-".repeat(80));
  console.log("📤 FINAL RESPONSE:");
  console.log("-".repeat(80));
  console.log(result.finalResponse);
  console.log("\n📊 Processing Steps:");
  result.actionsTaken.forEach((action, idx) => {
    console.log(`   ${idx + 1}. ${action}`);
  });
}

// ============================================================================
// SHOW THE THINKING GRAPH
// ============================================================================

console.log("\n\n" + "=".repeat(80));
console.log("🧠 THE THINKING GRAPH");
console.log("=".repeat(80));
console.log(`
  START
    ↓
  [CLASSIFY] ────────────→ "What is this about?"
    ↓
  [SEARCH DOCS] ─────────→ "What do I know about this?"
    ↓
  [DRAFT RESPONSE] ──────→ "How should I respond?"
    ↓
  [DECIDE ESCALATION] ───→ "Can I handle this alone?"
    ↓
    ├─→ YES: [HUMAN REVIEW] ──→ "Get expert input"
    │         ↓
    └─→ NO:  [FINALIZE] ──────→ "Send response"
              ↓
            END

KEY INSIGHTS:
- Each node represents a thinking step
- State flows automatically between nodes
- Conditional edges enable intelligent routing
- Human-in-the-loop for complex cases
- All decisions are logged and traceable
`);

// ============================================================================
// STATE INSPECTION EXAMPLE
// ============================================================================

console.log("\n" + "=".repeat(80));
console.log("🔍 STATE INSPECTION (Scenario 5)");
console.log("=".repeat(80));

const state = await graph.getState({ configurable: { thread_id: "scenario5" } });
console.log("\nInternal State After Processing:");
console.log("  ├─ Urgency:", state.values.urgency);
console.log("  ├─ Topic:", state.values.topic);
console.log("  ├─ Needed Escalation:", state.values.needsEscalation);
console.log("  ├─ Human Reviewed:", state.values.humanReviewed);
console.log("  ├─ Docs Found:", state.values.relevantDocs.length);
console.log("  └─ Actions Taken:", state.values.actionsTaken.length);

console.log("\n" + "=".repeat(80));
console.log("✨ COMPLETE! You've seen LangGraph's thinking process in action.");
console.log("=".repeat(80));
