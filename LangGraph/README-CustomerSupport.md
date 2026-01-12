# Customer Support Agent - LangGraph Thinking Process

## Overview

This folder contains examples demonstrating how LangGraph enables AI agents to "think" through complex tasks using state management, conditional routing, and multi-step workflows.

## Files

1. **customerSupportAgent-simple.js** - Start here! No API keys needed.
2. **customerSupportAgent.js** - Full version with OpenAI integration
3. **checkPoints.js** - Basic checkpoint example

## Quick Start

```bash
# Run the simple version (no API keys needed)
node customerSupportAgent-simple.js
```

## What You'll Learn

### 1. The Thinking Process

LangGraph agents think in steps, just like humans:

```
Human Thinking:            LangGraph Nodes:
--------------            ----------------
"What's this about?" ─→   [Classifier Node]
"What do I know?"    ─→   [Doc Search Node]
"How to respond?"    ─→   [Response Drafter Node]
"Need help?"         ─→   [Escalation Decision Node]
"Get expert input"   ─→   [Human Review Node]
"Finalize"           ─→   [Finalizer Node]
```

Each node is a discrete thinking step that reads state, processes information, and updates state.

### 2. State Management - The Agent's Memory

```javascript
const SupportState = z.object({
  // Input
  emailContent: z.string(),

  // Intermediate results (agent's thoughts)
  urgency: z.string().optional(),
  topic: z.string().optional(),

  // Accumulated knowledge (uses reducers)
  relevantDocs: z.array(z.string()).register(registry, {
    reducer: { fn: (x, y) => x.concat(y) },
    default: () => []
  }),

  // Decisions
  needsEscalation: z.boolean(),

  // Final output
  finalResponse: z.string().optional()
});
```

**Key Insight:** State is the agent's working memory. Each node reads from and writes to this shared memory.

### 3. Conditional Routing - Intelligent Decisions

```javascript
.addConditionalEdges(
  "escalationDecision",
  (state) => {
    // Route based on current state
    return state.needsEscalation ? "humanReview" : "finalizer";
  }
)
```

**Key Insight:** The graph automatically routes execution based on conditions. No manual if/else chains needed!

### 4. Node Design - Single Responsibility

```javascript
function classifyEmail(state) {
  // ONLY classify, don't search or draft
  return {
    urgency: "high",
    topic: "billing",
    actionsTaken: ["Email classified"]
  };
}
```

**Key Insight:** Each node does ONE thing well. This makes the system:
- Easy to test (test each node independently)
- Easy to debug (know exactly where issues occur)
- Easy to extend (add new nodes without changing existing ones)

### 5. Reducers - Smart State Updates

```javascript
// Without reducer (manual merging needed):
relevantDocs: [...state.relevantDocs, ...newDocs]

// With reducer (automatic):
relevantDocs: newDocs  // Automatically concatenates!
```

**Key Insight:** Reducers define how state updates merge. Arrays concatenate, booleans can OR/AND, etc.

## Architecture Patterns

### Pattern 1: Linear Pipeline

```
START → Node A → Node B → Node C → END
```

Use when: Each step must happen in order.

### Pattern 2: Conditional Branching

```
START → Node A → Decision
                    ├─→ Node B → END
                    └─→ Node C → END
```

Use when: Different paths based on conditions.

### Pattern 3: Human-in-the-Loop

```
START → Auto Nodes → Human Decision → Auto Nodes → END
                          ↓
                     (Pause here)
```

Use when: Complex decisions need human judgment.

### Pattern 4: Loop with Exit

```
START → Node A ⟲ Loop until condition
          ↓
        END
```

Use when: Iterative refinement or retry logic needed.

## How This Differs from Traditional Code

### Traditional Approach:

```javascript
async function handleEmail(email) {
  const urgency = classifyUrgency(email);
  const topic = classifyTopic(email);
  const docs = searchDocs(topic);
  let response = draftResponse(email, docs);

  if (urgency === 'high' || topic === 'billing') {
    response = await getHumanReview(response);
  }

  return finalizeResponse(response);
}
```

**Problems:**
- Hard to visualize the flow
- State management is manual
- Difficult to pause/resume
- No built-in logging or observability
- Hard to test individual steps

### LangGraph Approach:

```javascript
const graph = new StateGraph(State)
  .addNode("classify", classifyEmail)
  .addNode("search", searchDocs)
  .addNode("draft", draftResponse)
  .addNode("humanReview", getHumanReview)
  .addConditionalEdges("draft", routeByUrgency)
  .compile({ checkpointer });
```

**Benefits:**
- Visual graph representation
- Automatic state management
- Built-in pause/resume (checkpointing)
- Observability out of the box
- Easy to test each node independently
- Declarative and composable

## Real-World Applications

### 1. Customer Support (This Example)
- Classify incoming emails
- Search knowledge base
- Draft responses
- Escalate complex issues

### 2. Content Moderation
- Analyze content
- Check against policies
- Flag for review
- Auto-moderate or escalate

### 3. Document Processing
- Extract information
- Validate data
- Enrich with external sources
- Route to appropriate handlers

### 4. Sales Lead Qualification
- Analyze lead information
- Score lead quality
- Enrich with external data
- Route to appropriate sales team

### 5. Code Review Assistant
- Analyze code changes
- Check for issues
- Generate suggestions
- Request human review for complex cases

## Advanced Concepts

### Checkpointing (State Persistence)

```javascript
const checkpointer = new MemorySaver();
const graph = workflow.compile({ checkpointer });

// First run
await graph.invoke(input, { configurable: { thread_id: "123" } });

// Resume later with same thread_id
const state = await graph.getState({ configurable: { thread_id: "123" } });
```

**Use cases:**
- Long-running workflows
- Follow-up conversations
- Recovery from failures

### Streaming

```javascript
for await (const event of graph.stream(input)) {
  console.log("Node finished:", event);
}
```

**Use cases:**
- Real-time progress updates
- Monitoring and debugging
- Progressive UI updates

### Parallel Execution

```javascript
.addNode("nodeA", taskA)
.addNode("nodeB", taskB)
.addEdge(START, ["nodeA", "nodeB"])  // Run in parallel
```

**Use cases:**
- Independent operations (fetch from multiple APIs)
- Performance optimization

## Common Pitfalls and Solutions

### Pitfall 1: Too Much in One Node

```javascript
// ❌ Bad: Node does too much
function handleEmail(state) {
  const urgency = classify(state.email);
  const docs = search(urgency);
  const response = draft(docs);
  return { response };
}

// ✅ Good: Separate nodes
.addNode("classify", classifyEmail)
.addNode("search", searchDocs)
.addNode("draft", draftResponse)
```

### Pitfall 2: Forgetting Reducers

```javascript
// ❌ Bad: Last write wins
actionsTaken: z.array(z.string())

// ✅ Good: Accumulate actions
actionsTaken: z.array(z.string()).register(registry, {
  reducer: { fn: (x, y) => x.concat(y) },
  default: () => []
})
```

### Pitfall 3: Overusing Conditional Edges

```javascript
// ❌ Bad: Too many conditions
.addConditionalEdges("node", (state) => {
  if (state.a && state.b && !state.c) return "path1";
  if (state.d || (state.e && state.f)) return "path2";
  // ... 10 more conditions
})

// ✅ Good: Add intermediate decision nodes
.addNode("decisionNode", makeDecision)
.addConditionalEdges("decisionNode", simpleRoute)
```

## Testing Strategies

### Test Individual Nodes

```javascript
import { classifyEmail } from './customerSupportAgent.js';

test('classifies urgent billing correctly', () => {
  const result = classifyEmail({
    emailContent: "I was charged twice!"
  });

  expect(result.urgency).toBe('high');
  expect(result.topic).toBe('billing');
});
```

### Test Graph Execution

```javascript
test('escalates high urgency emails', async () => {
  const result = await graph.invoke({
    emailContent: "URGENT: System down!"
  });

  expect(result.needsEscalation).toBe(true);
  expect(result.humanReviewed).toBe(true);
});
```

### Test State History

```javascript
test('follows correct path', async () => {
  await graph.invoke(input, config);
  const state = await graph.getState(config);

  // Check which nodes were visited
  expect(state.metadata.step).toBe(5);
});
```

## Next Steps

1. **Run the Examples**
   ```bash
   node customerSupportAgent-simple.js
   ```

2. **Modify a Node**
   - Change the classification logic
   - Add new document sources
   - Customize response templates

3. **Add a New Node**
   - Create a sentiment analysis node
   - Add a translation node for international support
   - Build a priority scoring node

4. **Try Different Routing**
   - Add a "retry" loop for failed searches
   - Create parallel paths for different topics
   - Implement a feedback loop

5. **Build Your Own Agent**
   - Content moderator
   - Job application processor
   - Document analyzer
   - Research assistant

## Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraphjs/)
- [LangChain JS Docs](https://js.langchain.com/)
- [State Graph Examples](https://github.com/langchain-ai/langgraphjs/tree/main/examples)

## Questions to Explore

1. **What if a node needs to call another agent?**
   - Nest graphs! A node can invoke another compiled graph.

2. **How do I handle errors?**
   - Use try/catch in nodes, update state with error info, route to error handler node.

3. **Can I have dynamic number of nodes?**
   - Use `addDynamicEdges()` to create nodes at runtime based on state.

4. **How do I visualize my graph?**
   - Use `graph.getGraph().drawMermaid()` to generate a mermaid diagram.

5. **What about async operations?**
   - Nodes can be async! State updates happen after await completes.

## Key Takeaways

1. **State is Central** - Everything flows through shared state
2. **Nodes are Pure** - Each node is a function: state → updates
3. **Edges are Logic** - Routing happens via conditional edges
4. **Declarative > Imperative** - Describe the flow, don't control it
5. **Composable** - Build complex agents from simple nodes
6. **Observable** - Built-in logging and state inspection
7. **Testable** - Test nodes independently or full graph

---

**Remember:** LangGraph makes the thinking process explicit. Instead of hiding logic in nested functions, you declare how your agent thinks, making it easier to understand, debug, and improve.

Happy building! 🚀
