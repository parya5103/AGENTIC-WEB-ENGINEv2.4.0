import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs/promises";
import { AgentOrchestrator, AgentType } from "./agents.ts";
import { generateEmpireHtml, generateHomeHtml } from "./lib/server/renderer.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sanitizeForEmit(obj: any, cache = new WeakSet()): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (cache.has(obj)) return '[Circular]';
  
  const constructorName = obj.constructor?.name;
  // Aggressively catch potential circular/internal types
  if (constructorName && (
    ['Socket', 'Server', 'EventEmitter', 'Timeout', 'Immediate'].includes(constructorName) ||
    constructorName.includes('Grpc') ||
    constructorName.length < 3 || 
    obj._delegate || obj._firestore || obj.firestore
  )) {
    return `[Internal Object: ${constructorName || 'Anonymous'}]`;
  }

  cache.add(obj);
  if (Array.isArray(obj)) return obj.map(item => sanitizeForEmit(item, cache));
  
  const sanitized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && !key.startsWith('_')) {
      try {
        const val = obj[key];
        if (typeof val === 'function') continue;
        sanitized[key] = sanitizeForEmit(val, cache);
      } catch (e) {
        sanitized[key] = '[Unserializable]';
      }
    }
  }
  return sanitized;
}

// Persistent In-memory Store
let memoryStore: {
  users: Record<string, {
    categories: Record<string, any>;
    logs: any[];
    stats: any;
    tasks: Record<string, any>;
  }>;
} = { users: {} };

const STORAGE_FILE = path.join(process.cwd(), "storage.json");

async function saveToDisk() {
  try {
    await fs.writeFile(STORAGE_FILE, JSON.stringify(memoryStore, null, 2));
  } catch (e) {
    console.error("Failed to save storage to disk", e);
  }
}

async function loadFromDisk() {
  try {
    const data = await fs.readFile(STORAGE_FILE, "utf-8");
    memoryStore = JSON.parse(data);
    console.log("[Storage] Recovered state from disk.");
  } catch (e) {
    console.log("[Storage] No existing state found, starting fresh.");
    memoryStore = { users: {} };
  }
}

function getUserStore(userId: string) {
  if (!memoryStore.users[userId]) {
    memoryStore.users[userId] = {
      categories: {},
      logs: [],
      stats: { totalRevenue: 0.00, totalTraffic: 0, activeCategories: 0, autoDeploy: true, dailyGrowth: 1.2, simulationEnabled: true, history: [] },
      tasks: {}
    };
  }
  return memoryStore.users[userId];
}

async function startServer() {
  await loadFromDisk();
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  const PORT = process.env.PORT || 3000;

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`];

  const io = new Server(httpServer, { cors: { origin: allowedOrigins } });

  let activeUser: string = "local-user-admin"; // Locked to admin as requested "me only"
  let loopRunning = false;

  const orchestrator = new AgentOrchestrator(memoryStore as any, io);

  async function loadState() {
     const store = getUserStore(activeUser);
     const categories = Object.values(store.categories);
     io.emit("init", sanitizeForEmit({ categories, loopRunning, globalStats: store.stats }));
  }

  setInterval(() => { orchestrator.processQueue().catch(e => console.error(e)); }, 5000);
  setInterval(() => { saveToDisk().catch(e => console.error(e)); }, 15000);

  // --- API Routes ---
  app.get("/api/state", async (req, res) => {
    try {
      const userId = (req.query.userId as string) || activeUser;
      if (userId && userId !== "undefined") activeUser = userId;
      
      const store = getUserStore(activeUser);
      const payload = { 
        categories: Object.values(store.categories), 
        loopRunning, 
        globalStats: store.stats 
      };
      
      res.json(sanitizeForEmit(payload));
    } catch (e: any) {
      console.error("[API] State fetch failed:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/start", async (req, res) => {
    try {
      const userId = req.body.userId || activeUser;
      if (userId && userId !== "undefined") activeUser = userId;
      
      loopRunning = true;
      const store = getUserStore(activeUser);
      const existingNiches = Object.values(store.categories).map((c: any) => c.name);
      await orchestrator.addTask(AgentType.TREND_RESEARCH, { userId: activeUser, existingNiches });
      res.json({ status: "started" });
    } catch (e: any) {
      console.error("[API] Start failed:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/stop", (req, res) => {
    loopRunning = false;
    res.json({ status: "stopped" });
  });

  app.post("/api/categories/:slug/refresh", async (req, res) => {
    try {
      const { slug } = req.params;
      const userId = req.body.userId || activeUser;
      await orchestrator.addTask(AgentType.CONTENT_WRITER, { category: { slug }, userId });
      res.json({ status: "refresh_queued" });
    } catch (e: any) {
      console.error("[API] Refresh category failed:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/categories/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const userId = (req.query.userId as string) || activeUser;
      const store = getUserStore(userId);
      delete store.categories[slug];
      res.json({ status: "deleted" });
    } catch (e: any) {
      console.error("[API] Delete category failed:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/categories/:slug/strategy", async (req, res) => {
    try {
      const { slug } = req.params;
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "Missing identity" });
      await orchestrator.addTask(AgentType.MONETIZATION, { category: { slug }, userId });
      res.json({ status: "strategy_queued" });
    } catch (e: any) {
      console.error("[API] Category strategy failed:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/forge", async (req, res) => {
    try {
      const { seed, strategy, userId, temperature, depth, engine } = req.body;
      if (!userId) return res.status(400).json({ error: "Missing identity" });
      await orchestrator.addTask(AgentType.NICHE_VALIDATION, { niches: [{ name: seed, justification: "Manual Override" }], userId, config: { temperature, depth, engine, strategy } });
      res.json({ status: "manual_forge_queued" });
    } catch (e: any) {
      console.error("[API] Forge failed:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Reset stats to prevent dashboard ghosting
  app.get("/api/stats/reset", (req, res) => {
    try {
      const userId = (req.query.userId as string) || activeUser;
      const store = getUserStore(userId);
      store.stats = { totalRevenue: 0.00, totalTraffic: 0, activeCategories: 0, autoDeploy: true, dailyGrowth: 1.2, simulationEnabled: true, history: [] };
      res.json({ status: "ok" });
    } catch (e: any) {
      console.error("[API] Stats reset failed:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Empire Dynamic Serving
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      storage: "in-memory-fallback",
      mode: "local-only"
    });
  });

  // Catch-all for API to prevent HTML fallback (CRITICAL)
  app.all("/api/*", (req, res) => {
    res.status(404).json({ 
      error: "API Endpoint Not Found", 
      path: req.originalUrl,
      help: "Ensure the URL is correct and includes /api/ prefix if intended for JSON data."
    });
  });

  app.get("/empire", async (req, res) => {
    if (!activeUser) return res.send(generateHomeHtml([]));
    const store = getUserStore(activeUser);
    res.send(generateHomeHtml(Object.values(store.categories)));
  });

  app.get("/cat/:slug", async (req, res) => {
    const { slug } = req.params;
    if (!activeUser) return res.status(404).send("Empire Offline");
    const store = getUserStore(activeUser);
    const category = store.categories[slug];
    if (!category) return res.status(404).send("Category not indexed.");
    const posts = Object.values(category.posts || {});
    res.send(generateEmpireHtml(category, posts));
  });

  app.get("/cat/:slug/:postSlug", async (req, res) => {
    const { slug, postSlug } = req.params;
    if (!activeUser) return res.status(404).send("Empire Offline");
    const store = getUserStore(activeUser);
    const category = store.categories[slug];
    if (!category) return res.status(404).send("Insight not found.");
    const post = category.posts?.[postSlug];
    if (!post) return res.status(404).send("Insight not found.");
    res.send(generateEmpireHtml(category, [], post));
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  io.on("connection", (socket) => {
    socket.on("setUserId", async (uid) => { activeUser = uid; await loadState(); });
  });

  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
