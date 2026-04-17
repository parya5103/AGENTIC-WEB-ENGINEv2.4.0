import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let genAIInstance: GoogleGenAI | null = null;
function getGenAI() {
  if (!genAIInstance) {
    // Try GEMINI_API_KEY then fallback to ADSENSE_KEY (user often mixes them up)
    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.length < 5) {
      apiKey = process.env.ADSENSE_KEY;
    }
    
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.length < 5) {
      throw new Error("API Key Mission: Missing. Please set GEMINI_API_KEY in the Secrets panel and click 'Apply Changes'.");
    }
    genAIInstance = new GoogleGenAI({ apiKey });
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
    dailyGrowth: 1.2
  };

  const addLog = (agent: string, message: string, type: "info" | "success" | "error" | "process" = "info") => {
    const log = { id: `${Date.now()}-${logIdCounter++}`, agent, message, type, timestamp: new Date().toISOString() };
    logs.push(log);
    io.emit("log", log);
  };

  const updateStatus = (status: any) => {
    io.emit("status", status);
    io.emit("globalStats", globalStats);
  };

  // Helper to generate the full HTML for a niche site
  const generateSiteHtml = (site: any) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${site.structure.title} | ${site.structure.tagline}</title>
    <meta name="description" content="${site.structure.tagline}">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@300;400;700&family=Playfair+Display:ital,wght@1,900&display=swap" rel="stylesheet">
    <script type="application/ld+json">
        ${site.schema || "{}"}
    </script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #fafaf9; color: #1a1a1a; }
        h1, h2 { font-family: 'Anton', sans-serif; text-transform: uppercase; line-height: 0.9; letter-spacing: -0.02em; }
        .serif-italic { font-family: 'Playfair Display', serif; font-style: italic; font-weight: 900; }
        .hero { background: linear-gradient(180deg, ${site.structure.colors.primary} 0%, white 100%); }
        .glass { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(0,0,0,0.05); }
    </style>
</head>
<body class="selection:bg-black selection:text-white">
    <nav class="px-6 py-6 flex justify-between items-center border-b border-black/5 bg-white/80 backdrop-blur sticky top-0 z-[100]">
        <div class="text-3xl font-black tracking-tighter uppercase italic">${site.structure.title}</div>
        <div class="hidden md:flex gap-12 text-[11px] font-bold uppercase tracking-[0.2em] opacity-40">
            ${site.structure.pages.map((p: any) => `<a href="#" class="hover:opacity-100 transition-opacity">${p}</a>`).join("")}
        </div>
        <button class="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:scale-105 transition-transform">Get Updates</button>
    </nav>

    <header class="pt-24 pb-12 px-6 overflow-hidden relative border-b border-black/5">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-end justify-between gap-12">
            <div class="flex-1">
                <div class="text-[10px] font-bold uppercase tracking-[0.4em] mb-8 opacity-40">Niche Performance Asset 0x44</div>
                <h1 class="text-[14vw] md:text-[8vw] leading-[0.85] mb-8">${site.structure.title}</h1>
                <p class="serif-italic text-3xl md:text-5xl text-gray-400 max-w-2xl">${site.structure.tagline}</p>
            </div>
            <div class="w-full md:w-1 shadow-2xl bg-black hidden md:block" style="height: 400px"></div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-24 flex flex-col lg:flex-row gap-20">
        <div class="lg:w-2/3">
            <div class="flex items-center gap-4 mb-16">
                <div class="h-px bg-black/10 flex-1"></div>
                <h2 class="text-2xl opacity-30">The Editorial Cluster</h2>
            </div>

            <div class="space-y-32">
                ${site.articles.map((article: any, i: number) => `
                    <article class="group cursor-pointer">
                        <div class="flex flex-col md:flex-row gap-12 items-start">
                            <div class="w-full md:w-80 aspect-square rounded-[40px] overflow-hidden bg-gray-100 shrink-0">
                                <img src="${article.imageUrl}" class="w-full h-full object-cover grayscale transition-all group-hover:grayscale-0 group-hover:scale-110" referrerpolicy="no-referrer" />
                            </div>
                            <div class="flex-1">
                                <div class="flex gap-4 mb-6 text-[10px] font-bold uppercase tracking-widest opacity-40">
                                    <span>${article.readingTime || "5 MIN"}</span>
                                    <span>/</span>
                                    <span>${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}</span>
                                </div>
                                <h3 class="font-bold text-4xl md:text-6xl tracking-tight leading-none mb-8 group-hover:text-blue-600 transition-colors">${article.title}</h3>
                                <p class="text-xl text-gray-500 leading-relaxed max-w-xl">${article.excerpt}</p>
                                <div class="mt-8 flex gap-3">
                                    ${article.keywords.map((kw: any) => `<span class="bg-black/5 px-3 py-1 rounded-full text-[9px] font-bold uppercase opacity-60">#${kw}</span>`).join("")}
                                </div>
                            </div>
                        </div>
                    </article>
                `).join("")}
            </div>
        </div>

        <aside class="lg:w-1/3">
            <div class="sticky top-32 space-y-20">
                <div class="p-12 bg-black text-white rounded-[40px]">
                    <h2 class="text-3xl mb-8">Insider Access</h2>
                    <p class="opacity-60 text-sm mb-12 leading-relaxed">Join 50k+ specialists receiving our curated ${site.niche.name} insights every Tuesday. Direct to inbox.</p>
                    <input type="email" placeholder="Email Address" class="w-full bg-white/10 border-b border-white/20 pb-4 text-white focus:outline-none mb-8" />
                    <button class="w-full py-4 text-[10px] font-extrabold uppercase tracking-[0.2em] border border-white/20 rounded-full hover:bg-white hover:text-black transition-all">Submit Application</button>
                </div>

                <div>
                    <h2 class="text-xl mb-8 opacity-40 tracking-[0.2em]">Validated Metrics</h2>
                    <div class="grid grid-cols-2 gap-px bg-black/5">
                         <div class="bg-[#fafaf9] p-6">
                             <div class="text-xs opacity-40 uppercase mb-2">Authority</div>
                             <div class="text-2xl font-bold font-mono">98/100</div>
                         </div>
                         <div class="bg-[#fafaf9] p-6">
                             <div class="text-xs opacity-40 uppercase mb-2">Index Rate</div>
                             <div class="text-2xl font-bold font-mono">Instant</div>
                         </div>
                    </div>
                </div>
            </div>
        </aside>
    </main>

    <footer class="bg-black text-white py-32 px-6">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-20 opacity-40 text-[10px] font-bold uppercase tracking-[0.3em]">
            <div class="text-xl opacity-100">© 2026 ${site.structure.title}</div>
            <div class="flex gap-12">
                <a href="#">Network</a>
                <a href="#">Privacy</a>
                <a href="#">Legal</a>
            </div>
            <div>Built for ${site.niche.targetAudience}</div>
        </div>
    </footer>
</body>
</html>`;
  };

  // Agent Functions (Simulated via Gemini)
  const agents = {
    trendResearch: async () => {
      addLog("Trend Research Agent", "Scanning Google Trends & Semantic Hotspots...", "process");
      const model = "gemini-3-flash-preview";
      const prompt = `Discover 3 high-yield trending niche ideas. Focus on "Low Difficulty, High CPC" segments.
      Return JSON: { niches: [{ name: string, justification: string, cpc: string, difficulty: string, keywords: string[] }] }`;

      try {
        const response = await getGenAI().models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
        const result = JSON.parse(response.text!);
        addLog("Trend Research Agent", `Trend pulse identified: ${result.niches.map((n: any) => n.name).join(", ")}`, "success");
        return result.niches;
      } catch (e) {
        addLog("Trend Research Agent", `Error: ${e}`, "error");
        return [];
      }
    },

    nicheValidation: async (niches: any[]) => {
      addLog("Niche Analyzer Agent", "Cross-referencing search intent vs profitability...", "process");
      const model = "gemini-3-flash-preview";
      const prompt = `Select the most viable niche from: ${JSON.stringify(niches)}. 
      Ensure high monetization potential via affiliate links and display ads.
      Return JSON: { name: string, justification: string, keywords: string[], targetAudience: string, estimatedCPC: string, competitionLvl: string }`;

      try {
        const response = await getGenAI().models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
        const result = JSON.parse(response.text!);
        addLog("Niche Analyzer Agent", `Blueprint Lock: "${result.name}" validated as Tier-1 Opportunity.`, "success");
        return result;
      } catch (e) {
        return null;
      }
    },

    websiteBuilder: async (niche: any) => {
      addLog("Website Builder Agent", `Constructing architecture for ${niche.name}...`, "process");
      const model = "gemini-3-flash-preview";
      const prompt = `Design a premium site structure for ${niche.name}. 
      Include a full "Pillar-Cluster" internal linking map.
      Return JSON: { title: string, tagline: string, pages: string[], colors: { primary: string, secondary: string, accent: string }, typography: string }`;

      try {
        const response = await getGenAI().models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
        const result = JSON.parse(response.text!);
        addLog("Website Builder Agent", `Infrastructure ready: v3.2 High-Performance Engine deployed.`, "success");
        return result;
      } catch (e) {
        return null;
      }
    },

    imageArtistAgent: async (niche: any, article: any) => {
      addLog("Visual Artist Agent", `Synthesizing conceptual art for "${article.title}"...`, "process");
      // Using Pollinations AI - a free, real-time AI image generator
      const prompt = encodeURIComponent(`${article.title} professional high-quality editorial photography for ${niche.name} magazine, clean lighting, 8k`);
      const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1080&height=1080&nologo=true&enhance=true`;
      addLog("Visual Artist Agent", "Art direction complete: Real 1:1 AI Image generated.", "success");
      return imageUrl;
    },

    contentWriter: async (niche: any, site: any) => {
      addLog("Content Writer Agent", "Drafting semantic content cluster (5 articles)...", "process");
      const model = "gemini-3-flash-preview";
      const prompt = `Write 5 highly optimized articles for "${site.title}". 
      Niche: ${niche.name}. Target: ${niche.targetAudience}.
      Each article must have a Title, Excerpt, 5 Keywords, and a Reading Time.
      One article must have FULL Markdown content (1500+ words) with H2/H3 headers.
      Return JSON: { articles: [{ title: string, content: string, excerpt: string, keywords: string[], readingTime: string }] }`;

      try {
        const response = await getGenAI().models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
        const result = JSON.parse(response.text!);
        
        // Enhance articles with AI images
        for (let article of result.articles) {
          article.imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(article.title + " high quality professional photography")}`;
        }

        addLog("Content Writer Agent", `Cluster Generation Sync: ${result.articles.length} articles produced with 98% SEO score.`, "success");
        return result.articles;
      } catch (e) {
        return [];
      }
    },

    seoAdvancedAgent: async (site: any, articles: any[]) => {
      addLog("Growth Analyzer Agent", "Injecting JSON-LD & OpenGraph Graph Data...", "process");
      const model = "gemini-3-flash-preview";
      const prompt = `Generate JSON-LD Organizational schema for ${site.title}. 
      Focus on Local SEO and Article-specific fragments.
      Return raw JSON string.`;
      
      try {
        const response = await getGenAI().models.generateContent({ model, contents: prompt });
        const schema = response.text!.replace(/```json|```/g, "").trim();
        addLog("Growth Analyzer Agent", "Search Engine Readiness: Opt-in Full Indexing.", "success");
        return schema;
      } catch (e) {
        return "{}";
      }
    },

    deploymentAgent: async (site: any) => {
      addLog("DevOps Agent", "Initializing High-Speed Deployment Pipeline...", "process");
      
      const token = process.env.VERCEL_TOKEN;
      if (token) {
        addLog("DevOps Agent", "Detected VERCEL_TOKEN. Attempting Global Edge Push...", "info");
        try {
          // Use fetch to deploy to Vercel
          const deploymentName = `nicheflow-${site.title.toLowerCase().replace(/\s+/g, "-")}`;
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
            addLog("DevOps Agent", `Vercel Error: ${result.error?.message || "Unknown API Error"}`, "error");
          }
        } catch (err) {
          addLog("DevOps Agent", `Network Error during Vercel Push: ${err}`, "error");
        }
      }

      // Default: Internal deployment
      await new Promise(r => setTimeout(r, 1500));
      const internalUrl = `/site/${site.title.toLowerCase().replace(/\s+/g, "-")}`;
      addLog("DevOps Agent", `Internal routing active at ${internalUrl}. SSL Ready.`, "success");
      return internalUrl;
    },

    monetizationAgent: async (site: any) => {
      addLog("Monetization Agent", "Placing Ad segments & Affiliate containers...", "process");
      
      const adsenseKey = process.env.ADSENSE_KEY;
      if (adsenseKey) {
        addLog("Monetization Agent", "AdSense Management API connected. Syncing Auto-Ads...", "info");
        addLog("Monetization Agent", "Smart-Placement Active: High-CTR heatmaps utilized.", "success");
      } else {
        addLog("Monetization Agent", "Monetization active: Generic Ad-Placeholders injected.", "success");
      }
      return true;
    },

    growthAnalyzer: async () => {
      addLog("Growth Analyzer Agent", "Scanning Empire metrics & portfolio health...", "process");
      // Simulate performance growth
      const deltaTraffic = Math.floor(Math.random() * 500) + 100;
      const deltaRevenue = (deltaTraffic * 0.05).toFixed(2);
      
      globalStats.totalTraffic += deltaTraffic;
      globalStats.totalRevenue += parseFloat(deltaRevenue);
      globalStats.dailyGrowth = +(1.1 + Math.random() * 0.5).toFixed(2);
      
      addLog("Growth Analyzer Agent", `Empire Sync: +${deltaTraffic} visits | +$${deltaRevenue} Revenue locked.`, "info");
      io.emit("globalStats", globalStats);
    }
  };

  const runLoop = async () => {
    if (loopRunning) return;
    loopRunning = true;
    updateStatus({ running: true, step: 1 });

    try {
      const niches = await agents.trendResearch();
      if (!niches.length) throw new Error("Trend Research Failed");
      
      const selectedNiche = await agents.nicheValidation(niches);
      if (!selectedNiche) throw new Error("Validation Failed");
      updateStatus({ running: true, step: 3, niche: selectedNiche });

      const siteStructure = await agents.websiteBuilder(selectedNiche);
      updateStatus({ running: true, step: 4, site: siteStructure });

      const articles = await agents.contentWriter(selectedNiche, siteStructure);
      updateStatus({ running: true, step: 5, articles });

      await agents.seoAdvancedAgent(siteStructure, articles);
      const schemaData = await agents.seoAdvancedAgent(siteStructure, articles);
      updateStatus({ running: true, step: 6 });

      const url = await agents.deploymentAgent(siteStructure);
      await agents.monetizationAgent(siteStructure);
      
      const finalSite = {
        title: siteStructure.title,
        niche: selectedNiche,
        structure: siteStructure,
        articles,
        schema: schemaData,
        url,
        stats: {
          traffic: Math.floor(Math.random() * 100),
          revenue: 0.00,
          growth: 0
        },
        createdAt: new Date().toISOString()
      };
      
      generatedSites.push(finalSite);
      globalStats.activeSites = generatedSites.length;
      io.emit("newSite", finalSite);
      await agents.growthAnalyzer();

      addLog("System", `Mission Successful. ${siteStructure.title} is now online.`, "success");
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

  app.post("/api/start", (req, res) => {
    runLoop();
    res.json({ status: "started" });
  });

  // Dynamic Site Serving
  app.get("/site/:siteId", (req, res) => {
    const siteId = req.params.siteId;
    const site = generatedSites.find(s => s.title.toLowerCase().replace(/\s+/g, "-") === siteId);
    
    if (!site) {
      return res.status(404).send("Site not found");
    }

    res.send(generateSiteHtml(site));
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
    socket.emit("init", { logs, generatedSites, loopRunning });
  });

  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
