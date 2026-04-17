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

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Agent State
  let loopRunning = false;
  let currentStep = 0;
  let logs: any[] = [];
  let generatedSites: any[] = [];
  let logIdCounter = 0;

  const addLog = (agent: string, message: string, type: "info" | "success" | "error" | "process" = "info") => {
    const log = { id: `${Date.now()}-${logIdCounter++}`, agent, message, type, timestamp: new Date().toISOString() };
    logs.push(log);
    io.emit("log", log);
  };

  const updateStatus = (status: any) => {
    io.emit("status", status);
  };

  // Agent Functions (Simulated via Gemini)
  const agents = {
    trendResearch: async () => {
      addLog("Trend Research Agent", "Scanning Google Trends, Reddit, and News APIs...", "process");
      const model = "gemini-3-flash-preview";
      const prompt = `Act as a Trend Research Agent. Discover 3 trending niche ideas for automated content websites. 
      For each niche, provide:
      1. Name
      2. Justification (High search volume, low competition)
      3. Potential Keywords.
      Return as JSON with structure: { niches: [{ name: string, justification: string, keywords: string[] }] }`;

      try {
        const response = await genAI.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
        const result = JSON.parse(response.text!);
        addLog("Trend Research Agent", `Found trending niches: ${result.niches.map((n: any) => n.name).join(", ")}`, "success");
        return result.niches;
      } catch (e) {
        addLog("Trend Research Agent", `Error: ${e}`, "error");
        return [];
      }
    },

    nicheValidation: async (niches: any[]) => {
      addLog("Niche Analyzer Agent", "Validating niches for profitability and SEO difficulty...", "process");
      const model = "gemini-3-flash-preview";
      const prompt = `Analyze these niches: ${JSON.stringify(niches)}. 
      Select the BEST one for a new website. 
      Return the selected niche object with extra fields: selectedReason, targetAudience, estimatedCPC.
      Return as JSON.`;

      try {
        const response = await genAI.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
        const result = JSON.parse(response.text!);
        addLog("Niche Analyzer Agent", `Validated niche: ${result.name}. Selected for: ${result.selectedReason}`, "success");
        return result;
      } catch (e) {
        addLog("Niche Analyzer Agent", `Error: ${e}`, "error");
        return null;
      }
    },

    websiteBuilder: async (niche: any) => {
      addLog("Website Builder Agent", `Generating SEO-optimized structure for ${niche.name}...`, "process");
      const model = "gemini-3-flash-preview";
      const prompt = `As a Website Builder Agent, create the full structure for a niche site about ${niche.name}.
      Include:
      1. Site Title
      2. Tagline
      3. Page list (Homepage, Categories, About, Contact)
      4. Color scheme (hex codes)
      Return as JSON structure: { title: string, tagline: string, pages: string[], colors: { primary: string, secondary: string, accent: string } }`;

      try {
        const response = await genAI.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
        const result = JSON.parse(response.text!);
        addLog("Website Builder Agent", `Site structure created: "${result.title}"`, "success");
        return result;
      } catch (e) {
        addLog("Website Builder Agent", `Error: ${e}`, "error");
        return null;
      }
    },

    contentWriter: async (niche: any, site: any) => {
      addLog("Content Writer Agent", "Generating 5 initial high-quality SEO blog articles...", "process");
      const model = "gemini-3-flash-preview";
      const prompt = `As a Content Writer Agent for "${site.title}", generate 5 blog post titles and brief outlines based on keywords: ${JSON.stringify(niche.keywords)}.
      For the first article, generate the FULL content (1000+ words).
      Return as JSON: { articles: [{ title: string, content: string, excerpt: string, keywords: string[] }] }`;

      try {
        const response = await genAI.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
        const result = JSON.parse(response.text!);
        addLog("Content Writer Agent", `Generated ${result.articles.length} articles. Total words: ~5000+`, "success");
        return result.articles;
      } catch (e) {
        addLog("Content Writer Agent", `Error: ${e}`, "error");
        return [];
      }
    },

    seoOptimizer: async (site: any, articles: any[]) => {
      addLog("SEO Optimizer Agent", "Adding meta tags, sitemap.xml, and robots.txt...", "process");
      // Simulation: assume optimization is done
      addLog("SEO Optimizer Agent", "Technical SEO crawl optimization complete. All pages indexed-ready.", "success");
      return true;
    },

    deploymentAgent: async (site: any) => {
      addLog("DevOps Agent", "Pushing to GitHub and deploying to production...", "process");
      await new Promise(r => setTimeout(r, 2000)); // Simulate delay
      const liveUrl = `https://${site.title.toLowerCase().replace(/\s+/g, "-")}.nicheflow.ai`;
      addLog("DevOps Agent", `Deployment successful! Live at ${liveUrl}`, "success");
      return liveUrl;
    },

    monetizationAgent: async (site: any) => {
      addLog("Monetization Agent", "Injecting AdSense placeholders and affiliate segments...", "process");
      addLog("Monetization Agent", "Monetization structure active. AdSense compliance pages generated.", "success");
      return true;
    }
  };

  const runLoop = async () => {
    if (loopRunning) return;
    loopRunning = true;
    updateStatus({ running: true, step: 1 });

    try {
      // Step 1 & 2: Discover & Validate
      const niches = await agents.trendResearch();
      if (!niches.length) throw new Error("No niches found");
      
      const selectedNiche = await agents.nicheValidation(niches);
      if (!selectedNiche) throw new Error("Validation failed");
      updateStatus({ running: true, step: 3, niche: selectedNiche });

      // Step 3: Build
      const siteStructure = await agents.websiteBuilder(selectedNiche);
      updateStatus({ running: true, step: 4, site: siteStructure });

      // Step 4: Content
      const articles = await agents.contentWriter(selectedNiche, siteStructure);
      updateStatus({ running: true, step: 5, articles });

      // Step 5: SEO
      await agents.seoOptimizer(siteStructure, articles);
      updateStatus({ running: true, step: 6 });

      // Step 6: Deploy
      const url = await agents.deploymentAgent(siteStructure);
      
      // Step 7: Monetization
      await agents.monetizationAgent(siteStructure);
      
      const finalSite = {
        niche: selectedNiche,
        structure: siteStructure,
        articles,
        url,
        createdAt: new Date().toISOString()
      };
      generatedSites.push(finalSite);
      io.emit("newSite", finalSite);

      addLog("System", "Full expansion loop complete. Site is live and monetized.", "success");
      
      // Daily Loop Simulation: Wait then repeat or just stop for now
      addLog("System", "Next automated content update scheduled for T+24h.", "info");

    } catch (e) {
      addLog("System", `Loop terminated due to error: ${e}`, "error");
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
