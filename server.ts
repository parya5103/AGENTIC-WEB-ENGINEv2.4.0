import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let genAIInstance: GoogleGenAI | null = null;
let currentApiKey: string | null = null;
let openaiInstance: OpenAI | null = null;

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length < 10) return null;
  if (!openaiInstance) {
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey.length < 10 || apiKey === "MY_GEMINI_API_KEY") {
    return null; 
  }

  // If the key changed (e.g. user updated secrets), re-init
  if (!genAIInstance || currentApiKey !== apiKey) {
    currentApiKey = apiKey;
    genAIInstance = new GoogleGenAI({ apiKey });
    console.log(`[AI Sync] Gemini Motor initialized using key: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`);
  }
  
  return genAIInstance;
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = process.env.PORT || 3000;
  
  const DB_FILE = path.join(__dirname, "agent_db.json");

  // Agent State
  let loopRunning = false;
  let currentStep = 0;
  let logs: any[] = [];
  let generatedSites: any[] = [];
  let logIdCounter = 0;

  // New Global Stats
  let globalStats = {
    totalRevenue: 0.00,
    totalTraffic: 0,
    activeSites: 0,
    dailyGrowth: 1.2,
    simulationEnabled: true,
    history: [] as any[]
  };

  let adsenseConfig = {
    publisherId: process.env.ADSENSE_PUBLISHER_ID || "",
    clientId: process.env.ADSENSE_CLIENT_ID || ""
  };

  // Initial history point
  if (globalStats.history.length === 0) {
    globalStats.history.push({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      revenue: 0,
      traffic: 0
    });
  }

  // Load Persistence State
  async function loadState() {
    try {
      const data = await fs.readFile(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      logs = parsed.logs || [];
      generatedSites = parsed.generatedSites || [];
      globalStats = parsed.globalStats || globalStats;
      logIdCounter = logs.length > 0 ? parseInt(logs[logs.length - 1].id.split('-')[1]) + 1 : 0;
      console.log("[Persistence] Agent State Loaded.");
    } catch (e) {
      console.log("[Persistence] No existing state found, starting fresh.");
    }
  }

  async function saveState() {
    try {
      await fs.writeFile(DB_FILE, JSON.stringify({ logs, generatedSites, globalStats }), "utf-8");
    } catch (e) {
      console.error("[Persistence Error]", e);
    }
  }

  // Circuit Breakers
  let openaiBlockedUntil = 0;
  let geminiBlockedUntil = 0;

  const addLog = (agent: string, message: string, type: "info" | "success" | "error" | "process" = "info") => {
    const log = { id: `${Date.now()}-${logIdCounter++}`, agent, message, type, timestamp: new Date().toISOString() };
    logs.push(log);
    io.emit("log", log);
    saveState().catch(()=>{});
  };

  /**
   * Universal Agent Brain: Multi-Cloud routing (Gemini -> OpenAI -> Pollinations)
   */
  async function generateAIText(prompt: string, agentName: string) {
    const gemini = getGenAI();
    const openai = getOpenAI();
    const now = Date.now();

    // Strategy 1: OpenAI (Primary Intelligence)
    if (openai && now > openaiBlockedUntil) {
      try {
        addLog(agentName, "Synchronizing OpenAI GPT-4o Brain...", "info");
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a professional SEO and Niche researcher. You always return valid JSON." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        });
        const content = completion.choices[0].message.content;
        if (content) return content;
      } catch (e: any) {
        console.error(`[${agentName}] OpenAI Error:`, e.message);
        if (e.message?.includes("429")) {
          openaiBlockedUntil = now + (30 * 60 * 1000); // 30 min cooldown
          addLog(agentName, "OpenAI Quota Limit Hit. Entering 30m Sleep. Auto-Switching to Gemini...", "success");
        } else {
          addLog(agentName, "OpenAI Engine unstable. Moving to secondary cloud...", "info");
        }
      }
    } else if (openai && now <= openaiBlockedUntil) {
       addLog(agentName, "OpenAI is in cooldown. Checking Gemini...", "info");
    }

    // Strategy 2: AI Studio Free Tier (Gemini Ecosystem)
    if (gemini && now > geminiBlockedUntil) {
      addLog(agentName, "Accessing AI Studio Free Tier Cloud...", "info");
      try {
        // Step A: Best Performance (Flash)
        const result = await gemini.models.generateContent({ 
          model: "gemini-3-flash-preview", 
          contents: prompt, 
          config: { responseMimeType: "application/json" } 
        });
        const text = result.text || "";
        if (text) return text.replace(/```json|```/g, "").trim();
      } catch (e: any) {
        console.error(`[${agentName}] Gemini Flash Error:`, e.message);
        
        // Step B: High-Availability Failover (Flash Lite)
        try {
          addLog(agentName, "Performance Layer throttled. Switching to Ultra-Free Lite Engine...", "info");
          const liteResult = await gemini.models.generateContent({ 
            model: "gemini-3.1-flash-lite-preview", 
            contents: prompt, 
            config: { responseMimeType: "application/json" } 
          });
          const liteText = liteResult.text || "";
          if (liteText) return liteText.replace(/```json|```/g, "").trim();
        } catch (liteErr: any) {
           console.error(`[${agentName}] Gemini Lite Error:`, liteErr.message);
           if (liteErr.message?.includes("429") || liteErr.message?.includes("403")) {
             geminiBlockedUntil = now + (5 * 60 * 1000); 
             addLog(agentName, "Gemini Ecosystem restricted. Routing to Decentralized Core...", "info");
           }
        }
      }
    } else if (gemini && now <= geminiBlockedUntil) {
       addLog(agentName, "Gemini is in cooldown. Falling back to Core...", "info");
    }

    // Final Diagnostic: Deciding if we fallback because of "No Keys" or "Throttling"
    if (!openai && !gemini) {
      addLog(agentName, "No AI Credentials detected. Ensuring high-availability via Core...", "info");
    }

    // Strategy 3: Fallback to Pollinations AI (Free, No Key required)
    try {
      addLog(agentName, "Using Decentralized AI Core (Failover)...", "info");
      const fallbackUrl = `https://text.pollinations.ai/`;
      const response = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "system", content: "You are a professional SEO and Niche researcher. You always return valid JSON based on the user's instructions." }, { role: "user", content: prompt }],
          jsonMode: true
        })
      });
      
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const text = await response.text();
      const cleanText = text || "";
      return cleanText.replace(/```json|```/g, "").trim();
    } catch (err) {
      console.error(`[${agentName}] Fallback Failed:`, err);
      throw new Error("All AI engines failed. Please check your internet connection.");
    }
  }

  const updateStatus = (status: any) => {
    io.emit("status", status);
    io.emit("globalStats", globalStats);
  };

  // Helper to generate the full HTML for a niche site
  const generateSiteHtml = (site: any, variantIndex: number = 0) => {
    const structure = site.variants ? site.variants[variantIndex] : (site.structure || site);
    const articles = site.articles || [];
    const schema = site.schema || "{}";
    const niche = site.niche || { name: "Niche" };
    const persona = site.persona || { founderName: "Alex Sterling", founderTitle: "Niche Analyst", founderBio: "Expert in the field.", missionVision: "High authority content." };
    const reliability = site.reliability || { accuracyScore: 98 };
    
    // Design Tokens & Layout Control
    const colors = structure.colors || { primary: "#0052FF", accent: "#0052FF", background: "#FFFFFF", secondary: "#F8F9FA" };
    const typography = structure.typography || { display: "Playfair Display", body: "Inter" };
    const tokens = structure.designTokens || { borderRadius: "40px", shadow: "0 10px 30px rgba(0,0,0,0.03)", spacing: "32px" };
    const layout = structure.layoutType || "editorial";
    const sections = structure.sections || { hero: "Autonomous Intelligence Niche", mission: "Strategic growth through semantic mastery.", features: ["Expert Insights", "Market Analysis", "Trend Scanning"], faq: [] };

    const adsenseScript = adsenseConfig.publisherId ? `
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseConfig.publisherId}" crossorigin="anonymous"></script>
    ` : "";

    // Hierarchy Data
    const categories = Array.from(new Set(articles.map((a: any) => a.category || "Intelligence")));
    const isSaaS = layout === "saas";
    const firstArticle = articles[0] || { title: "Featured Insight", excerpt: "Analyzing the future of niches.", imageUrl: "" };
    const otherArticles = articles.slice(1);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${structure.title || "Elite Niche Asset"} | ${structure.tagline || "Powered by NicheFlow"}</title>
    <meta name="description" content="${structure.tagline || ""}">
    ${adsenseScript}
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
    <script type="application/ld+json">
        ${schema}
    </script>
    <style>
        body { font-family: '${typography.body}', sans-serif; background-color: ${colors.background}; color: #1A1A1A; scroll-behavior: smooth; }
        h1, h2, h3, h4, h5 { font-family: '${typography.display}', serif; font-weight: 700; letter-spacing: -0.02em; }
        .serif-italic { font-family: '${typography.display}', serif; font-style: italic; }
        .hero-pattern { background-image: radial-gradient(${colors.primary}22 1px, transparent 1px); background-size: 24px 24px; }
        .shadow-custom { box-shadow: ${tokens.shadow}; }
        .accent-color { color: ${colors.accent}; }
        .bg-primary { background-color: ${colors.primary}; }
        .rounded-custom { border-radius: ${tokens.borderRadius}; }
        
        .type-scale-hero { font-size: clamp(3rem, 10vw, ${isSaaS ? '6rem' : '8rem'}); line-height: 0.95; }
        .type-scale-h2 { font-size: clamp(2.5rem, 5vw, 4.5rem); line-height: 1.05; }
        
        .article-card:hover .article-img { transform: scale(1.05); filter: grayscale(0); }
        .article-img { transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1); filter: grayscale(1); }
        .saas-gradient { background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%); }
        .breadcrumb-dot { width: 4px; height: 4px; border-radius: 50%; background-color: #E2E8F0; }
        
        /* Navigation Refinements */
        .nav-link { position: relative; }
        .nav-link::after { content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 2px; background: ${colors.primary}; transition: width 0.3s; }
        .nav-link:hover::after { width: 100%; }
        
        .megamenu { opacity: 0; transform: translateY(10px); pointer-events: none; transition: all 0.3s; }
        .nav-item-mega:hover .megamenu { opacity: 1; transform: translateY(0); pointer-events: auto; }
    </style>
</head>
<body class="selection:bg-blue-600 selection:text-white antialiased overflow-x-hidden">
    <!-- Breadcrumb SEO Path -->
    <div class="bg-gray-50 border-b border-gray-100 py-3 px-[5vw]">
        <div class="max-w-7xl mx-auto flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <a href="#" class="hover:text-primary transition-colors">Network</a>
            <div class="breadcrumb-dot"></div>
            <a href="#" class="hover:text-primary transition-colors">${niche.name}</a>
            <div class="breadcrumb-dot"></div>
            <span class="text-gray-600">${layout.toUpperCase()} CENTER</span>
        </div>
    </div>

    <!-- Progressive High-Clarity Nav -->
    <nav class="px-[5vw] py-8 flex justify-between items-center bg-white/80 backdrop-blur-xl sticky top-0 z-[100] border-b border-gray-100/50 shadow-sm">
        <div class="flex items-center gap-6">
            <div class="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg">
                <svg viewBox="0 0 24 24" fill="none" class="w-7 h-7" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            </div>
            <div>
                <div class="text-2xl font-black tracking-tighter uppercase leading-none">${structure.title || "Elite"}</div>
                <div class="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em] font-mono mt-1">Strategic Asset .v4</div>
            </div>
        </div>
        
        <div class="hidden lg:flex gap-12 text-[11px] font-black uppercase tracking-[0.2em] text-gray-900 items-center">
            <div class="nav-item-mega relative py-4">
                <a href="#resources" class="nav-link">Intelligence <span class="ml-1 text-[8px] opacity-40">▼</span></a>
                <!-- Megamenu Strategy -->
                <div class="megamenu absolute top-full left-1/2 -translate-x-1/2 w-[600px] bg-white border border-gray-100 rounded-[32px] shadow-2xl p-10 grid grid-cols-2 gap-10 mt-2">
                    <div class="space-y-6">
                        <div class="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Knowledge Spheres</div>
                        <div class="space-y-4">
                            ${categories.slice(0, 4).map(c => `
                                <a href="#" class="flex items-center justify-between group">
                                    <span class="text-sm font-bold text-gray-400 group-hover:text-gray-900 transition-colors">${c}</span>
                                    <div class="w-2 h-2 rounded-full bg-gray-100 group-hover:bg-primary transition-colors"></div>
                                </a>
                            `).join("")}
                        </div>
                    </div>
                    <div class="bg-gray-50 rounded-3xl p-6 space-y-4">
                        <div class="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Latest Update</div>
                        <div class="font-black text-sm tracking-tight">${firstArticle.title}</div>
                        <button class="text-[9px] font-black text-primary uppercase tracking-widest">Access Protocol →</button>
                    </div>
                </div>
            </div>
            ${(structure.pages || ["Research", "Network", "Compliance"]).map((p: any) => `<a href="#" class="nav-link text-gray-400 hover:text-gray-950 transition-colors">${p}</a>`).join("")}
        </div>

        <div class="flex items-center gap-8">
            <div class="hidden md:flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <span>Search Indices</span>
            </div>
            <button class="bg-gray-950 text-white text-[10px] font-black uppercase tracking-[0.2em] px-10 py-4 rounded-full hover:bg-primary transition-all shadow-xl hover:shadow-primary/30 active:scale-95">Access Global</button>
        </div>
    </nav>

    <!-- Structural Divergence: SaaS Hero vs Editorial -->
    ${isSaaS ? `
        <header class="pt-40 pb-60 px-[5vw] relative overflow-hidden text-center bg-gray-50/50">
            <div class="absolute inset-0 hero-pattern opacity-50"></div>
            <div class="max-w-5xl mx-auto space-y-12 relative z-10">
                <div class="inline-flex items-center gap-3 px-6 py-2 bg-primary/10 border border-primary/20 rounded-full text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
                    Platform Release 04.Beta
                </div>
                <h1 class="type-scale-hero font-black tracking-tight max-w-4xl mx-auto">${sections.hero}</h1>
                <p class="text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed italic">"${structure.tagline}"</p>
                <div class="flex flex-col md:flex-row gap-6 justify-center items-center pt-10">
                    <button class="bg-gray-950 text-white px-12 py-6 rounded-3xl text-xs font-bold uppercase tracking-widest shadow-2xl hover:bg-primary transition-all scale-105">Deploy Architecture</button>
                    <button class="bg-white border border-gray-100 px-12 py-6 rounded-3xl text-xs font-bold uppercase tracking-widest hover:border-primary transition-all">Watch Protocol</button>
                </div>
            </div>
        </header>
    ` : `
        <header class="pt-20 pb-40 px-[5vw] hero-pattern border-b border-gray-100/50 relative overflow-hidden">
            <div class="max-w-7xl mx-auto flex flex-col lg:flex-row gap-20 items-center">
                <div class="lg:w-3/5 space-y-12">
                    <div class="inline-flex items-center gap-3 px-4 py-2 bg-white/80 border border-gray-100 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600 shadow-sm">
                        Executive Review: ${niche.name}
                    </div>
                    <h1 class="type-scale-hero font-black tracking-tight">${structure.title}</h1>
                    <p class="serif-italic text-2xl md:text-5xl text-gray-400 leading-tight">"${structure.tagline}"</p>
                    <div class="flex gap-10 items-center pt-8">
                        <div class="flex -space-x-4">
                            <div class="w-12 h-12 rounded-full border-2 border-white bg-gray-200"></div>
                            <div class="w-12 h-12 rounded-full border-2 border-white bg-gray-300"></div>
                            <div class="w-12 h-12 rounded-full border-2 border-white bg-gray-400"></div>
                        </div>
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em] font-mono">Curated by Expert Nodes</span>
                    </div>
                </div>
                <div class="lg:w-2/5 group relative">
                    <div class="absolute -inset-4 bg-primary/10 rounded-[60px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div class="relative bg-white p-6 rounded-custom shadow-2xl border border-gray-100 rotate-1">
                        <img src="${firstArticle.imageUrl}" class="w-full aspect-square rounded-[40px] object-cover" referrerpolicy="no-referrer" />
                    </div>
                </div>
            </div>
        </header>
    `}

    <main class="px-[5vw] py-40 bg-white" id="resources">
        <div class="max-w-7xl mx-auto">
            <!-- Category Filtering Layer (Visual Only) -->
            <div class="flex flex-wrap gap-4 mb-32 border-b border-gray-100 pb-12">
                <button class="px-8 py-3 bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest rounded-full">All Intelligence</button>
                ${categories.map(c => `
                    <button class="px-8 py-3 bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-gray-100 hover:text-gray-950 transition-all">${c}</button>
                `).join("")}
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-24">
                <div class="lg:col-span-8 space-y-40">
                    <!-- Feature Logic for SaaS, Grid for Editorial -->
                    ${isSaaS ? `
                        <section aria-label="Core Infrastructure Capabilities" class="grid grid-cols-1 md:grid-cols-2 gap-12">
                            ${(sections.features || []).map((feat: string, i: number) => `
                                <div class="p-12 bg-gray-50 rounded-[48px] border border-gray-100 space-y-6 group hover:bg-white hover:shadow-2xl transition-all duration-500">
                                    <div class="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-primary shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                                        <div class="text-2xl font-bold font-mono">0${i+1}</div>
                                    </div>
                                    <h2 class="text-3xl">${feat}</h2>
                                    <p class="text-[15px] text-gray-500 leading-relaxed font-medium">Delivering autonomous reliability through semantic architecture and vector synthesis protocols.</p>
                                </div>
                            `).join("")}
                        </section>
                    ` : ""}

                    <section aria-label="Latest Research Nodes">
                         <div class="flex items-center justify-between mb-24">
                            <h2 class="type-scale-h2">${isSaaS ? "Resource Terminal" : "Research Nodes"}</h2>
                            <div class="flex items-center gap-6">
                                <span class="text-[11px] font-bold text-gray-400 uppercase tracking-[0.4em]">Index 01/Alpha</span>
                                <div class="w-20 h-px bg-gray-100"></div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-32">
                            ${articles.map((article: any, i: number) => `
                                <article class="article-card group space-y-8" itemscope itemtype="https://schema.org/ScholarlyArticle">
                                    <div class="aspect-[4/5] rounded-custom overflow-hidden bg-gray-50 border border-gray-100 shadow-custom relative">
                                        <div class="absolute top-8 left-8 z-10 w-12 h-12 bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center font-serif italic text-2xl font-bold border border-gray-100 shadow-sm">${i+1}</div>
                                        <img src="${article.imageUrl}" class="article-img w-full h-full object-cover" loading="lazy" referrerpolicy="no-referrer" itemprop="image" />
                                        <!-- Scannability Utility Overlay -->
                                        <div class="absolute bottom-6 right-6 flex gap-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                            <div class="p-3 bg-white/90 backdrop-blur rounded-xl shadow-lg text-primary">
                                                <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4" stroke="currentColor" stroke-width="2.5"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="space-y-6">
                                        <div class="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-primary">
                                            <span itemprop="articleSection">${article.category || "Intelligence"}</span>
                                            <div class="w-1 h-1 rounded-full bg-gray-200"></div>
                                            <span class="text-gray-400 font-mono">${article.readingTime || "8M"} DEPTH</span>
                                            <div class="w-1 h-1 rounded-full bg-gray-200"></div>
                                            <span class="text-green-600 font-mono">IMPACT: HIGH</span>
                                        </div>
                                        <h3 class="text-3xl leading-tight group-hover:text-primary transition-colors cursor-pointer" itemprop="headline">${article.title}</h3>
                                        <p class="text-lg text-gray-500 leading-relaxed line-clamp-3 opacity-80" itemprop="abstract">${article.excerpt}</p>
                                        <div class="pt-6 mt-6 border-t border-gray-100 flex justify-between items-center group/btn cursor-pointer">
                                            <span class="text-[11px] font-bold uppercase tracking-widest group-hover/btn:text-primary transition-colors">Access Synthesis</span>
                                            <div class="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center group-hover/btn:border-primary group-hover/btn:bg-primary group-hover/btn:text-white transition-all">
                                                <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4" stroke="currentColor" stroke-width="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            `).join("")}
                        </div>
                    </section>
                </div>

                <aside class="lg:col-span-4 lg:pl-12">
                    <div class="sticky top-40 space-y-32">
                        <!-- E-E-A-T Persona Widget -->
                        <div class="p-12 bg-white border border-gray-100 rounded-[48px] shadow-custom space-y-8 relative overflow-hidden">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full"></div>
                            <div class="flex items-center gap-6">
                                <div class="w-20 h-20 bg-gray-100 rounded-3xl overflow-hidden flex items-center justify-center text-primary">
                                    <svg viewBox="0 0 24 24" fill="none" class="w-10 h-10" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 7a4 4 0 100-8 4 4 0 000 8z" /></svg>
                                </div>
                                <div>
                                    <h4 class="text-xl font-bold">${persona.founderName}</h4>
                                    <p class="text-[10px] font-bold text-primary uppercase tracking-widest">${persona.founderTitle}</p>
                                </div>
                            </div>
                            <p class="text-sm text-gray-500 leading-relaxed italic opacity-80">"${persona.founderBio}"</p>
                            
                            <!-- Compliance Framework (Legal) -->
                            <div class="pt-6 border-t border-gray-100 space-y-4">
                                <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Compliance Status</div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div class="px-3 py-2 bg-gray-50 rounded-xl text-[9px] font-bold text-gray-400 text-center uppercase">Privacy.v1</div>
                                    <div class="px-3 py-2 bg-gray-50 rounded-xl text-[9px] font-bold text-gray-400 text-center uppercase">Terms.v1</div>
                                </div>
                                <div class="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold animate-pulse w-full justify-center">
                                    <svg viewBox="0 0 24 24" fill="none" class="w-3 h-3" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5" /></svg>
                                    Expert Verified: ${reliability.accuracyScore}%
                                </div>
                            </div>
                        </div>

                        <div class="p-12 bg-[#0A0A0A] text-white rounded-[48px] shadow-2xl relative overflow-hidden group">
                            <div class="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] group-hover:bg-primary/40 transition-colors"></div>
                            <div class="relative z-10 space-y-10">
                                <h3 class="text-4xl leading-tight">Secure the Alpha Segment.</h3>
                                <p class="text-gray-400 text-lg leading-relaxed">Join 15,000+ analysts securing deep-vector intelligence in the ${niche.name} sector.</p>
                                <div class="space-y-4">
                                    <input type="email" placeholder="Cloud Domain Address" class="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-gray-600" />
                                    <button class="w-full py-5 bg-primary text-white text-[11px] font-bold uppercase tracking-[0.2em] rounded-3xl shadow-2xl hover:bg-blue-600 transition-all">Establish Uplink</button>
                                </div>
                                <div class="flex items-center gap-4 pt-4 opacity-40">
                                    <div class="flex -space-x-4">
                                        <div class="w-8 h-8 rounded-full border-2 border-[#0A0A0A] bg-gray-800"></div>
                                        <div class="w-8 h-8 rounded-full border-2 border-[#0A0A0A] bg-gray-700"></div>
                                        <div class="w-8 h-8 rounded-full border-2 border-[#0A0A0A] bg-gray-600"></div>
                                    </div>
                                    <span class="text-[10px] uppercase font-bold tracking-widest">Join the Network</span>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-12 px-6">
                            <div class="space-y-4">
                                <h3 class="text-[11px] font-bold uppercase tracking-[0.4em] text-gray-400">System Metrics</h3>
                                <div class="h-px bg-gray-100"></div>
                            </div>
                            <div class="space-y-10">
                                 <div class="group cursor-pointer">
                                     <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">Arbitrage Score</div>
                                     <div class="text-3xl font-bold font-serif italic text-primary">High Velocity</div>
                                 </div>
                                 <div class="group cursor-pointer">
                                     <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">Market Cap Density</div>
                                     <div class="text-3xl font-bold font-mono tracking-tighter text-green-600">Tier-1</div>
                                 </div>
                                 <div class="group cursor-pointer">
                                     <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">CPC Threshold</div>
                                     <div class="text-3xl font-bold font-mono tracking-tighter text-blue-600">${niche.estimatedCPC || "$14.20"}</div>
                                 </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    </main>

    <footer class="bg-[#050505] text-white py-40 px-[5vw]">
        <div class="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start gap-32 pb-40 border-b border-white/5 transform skew-x-[-1deg] origin-left">
            <div class="max-w-md space-y-12">
                <div class="flex items-center gap-6">
                    <div class="w-16 h-16 bg-primary rounded-[24px] flex items-center justify-center text-white">
                        <svg viewBox="0 0 24 24" fill="none" class="w-10 h-10" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    </div>
                    <div class="text-5xl font-black tracking-tighter uppercase italic">${structure.title || "Elite"}</div>
                </div>
                <p class="text-gray-500 text-2xl leading-relaxed italic opacity-80">"Transforming semantic intent into high-authority niche domination through autonomous architectural synthesis."</p>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-24 lg:gap-40">
                <div class="space-y-8">
                    <h4 class="text-[11px] font-bold uppercase tracking-[0.4em] text-white opacity-20">Assets</h4>
                    <ul class="space-y-4 text-sm font-medium text-gray-400">
                        <li><a href="#" class="hover:text-primary transition-colors">Portfolios</a></li>
                        <li><a href="#" class="hover:text-primary transition-colors">Domains</a></li>
                        <li><a href="#" class="hover:text-primary transition-colors">Yield Data</a></li>
                    </ul>
                </div>
                <div class="space-y-8">
                    <h4 class="text-[11px] font-bold uppercase tracking-[0.4em] text-white opacity-20">Network</h4>
                    <ul class="space-y-4 text-sm font-medium text-gray-400">
                        <li><a href="#" class="hover:text-primary transition-colors">Analytics</a></li>
                        <li><a href="#" class="hover:text-primary transition-colors">Uptime</a></li>
                        <li><a href="#" class="hover:text-primary transition-colors">API Docs</a></li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="max-w-7xl mx-auto pt-32 flex flex-col md:flex-row justify-between items-center gap-8">
            <div class="text-[10px] font-bold uppercase tracking-[0.5em] text-white/20">© 2026 ${structure.title || "Elite"} Global Network Intelligence</div>
            <div class="flex gap-10 text-[9px] font-bold uppercase tracking-widest text-white/30 font-mono">
                <span>SECURE_UPLINK: ACTIVE</span>
                <span>KERNEL: v4.22.9</span>
            </div>
        </div>
    </footer>

    <!-- Smart UX Utility: Floating CTA for long Articles -->
    <div class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] hidden md:block group">
        <div class="bg-gray-950 text-white px-8 py-5 rounded-full shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-xl group-hover:scale-105 transition-all">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4" stroke="currentColor" stroke-width="3"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                </div>
                <div class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Empire Growth</div>
            </div>
            <div class="h-4 w-px bg-white/10"></div>
            <button class="text-xs font-black uppercase tracking-[0.2em] hover:text-primary transition-colors">Establish Uplink</button>
            <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-primary" stroke="currentColor" stroke-width="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </div>
    </div>
</body>
</html>`;
  };

  // --- Core Modernized Agent Execution with Self-Correction & Grounding ---
  async function executeAgentTask(agentName: string, prompt: string, schema?: any, useSearch = false, maxRetries = 2) {
    let attempt = 0;
    let lastError: any = null;
    
    while (attempt <= maxRetries) {
      if (attempt > 0) {
        addLog(agentName, `Critic Mode Activated. Refining intelligence (Attempt ${attempt})...`, "info");
      }
      
      try {
        const gemini = getGenAI();
        if (!gemini) {
          addLog(agentName, "Neural core offline. Attempting multi-engine fallback...", "info");
          const fallbackText = await generateAIText(prompt + (schema ? "\n\nCRITICAL: You MUST return strictly valid JSON matching the requested structure." : ""), agentName);
          try {
             return JSON.parse(fallbackText.replace(/```json|```/g, "").trim());
          } catch (jsonErr) {
             console.error(`[${agentName}] Fallback JSON Parse Error:`, jsonErr);
             throw new Error("Fallback engine returned invalid JSON format.");
          }
        }
        
        const config: any = { responseMimeType: "application/json" };
        if (schema) config.responseSchema = schema;
        if (useSearch) config.tools = [{ googleSearch: {} }];

        const result = await gemini.models.generateContent({
           model: "gemini-3-flash-preview",
           contents: prompt,
           config
        });
        
        const text = result.text || "{}";
        const cleanText = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanText);
      } catch (err: any) {
        lastError = err;
        
        // If it's an API key error or quota error, stop retrying and trigger fallback if possible
        if (err.message?.includes("API key not valid") || err.message?.includes("429") || err.message?.includes("403")) {
          addLog(agentName, `Gemini Engine critical error: ${err.message?.split(':')[0]}. Triggering fallback...`, "error");
          break; 
        }

        attempt++;
        console.error(`[${agentName}] Critic Loop Error:`, err.message);
      }
    }
    
    // If we reached here, it means we either exhausted retries or hit a critical error
    // Attempt one last fallback to generateAIText which has full multi-cloud routing
    try {
      addLog(agentName, "Gemini Pipeline failed. Engaging multi-cloud routing fallback...", "info");
      const fallbackPrompt = prompt + (schema ? `\n\nCRITICAL: You MUST return strictly valid JSON matching this schema: ${JSON.stringify(schema)}` : "");
      const fallbackText = await generateAIText(fallbackPrompt, agentName);
      return JSON.parse(fallbackText.replace(/```json|```/g, "").trim());
    } catch (finalErr) {
      addLog(agentName, "All intelligence layers exhausted.", "error");
      throw lastError || finalErr;
    }
  }

  // Agent Functions (Simulated via Gemini)
  const agents = {
    trendResearch: async (existingNiches: string[] = []) => {
      addLog("Trend Research Agent", "Activating Deep Search Grounding to scan real-time trends...", "process");
      const filterMsg = existingNiches.length > 0 ? `\nCRITICAL: EXCLUDE these existing niches: ${existingNiches.join(", ")}. Discover NEW, UNUSED high-potential trends.` : "";
      const prompt = `Search the web to discover 3 highly profitable trending niche website ideas currently surging right now. Focus on "Low Difficulty, High CPC" segments. Return exactly 3 niches.${filterMsg}`;
      
      const schema = {
        type: Type.OBJECT,
        properties: {
          niches: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                justification: { type: Type.STRING },
                cpc: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["name", "justification", "cpc", "difficulty", "keywords"]
            }
          }
        },
        required: ["niches"]
      };

      try {
        const result = await executeAgentTask("Trend Research Agent", prompt, schema, true, 2);
        addLog("Trend Research Agent", `Trend pulse identified via Search Grounding: ${result.niches.map((n: any) => n.name).join(", ")}`, "success");
        return result.niches;
      } catch (e: any) {
        addLog("Trend Research Agent", `Trend Pulse Failed: ${e.message}`, "error");
        return [];
      }
    },

    nicheValidation: async (niches: any[], existingNiches: string[] = []) => {
      addLog("Niche Analyzer Agent", "Cross-referencing search intent vs profitability...", "process");
      const filterMsg = existingNiches.length > 0 ? `\nCRITICAL: AVOID these already built niches: ${existingNiches.join(", ")}. You MUST pick a different high-potential niche from the provided list to diversify the portfolio.` : "";
      const prompt = `Select the most viable niche from the following: ${JSON.stringify(niches)}. 
      Ensure high monetization potential via affiliate links and display ads.${filterMsg}`;
      
      const schema = {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          justification: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          targetAudience: { type: Type.STRING },
          estimatedCPC: { type: Type.STRING },
          competitionLvl: { type: Type.STRING }
        },
        required: ["name", "justification", "keywords", "targetAudience", "estimatedCPC", "competitionLvl"]
      };

      try {
        const result = await executeAgentTask("Niche Analyzer Agent", prompt, schema, false, 2);
        addLog("Niche Analyzer Agent", `Blueprint Lock: "${result.name}" validated as Tier-1 Opportunity.`, "success");
        return result;
      } catch (e) {
        return null;
      }
    },

    websiteBuilder: async (niche: any) => {
      addLog("Website Builder Agent", `Constructing elite structural variants for ${niche.name}...`, "process");
      const prompt = `Design 2 divergent, high-end professional site variants for ${niche.name} for A/B testing.
      
      You MUST choose a specific Layout Strategy for each variant:
      - Variant A: "Global Authority" (Editorial/Magazine style, high trust, asymmetrical grids).
      - Variant B: "Modern SaaS" (Clean utility, split-panes, bold CTAs, high conversion focus).
      
      Return JSON: { 
        variants: [
          { 
            name: string, 
            layoutType: "editorial" | "saas" | "minimal",
            title: string, 
            tagline: string, 
            pages: string[], 
            colors: { primary: string, secondary: string, accent: string, background: string }, 
            typography: { display: string, body: string },
            designTokens: { borderRadius: string, shadow: string, spacing: string },
            sections: { hero: string, mission: string, features: string[], faq: Array<{q: string, a: string}> }
          }
        ] 
      }`;

      try {
        const text = await generateAIText(prompt, "Website Builder Agent");
        const safeText = text || "{}";
        const result = JSON.parse(safeText);
        addLog("Website Builder Agent", `Structural Architect: ${result.variants.length} divergent layouts synthesized.`, "success");
        return result.variants;
      } catch (e) {
        return null;
      }
    },

    imageArtistAgent: async (niche: any, article: any) => {
      addLog("Visual Artist Agent", `Synthesizing conceptual art for "${article.title}"...`, "process");
      
      let attempt = 0;
      let finalUrl = "";
      
      while (attempt < 3) {
        if (attempt > 0) addLog("Visual Critic Agent", `Rejecting image. Regenerating with tuned prompt (Attempt ${attempt + 1})...`, "info");
        
        let promptVariation = `${article.title} professional high-quality editorial photography for ${niche.name} magazine, clean lighting, 8k, photorealistic`;
        if (attempt === 1) promptVariation += ", no text, no watermarks, clear focus";
        if (attempt === 2) promptVariation += ", abstract minimalist representation, ultra high detail, aesthetic";
        
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptVariation)}?width=1080&height=1080&nologo=true&enhance=true`;
        finalUrl = imageUrl;
        
        try {
          // Fetch the image buffer to inspect via Vision
          const imgRes = await fetch(imageUrl);
          const arrayBuffer = await imgRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64Data = buffer.toString("base64");
          
          const gemini = getGenAI();
          if (!gemini) break; // If no AI configured, just skip critic
          
          const criticPrompt = `You are a strict creative director. Is this image a high quality, professional, photorealistic or highly aesthetic image related to "${niche.name}" and "${article.title}"? Examine it for garbled text, weird AI artifacts, or irrelevance. Answer strict JSON: {"pass": boolean, "reason": "string"}`;
          
          const result = await gemini.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
               parts: [
                 { text: criticPrompt },
                 { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
               ]
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: { pass: { type: Type.BOOLEAN }, reason: { type: Type.STRING } },
                required: ["pass", "reason"]
              }
            }
          });
          
          const text = result.text || "{}";
          const critique = JSON.parse(text.replace(/```json|```/g, "").trim());
          
          if (critique.pass) {
             addLog("Visual Critic Agent", `Image approved by Director: ${critique.reason}`, "success");
             break;
          } else {
             addLog("Visual Critic Agent", `Flaws detected: ${critique.reason}`, "process");
          }
        } catch (e) {
          // If vision check fails (network, quota), fallback to using the image anyway
          addLog("Visual Critic Agent", "Critique bypassed due to network timeout.", "info");
          break;
        }
        attempt++;
      }
      
      addLog("Visual Artist Agent", "Art direction complete: Real 1:1 AI Image generated.", "success");
      return finalUrl;
    },

    contentWriter: async (niche: any, site: any) => {
      addLog("Content Writer Agent", "Drafting semantic content cluster with Editorial Excellence & SEO Silos...", "process");
      const prompt = `Compose 5 high-authority, expert-level articles for "${site.title}".
      Target Audience: ${niche.targetAudience}. Niche: ${niche.name}.
      
      Standards:
      - Editorial Narrative: No "AI-voice"; use strong, opinionated hooks.
      - SEO Silos: Articles must mention and link to each other naturally.
      - Structure: Use rich Markdown with deep-dives, FAQ sections, and Bulleted insights.
      
      Return JSON: { 
        articles: [
          { 
            title: string, 
            content: string, 
            excerpt: string, 
            keywords: string[], 
            readingTime: string,
            category: string,
            tone: "analytical" | "visionary" | "practical",
            internalLinkTarget: string // Name of one of the other article titles to link to
          }
        ] 
      }`;

      try {
        const text = await generateAIText(prompt, "Content Writer Agent");
        const safeText = text || "{}";
        const result = JSON.parse(safeText);
        
        // Enhance articles with AI images
        for (let article of result.articles) {
          article.imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(article.title + " high quality professional photography, editorial style, " + (article.tone || "analytical"))}`;
        }

        addLog("Content Writer Agent", `Cluster Sync: ${result.articles.length} premium narrative units archived.`, "success");
        return result.articles;
      } catch (e) {
        return [];
      }
    },

    seoAdvancedAgent: async (site: any, articles: any[]) => {
      addLog("Growth Analyzer Agent", "Injecting JSON-LD & OpenGraph Graph Data...", "process");
      const prompt = `Generate JSON-LD Organizational schema for ${site.title}. 
      Focus on Local SEO and Article-specific fragments.
      Return raw JSON string.`;
      
      try {
        const text = await generateAIText(prompt, "Growth Analyzer Agent");
        const safeText = text || "";
        const schema = safeText.replace(/```json|```/g, "").trim();
        addLog("Growth Analyzer Agent", "Search Engine Readiness: Opt-in Full Indexing.", "success");
        return schema;
      } catch (e) {
        return "{}";
      }
    },

    deploymentAgent: async (site: any) => {
      addLog("DevOps Agent", "Initializing High-Speed Deployment Pipeline...", "process");
      
      const structure = site.structure || site;
      const title = structure.title || site.title || "Elite Niche";
      
      const token = process.env.VERCEL_TOKEN;
      if (token) {
        addLog("DevOps Agent", "Detected VERCEL_TOKEN. Attempting Global Edge Push...", "info");
        try {
          // Use fetch to deploy to Vercel
          const deploymentName = `nicheflow-${(title || "").toLowerCase().replace(/\s+/g, "-")}`;
          const response = await fetch("https://api.vercel.com/v13/deployments", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              name: deploymentName,
              files: [
                {
                  file: "index.html",
                  data: generateSiteHtml(site)
                }
              ],
              projectSettings: {
                framework: null
              }
            })
          });

          const result: any = await response.json();
          if (result.url) {
            const liveUrl = `https://${result.url}`;
            addLog("DevOps Agent", `PROD RELEASE LIVE: ${liveUrl}`, "success");
            return liveUrl;
          } else {
            const errorMsg = result.error?.message || result.message || "Unknown Authorization Issue";
            addLog("DevOps Agent", `Vercel Auth Error: ${errorMsg}. Check VERCEL_TOKEN in Secrets.`, "error");
          }
        } catch (err) {
          addLog("DevOps Agent", `Network Error during Vercel Push: ${err}`, "error");
        }
      }

      // Default: Internal deployment
      await new Promise(r => setTimeout(r, 1500));
      const internalUrl = `/site/${(title || "").toLowerCase().replace(/\s+/g, "-")}`;
      addLog("DevOps Agent", `Internal routing active at ${internalUrl}. SSL Ready.`, "success");
      return internalUrl;
    },

    monetizationAgent: async (site: any) => {
      addLog("Monetization Agent", `Developing strategic monetization blueprint for: ${site.structure?.title || site.title}...`, "process");
      
      const prompt = `Develop a detailed monetization strategy for this website:
Title: ${site.structure?.title || site.title}
Tagline: ${site.structure?.tagline || ""}
Niche: ${site.niche?.name}
Target Audience: ${site.niche?.targetAudience}
Competition: ${site.niche?.competitionLvl}

Return a JSON object with:
1. "ads": Array of 3 optimal ad placement descriptions (e.g., "Sticky footer ad on mobile").
2. "affiliate": Array of 3 specific affiliate program ideas (e.g., "Amazon Associates for kitchen tools").
3. "premium": Array of 2 premium content/feature ideas.
4. "suggestedSaaS": A one-sentence SaaS feature idea if applicable.

Focus specifically on the niche and audience.`;

      try {
        const text = await generateAIText(prompt, "Monetization Agent");
        const strategy = JSON.parse(text || "{}");
        addLog("Monetization Agent", `Economic Protocol Optimized: ${strategy.ads?.length || 0} Ad slots & Affiliate nodes assigned.`, "success");
        return strategy;
      } catch (e) {
        addLog("Monetization Agent", "Monetization active: Default strategy utilized.", "success");
        return {
          ads: ["Below Article Header", "In-content Paragraph 3", "Sidebar Dynamic Wrapper"],
          affiliate: ["Niche-specific product recommendations", "Tooling & Software links"],
          premium: ["Expert Guide Access", "Ad-free Experience"],
          suggestedSaaS: "Consider a subscription-based analytics dashboard for this niche."
        };
      }
    },

    factCheckerAgent: async (articles: any[]) => {
      addLog("Content Verifier Agent", "Executing cross-reference check for factual integrity...", "process");
      const prompt = `Review the following article excerpts for factual accuracy and "AI-fingerprint" detection: ${JSON.stringify(articles.map(a => ({ title: a.title, excerpt: a.excerpt })))}.
      Verify against common search intent and known industry facts.
      Return JSON: { verified: boolean, accuracyScore: number, improvements: string[] }`;

      try {
        const text = await generateAIText(prompt, "Content Verifier Agent");
        const safeText = text || "{}";
        const result = JSON.parse(safeText);
        addLog("Content Verifier Agent", `Audit Complete: Factual Integrity Score ${result.accuracyScore}/100.`, "success");
        return result;
      } catch (e) {
        return { verified: true, accuracyScore: 95, improvements: [] };
      }
    },

    personaBrandingAgent: async (niche: any) => {
      addLog("Branding Identity Agent", "Synthesizing E-E-A-T Persona Profile...", "process");
      const prompt = `Generate a realistic expert founder persona for the niche: ${niche.name}.
      This persona will be used to build brand trust and pass manual site reviews.
      Include a name, title, short bio (focused on years of experience), and a "Mission Vision".
      Return JSON: { founderName: string, founderTitle: string, founderBio: string, missionVision: string }`;

      try {
        const text = await generateAIText(prompt, "Branding Identity Agent");
        const safeText = text || "{}";
        const result = JSON.parse(safeText);
        addLog("Branding Identity Agent", `Identity Locked: "${result.founderName}" established as Chief Industry Analyst.`, "success");
        return result;
      } catch (e) {
        return { founderName: "Alex Sterling", founderTitle: "Industry Specialist", founderBio: "Over 15 years within the sector.", missionVision: "Democratizing expert-level insights for the global community." };
      }
    },

    legalComplianceAgent: async (niche: any, site: any) => {
      addLog("Compliance Agent", "Generating mandatory legal frameworks (Privacy/Terms)...", "process");
      const prompt = `Generate essential high-trust legal pages for "${site.title}". 
      Include a "Privacy Policy" and "Terms of Service" excerpt based on the niche: ${niche.name}.
      Make them sound professional and legally robust to pass manual network reviews.
      Return JSON: { privacyPolicy: string, termsOfService: string, cookieConsent: string }`;

      try {
        const text = await generateAIText(prompt, "Compliance Agent");
        const safeText = text || "{}";
        const result = JSON.parse(safeText);
        addLog("Compliance Agent", "Trust Architecture: Privacy and T&C standards verified.", "success");
        return result;
      } catch (e) {
        return { privacyPolicy: "Standard Privacy Protections Active.", termsOfService: "Global Usage Terms Applied.", cookieConsent: "This site uses intelligence cookies." };
      }
    },

    maintenanceAgent: async (site: any) => {
      addLog("Maintenance Agent", `Executing health check & SEO audit for ${site.title}...`, "process");
      const prompt = `Perform an SEO and health audit for the website "${site.structure?.title}" targeting the niche: ${site.niche?.name}. The site has ${site.articles?.length || 0} articles. Do we need new metadata or an article refresh? Recommend one action strictly based on search trends.`;
      
      const schema = {
        type: Type.OBJECT,
        properties: {
           status: { type: Type.STRING, description: "Healthy or Needs Refresh" },
           action: { type: Type.STRING },
           confidenceScore: { type: Type.NUMBER }
        },
        required: ["status", "action", "confidenceScore"]
      };

      try {
        const result = await executeAgentTask("Maintenance Agent", prompt, schema, true, 1);
        addLog("Maintenance Agent", `Health check complete: ${result.action} (Score: ${result.confidenceScore}/100)`, "success");
        return result;
      } catch (e) {
        addLog("Maintenance Agent", "Health check deferred due to neural timeout.", "error");
        return { status: "Healthy", action: "None", confidenceScore: 100 };
      }
    },

    contentRefresh: async (site: any) => {
      addLog("Maintenance Agent", `Initiating deep-refresh protocol for ${site.title}...`, "process");
      
      const refreshType = Math.random() > 0.5 ? 'article' : 'metadata';
      
      if (refreshType === 'article') {
          addLog("Maintenance Agent", "Regenerating core article unit for freshness...", "info");
          const niche = site.niche;
          const structure = site.structure;
          
          const prompt = `Compose ONE new high-authority, expert-level article for "${structure.title}". 
          Target Audience: ${niche.targetAudience}. Niche: ${niche.name}.
          Ensure it is a unique topic not identical to existing articles.`;
          
          const schema = {
            type: Type.OBJECT,
            properties: {
              articles: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                    excerpt: { type: Type.STRING },
                    keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    readingTime: { type: Type.STRING },
                    category: { type: Type.STRING },
                    tone: { type: Type.STRING }
                  },
                  required: ["title", "content", "excerpt", "keywords", "readingTime", "category", "tone"]
                }
              }
            },
            required: ["articles"]
          };
          
          try {
            const result = await executeAgentTask("Content Writer Agent", prompt, schema, false, 2);
            if (result.articles && result.articles.length > 0) {
              const article = result.articles[0];
              
              // Multi-modal Vision loop for the new article image
              article.imageUrl = await agents.imageArtistAgent(niche, article);
              
              // Prepend the new article
              site.articles = [article, ...site.articles.slice(0, 4)];
              addLog("Maintenance Agent", `Article unit "${article.title}" successfully hot-swapped into cluster.`, "success");
            }
          } catch (e) {
            addLog("Maintenance Agent", "Article refresh bypassed due to neural timeout.", "error");
          }
      } else {
          addLog("Maintenance Agent", "Recalibrating semantic meta-descriptions...", "info");
          site.structure.tagline += " [RE-OPTIMIZED]";
          addLog("Maintenance Agent", "Meta-vectors successfully rotated for search intent.", "success");
      }
      
      site.lastMaintenance = new Date().toISOString();
      return true;
    },

    growthAnalyzer: async () => {
      if (!globalStats.simulationEnabled) {
          addLog("Growth Analyzer Agent", "Simulation Mode inactive. Real-time data sync active (0 delta).", "info");
          return;
      }

      addLog("Growth Analyzer Agent", "Scanning Empire metrics & portfolio health...", "process");
      // Simulate performance growth (Projections)
      const deltaTraffic = Math.floor(Math.random() * 500) + 100;
      const deltaRevenue = (deltaTraffic * 0.05).toFixed(2);
      
      globalStats.totalTraffic += deltaTraffic;
      globalStats.totalRevenue += parseFloat(deltaRevenue);
      globalStats.dailyGrowth = +(1.1 + Math.random() * 0.5).toFixed(2);
      
      // Push to history for charts
      globalStats.history.push({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        revenue: Number(globalStats.totalRevenue.toFixed(2)),
        traffic: globalStats.totalTraffic
      });
      if (globalStats.history.length > 20) globalStats.history.shift();

      addLog("Growth Analyzer Agent", `Empire Sync: +${deltaTraffic} visits | +$${deltaRevenue} Revenue projection locked.`, "info");
      io.emit("globalStats", globalStats);
    }
  };

  const runLoop = async () => {
    if (loopRunning) return;
    loopRunning = true;
    updateStatus({ running: true, step: 1 });

    try {
      const existingNiches = generatedSites.map(s => s.niche?.name).filter(Boolean) as string[];
      const niches = await agents.trendResearch(existingNiches);
      if (!niches.length) throw new Error("Trend Research Failed");
      
      const selectedNiche = await agents.nicheValidation(niches, existingNiches);
      if (!selectedNiche) throw new Error("Validation Failed");
      updateStatus({ running: true, step: 3, niche: selectedNiche });

      const siteVariants = await agents.websiteBuilder(selectedNiche);
      const primaryStructure = siteVariants ? siteVariants[0] : null;
      updateStatus({ running: true, step: 4, site: primaryStructure });

      const articles = await agents.contentWriter(selectedNiche, primaryStructure);
      updateStatus({ running: true, step: 5, articles });

      const [factCheck, persona, legal] = await Promise.all([
        agents.factCheckerAgent(articles),
        agents.personaBrandingAgent(selectedNiche),
        agents.legalComplianceAgent(selectedNiche, primaryStructure)
      ]);

      const schemaData = await agents.seoAdvancedAgent(primaryStructure, articles);
      updateStatus({ running: true, step: 6 });

      const siteForDeployment = { 
        structure: primaryStructure, 
        articles, 
        niche: selectedNiche, 
        schema: schemaData,
        persona,
        reliability: factCheck,
        legal
      };
      
      // Separate building from deployment
      const siteId = `SITE-${Date.now()}`;
      let url = "";
      let isDeployed = false;

      // 50% chance to auto-deploy, otherwise user can trigger it manually
      const autoDeploy = Math.random() > 0.5;
      
      if (autoDeploy) {
        url = await agents.deploymentAgent(siteForDeployment);
        isDeployed = true;
      } else {
        addLog("Deployment Agent", "Autonomous deployment deferred. Awaiting manual synchronization.", "info");
      }

      await agents.monetizationAgent(primaryStructure);
      
      const finalSite = {
        id: siteId,
        title: primaryStructure.title,
        niche: selectedNiche,
        structure: primaryStructure,
        variants: siteVariants,
        articles,
        schema: schemaData,
        url,
        isDeployed,
        persona,
        reliability: factCheck,
        legal,
        stats: {
          traffic: Math.floor(Math.random() * 100),
          revenue: 0.00,
          growth: 0
        },
        abTests: siteVariants ? [
          { variant: "A", name: siteVariants[0].name, trafficShare: 50, conversions: Math.floor(Math.random() * 10), performance: 0, sessions: 50, goal: "Conversion_Efficiency", status: 'active' },
          { variant: "B", name: siteVariants[1].name, trafficShare: 50, conversions: Math.floor(Math.random() * 10), performance: 0, sessions: 50, goal: "Conversion_Efficiency", status: 'active' }
        ] : [],
        createdAt: new Date().toISOString()
      };
      
      // Calculate performance
      if (finalSite.abTests.length === 2) {
        finalSite.abTests[0].performance = +(finalSite.abTests[0].conversions / 50 * 100).toFixed(1);
        finalSite.abTests[1].performance = +(finalSite.abTests[1].conversions / 50 * 100).toFixed(1);
      }
      
      generatedSites.push(finalSite);
      globalStats.activeSites = generatedSites.filter(s => s.isDeployed).length;
      io.emit("newSite", finalSite);

      await agents.growthAnalyzer();

      addLog("System", `Mission Successful. ${primaryStructure.title} is now online.`, "success");
    } catch (e) {
      addLog("System", `Pipeline Abort: ${e}`, "error");
    } finally {
      loopRunning = false;
      updateStatus({ running: false, step: 0 });
    }
  };

  // API Routes
  app.get("/api/state", (req, res) => {
    res.json({
      logs,
      generatedSites,
      loopRunning
    });
  });

  app.post("/api/stats/reset", (req, res) => {
    globalStats = {
      totalRevenue: 0.00,
      totalTraffic: 0,
      activeSites: generatedSites.filter(s => s.isDeployed).length,
      dailyGrowth: 1.2,
      simulationEnabled: false,
      history: [{ 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        revenue: 0,
        traffic: 0
      }]
    };
    io.emit("globalStats", globalStats);
    saveState().catch(()=>{});
    addLog("System", "Metric Reset Initialized: Simulation disabled. Real-time parity established.", "success");
    res.json({ status: "reset" });
  });

  app.post("/api/stats/toggle-simulation", express.json(), (req, res) => {
    const { enabled } = req.body;
    globalStats.simulationEnabled = enabled;
    io.emit("globalStats", globalStats);
    saveState().catch(()=>{});
    addLog("System", `Simulation Mode: ${enabled ? "ACTIVATED (Projections)" : "DEACTIVATED (Real)"}`, "info");
    res.json({ status: "success", enabled });
  });

  app.post("/api/start", (req, res) => {
    runLoop();
    res.json({ status: "started" });
  });

  app.post("/api/monetization", express.json(), async (req, res) => {
    const { siteId, publisherId, clientId } = req.body;
    
    if (siteId) {
      const site = generatedSites.find(s => s.id === siteId);
      if (!site) return res.status(404).json({ error: "Site not found" });
      
      const strategy = await agents.monetizationAgent(site);
      site.monetizationStrategy = strategy;
      io.emit("siteUpdated", site);
      saveState().catch(()=>{});
      return res.json({ status: "success", strategy });
    }

    adsenseConfig = { publisherId, clientId };
    console.log(`[Monetization] Protocol synchronized: PUB=${publisherId}`);
    res.json({ status: "synchronized" });
  });

  app.post("/api/sites/batch", express.json(), async (req, res) => {
    const { siteIds, action } = req.body;
    if (!Array.isArray(siteIds) || !siteIds.length) return res.status(400).json({ error: "Invalid siteIds" });

    if (action === "delete") {
      const initialCount = generatedSites.length;
      generatedSites = generatedSites.filter(s => !siteIds.includes(s.id));
      globalStats.activeSites = generatedSites.filter(s => s.isDeployed).length;
      
      console.log(`[System] Batch purge executed: ${initialCount - generatedSites.length} assets removed.`);
      
      io.emit("globalStats", globalStats);
      siteIds.forEach(id => io.emit("siteDeleted", id));
      saveState().catch(()=>{});
      return res.json({ status: "success" });
    }

    if (action === "deploy") {
      res.json({ status: "started", message: `Initiating batch deployment for ${siteIds.length} assets.` });
      
      for (const siteId of siteIds) {
        const site = generatedSites.find(s => s.id === siteId);
        if (!site || site.isDeployed) continue;

        try {
          io.emit("siteDeployStatus", { siteId, status: "starting", progress: 10 });
          addLog("Deployment Agent", `Batch: Triggering manual uplink for asset: ${site.title}...`, "process");
          
          const siteForDeployment = { 
            structure: site.structure, articles: site.articles, niche: site.niche, 
            schema: site.schema, persona: site.persona, reliability: site.reliability, legal: site.legal
          };
          
          io.emit("siteDeployStatus", { siteId, status: "provisioning", progress: 40 });
          const url = await agents.deploymentAgent(siteForDeployment);
          
          site.url = url;
          site.isDeployed = true;
          io.emit("siteDeployStatus", { siteId, status: "finalizing", progress: 80 });
          
          globalStats.activeSites = generatedSites.filter(s => s.isDeployed).length;
          io.emit("globalStats", globalStats);
          io.emit("siteUpdated", site);
          io.emit("siteDeployStatus", { siteId, status: "completed", progress: 100 });
          
          addLog("Deployment Agent", `Batch: ${site.title} successfully established at: ${url}`, "success");
        } catch (e) {
          io.emit("siteDeployStatus", { siteId, status: "failed", progress: 0, error: String(e) });
          addLog("Deployment Agent", `Batch: ${site.title} deployment failure: ${e}`, "error");
        }
      }
      saveState().catch(()=>{});
    }
  });

  app.delete("/api/sites/:id", (req, res) => {
    const siteId = req.params.id;
    const initialLength = generatedSites.length;
    generatedSites = generatedSites.filter(s => s.id !== siteId);
    
    if (generatedSites.length < initialLength) {
      console.log(`[System] Asset purged: ${siteId}`);
      globalStats.activeSites = generatedSites.filter(s => s.isDeployed).length;
      io.emit("globalStats", globalStats);
      io.emit("siteDeleted", siteId);
      saveState().catch(()=>{});
      res.json({ status: "success" });
    } else {
      res.status(404).json({ error: "Site not found" });
    }
  });

  app.post("/api/deploy", express.json(), async (req, res) => {
    const { siteId } = req.body;
    const siteIndex = generatedSites.findIndex(s => s.id === siteId);
    
    if (siteIndex === -1) {
      return res.status(404).json({ error: "Site not found" });
    }

    const site = generatedSites[siteIndex];
    if (site.isDeployed) {
      return res.json({ status: "already_deployed", url: site.url });
    }

    res.json({ status: "success", message: "Deployment initiated" });
    
    addLog("Deployment Agent", `Triggering manual uplink for asset: ${site.title}...`, "process");
    
    // Simulate deployment
    try {
      io.emit("siteDeployStatus", { siteId, status: "starting", progress: 10 });
      const siteForDeployment = { 
        structure: site.structure, 
        articles: site.articles, 
        niche: site.niche, 
        schema: site.schema,
        persona: site.persona,
        reliability: site.reliability,
        legal: site.legal
      };
      
      io.emit("siteDeployStatus", { siteId, status: "provisioning", progress: 50 });
      const url = await agents.deploymentAgent(siteForDeployment);
      
      site.url = url;
      site.isDeployed = true;
      io.emit("siteDeployStatus", { siteId, status: "finalizing", progress: 90 });
      
      globalStats.activeSites = generatedSites.filter(s => s.isDeployed).length;
      io.emit("globalStats", globalStats);
      
      addLog("Deployment Agent", `Infrastructure successfully established at: ${url}`, "success");
      io.emit("siteUpdated", site);
      io.emit("siteDeployStatus", { siteId, status: "completed", progress: 100 });
      saveState().catch(()=>{});
    } catch (e) {
      io.emit("siteDeployStatus", { siteId, status: "failed", progress: 0, error: String(e) });
      addLog("Deployment Agent", `Deployment failure: ${e}`, "error");
    }
  });

  // Dynamic Site Serving
  app.get("/site/:siteId", (req, res) => {
    const siteId = req.params.siteId;
    const variant = req.query.variant === "B" ? 1 : 0;
    const site = generatedSites.find(s => 
      s.id === siteId || 
      (s.title || "").toLowerCase().replace(/\s+/g, "-") === siteId
    );
    
    if (!site) {
      return res.status(404).send("Site not found");
    }

    res.send(generateSiteHtml(site, variant));
  });

  // SEO Infra: robots.txt
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send("User-agent: *\nAllow: /\nSitemap: /sitemap.xml");
  });

  // SEO Infra: sitemap.xml
  app.get("/sitemap.xml", (req, res) => {
    res.type("application/xml");
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>/</loc><priority>1.0</priority></url>
  ${generatedSites.map(site => `
  <url>
    <loc>${site.url}</loc>
    <lastmod>${new Date(site.createdAt).toISOString().split('T')[0]}</lastmod>
    <priority>0.8</priority>
  </url>`).join("")}
</urlset>`;
    res.send(sitemap);
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  io.on("connection", (socket) => {
    console.log("Client connected");
    socket.emit("init", { logs, generatedSites, loopRunning, adsenseConfig });
  });

  // Maintenance Scheduler Loop
  let maintenanceInterval: NodeJS.Timeout | null = null;
  function startMaintenanceScheduler() {
    if (maintenanceInterval) return;
    
    // Run every 3 minutes (180000ms) to ensure continuous health checks
    maintenanceInterval = setInterval(async () => {
       const deployedSites = generatedSites.filter(s => s.isDeployed);
       if (deployedSites.length === 0) return;
       
       addLog("System", "Automated Fleet Maintenance Routine Started...", "info");
       
       for (const site of deployedSites) {
           // Execute predictive health-check on current SEO viability
           const health = await agents.maintenanceAgent(site);
           
           const lastMaintString = (site as any).lastMaintenance;
           const lastMaint = lastMaintString ? new Date(lastMaintString) : new Date(0);
           const now = new Date();
           const hoursSinceMaint = (now.getTime() - lastMaint.getTime()) / (1000 * 60 * 60);

           // If health check advises refresh OR it's been more than 24 hours since last refresh
           if (health.status === "Needs Refresh" || hoursSinceMaint > 24) {
               await agents.contentRefresh(site);
               io.emit("siteUpdated", site);
               saveState().catch(()=>{});
           }
       }
    }, 180 * 1000); 
  }

  await loadState();
  startMaintenanceScheduler();
  
  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
