import dotenv from "dotenv";

dotenv.config();

export type AIResponse = { content: string; reasoning?: string };

export async function generateAIText(prompt: string, agentName: string = "System"): Promise<AIResponse> {
  try {
    const ollamaUrl = process.env.OLLAMA_API_URL || "http://ollama:11434/api/chat";
    const ollamaModel = process.env.OLLAMA_MODEL || "qwen2.5:7b";

    console.log(`[Intelligence] Requesting text from local Ollama (${ollamaModel}). Agent: ${agentName}`);

    const response = await fetch(ollamaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: "system", content: `You are NicheFlow ${agentName} Agent. Return strictly valid JSON.` },
          { role: "user", content: prompt }
        ],
        stream: false,
        format: "json"
      })
    });

    if (!response.ok) {
        throw new Error(`Ollama HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { content: data.message.content || "" };
  } catch (e: any) {
    console.error(`[Intelligence] Ollama connection failed. Error: ${e.message}`);
    throw new Error("Local AI cluster offline or unreachable. Ensure Ollama is running.");
  }
}
