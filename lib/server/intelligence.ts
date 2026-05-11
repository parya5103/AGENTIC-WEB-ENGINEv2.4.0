import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

let genAIInstance: GoogleGenerativeAI | null = null;
let qwenInstance: OpenAI | null = null;

export function getQwen() {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey || apiKey.length < 10) return null;
  if (!qwenInstance) {
    qwenInstance = new OpenAI({
      apiKey,
      baseURL: process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1"
    });
  }
  return qwenInstance;
}

export function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.length < 10 || apiKey === "MY_GEMINI_API_KEY") return null;
  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
}

let geminiBlockedUntil = 0;
let qwenBlockedUntil = 0;

export async function generateAIText(prompt: string, agentName: string = "System") {
  const qwen = getQwen();
  const gemini = getGenAI();
  let lastError: any = null;

  const strategies = [
    {
      name: "Qwen",
      execute: async () => {
        if (!qwen || Date.now() < qwenBlockedUntil) return null;
        const completion = await qwen.chat.completions.create({
          model: "qwen-2.5-coder-32b-instruct", // Optimized for coding and system architecture
          messages: [
            { role: "system", content: "You are a world-class AI agent and system architect. Return strictly valid JSON." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        });
        return completion.choices[0].message.content;
      },
      handleError: (e: any) => {
        if (e.message?.includes("429") || e.message?.includes("quota")) {
          qwenBlockedUntil = Date.now() + (5 * 60 * 1000);
        }
      }
    },
    {
      name: "Gemini",
      execute: async () => {
        if (!gemini || Date.now() < geminiBlockedUntil) return null;
        const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
        const res = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        });
        return res.response.text();
      },
      handleError: (e: any) => {
        if (e.message?.includes("429") || e.message?.includes("Quota")) {
          geminiBlockedUntil = Date.now() + (5 * 60 * 1000);
        }
      }
    },
    {
      name: "Pollinations (Deep Fallback)",
      execute: async () => {
        // Truly free, no-key fallback for basic structured data
        const encodedPrompt = encodeURIComponent(`Return STRICT JSON for: ${prompt}`);
        const url = `https://text.pollinations.ai/${encodedPrompt}?json=true&model=openai&system=You+are+a+JSON+API+generator.`;
        
        const response = await fetch(url);
        if (!response.ok) return null;
        
        let text = await response.text();
        // Clean markdown if present
        text = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
        return text;
      },
      handleError: () => {}
    }
  ];

  for (const strategy of strategies) {
    try {
      const result = await strategy.execute();
      if (result) return result;
    } catch (e: any) {
      lastError = e;
      strategy.handleError(e);
    }
  }

  throw lastError || new Error("All AI clusters offline.");
}
