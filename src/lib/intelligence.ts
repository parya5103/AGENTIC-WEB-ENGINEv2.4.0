export interface InvasionBlueprint {
  niche: string;
  strategyName: string;
  phases: Array<{
    name: string;
    objective: string;
    targetKeywords: string[];
    monetizationAngle: string;
    aiResourceAllocation: string;
  }>;
  structuralIntegrityScore: number;
  marketGapFound: string;
}

export const orchestrateStrategicPlan = async (userNiche: string): Promise<InvasionBlueprint> => {
  // Hardcoding local defaults since this runs in the browser and Vite handles env variables
  // using import.meta.env, which TS might complain about if types aren't set up perfectly.
  // Ideally, these would be injected or read from a configuration object.
  const ollamaUrl = "http://localhost:11434/api/chat";
  const ollamaModel = "qwen2.5:7b";

  const prompt = `Design a high-level "Invasion Blueprint" for a digital empire in the niche: "${userNiche}".
    The goal is to dominate through SEO silos, programmatic content, and high-convert affilate funnels.
    Be extremely specific about the "Market Gap" and "Phase Objectives".

    Return STRICT JSON ONLY, matching this structure:
    {
      "niche": "string",
      "strategyName": "string",
      "marketGapFound": "string",
      "structuralIntegrityScore": 0,
      "phases": [
        {
          "name": "string",
          "objective": "string",
          "targetKeywords": ["string"],
          "monetizationAngle": "string",
          "aiResourceAllocation": "string"
        }
      ]
    }`;

  try {
    const response = await fetch(ollamaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: "system", content: "You are NicheFlow Strategic Planner. Return strictly valid JSON." },
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
    return JSON.parse(data.message.content || "{}");
  } catch (e) {
    console.error("Blueprint Parser Error:", e);
    throw new Error("Failed to synthesize strategic blueprint from local Ollama instance.");
  }
};
