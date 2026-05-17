import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";

// 1. Define the Shared State Schema
export const CompanyState = Annotation.Root({
  task: Annotation<string>(),
  plan: Annotation<string>(),
  code: Annotation<string>(),
  feedback: Annotation<string>(),
  isApproved: Annotation<boolean>(),
});

// 2. Initialize Groq (Free Cloud Llama 3 Compute)
const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY || "dummy", // Fallback required for strict TS
  model: "llama3-70b-8192", // Using the 70B model for enterprise-grade logic
  temperature: 0.1,
});

// Agent Nodes
async function productManagerNode(state: typeof CompanyState.State) {
  console.log("👔 [PM] Planning...");
  const prompt = `You are a Product Manager. Create a step-by-step technical plan for: ${state.task}. Output ONLY the plan.`;
  // ChatGroq returns an AIMessage object, we extract the content
  const response = await llm.invoke(prompt);
  return { plan: response.content as string };
}

async function engineerNode(state: typeof CompanyState.State) {
  console.log("💻 [Engineer] Coding...");
  let prompt = `You are a Lead Engineer. Execute this plan: ${state.plan}. Output ONLY the code block.`;
  if (state.feedback) prompt += `\n\nFix these issues: ${state.feedback}`;

  const response = await llm.invoke(prompt);
  return { code: response.content as string };
}

async function qaReviewerNode(state: typeof CompanyState.State) {
  console.log("🔍 [QA] Reviewing...");
  const prompt = `You are a strict QA Reviewer. Review this code: ${state.code}
  If it passes, respond EXACTLY with "APPROVED".
  If it fails, provide specific feedback.`;

  const response = await llm.invoke(prompt);
  const review = response.content as string;

  if (review.trim() === "APPROVED") {
    return { isApproved: true, feedback: "" };
  } else {
    return { isApproved: false, feedback: review };
  }
}

// Routing Logic
function routeAfterQA(state: typeof CompanyState.State) {
  if (state.isApproved) return END;
  return "Engineer";
}

// Build Graph
const workflow = new StateGraph(CompanyState)
  .addNode("ProductManager", productManagerNode)
  .addNode("Engineer", engineerNode)
  .addNode("QAReviewer", qaReviewerNode)
  .addEdge(START, "ProductManager")
  .addEdge("ProductManager", "Engineer")
  .addEdge("Engineer", "QAReviewer")
  .addConditionalEdges("QAReviewer", routeAfterQA);

export const companyApp = workflow.compile();
