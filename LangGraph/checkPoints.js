import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import * as z from "zod";

const State = z.object({
  foo: z.string(),
  bar: z.array(z.string()).register(registry, {
    reducer: {
      fn: (x, y) => x.concat(y),
    },
    default: () => [],
  }),
  iteration: z.number().register(registry, {
    default: () => 0,
  }),
});

const workflow = new StateGraph(State)
  .addNode("nodeA", (state) => {
    return { foo: "a", bar: ["a"], iteration: state.iteration + 1 };
  })
  .addNode("nodeB", (state) => {
    return { foo: "b", bar: ["b"] };
  })
  .addNode("nodeC", (state) => {
    return { foo: "c", bar: ["c"] };
  })
  .addEdge(START, "nodeA")
  // Conditional edge from nodeA: goes to nodeB or nodeC based on iteration count
  .addConditionalEdges("nodeA", (state) => {
    // If iteration is 1, go to nodeB; if iteration > 1, go to nodeC
    return state.iteration === 1 ? "nodeB" : "nodeC";
  })
  .addEdge("nodeB", "nodeC")
  // Conditional edge from nodeC: loop back to nodeA or end based on iteration count
  .addConditionalEdges("nodeC", (state) => {
    // Loop back to nodeA if iteration < 3, otherwise end
    return state.iteration < 3 ? "nodeA" : END;
  });

const checkpointer = new MemorySaver();
const graph = workflow.compile({ checkpointer });

const config = { configurable: { thread_id: "1" } };
const result = await graph.invoke({ foo: "", bar: [], iteration: 0 }, config);
console.log("Final Result:", result);

// Get the current state
const currentState = await graph.getState(config);
console.log("\n=== Current State ===");
console.log("Metadata:", currentState.metadata);

// Get the state history
console.log("\n=== State History ===");
const stateHistory = await graph.getStateHistory(config);
let historyCount = 0;
for await (const state of stateHistory) {
  historyCount++;
  console.log(`\nCheckpoint ${historyCount}:`);
  console.log("  Next:", state.next);
  console.log("  Config:", state.config);
}
