import { Annotation, MemorySaver, StateGraph, END } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";

const model = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "gpt-oss:120b-cloud",
});

const SupportStateAnnotation = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  currentStep: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "warranty_collector",
  }),
  warrantyStatus: Annotation({
    reducer: (x, y) => y ?? x,
  }),
  issueType: Annotation({
    reducer: (x, y) => y ?? x,
  }),
});
const WARRANTY_COLLECTOR_PROMPT = `You are a customer support agent helping with device issues.

CURRENT STEP: Warranty verification

At this step, you need to:
1. Greet the customer warmly
2. Ask if their device is under warranty
3. Use record_warranty_status to record their response and move to the next step

Be conversational and friendly. Don't ask multiple questions at once.`;
const ISSUE_CLASSIFIER_PROMPT = `You are a customer support agent helping with device issues.

CURRENT STEP: Issue classification
CUSTOMER INFO: Warranty status is {warrantyStatus}

At this step, you need to:
1. Ask the customer to describe their issue
2. Determine if it's a hardware issue (physical damage, broken parts) or software issue (app crashes, performance)
3. Use record_issue_type to record the classification and move to the next step

If unclear, ask clarifying questions before classifying.`;

const RESOLUTION_SPECIALIST_PROMPT = `You are a customer support agent helping with device issues.

CURRENT STEP: Resolution
CUSTOMER INFO: Warranty status is {warrantyStatus}, issue type is {issueType}

At this step, you need to:
1. For SOFTWARE issues: provide troubleshooting steps using provide_solution
2. For HARDWARE issues:
   - If IN WARRANTY: explain warranty repair process using provide_solution
   - If OUT OF WARRANTY: escalate_to_human for paid repair options

Be specific and helpful in your solutions.`;

// Step configuration
const STEP_CONFIG = {
  warranty_collector: {
    prompt: WARRANTY_COLLECTOR_PROMPT,
    toolNames: ["record_warranty_status"],
    requires: [],
  },
  issue_classifier: {
    prompt: ISSUE_CLASSIFIER_PROMPT,
    toolNames: ["record_issue_type"],
    requires: ["warrantyStatus"],
  },
  resolution_specialist: {
    prompt: RESOLUTION_SPECIALIST_PROMPT,
    toolNames: ["provide_solution", "escalate_to_human"],
    requires: ["warrantyStatus", "issueType"],
  },
};

// Define tools
const recordWarrantyStatusTool = new DynamicStructuredTool({
  name: "record_warranty_status",
  description:
    "Record the customer's warranty status and transition to issue classification.",
  schema: z.object({
    status: z.enum(["in_warranty", "out_of_warranty"]),
  }),
  func: async ({ status }) => {
    return `Warranty status recorded as: ${status}`;
  },
});

const recordIssueTypeTool = new DynamicStructuredTool({
  name: "record_issue_type",
  description:
    "Record the type of issue and transition to resolution specialist.",
  schema: z.object({
    issueType: z.enum(["hardware", "software"]),
  }),
  func: async ({ issueType }) => {
    return `Issue type recorded as: ${issueType}`;
  },
});

const escalateToHumanTool = new DynamicStructuredTool({
  name: "escalate_to_human",
  description: "Escalate the case to a human support specialist.",
  schema: z.object({
    reason: z.string(),
  }),
  func: async ({ reason }) => {
    return `Escalating to human support. Reason: ${reason}`;
  },
});

const provideSolutionTool = new DynamicStructuredTool({
  name: "provide_solution",
  description: "Provide a solution to the customer's issue.",
  schema: z.object({
    solution: z.string(),
  }),
  func: async ({ solution }) => {
    return `Solution provided: ${solution}`;
  },
});

// All tools collection
const allTools = [
  recordWarrantyStatusTool,
  recordIssueTypeTool,
  provideSolutionTool,
  escalateToHumanTool,
];

// Create a map for easy lookup
const toolsMap = Object.fromEntries(allTools.map((tool) => [tool.name, tool]));

// Agent node function
async function agentNode(state) {
  const currentStep = state.currentStep || "warranty_collector";
  const stepConfig = STEP_CONFIG[currentStep];

  // Validate required state exists
  for (const key of stepConfig.requires) {
    if (!state[key]) {
      throw new Error(`${key} must be set before reaching ${currentStep}`);
    }
  }

  // Format prompt with state values
  let systemPrompt = stepConfig.prompt
    .replace("{warrantyStatus}", state.warrantyStatus || "")
    .replace("{issueType}", state.issueType || "");

  // Get tools for this step
  const stepTools = stepConfig.toolNames.map((name) => toolsMap[name]);

  // Bind tools to model
  const modelWithTools = model.bindTools(stepTools);

  // Invoke the model
  const messages = [
    { role: "system", content: systemPrompt },
    ...state.messages,
  ];

  const response = await modelWithTools.invoke(messages);

  // Handle tool calls and state updates
  let updates = { messages: [response] };

  if (response.tool_calls && response.tool_calls.length > 0) {
    const toolCall = response.tool_calls[0];
    const tool = stepTools.find((t) => t.name === toolCall.name);

    if (tool) {
      const toolResult = await tool.func(toolCall.args);

      // Add tool message
      const toolMessage = new ToolMessage({
        content: toolResult,
        tool_call_id: toolCall.id,
      });

      updates.messages.push(toolMessage);

      // Handle state transitions based on tool called
      if (toolCall.name === "record_warranty_status") {
        updates.warrantyStatus = toolCall.args.status;
        updates.currentStep = "issue_classifier";
      } else if (toolCall.name === "record_issue_type") {
        updates.issueType = toolCall.args.issueType;
        updates.currentStep = "resolution_specialist";
      }
    }
  }

  return updates;
}

// Should continue function
function shouldContinue(state) {
  const lastMessage = state.messages[state.messages.length - 1];

  // If there are tool calls, continue
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "agent";
  }

  // Otherwise end
  return END;
}

// Build the graph
const workflow = new StateGraph(SupportStateAnnotation)
  .addNode("agent", agentNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue);

// Compile with checkpointer
const checkpointer = new MemorySaver();
const agent = workflow.compile({ checkpointer });

// Configuration with thread ID for conversation persistence
const config = { configurable: { thread_id: "customer-support-1" } };

let result = await agent.invoke(
  { messages: [new HumanMessage("Hi, my phone screen is cracked")] },
  config
);
console.log(result.messages[result.messages.length - 1].content);
console.log("\n=== Interaction 2 ===");
result = await agent.invoke(
  { messages: [new HumanMessage("Yes, it's still under warranty")] },
  config
);
console.log(result.messages[result.messages.length - 1].content);
