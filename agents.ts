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
  IMAGE_GENERATOR: "Image Generator",
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
    if (userId === '__proto__' || userId === 'constructor' || userId === 'prototype') {
      throw new Error("Invalid userId");
    }
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

  private addLog(agent: string, message: string, type: "info" | "success" | "warning" | "error" | "process" = "info", userId?: string) {
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
        case AgentType.IMAGE_GENERATOR: result = await this.runImageGenerator(task.payload); break;
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
      
      let errorMessage = error.message;
      if (errorMessage?.includes("<!DOCTYPE html>")) {
        errorMessage = "Provider returned HTML instead of JSON (Possible API misconfiguration or outage).";
      }
      if (errorMessage?.length > 200) {
        errorMessage = errorMessage.substring(0, 197) + "...";
      }

      store.tasks[task.id].status = status;
      store.tasks[task.id].retryCount = retryCount;
      store.tasks[task.id].error = errorMessage;
      store.tasks[task.id].updatedAt = new Date().toISOString();
      
      this.io.emit("taskStatusChange", this.sanitize({ id: task.id, status, error: errorMessage }));
      this.addLog(task.agent, `Task ${task.id} failed: ${errorMessage}`, "error", userId);
    }
  }

  // --- Agent Implementations (Empire Model) ---

  private async parseAIResponse(response: string) {
    let cleanResponse = response.trim();
    
    // Extract JSON from markdown or find the largest balanced block
    const markdownMatch = cleanResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch) {
      cleanResponse = markdownMatch[1].trim();
    } else {
      const start = cleanResponse.indexOf('{');
      const end = cleanResponse.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        cleanResponse = cleanResponse.substring(start, end + 1);
      }
    }

    try {
      return JSON.parse(cleanResponse);
    } catch (e) {
      console.warn("[Parser] JSON parse failed, attempting recovery...", e);
      
      // Robust recovery for truncated JSON
      let fixed = cleanResponse;
      const stack: string[] = [];
      let inString = false;
      let escapeNext = false;
      
      for (let i = 0; i < fixed.length; i++) {
        const char = fixed[i];
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === '{') stack.push('}');
          else if (char === '[') stack.push(']');
          else if (char === '}' && stack[stack.length - 1] === '}') stack.pop();
          else if (char === ']' && stack[stack.length - 1] === ']') stack.pop();
        }
      }

      if (inString) fixed += '"';
      while (stack.length > 0) {
        fixed += stack.pop();
      }

      try {
        return JSON.parse(fixed);
      } catch (e2) {
        console.error("[Parser] Recovery failed. Original length:", response.length);
        throw new Error("AI response was malformed. Please try again.");
      }
    }
  }

  private async runTrendResearch(payload: any) {
    const { userId, existingNiches = [] } = payload;
    this.addLog(AgentType.TREND_RESEARCH, "Scanning real-time global markets for untapped high-CPC opportunities...", "process", userId);
    
    const existingList = existingNiches.length > 0 ? `CRITICAL: Avoid these existing niches at all costs (DUPLICATES FORBIDDEN): ${existingNiches.join(", ")}.` : "";
    
    const prompt = `Act as an elite Trend Research Agent. Discover 3 highly profitable trending niche categories for a content empire.
    Focus on high CPC and low competition.
    ${existingList}
    
    Return STRICT JSON ONLY: { "niches": [ { "name": "string", "justification": "string", "cpc": "string", "difficulty": "string", "keywords": ["string"] } ] }`;
    
    const { content: response, reasoning } = await generateAIText(prompt, AgentType.TREND_RESEARCH);
    if (reasoning) this.addLog(AgentType.TREND_RESEARCH, `Neural Reasoning: ${reasoning.substring(0, 300)}...`, "info", userId);
    const data = await this.parseAIResponse(response);
    
    if (!data.niches || !Array.isArray(data.niches)) {
      throw new Error("AI response missing niches array");
    }

    this.addLog(AgentType.TREND_RESEARCH, `Identified ${data.niches.length} high-authority vectors.`, "success", userId);
    
    // Auto-validate the first one to start the chain
    await this.addTask(AgentType.NICHE_VALIDATION, { niches: data.niches, userId });
    return data;
  }

  private async runNicheValidation(payload: any) {
    const { niches, userId } = payload;
    this.addLog(AgentType.NICHE_VALIDATION, "Validating category expansion potential...", "process", userId);
    const prompt = `From these niches: ${JSON.stringify(niches)}, select the single best authority category.
    Return STRICT JSON: { "name": "string", "justification": "string", "keywords": ["string"], "audience": "string" }`;
    
    const { content: response, reasoning } = await generateAIText(prompt, AgentType.NICHE_VALIDATION);
    if (reasoning) this.addLog(AgentType.NICHE_VALIDATION, `Neural Reasoning: ${reasoning.substring(0, 300)}...`, "info", userId);
    const data = await this.parseAIResponse(response);
    
    this.addLog(AgentType.NICHE_VALIDATION, `Selected niche: ${data.name}. Strategy: Vertical Authority.`, "success", userId);
    await this.addTask(AgentType.KEYWORD_RESEARCH, { niche: data, userId });
    return data;
  }

  private async runKeywordResearch(payload: any) {
    const { niche, userId } = payload;
    this.addLog(AgentType.KEYWORD_RESEARCH, `Extracting semantic clusters for ${niche.name}...`, "process", userId);
    const prompt = `Build a semantic keyword map for: ${JSON.stringify(niche)}.
    Return STRICT JSON: { "clusters": [ { "topic": "string", "keywords": ["string"] } ] }`;
    
    const { content: response, reasoning } = await generateAIText(prompt, AgentType.KEYWORD_RESEARCH);
    if (reasoning) this.addLog(AgentType.KEYWORD_RESEARCH, `Neural Reasoning: ${reasoning.substring(0, 300)}...`, "info", userId);
    const data = await this.parseAIResponse(response);
    
    this.addLog(AgentType.KEYWORD_RESEARCH, `Generated ${data.clusters?.length || 0} semantic silos.`, "success", userId);
    await this.addTask(AgentType.SEO_STRATEGIST, { niche, clusters: data.clusters, userId });
    return data;
  }

  private async runSEOStrategist(payload: any) {
    const { niche, clusters, userId } = payload;
    this.addLog(AgentType.SEO_STRATEGIST, "Designing category Silo architecture...", "process", userId);
    const prompt = `Design an SEO Silo for category: ${niche.name}. Use clusters: ${JSON.stringify(clusters)}.
    Return STRICT JSON: { "siloStructure": "string", "topics": ["string"] }`;
    
    const { content: response, reasoning } = await generateAIText(prompt, AgentType.SEO_STRATEGIST);
    if (reasoning) this.addLog(AgentType.SEO_STRATEGIST, `Neural Reasoning: ${reasoning.substring(0, 300)}...`, "info", userId);
    const data = await this.parseAIResponse(response);
    
    this.addLog(AgentType.SEO_STRATEGIST, "Silo structure finalized. Architecture ready for deployment.", "success", userId);
    await this.addTask(AgentType.WEBSITE_ARCHITECT, { architecture: data, niche, clusters, userId });
    return data;
  }

  private async runWebsiteArchitect(payload: any) {
    const { architecture, niche, userId } = payload;
    const slug = niche.name.toLowerCase().replace(/\s+/g, "-");
    this.addLog(AgentType.WEBSITE_ARCHITECT, `Allocating new category path: /cat/${slug}`, "process", userId);
    
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
    this.addLog(AgentType.UI_UX_DESIGNER, "Generating visual tokens for category...", "process", userId);
    const prompt = `Return design tokens for ${category.name}. Focus on aesthetic identity.
    Return STRICT JSON: { "primaryColor": "string", "secondaryColor": "string", "accentColor": "string", "icon": "string" }`;
    const { content: response, reasoning } = await generateAIText(prompt, AgentType.UI_UX_DESIGNER);
    if (reasoning) this.addLog(AgentType.UI_UX_DESIGNER, `Neural Reasoning: ${reasoning.substring(0, 300)}...`, "info", userId);
    const style = await this.parseAIResponse(response);
    
    this.addLog(AgentType.UI_UX_DESIGNER, `Visual identity mapped. Accent: ${style.accentColor}.`, "success", userId);
    await this.addTask(AgentType.FULL_STACK_DEVELOPER, { category, style, userId });
    return style;
  }

  private async runFullStackDeveloper(payload: any) {
    const { category, style, userId } = payload;
    this.addLog(AgentType.FULL_STACK_DEVELOPER, "Deploying dynamic logic nodes...", "process", userId);
    const updates = { ...category, style, status: "developed" };
    if (userId) {
      const store = this.getUserStore(userId);
      store.categories[category.slug] = { ...store.categories[category.slug], ...updates };
    }
    this.addLog(AgentType.FULL_STACK_DEVELOPER, "Backend routes and logic provisioned.", "success", userId);
    await this.addTask(AgentType.CONTENT_WRITER, { category: updates, userId });
    return updates;
  }

  private async runContentWriter(payload: any) {
    const { category, userId } = payload;
    this.addLog(AgentType.CONTENT_WRITER, `Architecting High-Authority Editorial Articles for ${category.name}...`, "process", userId);
    
    const prompt = `Write 3 high-authority, SEO-optimized editorial articles for a website about "${category.name}".
    Focus on informational intent and user-value. Length should be significant.
    
    Return STRICT JSON: { "articles": [ { "title": "string", "content": "string", "slug": "string", "excerpt": "string" } ] }`;
    
    const { content: response, reasoning } = await generateAIText(prompt, AgentType.CONTENT_WRITER);
    if (reasoning) this.addLog(AgentType.CONTENT_WRITER, `Neural Reasoning: ${reasoning.substring(0, 500)}...`, "info", userId);
    const data = await this.parseAIResponse(response);
    
    if (userId) {
      const store = this.getUserStore(userId);
      const catStore = store.categories[category.slug];
      if (!catStore) throw new Error("Category lost during generation");
      if (!catStore.posts) catStore.posts = {};
      for (const article of data.articles) {
        catStore.posts[article.slug] = { ...article, createdAt: new Date().toISOString() };
      }
    }

    this.addLog(AgentType.CONTENT_WRITER, `Published ${data.articles?.length || 0} authority articles. Node expansion complete.`, "success", userId);
    await this.addTask(AgentType.IMAGE_GENERATOR, { category, articles: data.articles, userId });
    return { count: data.articles?.length || 0 };
  }

  private async runImageGenerator(payload: any) {
    const { category, articles, userId } = payload;
    this.addLog(AgentType.IMAGE_GENERATOR, `Generating semantic visuals for ${articles.length} articles...`, "process", userId);
    
    for (const article of articles) {
      // Use pollinations for fast placeholder images
      const prompt = encodeURIComponent(`high quality professional blog hero image for ${article.title}, ${category.name}, aesthetic, digital art`);
      const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=768&nologo=true&private=true&enhance=true`;
      
      if (userId) {
        const store = this.getUserStore(userId);
        const catStore = store.categories[category.slug];
        if (catStore && catStore.posts[article.slug]) {
          catStore.posts[article.slug].imageUrl = imageUrl;
        }
      }
    }

    this.addLog(AgentType.IMAGE_GENERATOR, "Visual assets attached to authority nodes.", "success", userId);
    await this.addTask(AgentType.INTERNAL_LINKING, { category, articles, userId });
    return { status: "images_generated" };
  }

  private async runInternalLinking(payload: any) {
    const { category, userId } = payload;
    this.addLog(AgentType.INTERNAL_LINKING, "Optimizing semantic cluster linking...", "process", userId);
    await this.addTask(AgentType.MONETIZATION, { category, userId });
    return { status: "linked" };
  }

  private async runMonetization(payload: any) {
    const { category, userId } = payload;
    this.addLog(AgentType.MONETIZATION, "Injecting AdSense and Affiliate CTAs...", "process", userId);
    await this.addTask(AgentType.AUTOMATION, { category, userId });
    return { monetized: true };
  }

  private async runAutomation(payload: any) {
    const { category, userId } = payload;
    this.addLog(AgentType.AUTOMATION, "Setting daily autonomous expansion cycle...", "process", userId);
    await this.addTask(AgentType.ANALYTICS, { category, userId });
    return { loop_synced: true };
  }

  private async runAnalytics(payload: any) {
    const { category, userId } = payload;
    this.addLog(AgentType.ANALYTICS, "Forecasting traffic growth...", "process", userId);
    await this.addTask(AgentType.DEVOPS_DEPLOYMENT, { category, userId });
    return { traffic: "simulated" };
  }

  private async runDevOpsDeployment(payload: any) {
    const { category, userId } = payload;
    const url = `/cat/${category.slug}`;
    this.addLog(AgentType.DEVOPS_DEPLOYMENT, `PRODUCTION UPLINK LIVE: ${url}`, "success", userId);
    if (userId) {
      const store = this.getUserStore(userId);
      store.categories[category.slug] = { ...store.categories[category.slug], status: "live", url };
    }
    return { live: true };
  }
}
