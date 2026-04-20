import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

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
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Design a high-level "Invasion Blueprint" for a digital empire in the niche: "${userNiche}". 
    The goal is to dominate through SEO silos, programmatic content, and high-convert affilate funnels.
    Be extremely specific about the "Market Gap" and "Phase Objectives".`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          niche: { type: Type.STRING },
          strategyName: { type: Type.STRING },
          marketGapFound: { type: Type.STRING },
          structuralIntegrityScore: { type: Type.NUMBER },
          phases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                objective: { type: Type.STRING },
                targetKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                monetizationAngle: { type: Type.STRING },
                aiResourceAllocation: { type: Type.STRING }
              },
              required: ["name", "objective", "targetKeywords"]
            }
          }
        },
        required: ["niche", "strategyName", "phases", "marketGapFound"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Blueprint Parser Error:", e);
    throw new Error("Failed to synthesize strategic blueprint.");
  }
};
