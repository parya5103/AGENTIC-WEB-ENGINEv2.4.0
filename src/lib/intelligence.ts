import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

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
  const model = ai.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          niche: { type: SchemaType.STRING },
          strategyName: { type: SchemaType.STRING },
          marketGapFound: { type: SchemaType.STRING },
          structuralIntegrityScore: { type: SchemaType.NUMBER },
          phases: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                objective: { type: SchemaType.STRING },
                targetKeywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                monetizationAngle: { type: SchemaType.STRING },
                aiResourceAllocation: { type: SchemaType.STRING }
              },
              required: ["name", "objective", "targetKeywords"]
            }
          }
        },
        required: ["niche", "strategyName", "phases", "marketGapFound"]
      }
    }
  });

  const response = await model.generateContent(`Design a high-level "Invasion Blueprint" for a digital empire in the niche: "${userNiche}". 
    The goal is to dominate through SEO silos, programmatic content, and high-convert affilate funnels.
    Be extremely specific about the "Market Gap" and "Phase Objectives".`);

  try {
    return JSON.parse(response.response.text());
  } catch (e) {
    console.error("Blueprint Parser Error:", e);
    throw new Error("Failed to synthesize strategic blueprint.");
  }
};
