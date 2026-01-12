# Quick Start Guide

## What You Have

I've created a comprehensive customer support agent that demonstrates LangGraph's thinking process:

```
LangGraph/
├── customerSupportAgent-simple.js    ⭐ Start here! (No API needed)
├── customerSupportAgent.js           Full version with OpenAI
├── checkPoints.js                    Basic checkpoint example
├── README-CustomerSupport.md         Comprehensive guide
├── THINKING-PROCESS-GUIDE.md         Deep dive into thinking
└── QUICK-START.md                    This file
```

## Run It Now

```bash
# Option 1: Simple version (no API keys needed)
npm run support:simple

# Option 2: Full version (requires OpenAI API key)
npm run support:full

# Option 3: Basic checkpoint example
npm run checkpoint
```

## What You'll See

The agent processes 5 customer email scenarios:

### Scenario 1: Password Reset (Low Urgency)
```
Email: "Hi, I forgot my password and can't log in..."

Agent's Thinking:
  🔍 [CLASSIFY]    → urgency: low, topic: password_reset
  📚 [DOC SEARCH]  → Found 3 relevant docs
  ✍️  [DRAFT]      → Created helpful response
  🚦 [ESCALATION]  → No escalation needed
  ✅ [FINALIZE]    → Response ready!

Path: START → Classify → Search → Draft → Decide → Finalize → END
```

### Scenario 2: Bug Report (Medium Urgency)
```
Email: "The export feature crashes when I select PDF..."

Agent's Thinking:
  🔍 [CLASSIFY]    → urgency: medium, topic: bug_report
  📚 [DOC SEARCH]  → Found bug reporting procedures
  ✍️  [DRAFT]      → Created response with next steps
  🚦 [ESCALATION]  → No escalation needed
  ✅ [FINALIZE]    → Response ready with follow-up

Path: START → Classify → Search → Draft → Decide → Finalize → END
```

### Scenario 3: Billing Issue (HIGH Urgency) ⚡
```
Email: "I was charged twice for my subscription!"

Agent's Thinking:
  🔍 [CLASSIFY]    → urgency: HIGH, topic: billing
  📚 [DOC SEARCH]  → Found refund policies
  ✍️  [DRAFT]      → Created empathetic response
  🚦 [ESCALATION]  → ⚠️  ESCALATION NEEDED (billing issue)
  👤 [HUMAN]       → Human agent enhanced response
  ✅ [FINALIZE]    → Priority response ready!

Path: START → Classify → Search → Draft → Decide → HUMAN REVIEW → Finalize → END
                                                     ^^^^^^^^^^^^^^^
                                                   Different path!
```

### Scenario 4: Feature Request (Low Urgency)
```
Email: "Can you add dark mode to the mobile app?"

Agent's Thinking:
  🔍 [CLASSIFY]    → urgency: low, topic: feature_request
  📚 [DOC SEARCH]  → Found feature request process
  ✍️  [DRAFT]      → Explained how requests are handled
  🚦 [ESCALATION]  → No escalation needed
  ✅ [FINALIZE]    → Response with voting link

Path: START → Classify → Search → Draft → Decide → Finalize → END
```

### Scenario 5: Technical Issue (HIGH Urgency) ⚡
```
Email: "Our API integration fails with 504 errors!"

Agent's Thinking:
  🔍 [CLASSIFY]    → urgency: HIGH, topic: technical_issue
  📚 [DOC SEARCH]  → Found API troubleshooting docs
  ✍️  [DRAFT]      → Technical response with solutions
  🚦 [ESCALATION]  → ⚠️  ESCALATION NEEDED (API + high urgency)
  👤 [HUMAN]       → Engineering team notified
  ✅ [FINALIZE]    → Priority response with eng team escalation

Path: START → Classify → Search → Draft → Decide → HUMAN REVIEW → Finalize → END
```

## The Key Insight

Notice how Scenarios 3 and 5 take a **different path** through the graph:

```
Normal Path (Scenarios 1, 2, 4):
  Classify → Search → Draft → Decide → Finalize

High Priority Path (Scenarios 3, 5):
  Classify → Search → Draft → Decide → HUMAN REVIEW → Finalize
                                              ↑
                                    Extra step inserted!
```

**This is LangGraph's power:** The graph automatically routes based on state (urgency, topic) without manual if/else logic!

## The Thinking Process Visualized

```
┌─────────────────────────────────────────────────────────────┐
│                      START                                  │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────┐
│  🔍 CLASSIFY: "What is this email about?"                │
│                                                           │
│  Reads: emailContent                                      │
│  Thinks: "Is it urgent? What topic?"                      │
│  Updates: urgency, topic                                  │
└───────────────────────┬───────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────┐
│  📚 SEARCH DOCS: "What do I know about this?"            │
│                                                           │
│  Reads: topic                                             │
│  Thinks: "Which docs are relevant?"                       │
│  Updates: relevantDocs[]                                  │
└───────────────────────┬───────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────┐
│  ✍️  DRAFT: "How should I respond?"                       │
│                                                           │
│  Reads: emailContent, topic, relevantDocs                 │
│  Thinks: "Craft empathetic, helpful response"             │
│  Updates: draftResponse                                   │
└───────────────────────┬───────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────┐
│  🚦 DECIDE: "Can I handle this alone?"                   │
│                                                           │
│  Reads: urgency, topic                                    │
│  Thinks: "Is this high priority or sensitive?"            │
│  Updates: needsEscalation                                 │
└───────────────────────┬───────────────────────────────────┘
                        ↓
           ╔════════════════════════╗
           ║ needsEscalation?       ║
           ╚════════╤═══════════════╝
                ┌───┴────┐
              YES│        │NO
                 ↓        ↓
    ┌────────────────┐  ┌────────────────┐
    │ 👤 HUMAN       │  │ ✅ FINALIZE    │
    │    REVIEW      │  │                │
    │                │  │  Reads: draft  │
    │ Reads: all     │  │  Prepares:     │
    │ Gets: human    │  │    final       │
    │       feedback │  │    response    │
    └───────┬────────┘  └────────┬───────┘
            │                    │
            └─────────┬──────────┘
                      ↓
            ┌───────────────────┐
            │   ✅ FINALIZE     │
            │                   │
            │  Combines all     │
            │  Adds signature   │
            └─────────┬─────────┘
                      ↓
                  ┌───────┐
                  │  END  │
                  └───────┘
```

## Key Concepts Demonstrated

### 1. State Management
Every node reads from and writes to a shared state object:

```javascript
State = {
  emailContent: "...",      // Input
  urgency: "high",          // Classifier output
  topic: "billing",         // Classifier output
  relevantDocs: [...],      // Search output
  draftResponse: "...",     // Drafter output
  needsEscalation: true,    // Decision output
  finalResponse: "..."      // Final output
}
```

### 2. Node Specialization
Each node has ONE job:

- **Classifier:** Determine urgency + topic
- **Doc Search:** Find relevant information
- **Drafter:** Create response
- **Decision:** Determine if escalation needed
- **Human Review:** Get human input
- **Finalizer:** Prepare final output

### 3. Conditional Routing
The graph routes automatically:

```javascript
.addConditionalEdges(
  "escalationDecision",
  (state) => state.needsEscalation ? "humanReview" : "finalizer"
)
```

No manual if/else in your main code!

### 4. Reducers
Arrays automatically accumulate:

```javascript
actionsTaken: z.array(z.string()).register(registry, {
  reducer: { fn: (x, y) => x.concat(y) },
  default: () => []
})

// Node 1 returns: { actionsTaken: ["Step 1"] }
// Node 2 returns: { actionsTaken: ["Step 2"] }
// Final state: { actionsTaken: ["Step 1", "Step 2"] }
```

### 5. Observability
Every step is logged:

```
🔍 [THINKING] What is this email about?
   Analyzing: "I was charged twice for my subscription!"
   ↳ Decision: billing (high urgency)

📚 [THINKING] What information can help here?
   ↳ Found 3 relevant knowledge articles

✍️  [THINKING] How should I respond?
   ↳ Response drafted using best practices

🚦 [THINKING] Should a human review this?
   ↳ Decision: YES - needs human review

👤 [THINKING] Getting human agent input...
   ↳ Human agent added: "Priority escalation..."

✅ [THINKING] Finalizing response...
   ↳ Final response ready to send
```

## Modify and Experiment

### Easy Modifications

1. **Change Classification Logic** (customerSupportAgent-simple.js:43)
   ```javascript
   function classifyEmail(state) {
     // Add your own rules!
     if (email.includes("urgent")) {
       urgency = "critical";
     }
   }
   ```

2. **Add Documentation** (customerSupportAgent-simple.js:62)
   ```javascript
   const docDatabase = {
     password_reset: [...],
     // Add your topic!
     account_deletion: [
       "Account deletion is permanent",
       "Export data before deletion"
     ]
   }
   ```

3. **Modify Escalation Rules** (customerSupportAgent-simple.js:150)
   ```javascript
   function decideEscalation(state) {
     const needsEscalation =
       state.urgency === "high" ||
       state.customerEmail.includes("@vip.com");  // VIP check!
   }
   ```

### Advanced Modifications

1. **Add a New Node**
   ```javascript
   function sentimentAnalysis(state) {
     const sentiment = analyzeSentiment(state.emailContent);
     return { sentiment };
   }

   workflow.addNode("sentiment", sentimentAnalysis)
           .addEdge("classifier", "sentiment")
           .addEdge("sentiment", "docSearch");
   ```

2. **Add Parallel Processing**
   ```javascript
   .addEdge("classifier", ["docSearch", "sentiment"])  // Both run in parallel
   ```

3. **Add a Retry Loop**
   ```javascript
   .addConditionalEdges("docSearch", (state) => {
     if (state.relevantDocs.length === 0 && state.retries < 3) {
       return "classifier";  // Loop back to try again
     }
     return "responseDrafter";
   })
   ```

## Next Steps

1. **Run the simple version:** `npm run support:simple`
2. **Read the thinking guide:** `THINKING-PROCESS-GUIDE.md`
3. **Read the full guide:** `README-CustomerSupport.md`
4. **Modify a node** and see what changes
5. **Add a new node** to extend functionality
6. **Build your own agent!**

## Common Use Cases

Use this pattern for:
- **Content Moderation:** Classify → Check policies → Moderate/Escalate
- **Document Processing:** Extract → Validate → Enrich → Route
- **Sales Leads:** Qualify → Score → Enrich → Assign
- **Code Review:** Analyze → Check → Suggest → Human review
- **Research Assistant:** Search → Summarize → Verify → Present

## Questions?

Check these files:
- `README-CustomerSupport.md` - Comprehensive guide
- `THINKING-PROCESS-GUIDE.md` - Deep dive into thinking
- `customerSupportAgent-simple.js` - Full code with comments

## The Big Picture

**Traditional AI:** Input → [Black Box] → Output

**LangGraph AI:** Input → [Observable Thinking Steps] → Output
                          ↑
                    Can see, debug, modify each step!

This is the power of LangGraph: making AI reasoning **explicit, transparent, and controllable**.

---

**Now go run it!** `npm run support:simple` 🚀
