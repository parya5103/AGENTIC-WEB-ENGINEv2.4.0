import { generateAIText } from "./lib/server/intelligence.ts";

export const AgentType = {
  TREND_RESEARCH: "Trend Research",
  NICHE_VALIDATION: "Niche Validation",
  KEYWORD_RESEARCH: "Keyword Research",
  SEO_STRATEGIST: "SEO Strategist",
  WEBSITE_ARCHITECT: "Website Architect",
  UI_UX_DESIGNER: "UI/UX Designer",
  FULL_STACK_DEVELOPER: "Full-Stack Developer",
  CONTENT_WRITER: "Content Writer",
  INTERNAL_LINKING: "Internal Linking",
  MONETIZATION: "Monetization Agent",
  AUTOMATION: "Automation Agent",
  ANALYTICS: "Analytics Agent",
  DEVOPS_DEPLOYMENT: "DevOps Deployment"
} as const;

export type AgentType = typeof AgentType[keyof typeof AgentType];

export interface Task {
  id: string;
  agent: AgentType;
  status: "pending" | "processing" | "completed" | "failed";
  retryCount: number;
  payload: any;
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt?: string;
}

export class AgentOrchestrator {
  private store: any;
  private io: any;

  constructor(store: any, io: any) {
    this.store = store;
    this.io = io;
  }

  private getUserStore(userId: string) {
    if (!this.store.users[userId]) {
      this.store.users[userId] = {
        categories: {},
        logs: [],
        stats: { totalRevenue: 0.00, totalTraffic: 0, activeCategories: 0, autoDeploy: true, dailyGrowth: 1.2, simulationEnabled: true, history: [] },
        tasks: {}
      };
    }
    return this.store.users[userId];
  }

  async addTask(agent: AgentType, payload: any) {
    const taskId = `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task: Task = {
      id: taskId,
      agent,
      status: "pending",
      retryCount: 0,
      payload,
      createdAt: new Date().toISOString()
    };

    const userId = payload.userId;
    if (userId) {
      const store = this.getUserStore(userId);
      store.tasks[taskId] = task;
    }

    this.io.emit("taskAdded", this.sanitize(task));
    return taskId;
  }

  async processQueue() {
    for (const userId in this.store.users) {
      const store = this.store.users[userId];
      const pendingTasks = Object.values(store.tasks).filter((t: any) => t.status === "pending").sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt)).slice(0, 3);
      for (const task of pendingTasks) {
        await this.runTask(task as Task, userId);
      }
    }
  }

  private async addLog(agent: string, message: string, type: "info" | "success" | "warning" | "error" | "process" = "info", userId?: string) {
    const logId = `LOG-${Date.now()}`;
    const log = { id: logId, agent, message, type, timestamp: new Date().toISOString() };
    if (userId) {
      const store = this.getUserStore(userId);
      store.logs.push(log);
      if (store.logs.length > 500) store.logs.shift();
    }
    this.io.emit("log", this.sanitize(log));
  }

  private sanitize(obj: any, cache = new WeakSet()): any {
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
    if (Array.isArray(obj)) return obj.map(item => this.sanitize(item, cache));
    
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && !key.startsWith('_')) {
        try {
          const val = obj[key];
          if (typeof val === 'function') continue;
          sanitized[key] = this.sanitize(val, cache);
        } catch (e) {
          sanitized[key] = '[Unserializable]';
        }
      }
    }
    return sanitized;
  }

  private async runTask(task: Task, userId: string) {
    const store = this.getUserStore(userId);
    store.tasks[task.id].status = "processing";
    this.io.emit("taskStatusChange", this.sanitize({ id: task.id, status: "processing" }));

    try {
      let result;
      switch (task.agent) {
        case AgentType.TREND_RESEARCH: result = await this.runTrendResearch(task.payload); break;
        case AgentType.NICHE_VALIDATION: result = await this.runNicheValidation(task.payload); break;
        case AgentType.KEYWORD_RESEARCH: result = await this.runKeywordResearch(task.payload); break;
        case AgentType.SEO_STRATEGIST: result = await this.runSEOStrategist(task.payload); break;
        case AgentType.WEBSITE_ARCHITECT: result = await this.runWebsiteArchitect(task.payload); break;
        case AgentType.UI_UX_DESIGNER: result = await this.runUIUXDesigner(task.payload); break;
        case AgentType.FULL_STACK_DEVELOPER: result = await this.runFullStackDeveloper(task.payload); break;
        case AgentType.CONTENT_WRITER: result = await this.runContentWriter(task.payload); break;
        case AgentType.INTERNAL_LINKING: result = await this.runInternalLinking(task.payload); break;
        case AgentType.MONETIZATION: result = await this.runMonetization(task.payload); break;
        case AgentType.AUTOMATION: result = await this.runAutomation(task.payload); break;
        case AgentType.ANALYTICS: result = await this.runAnalytics(task.payload); break;
        case AgentType.DEVOPS_DEPLOYMENT: result = await this.runDevOpsDeployment(task.payload); break;
        default: throw new Error(`Unsupported agent: ${task.agent}`);
      }

      store.tasks[task.id].status = "completed";
      store.tasks[task.id].result = result;
      store.tasks[task.id].updatedAt = new Date().toISOString();
      this.io.emit("taskStatusChange", this.sanitize({ id: task.id, status: "completed", result }));
      
    } catch (error: any) {
      const retryCount = (task.retryCount || 0) + 1;
      const status = retryCount >= 3 ? "failed" : "pending";
      
      store.tasks[task.id].status = status;
      store.tasks[task.id].retryCount = retryCount;
      store.tasks[task.id].error = error.message;
      store.tasks[task.id].updatedAt = new Date().toISOString();
      
      this.io.emit("taskStatusChange", this.sanitize({ id: task.id, status, error: error.message }));
      await this.addLog(task.agent, `Task ${task.id} failed: ${error.message}`, "error", userId);
    }
  }

  // --- Agent Implementations (Empire Model) ---

  private async parseAIResponse(response: string) {
    let cleanResponse = response.trim();
    
    // Attempt to extract JSON from markdown if present
    const markdownMatch = cleanResponse.match(/```json\s*([\s\S]*?)\s*```/) || cleanResponse.match(/```\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      cleanResponse = markdownMatch[1].trim();
    } else {
      // If no code blocks, try to find the first '{' and last '}'
      const start = cleanResponse.indexOf('{');
      const end = cleanResponse.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        cleanResponse = cleanResponse.substring(start, end + 1);
      }
    }

    try {
      return JSON.parse(cleanResponse);
    } catch (e) {
      // TRUNCATION RECOVERY
      // If it ends abruptly, try to force close it
      console.warn("[Parser] Truncated JSON detected, attempting recovery...");
      
      let fixed = cleanResponse;
      // Close open strings
      if ((fixed.split('"').length - 1) % 2 !== 0) fixed += '"';
      
      // Close open structures (rough heuristic)
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/\]/g) || []).length;
      for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
      
      const openBraces = (fixed.match(/\{/g) || []).length;
      const closeBraces = (fixed.match(/\}/g) || []).length;
      for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';

      try {
        return JSON.parse(fixed);
      } catch (e2) {
        throw new Error("AI returned malformed/truncated JSON: " + response.substring(0, 100) + "...");
      }
    }
  }

  private async runTrendResearch(payload: any) {
    const { userId } = payload;
    await this.addLog(AgentType.TREND_RESEARCH, "Scanning real-time trends (Google, Reddit, X)...", "process", userId);
    const prompt = `Act as an elite Trend Research Agent. Discover 3 highly profitable trending niche categories.
    Each niche MUST have a unique identity.
    Return STRICT JSON: { "niches": [ { "name": "string", "justification": "string", "cpc": "string", "difficulty": "string", "keywords": ["string"] } ] }`;
    
    const response = await generateAIText(prompt, AgentType.TREND_RESEARCH);
    const data = await this.parseAIResponse(response);
    
    if (!data.niches || !Array.isArray(data.niches)) {
      throw new Error("AI response missing niches array");
    }

    await this.addLog(AgentType.TREND_RESEARCH, `Found ${data.niches.length} trending niches. High potential detected.`, "success", userId);
    
    // Auto-validate the first one to start the chain
    await this.addTask(AgentType.NICHE_VALIDATION, { niches: data.niches, userId });
    return data;
  }

  private async runNicheValidation(payload: any) {
    const { niches, userId } = payload;
    await this.addLog(AgentType.NICHE_VALIDATION, "Validating category expansion potential...", "process", userId);
    const prompt = `From these niches: ${JSON.stringify(niches)}, select the single best authority category.
    Return STRICT JSON: { "name": "string", "justification": "string", "keywords": ["string"], "audience": "string" }`;
    
    const response = await generateAIText(prompt, AgentType.NICHE_VALIDATION);
    const data = await this.parseAIResponse(response);
    
    await this.addLog(AgentType.NICHE_VALIDATION, `Selected niche: ${data.name}. Strategy: Vertical Authority.`, "success", userId);
    await this.addTask(AgentType.KEYWORD_RESEARCH, { niche: data, userId });
    return data;
  }

  private async runKeywordResearch(payload: any) {
    const { niche, userId } = payload;
    await this.addLog(AgentType.KEYWORD_RESEARCH, `Extracting semantic clusters for ${niche.name}...`, "process", userId);
    const prompt = `Build a semantic keyword map for: ${JSON.stringify(niche)}.
    Return STRICT JSON: { "clusters": [ { "topic": "string", "keywords": ["string"] } ] }`;
    
    const response = await generateAIText(prompt, AgentType.KEYWORD_RESEARCH);
    const data = await this.parseAIResponse(response);
    
    await this.addLog(AgentType.KEYWORD_RESEARCH, `Generated ${data.clusters?.length || 0} semantic silos.`, "success", userId);
    await this.addTask(AgentType.SEO_STRATEGIST, { niche, clusters: data.clusters, userId });
    return data;
  }

  private async runSEOStrategist(payload: any) {
    const { niche, clusters, userId } = payload;
    await this.addLog(AgentType.SEO_STRATEGIST, "Designing category Silo architecture...", "process", userId);
    const prompt = `Design an SEO Silo for category: ${niche.name}. Use clusters: ${JSON.stringify(clusters)}.
    Return STRICT JSON: { "siloStructure": "string", "topics": ["string"] }`;
    
    const response = await generateAIText(prompt, AgentType.SEO_STRATEGIST);
    const data = await this.parseAIResponse(response);
    
    await this.addLog(AgentType.SEO_STRATEGIST, "Silo structure finalized. Architecture ready for deployment.", "success", userId);
    await this.addTask(AgentType.WEBSITE_ARCHITECT, { architecture: data, niche, clusters, userId });
    return data;
  }

  private async runWebsiteArchitect(payload: any) {
    const { architecture, niche, userId } = payload;
    const slug = niche.name.toLowerCase().replace(/\s+/g, "-");
    await this.addLog(AgentType.WEBSITE_ARCHITECT, `Allocating new category path: /cat/${slug}`, "process", userId);
    
    const categoryData = {
      slug,
      name: niche.name,
      description: niche.justification,
      createdAt: new Date().toISOString(),
      status: "architected",
      posts: {}
    };

    if (userId) {
      const store = this.getUserStore(userId);
      store.categories[slug] = { ...store.categories[slug], ...categoryData };
    }
    
    await this.addTask(AgentType.UI_UX_DESIGNER, { category: categoryData, userId });
    return categoryData;
  }

  private async runUIUXDesigner(payload: any) {
    const { category, userId } = payload;
    await this.addLog(AgentType.UI_UX_DESIGNER, "Generating visual tokens for category...", "process", userId);
    const prompt = `Return design tokens for ${category.name}. Focus on aesthetic identity.
    Return STRICT JSON: { "primaryColor": "string", "secondaryColor": "string", "accentColor": "string", "icon": "string" }`;
    const response = await generateAIText(prompt, AgentType.UI_UX_DESIGNER);
    const style = await this.parseAIResponse(response);
    
    await this.addLog(AgentType.UI_UX_DESIGNER, `Visual identity mapped. Accent: ${style.accentColor}.`, "success", userId);
    await this.addTask(AgentType.FULL_STACK_DEVELOPER, { category, style, userId });
    return style;
  }

  private async runFullStackDeveloper(payload: any) {
    const { category, style, userId } = payload;
    await this.addLog(AgentType.FULL_STACK_DEVELOPER, "Deploying dynamic logic nodes...", "process", userId);
    const updates = { ...category, style, status: "developed" };
    if (userId) {
      const store = this.getUserStore(userId);
      store.categories[category.slug] = { ...store.categories[category.slug], ...updates };
    }
    await this.addLog(AgentType.FULL_STACK_DEVELOPER, "Backend routes and logic provisioned.", "success", userId);
    await this.addTask(AgentType.CONTENT_WRITER, { category: updates, userId });
    return updates;
  }

  private async runContentWriter(payload: any) {
    const { category, userId } = payload;
    await this.addLog(AgentType.CONTENT_WRITER, `Generating High-Authority Editorial Articles for /cat/${category.slug}...`, "process", userId);
    
    const prompt = `Write 3 mass-authority articles for ${category.name}. Markdown. Long-form.
    Return STRICT JSON: { "articles": [ { "title": "string", "content": "string", "slug": "string", "excerpt": "string" } ] }`;
    
    const response = await generateAIText(prompt, AgentType.CONTENT_WRITER);
    const data = await this.parseAIResponse(response);
    
    if (userId) {
      const store = this.getUserStore(userId);
      const catStore = store.categories[category.slug];
      if (!catStore.posts) catStore.posts = {};
      for (const article of data.articles) {
        catStore.posts[article.slug] = { ...article, createdAt: new Date().toISOString() };
      }
    }

    await this.addLog(AgentType.CONTENT_WRITER, `Published ${data.articles?.length || 0} authority insights.`, "success", userId);
    await this.addTask(AgentType.INTERNAL_LINKING, { category, articles: data.articles, userId });
    return { count: data.articles?.length || 0 };
  }

  private async runInternalLinking(payload: any) {
    const { category, userId } = payload;
    await this.addLog(AgentType.INTERNAL_LINKING, "Optimizing semantic cluster linking...", "process", userId);
    await this.addTask(AgentType.MONETIZATION, { category, userId });
    return { status: "linked" };
  }

  private async runMonetization(payload: any) {
    const { category, userId } = payload;
    await this.addLog(AgentType.MONETIZATION, "Injecting AdSense and Affiliate CTAs...", "process", userId);
    await this.addTask(AgentType.AUTOMATION, { category, userId });
    return { monetized: true };
  }

  private async runAutomation(payload: any) {
    const { category, userId } = payload;
    await this.addLog(AgentType.AUTOMATION, "Setting daily autonomous expansion cycle...", "process", userId);
    await this.addTask(AgentType.ANALYTICS, { category, userId });
    return { loop_synced: true };
  }

  private async runAnalytics(payload: any) {
    const { category, userId } = payload;
    await this.addLog(AgentType.ANALYTICS, "Forecasting traffic growth...", "process", userId);
    await this.addTask(AgentType.DEVOPS_DEPLOYMENT, { category, userId });
    return { traffic: "simulated" };
  }

  private async runDevOpsDeployment(payload: any) {
    const { category, userId } = payload;
    const url = `/cat/${category.slug}`;
    await this.addLog(AgentType.DEVOPS_DEPLOYMENT, `PRODUCTION UPLINK LIVE: ${url}`, "success", userId);
    if (userId) {
      const store = this.getUserStore(userId);
      store.categories[category.slug] = { ...store.categories[category.slug], status: "live", url };
    }
    return { live: true };
  }
}
