import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

let genAIInstance: GoogleGenerativeAI | null = null;
let qwenInstance: OpenAI | null = null;
let nvidiaInstance: OpenAI | null = null;

export function getNVIDIA() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey || apiKey.length < 10) return null;
  if (!nvidiaInstance) {
    const baseURL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
    nvidiaInstance = new OpenAI({
      apiKey,
      baseURL
    });
  }
  return nvidiaInstance;
}

export function getQwen() {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey || apiKey.length < 10) return null;
  if (!qwenInstance) {
    let baseURL = process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
    
    // Normalize baseURL: strip trailing slashes and common path suffixes that the SDK appends
    baseURL = baseURL.replace(/\/+$/, "");
    if (baseURL.endsWith("/chat/completions")) {
      baseURL = baseURL.replace(/\/chat\/completions$/, "");
    }

    // Ensure /api/v1 for OpenRouter if missing
    if (baseURL.includes("openrouter.ai") && !baseURL.includes("/api/v1")) {
      baseURL += "/api/v1";
    }

    process.env.QWEN_BASE_URL = baseURL; // Sync for other checks
    console.log(`[Intelligence] Initializing Qwen with baseURL: ${baseURL}`);

    qwenInstance = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: baseURL.includes("openrouter.ai") ? {
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "NicheFlow AI"
      } : {}
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

export type AIResponse = { content: string; reasoning?: string };

export async function generateAIText(prompt: string, agentName: string = "System"): Promise<AIResponse> {
  const qwen = getQwen();
  const gemini = getGenAI();
  let lastError: any = null;

  const qwenBaseUrl = process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const isOpenRouter = qwenBaseUrl.includes("openrouter.ai");
  const qwenModel = isOpenRouter ? "qwen/qwen-2.5-coder-32b-instruct" : "qwen2.5-coder-32b-instruct";
  const nvidia = getNVIDIA();

  const strategies = [
    {
      name: "Ollama",
      execute: async (): Promise<AIResponse | null> => {
        try {
          const ollamaUrl = process.env.OLLAMA_API_URL || "http://ollama:11434/api/chat";
          const ollamaModel = process.env.OLLAMA_MODEL || "qwen2.5:7b";
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
          if (!response.ok) return null;
          const data = await response.json();
          return { content: data.message.content || "" };
        } catch (e: any) {
          console.log(`[Intelligence] Ollama connection failed. Fallback triggered.`);
          return null;
        }
      },
      handleError: () => {}
    },

    {
      name: "NVIDIA Nemotron",
      execute: async (): Promise<AIResponse | null> => {
        if (!nvidia) return null;
        try {
          const completion = await nvidia.chat.completions.create({
            model: "nvidia/nemotron-3-super-120b-a12b",
            messages: [
              { role: "system", content: `You are NicheFlow ${agentName} Agent. Return strictly valid JSON. Express your underlying logic in reasoning_content.` },
              { role: "user", content: prompt }
            ],
            temperature: 1,
            top_p: 0.95,
            max_tokens: 16384,
            // @ts-ignore - NVIDIA specific parameters
            extra_body: {
              chat_template_kwargs: { enable_thinking: true },
              reasoning_budget: 16384
            },
            response_format: { type: "json_object" }
          });

          const message = completion.choices[0].message;
          const reasoning = (message as any).reasoning_content;
          
          if (reasoning) {
            console.log(`[NVIDIA-THOUGHTS] ${agentName}: ${reasoning.substring(0, 200)}...`);
          }

          return { content: message.content || "", reasoning };
        } catch (e: any) {
          console.error(`[Intelligence] NVIDIA Strategy failed: ${e.message}`);
          return null;
        }
      },
      handleError: (e: any) => {
        console.warn(`[Intelligence] NVIDIA fallback triggered.`);
      }
    },
    {
      name: "Qwen",
      execute: async (): Promise<AIResponse | null> => {
        if (!qwen || Date.now() < qwenBlockedUntil) return null;
        try {
          const completion = await qwen.chat.completions.create({
            model: qwenModel,
            messages: [
              { role: "system", content: `You are NicheFlow ${agentName} Agent. Return strictly valid JSON.` },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
          }, { timeout: 30000 });
          return { content: completion.choices[0].message.content || "" };
        } catch (e: any) {
          const isHtml = e.message?.includes("<!DOCTYPE html>");
          const is404 = e.message?.includes("404") || e.status === 404;
          
          if (isHtml || is404) {
            console.error(`[Intelligence] Qwen Strategy failed (Model: ${qwenModel}, URL: ${process.env.QWEN_BASE_URL}). ${is404 ? "Received 404 Not Found." : "Received HTML instead of JSON."}`);
            return null;
          }
          throw e;
        }
      },
      handleError: (e: any) => {
        if (e.message?.includes("429") || e.message?.includes("quota") || e.message?.includes("limit")) {
          qwenBlockedUntil = Date.now() + (2 * 60 * 1000);
        }
      }
    },
    {
      name: "Gemini",
      execute: async (): Promise<AIResponse | null> => {
        if (!gemini || Date.now() < geminiBlockedUntil) return null;
        const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
        const res = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        });
        return { content: res.response.text() };
      },
      handleError: (e: any) => {
        if (e.message?.includes("429") || e.message?.includes("Quota")) {
          geminiBlockedUntil = Date.now() + (1 * 60 * 1000);
        }
      }
    },
    {
      name: "Pollinations (Deep Fallback)",
      execute: async (): Promise<AIResponse | null> => {
        const encodedPrompt = encodeURIComponent(`Return STRICT JSON for: ${prompt}. Category: ${agentName}`);
        const url = `https://text.pollinations.ai/${encodedPrompt}?json=true&model=openai&system=You+are+a+specialized+niche+research+API.`;
        
        const response = await fetch(url);
        if (!response.ok) return null;
        
        let text = await response.text();
        text = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
        return { content: text };
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
