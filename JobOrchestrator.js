/**
 * Simple Job Orchestrator System
 * A beginner-friendly example of managing background tasks with job tracking
 */

// In-memory job store (static data)
const jobStore = {
  jobs: {},
  nextJobId: 1,
};

// Job statuses
const JobStatus = {
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
};

// Simulated specialized agents
const agents = {
  legal_reviewer: async (task) => {
    // Simulate legal document review
    await delay(2000);
    return {
      summary: "Contract reviewed successfully",
      findings: [
        "No major risks found",
        "Standard terms apply",
        "Signatures verified",
      ],
      recommendation: "Proceed with approval",
    };
  },

  data_analyzer: async (task) => {
    // Simulate data analysis
    await delay(1500);
    return {
      summary: "Data analysis complete",
      insights: [
        "Sales increased by 15%",
        "Customer retention improved",
        "Peak hours: 2-4 PM",
      ],
      charts: ["chart1.png", "chart2.png"],
    };
  },

  document_parser: async (task) => {
    // Simulate document parsing
    await delay(1000);
    return {
      summary: "Document parsed successfully",
      pages: 25,
      wordCount: 5432,
      sections: ["Introduction", "Main Content", "Conclusion"],
    };
  },
};

// Helper function to simulate delay
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Create a new job and run it in background
function runAgent(agentName, task) {
  const jobId = `job_${jobStore.nextJobId++}`;

  // Create job record
  jobStore.jobs[jobId] = {
    id: jobId,
    agentName,
    task,
    status: JobStatus.QUEUED,
    createdAt: new Date().toISOString(),
    result: null,
    error: null,
  };

  // Start processing in background (non-blocking)
  processJobInBackground(jobId, agentName, task);

  return jobId;
}

// Background job processor
async function processJobInBackground(jobId, agentName, task) {
  const job = jobStore.jobs[jobId];

  try {
    // Update status to running
    job.status = JobStatus.RUNNING;
    job.startedAt = new Date().toISOString();

    // Execute the agent
    const agent = agents[agentName];
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found`);
    }

    const result = await agent(task);

    // Mark as completed
    job.status = JobStatus.COMPLETED;
    job.result = result;
    job.completedAt = new Date().toISOString();
  } catch (error) {
    // Mark as failed
    job.status = JobStatus.FAILED;
    job.error = error.message;
    job.failedAt = new Date().toISOString();
  }
}

// Check job status
function checkStatus(jobId) {
  const job = jobStore.jobs[jobId];

  if (!job) {
    return { error: `Job ${jobId} not found` };
  }

  return {
    jobId: job.id,
    status: job.status,
    agentName: job.agentName,
    task: job.task,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}

// Get job result
function getResult(jobId) {
  const job = jobStore.jobs[jobId];

  if (!job) {
    return { error: `Job ${jobId} not found` };
  }

  if (job.status !== JobStatus.COMPLETED) {
    return {
      error: `Job is not completed yet. Current status: ${job.status}`,
    };
  }

  return {
    jobId: job.id,
    status: job.status,
    result: job.result,
  };
}

// List all jobs
function listAllJobs() {
  return Object.values(jobStore.jobs).map((job) => ({
    jobId: job.id,
    agentName: job.agentName,
    status: job.status,
    createdAt: job.createdAt,
  }));
}

// Main Orchestrator Agent
class OrchestratorAgent {
  // Handle user request
  async handleRequest(userInput) {
    const input = userInput.toLowerCase();

    // Check for status requests
    if (input.includes("status") || input.includes("update")) {
      return this.handleStatusCheck(userInput);
    }

    // Check for result requests
    if (input.includes("done") || input.includes("result")) {
      return this.handleResultCheck(userInput);
    }

    // Check for list requests
    if (input.includes("list") || input.includes("all jobs")) {
      return this.handleListJobs();
    }

    // Delegate to appropriate agent
    return this.delegateTask(userInput);
  }

  // Delegate task to specialized agent
  delegateTask(userInput) {
    let agentName = "document_parser"; // default
    let task = userInput;

    // Route to appropriate agent based on keywords
    if (userInput.includes("contract") || userInput.includes("legal")) {
      agentName = "legal_reviewer";
    } else if (userInput.includes("data") || userInput.includes("analyze")) {
      agentName = "data_analyzer";
    }

    const jobId = runAgent(agentName, task);

    return {
      message: `Started processing your request using ${agentName}`,
      jobId: jobId,
      status: "Job created and running in background",
    };
  }

  // Handle status check
  handleStatusCheck(userInput) {
    // Extract job_id if mentioned, otherwise get latest job
    const jobIdMatch = userInput.match(/job_(\d+)/);
    let jobId;

    if (jobIdMatch) {
      jobId = jobIdMatch[0];
    } else {
      // Get the most recent job
      const allJobs = Object.keys(jobStore.jobs);
      jobId = allJobs[allJobs.length - 1];
    }

    if (!jobId) {
      return { message: "No jobs found. Please start a task first." };
    }

    const status = checkStatus(jobId);

    if (status.error) {
      return status;
    }

    const messages = {
      queued: "Job is waiting in queue...",
      running: "Still processing your request...",
      completed: 'Job completed! Use "get result" to see the output.',
      failed: "Job failed. Please try again.",
    };

    return {
      jobId: status.jobId,
      status: status.status,
      message: messages[status.status],
      details: status,
    };
  }

  // Handle result check
  handleResultCheck(userInput) {
    // Extract job_id if mentioned, otherwise get latest completed job
    const jobIdMatch = userInput.match(/job_(\d+)/);
    let jobId;

    if (jobIdMatch) {
      jobId = jobIdMatch[0];
    } else {
      // Get the most recent completed job
      const completedJobs = Object.values(jobStore.jobs)
        .filter((job) => job.status === JobStatus.COMPLETED)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

      if (completedJobs.length > 0) {
        jobId = completedJobs[0].id;
      }
    }

    if (!jobId) {
      return { message: "No completed jobs found." };
    }

    const result = getResult(jobId);

    if (result.error) {
      return result;
    }

    return {
      message: "Here are your results:",
      jobId: result.jobId,
      result: result.result,
    };
  }

  // Handle list all jobs
  handleListJobs() {
    const jobs = listAllJobs();

    if (jobs.length === 0) {
      return { message: "No jobs found." };
    }

    return {
      message: `Found ${jobs.length} job(s)`,
      jobs: jobs,
    };
  }
}

// Demo Usage
async function demo() {
  const orchestrator = new OrchestratorAgent();

  console.log("=== Job Orchestrator Demo ===\n");

  // User: Review this contract
  console.log("User: Review this M&A contract");
  let response = await orchestrator.handleRequest("Review this M&A contract");
  console.log("Orchestrator:", JSON.stringify(response, null, 2));
  console.log("\n---\n");

  // Wait a bit
  await delay(500);

  // User: What's the status?
  console.log("User: What's the status?");
  response = await orchestrator.handleRequest("What's the status?");
  console.log("Orchestrator:", JSON.stringify(response, null, 2));
  console.log("\n---\n");

  // Wait for completion
  await delay(2500);

  // User: Is it done yet?
  console.log("User: Is it done yet?");
  response = await orchestrator.handleRequest("Is it done yet?");
  console.log("Orchestrator:", JSON.stringify(response, null, 2));
  console.log("\n---\n");

  // Start another job
  console.log("User: Analyze sales data");
  response = await orchestrator.handleRequest("Analyze sales data");
  console.log("Orchestrator:", JSON.stringify(response, null, 2));
  console.log("\n---\n");

  // List all jobs
  await delay(2000);
  console.log("User: List all jobs");
  response = await orchestrator.handleRequest("List all jobs");
  console.log("Orchestrator:", JSON.stringify(response, null, 2));
}

demo().catch(console.error);
