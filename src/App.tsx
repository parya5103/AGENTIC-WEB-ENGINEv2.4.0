/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Rocket, 
  Search, 
  Layout, 
  PenTool, 
  Globe, 
  Zap, 
  ShieldCheck, 
  ExternalLink, 
  Activity,
  ChevronRight,
  Monitor,
  RefreshCcw,
  CheckCircle2,
  Trash2,
  Play,
  RotateCcw,
  Target,
  Brain,
  DollarSign,
  ArrowUpRight,
  Database,
  Bell,
  Settings,
  Clock,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { orchestrateStrategicPlan, type InvasionBlueprint } from "./lib/intelligence";
import { auth, db, signIntoApp, logoutFromApp } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, onSnapshot, doc, orderBy, limit } from "firebase/firestore";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";

// SaaS Components
import { Sidebar } from "./components/Sidebar";
import { PageHeader } from "./components/PageHeader";
import { StatsGrid } from "./components/StatsGrid";
import { NetworkChart } from "./components/NetworkChart";
import { NeuralTopologyMap } from "./components/NeuralTopologyMap";
import { ThinkingConsole } from "./components/ThinkingConsole";

interface Log {
  id: string;
  agent: string;
  message: string;
  type: "info" | "success" | "error" | "process";
  timestamp: string;
}

interface Site {
  id: string;
  title: string;
  niche: { name: string; selectedReason: string; targetAudience: string; estimatedCPC: string; competitionLvl: string };
  structure: { title: string; tagline: string; pages: string[]; colors: any; typography: string };
  variants: any[];
  articles: any[];
  stats: { traffic: number; revenue: number; growth: number };
  abTests?: Array<{ 
    variant: string; 
    name: string; 
    trafficShare: number; 
    conversions: number; 
    performance: number;
    sessions?: number;
    goal?: string;
    status?: 'active' | 'paused' | 'winner';
  }>;
  lastMaintenance?: string;
  persona?: { founderName: string; founderTitle: string; founderBio: string; missionVision: string };
  reliability?: { verified: boolean; accuracyScore: number; improvements: string[] };
  url: string;
  isDeployed: boolean;
  isDeploying?: boolean;
  deployProgress?: number;
  deployStatus?: string;
  deployError?: string;
  monetizationStrategy?: {
    ads: string[];
    affiliate: string[];
    premium: string[];
    suggestedSaaS?: string;
  };
  createdAt: string;
  thinkingTrace?: string[];
}

interface GlobalStats {
  totalRevenue: number;
  totalTraffic: number;
  activeSites: number;
  dailyGrowth: number;
  simulationEnabled?: boolean;
  history: Array<{ time: string; revenue: number; traffic: number }>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logs, setLogs] = useState<Log[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({ 
    totalRevenue: 0, 
    totalTraffic: 0, 
    activeSites: 0, 
    dailyGrowth: 1.2,
    simulationEnabled: true,
    history: [{ time: "00:00", revenue: 0, traffic: 0 }]
  });
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [siteToDeploy, setSiteToDeploy] = useState<Site | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());
  const [batchActionType, setBatchActionType] = useState<"delete" | "deploy" | null>(null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [blueprint, setBlueprint] = useState<InvasionBlueprint | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [strategyPrompt, setStrategyPrompt] = useState("");
  const [showConsole, setShowConsole] = useState(false);
  const [adsenseConfig, setAdsenseConfig] = useState({ publisherId: "", clientId: "" });
  const logEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // --- Firebase Auth & Lifecycle ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      console.log(`[Auth] User: ${u?.email || 'Guest'}`);
    });

    return () => unsubscribeAuth();
  }, []);

  // --- Real-time Sync (Firestore) ---
  useEffect(() => {
    if (!user) {
      setSites([]);
      setLogs([]);
      return;
    }

    // 1. Sync Assets
    const qAssets = query(collection(db, "users", user.uid, "assets"), orderBy("createdAt", "desc"));
    const unsubAssets = onSnapshot(qAssets, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Site));
      setSites(docs);
    });

    // 2. Sync Logs
    const qLogs = query(collection(db, "users", user.uid, "logs"), orderBy("timestamp", "desc"), limit(100));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Log)).reverse();
      setLogs(docs);
    });

    // 3. Sync Stats
    const unsubStats = onSnapshot(doc(db, "users", user.uid, "stats", "global"), (snapshot) => {
      if (snapshot.exists()) {
        setGlobalStats(snapshot.data() as GlobalStats);
      }
    });

    // 4. Sync Config
    const unsubConfig = onSnapshot(doc(db, "users", user.uid, "config", "adsense"), (snapshot) => {
      if (snapshot.exists()) {
        setAdsenseConfig(snapshot.data() as any);
      }
    });

    return () => {
      unsubAssets();
      unsubLogs();
      unsubStats();
      unsubConfig();
    };
  }, [user]);

  // --- Legacy Socket.io (for agent execution state) ---
  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on("status", (status: any) => {
      setIsRunning(status.running);
      setCurrentStep(status.step);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const startLoop = async () => {
    if (!user) return;
    await fetch("/api/start", { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid })
    });
  };

  const resetMetrics = async () => {
    if (!user || !confirm("This will reset all simulated dashboard revenue and traffic to zero. Continue?")) return;
    await fetch("/api/stats/reset", { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid })
    });
  };

  const toggleSimulation = async (enabled: boolean) => {
    if (!user) return;
    await fetch("/api/stats/toggle-simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, userId: user.uid })
    });
  };

  const generateStrategy = async () => {
    if (!strategyPrompt) return;
    setIsPlanning(true);
    try {
      const plan = await orchestrateStrategicPlan(strategyPrompt);
      setBlueprint(plan);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlanning(false);
    }
  };

  const syncMonetization = async () => {
    if (!user) return;
    await fetch("/api/monetization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...adsenseConfig, userId: user.uid })
    });
  };

  const deploySite = async (siteId: string) => {
    if (!user) return;
    await fetch("/api/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, userId: user.uid })
    });
  };

  const toggleSiteSelection = (siteId: string) => {
    setSelectedSiteIds(prev => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  };

  const executeBatchAction = async (action: "delete" | "deploy") => {
    if (!user || selectedSiteIds.size === 0) return;
    
    await fetch("/api/sites/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        siteIds: Array.from(selectedSiteIds),
        action,
        userId: user.uid 
      })
    });
    
    if (action === "delete") {
      setSelectedSiteIds(new Set());
    }
  };

  const generateMonetizationStrategy = async (siteId: string) => {
    setIsGeneratingStrategy(true);
    try {
      await fetch("/api/monetization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId })
      });
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const deleteSite = async (siteId: string) => {
    if (!user) return;
    await fetch(`/api/sites/${siteId}?userId=${user.uid}`, {
      method: "DELETE",
    });
  };

  const steps = [
    { name: "Discover", icon: Search },
    { name: "Analyze", icon: Zap },
    { name: "Build", icon: Layout },
    { name: "Write", icon: PenTool },
    { name: "SEO", icon: Activity },
    { name: "Deploy", icon: Globe },
    { name: "Monetize", icon: Database },
  ];

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-bg-light flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center text-white animate-pulse">
            <Rocket className="w-8 h-8" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted animate-pulse">Neural Handshake Active...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-bg-light flex flex-col">
        {/* Landing Nav */}
        <nav className="h-24 px-10 flex items-center justify-between border-b border-border bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white">
              <Rocket className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase tracking-tighter text-text-main line-clamp-1 leading-none">NicheFlow Agentic</span>
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1">Enterprise Asset Forge</span>
            </div>
          </div>
          <button 
            onClick={signIntoApp}
            className="px-8 py-3 bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand transition-all shadow-xl shadow-brand/10 active:scale-95"
          >
            Authenticate Terminal
          </button>
        </nav>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#0052FF08_0%,transparent_50%)]" />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8 max-w-4xl relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand/5 border border-brand/10 rounded-full text-[10px] font-black uppercase tracking-widest text-brand">
              <Zap className="w-3.5 h-3.5 fill-brand" />
              SaaS v4.22_STABLE Ready
            </div>
            <h1 className="text-7xl lg:text-9xl font-black tracking-tight text-text-main leading-none">
              Forge your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-black">Digital Empire.</span>
            </h1>
            <p className="text-lg lg:text-xl text-text-muted max-w-2xl mx-auto font-medium leading-relaxed italic">
              "Autonomous intelligence for the high-velocity niche economy. Deploy, scale, and dominate with agentic precision."
            </p>
            <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={signIntoApp}
                className="px-12 py-5 bg-gray-900 text-white rounded-3xl text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-brand transition-all hover:scale-105 active:scale-95 group"
              >
                Access Neural Core
                <ChevronRight className="inline-block ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            {/* Visual Teaser */}
            <div className="pt-20 grid grid-cols-3 gap-6 max-w-2xl mx-auto opacity-40">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-white border border-border rounded-2xl flex items-center justify-center">
                  <Globe className="w-6 h-6 text-text-main" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest">Global Deploy</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-white border border-border rounded-2xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-text-main" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest">Neural Trace</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-white border border-border rounded-2xl flex items-center justify-center">
                  <Database className="w-6 h-6 text-text-main" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest">High Yield</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer info */}
        <footer className="py-10 text-center border-t border-border opacity-20">
          <p className="text-[9px] font-black uppercase tracking-[0.6em]">Encrypted Handshake Required for Uplink</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-light text-text-main font-sans antialiased overflow-hidden selection:bg-brand/10 selection:text-brand">
      {/* SaaS Sidebar */}
      <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isRunning={isRunning} 
      />

      {/* Main Content Area */}
      <main className="flex-1 ml-80 flex flex-col h-full bg-[#FAFAFA] relative overflow-hidden">
        <PageHeader 
            title={activeTab}
            isRunning={isRunning}
            showConsole={showConsole}
            onToggleConsole={() => setShowConsole(!showConsole)}
            user={user}
            onLogout={logoutFromApp}
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 lg:p-12 scrollbar-none custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-[1600px] mx-auto space-y-12"
              >
                {/* Visual Stats Section */}
                <StatsGrid globalStats={globalStats} toggleSimulation={toggleSimulation} />

                {/* Core Data Visualizations */}
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-12 lg:col-span-8 space-y-8">
                    <NeuralTopologyMap 
                      sites={sites} 
                      setSelectedSite={setSelectedSite} 
                      setActiveTab={setActiveTab} 
                    />
                    
                    <div className="card-minimal p-8 group">
                      <div className="flex items-center justify-between mb-8">
                         <div className="flex items-center gap-3">
                            <Rocket className="w-5 h-5 text-brand" />
                            <h3 className="text-lg font-semibold text-text-main">Neural Empire Growth</h3>
                         </div>
                         <div className="flex bg-gray-50 p-1 rounded-xl border border-border">
                           <button className="px-4 py-1.5 bg-white shadow-sm rounded-lg text-xs font-bold text-brand">Revenue Velocity</button>
                           <button className="px-4 py-1.5 text-text-muted hover:text-text-main rounded-lg text-xs font-semibold transition-colors">Yield Optimization</button>
                         </div>
                      </div>
                      <div className="h-[400px] w-full">
                         <NetworkChart data={globalStats.history} />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
                    <div className="card-minimal p-8 flex flex-col relative overflow-hidden bg-white/50 backdrop-blur-sm h-full">
                        <div className="flex items-center justify-between mb-8">
                          <h4 className="flex items-center gap-2 stat-label">
                            <Activity className="w-3.5 h-3.5 text-brand" />
                            Autonomous Trace
                          </h4>
                          <span className="text-[10px] font-bold text-brand bg-brand-light px-2 py-0.5 rounded uppercase">Live Uplink</span>
                        </div>
                        <div className="space-y-8 flex-grow">
                           {logs.slice(-5).map((log, i) => (
                              <div key={i} className="flex gap-4 border-l-2 border-gray-100 pl-6 relative group/log hover:border-gray-300 transition-colors">
                                 <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-white border-2 border-gray-300 group-hover/log:border-brand transition-colors" />
                                 <div className="w-full">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="text-[10px] font-bold text-brand uppercase tracking-widest italic">
                                        {log.agent.replace(" Agent", "")}
                                      </div>
                                      <span className="text-[9px] text-text-muted font-bold font-mono">T-{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-[13px] leading-relaxed text-text-main font-medium opacity-80 line-clamp-2">
                                      "{log.message}"
                                    </p>
                                 </div>
                              </div>
                           ))}
                           {logs.length === 0 && (
                             <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-30 grayscale">
                               <RefreshCcw className="w-8 h-8 animate-spin" />
                               <p className="text-xs font-bold uppercase tracking-widest">Handshaking with Core...</p>
                             </div>
                           )}
                        </div>
                        <button 
                           onClick={() => setActiveTab("logs")}
                           className="mt-8 w-full py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-xs font-bold text-text-main transition-all border border-border uppercase tracking-widest"
                        >
                           Full Telemetry Matrix
                        </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "strategy" && (
              <motion.div 
                key="strategy"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="card-minimal p-12 bg-white/50 backdrop-blur-xl border-border relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 blur-[100px] -mr-48 -mt-48" />
                  
                  <div className="flex items-center gap-6 mb-12 relative z-10">
                    <div className="w-16 h-16 bg-brand text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-brand/20">
                      <Brain className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight text-text-main">Strategic Vision</h2>
                      <p className="text-sm text-text-muted mt-1 font-medium italic opacity-70 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" />
                        Synthesizing high-level market invasion blueprints via Gemini 3.1 Pro.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 mb-16 relative z-10">
                    <div className="flex gap-4">
                      <div className="flex-grow relative group">
                        <Search className={`w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 transition-colors ${
                          strategyPrompt.length > 0 && strategyPrompt.length < 15 ? 'text-amber-500' : 'text-text-muted group-focus-within:text-brand'
                        }`} />
                        <input 
                          type="text" 
                          value={strategyPrompt}
                          onChange={(e) => setStrategyPrompt(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && strategyPrompt.length >= 15 && generateStrategy()}
                          placeholder="Enter Niche Concept (e.g. AI-driven sustainable architecture for desert climates)..." 
                          className={`w-full pl-16 pr-24 py-6 bg-white border rounded-[24px] text-xl font-medium outline-none transition-all shadow-sm ${
                            strategyPrompt.length > 0 && strategyPrompt.length < 15 
                              ? 'border-amber-200 focus:ring-amber-50' 
                              : 'border-border focus:ring-brand/5 focus:border-brand/40'
                          }`}
                        />
                        <div className={`absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                          strategyPrompt.length === 0 ? 'text-text-muted' : 
                          strategyPrompt.length < 15 ? 'text-amber-500' : 'text-green-500'
                        }`}>
                          {strategyPrompt.length} / 15 chars
                        </div>
                      </div>
                      <button 
                        onClick={generateStrategy}
                        disabled={isPlanning || strategyPrompt.length < 15}
                        className="px-10 py-6 bg-gray-950 text-white rounded-[24px] font-bold hover:bg-gray-800 transition-all flex items-center gap-3 shadow-2xl disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 group/btn overflow-hidden relative"
                      >
                        <div className="absolute inset-0 bg-brand/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                        <span className="relative z-10 flex items-center gap-3">
                          {isPlanning ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
                          Synthesize Empire
                        </span>
                      </button>
                    </div>
                    {strategyPrompt.length > 0 && strategyPrompt.length < 15 && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] font-bold text-amber-600 uppercase tracking-widest pl-6 italic"
                      >
                        Core directive requires higher semantic density (min 15 chars)
                      </motion.p>
                    )}
                  </div>

                  {blueprint && (
                    <motion.div 
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-12 relative z-10"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="card-minimal p-8 bg-brand/5 border-brand/10 group hover:shadow-lg transition-all">
                          <div className="stat-label mb-3 text-brand flex items-center gap-2 uppercase">
                            <Globe className="w-3 h-3" /> Targeted Niche
                          </div>
                          <div className="text-3xl font-bold tracking-tight text-text-main leading-tight italic">"{blueprint.niche}"</div>
                        </div>
                        <div className="card-minimal p-8 bg-gray-50 border-gray-200 group hover:shadow-lg transition-all">
                          <div className="stat-label mb-3 flex items-center gap-2 uppercase">
                            <ShieldCheck className="w-3 h-3" /> Strategy Name
                          </div>
                          <div className="text-3xl font-bold tracking-tight text-text-main leading-tight">{blueprint.strategyName}</div>
                        </div>
                        <div className="card-minimal p-8 bg-green-50 border-green-100 group hover:shadow-lg transition-all">
                          <div className="stat-label mb-3 text-green-700 flex items-center gap-2 uppercase">
                            <Zap className="w-3 h-3" /> Structural Integrity
                          </div>
                          <div className="text-4xl font-black tracking-tighter text-green-600">{blueprint.structuralIntegrityScore}%</div>
                        </div>
                      </div>

                      <div className="p-12 bg-[#050505] rounded-[48px] text-white relative overflow-hidden shadow-2xl group border border-white/5">
                         <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-brand/10 blur-[120px] group-hover:bg-brand/20 transition-all duration-700" />
                         <div className="relative z-10 space-y-8">
                            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20">
                              <Search className="w-3.5 h-3.5 text-brand" />
                              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-light">Market Vulnerability Analysis</span>
                            </div>
                            <p className="text-4xl md:text-5xl font-light leading-[1.1] italic tracking-tight text-gray-100">
                               "{blueprint.marketGapFound}"
                            </p>
                         </div>
                      </div>

                      <div className="space-y-10">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold flex items-center gap-4">
                              <div className="w-2 h-10 bg-brand rounded-full shadow-[0_0_15px_rgba(17,17,17,0.3)]" />
                              Execution Roadmap
                            </h3>
                            <div className="text-[11px] font-bold tracking-widest text-text-muted bg-gray-50 px-4 py-2 rounded-xl border border-border">SYSTEM_VERIFIED_V4.2</div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                          {blueprint.phases.map((phase, i) => (
                            <div key={i} className="card-minimal p-8 group hover:border-brand hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer relative bg-white">
                              <div className="absolute top-6 right-8 text-5xl font-black text-gray-50 group-hover:text-brand/5 transition-colors pointer-events-none italic">0{i+1}</div>
                              <div className="relative z-10 space-y-6">
                                <span className="text-[9px] font-bold text-brand uppercase tracking-widest bg-brand/5 px-2 py-1 rounded-md border border-brand/10">Phase 0{i+1}</span>
                                <h4 className="text-xl font-bold text-text-main leading-none">{phase.name}</h4>
                                <p className="text-[13px] text-text-muted leading-relaxed font-medium">{phase.objective}</p>
                                <div className="pt-6 border-t border-gray-100 space-y-4">
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tactical Asset Mapping</div>
                                  <div className="flex flex-wrap gap-2">
                                    {phase.targetKeywords.slice(0, 4).map((kw, j) => (
                                      <span key={j} className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg group-hover:bg-brand-light/20 transition-colors">
                                        {kw}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="pt-4 flex items-center justify-between">
                                    <div className="text-[10px] font-bold text-brand uppercase tracking-widest">Allocation</div>
                                    <div className="text-[10px] font-bold text-text-main">{phase.aiResourceAllocation}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-center pt-16">
                        <button 
                          onClick={() => {
                            setLogs(prev => [...prev, { id: Date.now().toString(), agent: "Strategic Core", message: `Grounding identified market gap: "${blueprint.marketGapFound.substring(0, 50)}..."`, type: "info", timestamp: new Date().toISOString() }]);
                            setLogs(prev => [...prev, { id: (Date.now() + 1).toString(), agent: "Strategic Core", message: `Commencing automated invasion of ${blueprint.niche} segment.`, type: "success", timestamp: new Date().toISOString() }]);
                            setActiveTab("overview");
                            startLoop();
                          }}
                          className="group relative"
                        >
                          <div className="absolute -inset-1 bg-gradient-to-r from-brand to-gray-800 rounded-[32px] blur-xl opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                          <div className="relative px-16 py-8 bg-gray-950 text-white rounded-[32px] font-black uppercase tracking-[0.4em] text-sm hover:translate-y-[-2px] hover:shadow-2xl transition-all flex items-center gap-6">
                            Initialize Invasion Pipeline
                            <Rocket className="w-5 h-5 text-brand group-hover:rotate-45 transition-transform" />
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}
                  
                  {!blueprint && !isPlanning && (
                    <div className="py-32 flex flex-col items-center justify-center text-center space-y-8 opacity-40 grayscale group-hover:grayscale-0 transition-all">
                       <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <Target className="w-10 h-10 text-gray-400" />
                       </div>
                       <div>
                          <h4 className="text-2xl font-bold text-text-main">Awaiting Directives</h4>
                          <p className="text-sm font-medium mt-2">Enter a niche concept to begin strategic neural mapping.</p>
                       </div>
                    </div>
                  )}

                  {isPlanning && (
                    <div className="py-40 flex flex-col items-center justify-center space-y-10">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full border-2 border-gray-100 border-t-brand animate-spin" />
                            <Brain className="w-10 h-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand animate-pulse" />
                        </div>
                        <div className="text-center space-y-3">
                            <h4 className="text-2xl font-bold text-text-main animate-pulse">Designing Global Strategy</h4>
                            <p className="text-sm font-mono text-brand flex items-center justify-center gap-2">
                                <Activity className="w-3.5 h-3.5" />
                                Analyzing market vectors & semantic silos...
                            </p>
                        </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "sites" && (
              <motion.div 
                key="sites"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                {/* Top Action Row */}
                <div className="flex justify-between items-center card-minimal p-8 pl-10">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-text-main mb-1.5">Asset Management</h2>
                    <p className="text-xs font-medium text-text-muted">Manage, deploy, and monitor your generated web assets.</p>
                  </div>
                  <div className="flex gap-4">
                     <div className="relative">
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input 
                          type="text" 
                          placeholder="Search assets..." 
                          className="pl-11 pr-6 py-2.5 bg-gray-50 border border-border rounded-xl text-sm outline-none focus:bg-white focus:border-gray-300 transition-all w-72 text-text-main font-medium"
                        />
                     </div>
                     <button 
                        onClick={() => setActiveTab("strategy")}
                        className="px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all flex items-center gap-2 shadow-sm"
                     >
                        <Rocket className="w-4 h-4" /> 
                        Launch New Asset
                     </button>
                     <button className="p-2.5 bg-white border border-border rounded-xl text-text-muted hover:text-text-main hover:bg-gray-50 transition-all flex items-center justify-center">
                        <RefreshCcw className="w-4 h-4" /> 
                     </button>
                  </div>
                </div>

                {/* Practical Table View */}
                <div className="card-minimal overflow-hidden">
                  <div className="grid grid-cols-[60px,2.8fr,1fr,1.2fr,1fr,120px] px-8 py-4 border-b border-border text-xs font-semibold text-text-muted uppercase tracking-wider bg-gray-50/50">
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
                        checked={sites.length > 0 && selectedSiteIds.size === sites.length}
                        onChange={() => {
                          if (selectedSiteIds.size === sites.length) setSelectedSiteIds(new Set());
                          else setSelectedSiteIds(new Set(sites.map(s => s.id)));
                        }}
                      />
                    </div>
                    <div>Asset Identity</div>
                    <div>Market Data</div>
                    <div>Performance</div>
                    <div>Status</div>
                    <div className="text-right">Action</div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {sites.map((site, i) => (
                      <div 
                        key={i}
                        className={`grid grid-cols-[60px,2.8fr,1fr,1.2fr,1fr,120px] px-8 py-6 items-center transition-colors group cursor-pointer relative ${selectedSiteIds.has(site.id) ? 'bg-brand/5' : 'hover:bg-gray-50/50'}`}
                        onClick={() => { setSelectedSite(site); }}
                      >
                        <div className="absolute left-0 w-1 h-0 bg-brand group-hover:h-full transition-all duration-300 rounded-r" />
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                           <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
                            checked={selectedSiteIds.has(site.id)}
                            onChange={() => toggleSiteSelection(site.id)}
                          />
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden border border-border shrink-0 shadow-sm">
                              <img src={site.articles[0]?.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                           </div>
                           <div className="min-w-0">
                               <div className="flex items-center gap-2 mb-1.5">
                                  <div className="text-[10px] font-bold text-brand bg-brand-light px-2 py-0.5 rounded uppercase tracking-wider">{(site.niche?.name || "Niche").substring(0, 15)}</div>
                                  <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">ID-{(site.title || "0000").substring(0,4)}</span>
                               </div>
                              <div className="font-semibold text-lg tracking-tight text-text-main truncate group-hover:text-brand transition-colors">{site.structure?.title || site.title || "Untitled Asset"}</div>
                           </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <div className="text-lg font-semibold tracking-tight text-text-main">${site.niche?.estimatedCPC || 0} <span className="text-xs font-medium text-text-muted">CPC</span></div>
                           <div className={`text-[10px] font-bold uppercase tracking-wider ${(site.niche?.competitionLvl || 'medium') === 'low' ? 'text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded' : 'text-amber-600 bg-amber-50 w-fit px-2 py-0.5 rounded'}`}>
                               {(site.niche?.competitionLvl || "moderate").toUpperCase()} COMPETITION
                           </div>
                        </div>
                        <div>
                           <div className="text-xl font-semibold tracking-tight text-text-main mb-1.5 tabular-nums">{site.stats.traffic.toLocaleString()}</div>
                           <div className="flex items-center gap-1.5">
                              <div className="text-[10px] font-bold text-green-700 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                 <ArrowUpRight className="w-3 h-3" /> +$1.40/D
                              </div>
                           </div>
                        </div>
                        <div className="flex flex-col gap-4">
                           {site.isDeploying ? (
                             <div className="space-y-3 p-4 bg-brand/5 rounded-2xl border border-brand/10 relative overflow-hidden group/deploying">
                               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand/5 to-transparent -translate-x-full group-hover/deploying:translate-x-full transition-transform duration-[2000ms] ease-in-out" />
                               <div className="flex justify-between items-center relative z-10">
                                 <div className="flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                                   <span className="text-[10px] font-bold text-brand uppercase tracking-widest italic">{site.deployStatus || "Synchronizing"}</span>
                                 </div>
                                 <span className="text-[12px] font-black text-brand tabular-nums">{(site.deployProgress || 0).toFixed(1)}%</span>
                               </div>
                               <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200 relative">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${site.deployProgress || 0}%` }}
                                   className="h-full bg-gradient-to-r from-brand to-brand-dark transition-all duration-500 relative"
                                 >
                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                                 </motion.div>
                               </div>
                               <div className="flex items-center justify-between text-[9px] font-bold text-text-muted uppercase tracking-tighter opacity-70">
                                 <span>EST: {Math.max(0, 30 - Math.floor((site.deployProgress || 0) / 3.3))}s REMAINING</span>
                                 <Activity className="w-3 h-3 animate-pulse" />
                               </div>
                             </div>
                           ) : !site.isDeployed ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSiteToDeploy(site); }}
                                className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-semibold shadow-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 w-full"
                              >
                                <Rocket className="w-3 h-3" />
                                Deploy
                              </button>
                           ) : (
                              <div className="flex gap-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-50 border border-green-200 text-green-600 group/tt relative" title="Integrity Verified">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-light border border-gray-200 text-text-main group/tt relative" title="Structure Optimized">
                                  <Activity className="w-4 h-4 opacity-50" />
                                </div>
                              </div>
                           )}
                        </div>
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           {site.isDeployed && (
                             <button className="p-2.5 bg-gray-100 text-text-main rounded-lg hover:bg-brand hover:text-white transition-colors" title="Redeploy"><Rocket className="w-4 h-4" /></button>
                           )}
                           <button className="p-2.5 bg-gray-100 text-text-main rounded-lg hover:bg-brand hover:text-white transition-colors"><ExternalLink className="w-4 h-4" /></button>
                           <button 
                              onClick={() => setSiteToDelete(site)}
                              className="p-2.5 bg-gray-100 text-text-muted rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                              title="Delete Asset"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      </div>
                    ))}
                    {sites.length === 0 && (
                      <div className="py-32 flex flex-col items-center justify-center text-center px-8">
                        <div className="w-20 h-20 bg-gray-50 border border-border rounded-2xl flex items-center justify-center mb-6">
                          <Globe className="w-8 h-8 text-text-muted opacity-50" />
                        </div>
                        <h4 className="text-xl font-semibold text-text-main mb-2">No Assets Found</h4>
                        <p className="text-sm text-text-muted max-w-md">Your workspace is currently empty. Initiate the generation pipeline from the overview tab to create your first asset.</p>
                      </div>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {selectedSiteIds.size > 0 && activeTab === "sites" && (
                      <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/10 text-white rounded-3xl p-4 shadow-2xl flex items-center gap-6 z-50 w-full max-w-xl px-6 backdrop-blur-xl"
                      >
                        <div className="flex items-center gap-3 pr-6 border-r border-white/10">
                          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center font-bold text-lg">{selectedSiteIds.size}</div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 italic">Items Selected</div>
                        </div>
                        <div className="flex-1 flex gap-3">
                          <button 
                            onClick={() => executeBatchAction("deploy")}
                            className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/5"
                          >
                            <Rocket className="w-4 h-4" /> Deploy
                          </button>
                          <button 
                            onClick={() => setBatchActionType("delete")}
                            className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-100 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-red-500/20"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                        <button 
                          onClick={() => setSelectedSiteIds(new Set())}
                          className="p-3 text-white/40 hover:text-white transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {activeTab === "logs" && (
              <motion.div 
                key="logs"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6 h-[calc(100vh-160px)] flex flex-col"
              >
                <div className="flex justify-between items-center card-minimal p-8 pl-10">
                   <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-text-main mb-1.5">Agent Logs</h2>
                    <p className="text-xs font-medium text-text-muted">Real-time telemetry and execution traces across the node network</p>
                  </div>
                  <div className="flex gap-4">
                     <button className="px-6 py-2.5 bg-white border border-border rounded-xl text-sm font-medium text-text-muted hover:text-text-main hover:bg-gray-50 transition-colors">Clear Logs</button>
                     <button className="px-6 py-2.5 bg-gray-900 border border-transparent text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-gray-800 transition-colors">Download Trace</button>
                  </div>
                </div>

                <div className="flex-grow card-minimal p-0 overflow-hidden flex flex-col relative group">
                  <div className="flex items-center justify-between px-8 py-5 border-b border-border bg-gray-50/50">
                     <div className="flex gap-8">
                        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                           <div className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" /> 
                           Primary Core: <span className="text-text-main">Gemini 3.1 Pro</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                           <div className="w-2.5 h-2.5 rounded-full bg-green-500" /> 
                           Self-Healing: <span className="text-text-main">Connected</span>
                        </div>
                     </div>
                     <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider bg-white px-2.5 py-1 rounded-md border border-border">v4.22_CORE_STABLE</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 p-8 scrollbar-none relative z-10">
                    {logs.map((log) => (
                      <div key={log.id} className="flex gap-6 group relative items-start hover:bg-gray-50/50 p-2 rounded-lg transition-colors">
                        <span className="text-[11px] font-mono text-text-muted shrink-0 mt-1.5 tabular-nums text-right w-24">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <div className="flex flex-col flex-1">
                           <div className="flex items-center gap-3 mb-1.5">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider border ${
                                log.type === "success" ? "bg-green-50 text-green-700 border-green-200" : 
                                log.type === "error" ? "bg-red-50 text-red-700 border-red-200" : 
                                log.type === "process" ? "bg-brand-light text-text-main border-gray-200" : "bg-gray-50 text-text-muted border-border"
                              }`}>
                                {log.agent.replace(" Agent", "")}
                              </span>
                           </div>
                           <p className={`text-[13px] font-medium leading-relaxed ${
                             log.type === "error" ? "text-red-600" : "text-text-main"
                           }`}>
                             {log.message}
                           </p>
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && (
                       <div className="h-full flex flex-col items-center justify-center opacity-40 py-32">
                          <Activity className="w-12 h-12 mb-4 animate-pulse text-text-muted" />
                          <p className="text-sm font-semibold uppercase tracking-wider text-text-muted">Awaiting stream initialization</p>
                       </div>
                    )}
                    <div ref={logEndRef} />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface to-transparent pointer-events-none z-10" />
                </div>
              </motion.div>
            )}
            {activeTab === "config" && (
              <motion.div 
                key="config"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-[1000px] mx-auto space-y-8"
              >
                <div className="card-minimal p-10 bg-white/50 backdrop-blur-xl border-border relative overflow-hidden">
                   <div className="flex items-center gap-6 mb-12">
                      <div className="w-16 h-16 bg-gray-900 text-white rounded-3xl flex items-center justify-center shadow-xl">
                         <Settings className="w-8 h-8" />
                      </div>
                      <div>
                         <h2 className="text-3xl font-bold tracking-tight text-text-main">Neural Configuration</h2>
                         <p className="text-sm text-text-muted mt-1 font-medium italic opacity-70">Global core parameters and platform identity.</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block pl-1">Primary Engine</label>
                         <div className="p-4 bg-gray-50 border border-border rounded-xl text-sm font-bold text-text-main flex items-center gap-3">
                            <Zap className="w-4 h-4 text-brand" />
                            Gemini 3.1 Pro (asia-south1)
                         </div>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block pl-1">System Version</label>
                         <div className="p-4 bg-gray-50 border border-border rounded-xl text-sm font-bold text-text-main flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4 text-brand" />
                            v4.22_CORE_STABLE
                         </div>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block pl-1">Data Residency</label>
                         <div className="p-4 bg-gray-50 border border-border rounded-xl text-sm font-bold text-text-main flex items-center gap-3">
                            <Globe className="w-4 h-4 text-brand" />
                            Firestore Global Edge
                         </div>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block pl-1">Neural Capacity</label>
                         <div className="p-4 bg-gray-50 border border-border rounded-xl text-sm font-bold text-text-main flex items-center gap-3">
                            <Activity className="w-4 h-4 text-brand" />
                            75% / 100k Tokens
                         </div>
                      </div>
                   </div>

                   <div className="mt-12 pt-12 border-t border-border flex justify-end">
                      <button className="px-10 py-4 bg-gray-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-brand transition-all active:scale-95">
                         Save Core Directives
                      </button>
                   </div>
                </div>

                <div className="card-minimal p-10 bg-red-50 border-red-100">
                    <h3 className="text-lg font-black text-red-700 uppercase tracking-tight flex items-center gap-3 mb-4">
                       <Trash2 className="w-5 h-5" />
                       Danger Zone
                    </h3>
                    <p className="text-xs font-semibold text-red-600/70 mb-6">Irreversible actions that affect your entire neural network.</p>
                    <button 
                      onClick={resetMetrics}
                      className="px-8 py-3 bg-white border border-red-200 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    >
                       Purge All Network Stats
                    </button>
                </div>
              </motion.div>
            )}

            {activeTab === "settings" && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-[1000px] mx-auto space-y-8"
              >
                <div className="card-minimal p-12 bg-white/50 backdrop-blur-xl border-border relative overflow-hidden">
                   <div className="flex items-center gap-6 mb-12">
                      <div className="w-16 h-16 bg-brand text-white rounded-3xl flex items-center justify-center shadow-xl shadow-brand/20">
                         <Zap className="w-8 h-8 fill-current" />
                      </div>
                      <div>
                         <h2 className="text-3xl font-bold tracking-tight text-text-main">Synergy Integrations</h2>
                         <p className="text-sm text-text-muted mt-1 font-medium italic opacity-70">Connect third-party neural nodes and economic uplinks.</p>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="p-8 rounded-3xl border border-border bg-white group hover:shadow-xl transition-all flex items-center justify-between">
                         <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-text-main group-hover:bg-brand group-hover:text-white transition-all">
                               <Monitor className="w-7 h-7" />
                            </div>
                            <div>
                               <h4 className="text-lg font-bold text-text-main">Google AdSense</h4>
                               <p className="text-xs font-medium text-text-muted mt-1 italic">Economic extraction & yield optimization.</p>
                            </div>
                         </div>
                         <button 
                            onClick={() => setActiveTab("monetization")}
                            className="px-6 py-2.5 bg-gray-50 border border-border rounded-xl text-xs font-bold text-text-main hover:bg-gray-100 transition-all border-dashed"
                          >
                            Configure Sync
                         </button>
                      </div>

                      <div className="p-8 rounded-3xl border border-border bg-white group hover:shadow-xl transition-all flex items-center justify-between opacity-50">
                         <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-text-main">
                               <Globe className="w-7 h-7" />
                            </div>
                            <div>
                               <h4 className="text-lg font-bold text-text-main">Vercel Edge</h4>
                               <p className="text-xs font-medium text-text-muted mt-1 italic">High-velocity global deployment nodes.</p>
                            </div>
                         </div>
                         <div className="px-6 py-2.5 bg-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-muted">
                            Offline
                         </div>
                      </div>

                      <div className="p-8 rounded-3xl border border-border bg-white group hover:shadow-xl transition-all flex items-center justify-between opacity-50">
                         <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-text-main">
                               <ExternalLink className="w-7 h-7" />
                            </div>
                            <div>
                               <h4 className="text-lg font-bold text-text-main">Amazon Affiliates</h4>
                               <p className="text-xs font-medium text-text-muted mt-1 italic">Product extraction & referral nodes.</p>
                            </div>
                         </div>
                         <div className="px-6 py-2.5 bg-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-muted">
                            Offline
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === "monetization" && (
              <motion.div 
                key="monetization"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-[1400px] mx-auto space-y-12"
              >
                <div className="card-minimal p-12 bg-white/50 backdrop-blur-xl border-border relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 blur-[100px] -mr-48 -mt-48" />
                  
                  <div className="flex items-center justify-between mb-12 relative z-10">
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-brand text-white rounded-[24px] flex items-center justify-center shadow-2xl shadow-brand/20">
                           <Rocket className="w-8 h-8" />
                        </div>
                        <div>
                           <h2 className="text-3xl font-bold tracking-tight text-text-main">Monetization Engine</h2>
                           <p className="text-sm text-text-muted mt-1 font-medium italic opacity-70">Synthesizing high-yield ad placement architectures.</p>
                        </div>
                     </div>
                     <button className="flex items-center gap-2 px-6 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-border text-[10px] font-bold uppercase tracking-widest text-text-main transition-all">
                        <Activity className="w-4 h-4 text-brand" />
                        Live Yield Trace
                     </button>
                  </div>

                  <div className="grid grid-cols-12 gap-12 relative z-10">
                     <div className="col-span-12 lg:col-span-12 space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           {/* AdSense Configuration */}
                           <div className="card-minimal p-10 bg-white/80 border-border group hover:shadow-2xl transition-all duration-500">
                              <div className="flex items-center gap-5 mb-10 text-text-main">
                                 <div className="p-3 bg-gray-950 text-white rounded-2xl shadow-xl group-hover:rotate-12 transition-transform">
                                    <Monitor className="w-6 h-6" />
                                 </div>
                                 <div>
                                    <h3 className="text-xl font-bold tracking-tight">Google AdSense</h3>
                                    <p className="text-[10px] font-bold text-brand uppercase tracking-widest mt-1">Core Revenue Uplink</p>
                                 </div>
                              </div>

                              <div className="space-y-6">
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block pl-1">Publisher ID</label>
                                    <input 
                                      type="text" 
                                      placeholder="pub-0123456789012345"
                                      value={adsenseConfig.publisherId}
                                      onChange={(e) => setAdsenseConfig(prev => ({ ...prev, publisherId: e.target.value }))}
                                      className="w-full bg-gray-50 border border-border p-5 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand/40 focus:bg-white transition-all text-text-main shadow-inner"
                                    />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block pl-1">Client ID</label>
                                    <input 
                                      type="text" 
                                      placeholder="ca-pub-0123456789012345"
                                      value={adsenseConfig.clientId}
                                      onChange={(e) => setAdsenseConfig(prev => ({ ...prev, clientId: e.target.value }))}
                                      className="w-full bg-gray-50 border border-border p-5 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand/40 focus:bg-white transition-all text-text-main shadow-inner"
                                    />
                                 </div>
                                 <button 
                                    onClick={syncMonetization}
                                    className="w-full py-5 bg-gray-950 text-white rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-2xl hover:bg-gray-800 transition-all flex items-center justify-center gap-3 active:scale-95"
                                 >
                                    Handshake Ad Server
                                 </button>
                              </div>
                           </div>

                           {/* Analysis & Generation */}
                           <div className="card-minimal p-10 bg-white/80 border-border group hover:shadow-2xl transition-all duration-500 flex flex-col">
                              <div className="flex items-center gap-5 mb-10 text-text-main">
                                 <div className="p-3 bg-brand text-white rounded-2xl shadow-xl group-hover:rotate-[-12deg] transition-transform">
                                    <Zap className="w-6 h-6 fill-current" />
                                 </div>
                                 <div>
                                    <h3 className="text-xl font-bold tracking-tight">Yield Optimization</h3>
                                    <p className="text-[10px] font-bold text-brand uppercase tracking-widest mt-1">Autonomous Strategy Lab</p>
                                 </div>
                              </div>

                              <div className="space-y-8 flex-grow flex flex-col">
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block pl-1">Target Asset Identity</label>
                                    <select 
                                      value={selectedSite?.id || ""}
                                      onChange={(e) => {
                                        const siteId = e.target.value;
                                        const found = sites.find(s => s.id === siteId);
                                        setSelectedSite(found || null);
                                      }}
                                      className="w-full bg-gray-50 border border-border p-5 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand/40 focus:bg-white transition-all text-text-main cursor-pointer"
                                    >
                                      <option value="">Select managed node...</option>
                                      {sites.map(s => (
                                        <option key={s.id} value={s.id}>{s.structure?.title || s.title}</option>
                                      ))}
                                    </select>
                                 </div>

                                 {selectedSite && (
                                   <div className="flex-grow flex flex-col justify-end">
                                      {!selectedSite.monetizationStrategy ? (
                                        <button 
                                          onClick={() => generateMonetizationStrategy(selectedSite.id)}
                                          disabled={isGeneratingStrategy}
                                          className="w-full py-6 bg-brand text-white rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-xl group-hover:shadow-brand/20 transition-all flex items-center justify-center gap-4 disabled:opacity-50 active:scale-95"
                                        >
                                          {isGeneratingStrategy ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                                          {isGeneratingStrategy ? "Synthesizing..." : "Initiate Strategy Pulse"}
                                        </button>
                                      ) : (
                                        <div className="space-y-6">
                                           <div className="p-6 bg-gray-950 text-white rounded-2xl relative overflow-hidden group">
                                              <div className="absolute bottom-0 right-0 w-24 h-24 bg-brand/20 blur-[60px]" />
                                              <div className="relative z-10 flex items-center justify-between">
                                                 <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-brand-light uppercase tracking-widest">Optimized Expansion</p>
                                                    <p className="text-sm font-bold italic line-clamp-1">"{selectedSite.monetizationStrategy.suggestedSaaS}"</p>
                                                 </div>
                                                 <Target className="w-5 h-5 text-brand" />
                                              </div>
                                           </div>
                                           <button 
                                              onClick={() => generateMonetizationStrategy(selectedSite.id)}
                                              className="w-full py-4 text-[10px] font-bold text-brand uppercase tracking-[0.3em] hover:opacity-80 transition-opacity flex items-center justify-center gap-3 border border-brand/20 rounded-2xl"
                                           >
                                              <RotateCcw className="w-3.5 h-3.5" /> Re-Model Blueprint
                                           </button>
                                        </div>
                                      )}
                                   </div>
                                 )}
                              </div>
                           </div>
                        </div>

                        {selectedSite?.monetizationStrategy && (
                          <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-3 gap-8"
                          >
                             <div className="card-minimal p-8 bg-gray-50/50 hover:bg-white transition-colors border-border">
                                <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-6 flex items-center gap-2">
                                   <Monitor className="w-3.5 h-3.5 text-brand" /> Placement Protocol
                                </div>
                                <ul className="space-y-4">
                                   {selectedSite.monetizationStrategy.ads.map((ad, idx) => (
                                     <li key={idx} className="flex gap-4 items-start">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-1.5" />
                                        <span className="text-[13px] font-bold text-text-main italic leading-tight">{ad}</span>
                                     </li>
                                   ))}
                                </ul>
                             </div>
                             <div className="card-minimal p-8 bg-gray-50/50 hover:bg-white transition-colors border-border">
                                <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-6 flex items-center gap-2">
                                   <ExternalLink className="w-3.5 h-3.5 text-brand" /> Affiliate Handshake
                                </div>
                                <ul className="space-y-4">
                                   {selectedSite.monetizationStrategy.affiliate.map((aff, idx) => (
                                     <li key={idx} className="flex gap-4 items-start">
                                        <div className="w-1.5 h-1.5 rounded-full bg-black shrink-0 mt-1.5" />
                                        <span className="text-[13px] font-bold text-text-main italic leading-tight">{aff}</span>
                                     </li>
                                   ))}
                                </ul>
                             </div>
                             <div className="card-minimal p-8 bg-gray-950 text-white hover:bg-black transition-colors border-white/10 group">
                                <div className="text-[10px] font-bold text-brand uppercase tracking-widest mb-6 flex items-center gap-2">
                                   <Rocket className="w-3.5 h-3.5" /> Growth Vectors
                                </div>
                                <div className="space-y-6">
                                   {selectedSite.monetizationStrategy.premium.map((p, idx) => (
                                     <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group-hover:bg-white/10 transition-colors">
                                        <span className="text-xs font-black uppercase tracking-widest">{p}</span>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
                                     </div>
                                   ))}
                                   <div className="pt-4 border-t border-white/5">
                                      <p className="text-[11px] font-medium text-white/50 leading-relaxed italic">"Neural extraction recommends scaling into managed SaaS service for maximum retention."</p>
                                   </div>
                                </div>
                             </div>
                          </motion.div>
                        )}
                     </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>      {/* Modern Detail Overlay */}
      <AnimatePresence>
        {selectedSite && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex justify-end"
            onClick={() => setSelectedSite(null)}
          >
             <motion.div 
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 40, stiffness: 300, mass: 0.8 }}
              className="w-[1200px] h-full bg-white flex flex-col overflow-hidden rounded-l-3xl shadow-2xl border-l border-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-28 border-b border-border flex items-center justify-between px-12 shrink-0 bg-gray-50/80">
                 <div className="flex items-center gap-8">
                    <button onClick={() => setSelectedSite(null)} className="p-3 bg-white border border-border hover:bg-gray-50 text-text-main rounded-xl transition-colors shadow-sm">
                      <ChevronRight className="w-6 h-6 rotate-180" />
                    </button>
                    <div>
                       <h3 className="text-2xl font-bold tracking-tight text-text-main mb-1.5">{selectedSite.structure?.title || selectedSite.title || "Untitled Asset"}</h3>
                       <div className="flex items-center gap-3">
                          <div className="text-[10px] text-brand font-bold uppercase tracking-wider bg-brand-light border border-transparent px-2.5 py-0.5 rounded-md">ASSET: {(selectedSite.title || selectedSite.structure?.title || "SITE").toUpperCase().replace(/\s+/g, "_")}</div>
                          {selectedSite.isDeployed ? (
                             <div className="text-[10px] text-green-700 font-bold uppercase tracking-wider bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-md flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> ONLINE</div>
                          ) : (
                             <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> STANDBY</div>
                          )}
                       </div>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <a 
                      href={selectedSite.isDeployed ? `/site/${selectedSite.id}` : "#"} 
                      onClick={(e) => { 
                        if(!selectedSite.isDeployed) { 
                          e.preventDefault(); 
                          deploySite(selectedSite.id); 
                        } 
                      }}
                      target={selectedSite.isDeployed ? "_blank" : undefined}
                      className={`px-6 py-3 border rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 group ${selectedSite.isDeployed ? 'bg-white border-border text-text-main hover:bg-gray-50 shadow-sm' : 'bg-brand border-brand text-white shadow-sm hover:bg-brand/90'}`}
                    >
                      {selectedSite.isDeployed ? <ExternalLink className="w-4 h-4 text-text-muted group-hover:text-text-main" /> : <Rocket className="w-4 h-4" />}
                      {selectedSite.isDeployed ? "View Live" : "Deploy Site"}
                    </a>
                    <button className="px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-gray-800 transition-colors">
                      Optimize Content
                    </button>
                    <button 
                      onClick={() => setSiteToDelete(selectedSite)}
                      className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-colors border border-red-100"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12 bg-surface scrollbar-none">
                 <div className="max-w-5xl mx-auto space-y-16">
                             {/* Immersive Preview */}
                             <div className="grid grid-cols-12 gap-8 items-start">
                                <div className="col-span-12 lg:col-span-8 space-y-8">
                                  <div className="relative group rounded-3xl overflow-hidden border border-border shadow-md bg-white">
                                    <div className="aspect-[16/9] relative">
                                        <div className="absolute top-0 left-0 w-full h-10 bg-gray-100 flex items-center px-4 gap-2 z-10 border-b border-border">
                                          <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                                          <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                                          <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                                          <div className="flex-grow flex justify-center">
                                            <span className="text-[10px] font-mono text-text-muted">Live Uplink Stream</span>
                                          </div>
                                        </div>
                                        <iframe 
                                          src={`/site/${(selectedSite.title || selectedSite.structure?.title || "untitled").toLowerCase().replace(/\s+/g, "-")}`}
                                          className="w-full h-full pt-10 bg-white"
                                          title="Site Preview"
                                        />
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="col-span-12 lg:col-span-4 space-y-6">
                                  <div className="card-minimal p-6 bg-gray-950 text-green-400 font-mono text-[11px] h-full shadow-2xl border-white/5">
                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10 opacity-70">
                                      <Zap className="w-3 h-3 text-brand-light" />
                                      <span className="text-[9px] font-bold uppercase tracking-widest text-brand-light">NEURAL_THINKING_TRACE</span>
                                    </div>
                                    <div className="space-y-4">
                                      {selectedSite.thinkingTrace ? selectedSite.thinkingTrace.map((trace, i) => (
                                        <motion.div 
                                          key={i}
                                          initial={{ x: -10, opacity: 0 }}
                                          animate={{ x: 0, opacity: 1 }}
                                          transition={{ delay: i * 0.1 }}
                                          className="flex gap-3"
                                        >
                                          <span className="text-white/20 select-none">›</span>
                                          <p>{trace}</p>
                                        </motion.div>
                                      )) : (
                                        <div className="space-y-4 opacity-50">
                                          <p>-- Connecting to synaptic history --</p>
                                          <p>Initializing analysis matrices...</p>
                                          <p>Recovering trace memory from secure enclave...</p>
                                          <div className="h-4 flex items-center justify-center">
                                            <RefreshCcw className="w-4 h-4 animate-spin" />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="mt-8 pt-4 border-t border-white/10 opacity-40 italic">
                                      LOCKED_VERSION_4.2.2_STABLE
                                    </div>
                                  </div>
                                </div>
                             </div>

                     <div className="grid grid-cols-5 gap-12">
                        <div className="col-span-3 space-y-12">
                           {/* Variant Laboratory: Configuration */}
                           <div className="card-minimal p-8 space-y-8">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                   <div className="p-2.5 bg-brand-light rounded-lg text-brand">
                                      <Zap className="w-5 h-5" />
                                   </div>
                                   <div>
                                      <h4 className="text-lg font-bold text-text-main">A/B Testing Lab</h4>
                                      <div className="text-xs font-semibold text-text-muted mt-0.5">Variant Configuration</div>
                                   </div>
                                </div>
                                <div className="flex gap-3">
                                   <button 
                                     onClick={() => {
                                       setLogs(prev => [...prev, { id: Date.now().toString(), agent: "System", message: "Configuration reset to original variant parameters.", type: "info", timestamp: new Date().toISOString() }]);
                                     }}
                                     className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-text-main hover:bg-gray-50 transition-colors"
                                   >
                                     Reset
                                   </button>
                                   <button 
                                     onClick={() => {
                                       setLogs(prev => [...prev, { id: Date.now().toString(), agent: "System", message: "Neural structure configuration saved to database.", type: "success", timestamp: new Date().toISOString() }]);
                                     }}
                                     className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors shadow-sm"
                                   >
                                     Save Config
                                   </button>
                                </div>
                              </div>

                              <div className="space-y-6">
                                 <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-border">
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 bg-white border border-border rounded-lg flex items-center justify-center text-text-muted">
                                          <Settings className="w-5 h-5" />
                                       </div>
                                       <div>
                                          <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Primary Target</div>
                                          <div className="text-sm font-bold text-text-main">{selectedSite.abTests?.[0]?.goal || 'Conversion_Efficiency'}</div>
                                       </div>
                                    </div>
                                    <select className="bg-white border border-border rounded-lg px-4 py-2 text-xs font-semibold text-text-main outline-none focus:border-gray-400 transition-colors appearance-none cursor-pointer">
                                       <option>Maximize Revenue</option>
                                       <option>Reduce Bounce Rate</option>
                                       <option>Expand Dwell Time</option>
                                       <option selected>Conversion Efficiency</option>
                                    </select>
                                 </div>

                                 <div className="grid grid-cols-1 gap-4">
                                    {selectedSite.abTests?.map((test, i) => (
                                      <div key={i} className="p-6 bg-white rounded-2xl border border-border hover:border-gray-300 transition-colors">
                                         <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                               <div className="w-8 h-8 bg-gray-50 rounded-md border border-border flex items-center justify-center text-xs font-bold text-text-muted">0{i+1}</div>
                                               <input 
                                                 defaultValue={test.name}
                                                 className="bg-transparent text-lg font-bold text-text-main outline-none border-b border-transparent focus:border-gray-300 transition-colors w-48"
                                               />
                                            </div>
                                            <div className="flex items-center gap-2">
                                               <div className={`w-2.5 h-2.5 rounded-full ${test.status === 'active' || !test.status ? 'bg-green-500' : 'bg-amber-500'}`} />
                                               <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{test.status || 'Active'}</span>
                                            </div>
                                         </div>
                                         
                                         <div className="space-y-4">
                                            <div className="flex justify-between items-end">
                                               <div>
                                                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Traffic Share</div>
                                                  <div className="text-2xl font-bold text-text-main">{test.trafficShare}%</div>
                                               </div>
                                            </div>
                                            <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                               <div 
                                                 className="absolute inset-y-0 left-0 bg-brand transition-all duration-500" 
                                                 style={{ width: `${test.trafficShare}%` }} 
                                               />
                                               <input 
                                                 type="range" 
                                                 className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                                 defaultValue={test.trafficShare}
                                                 min="0"
                                                 max="100"
                                               />
                                            </div>
                                            <div className="flex justify-between items-center pt-2">
                                               <div className="flex gap-6">
                                                  <div>
                                                     <div className="text-[10px] font-semibold text-text-muted mb-0.5">Conversions</div>
                                                     <div className="text-sm font-bold text-text-main">{test.conversions.toLocaleString()}</div>
                                                  </div>
                                                  <div>
                                                     <div className="text-[10px] font-semibold text-text-muted mb-0.5">Sessions</div>
                                                     <div className="text-sm font-bold text-text-main">{(test.conversions * 12.5).toFixed(0)}</div>
                                                  </div>
                                               </div>
                                               <button className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-text-muted">
                                                  <Trash2 className="w-4 h-4" />
                                               </button>
                                            </div>
                                         </div>
                                      </div>
                                    ))}
                                    <button className="p-8 border border-border border-dashed rounded-2xl hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center gap-4 text-text-muted hover:text-text-main h-full min-h-[200px] transition-all">
                                       <div className="p-3 bg-white rounded-2xl border border-border shadow-sm">
                                          <PenTool className="w-5 h-5" />
                                       </div>
                                       <span className="text-sm font-semibold tracking-wider">New Variant</span>
                                    </button>
                                 </div>
                              </div>
                           </div>

                           {/* A/B Test Results */}
                           {selectedSite.abTests && selectedSite.abTests.length > 0 && (
                             <div className="card-minimal border-brand-light p-8 space-y-8 bg-brand-light/30">
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className="text-brand p-2 bg-white rounded-lg shadow-sm border border-border">
                                        <Zap className="w-5 h-5" />
                                     </div>
                                     <h4 className="text-lg font-bold text-text-main">Performance Results</h4>
                                  </div>
                                  <span className="text-[10px] font-bold text-brand bg-white px-2.5 py-1 rounded-md uppercase tracking-wider border border-border shadow-sm">Active Experiment</span>
                                </div>
                               
                               <div className="grid grid-cols-2 gap-6">
                                 {selectedSite.abTests.map((test, i) => (
                                   <div key={i} className={`p-6 rounded-2xl border transition-colors ${test.performance > (selectedSite.abTests?.[1-i]?.performance || 0) ? "bg-white border-brand-light shadow-sm" : "bg-gray-50/50 border-transparent"}`}>
                                      <div className="flex justify-between items-start mb-4">
                                         <div>
                                            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{test.name}</div>
                                            <div className="text-2xl font-bold text-text-main">{test.performance}% <span className="text-xs font-semibold opacity-60">CNV</span></div>
                                         </div>
                                         {test.performance > (selectedSite.abTests?.[1-i]?.performance || 0) && (
                                           <div className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" /> Winner</div>
                                         )}
                                      </div>
                                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                                        <div className={`h-full rounded-full transition-all duration-1000 ${test.performance > (selectedSite.abTests?.[1-i]?.performance || 0) ? "bg-brand" : "bg-gray-300"}`} style={{ width: `${test.performance}%` }} />
                                      </div>
                                      <div className="flex justify-between text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                                        <span>{test.conversions} CONV.</span>
                                        <span>{test.trafficShare}% TRAFFIC</span>
                                      </div>
                                   </div>
                                 ))}
                               </div>
                               <div className="p-4 bg-white rounded-xl border border-border flex items-center gap-3 text-sm font-medium text-text-main">
                                  <Activity className="w-4 h-4 text-brand shrink-0" />
                                  <p>AI Recommendation: Reroute 100% traffic to <strong>{selectedSite.abTests.reduce((prev, current) => (prev.performance > current.performance) ? prev : current).name}</strong> for optimal yield.</p>
                               </div>
                             </div>
                           )}

                           <div className="space-y-4">
                              <div className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
                                <div className="w-4 h-[2px] bg-brand" />
                                Niche Thesis
                              </div>
                              <h4 className="text-2xl font-bold tracking-tight text-text-main">"{selectedSite.niche.selectedReason}"</h4>
                              <p className="text-sm text-text-muted leading-relaxed font-medium border-l-2 border-brand-light pl-4">
                                Validated as a high-intent vertical. The content strategy prioritizes semantic authority through structured knowledge graphs. 
                                The user experience is designed to minimize cognitive friction, seamlessly bridging user intent with monetization goals.
                              </p>
                           </div>

                           <div className="grid grid-cols-2 gap-6">
                              <div className="card-minimal p-6">
                                 <div className="text-[10px] font-bold text-text-muted uppercase mb-2 tracking-wider">Target Demographic</div>
                                 <div className="text-lg font-bold text-text-main">{selectedSite.niche.targetAudience}</div>
                              </div>
                              <div className="card-minimal p-6">
                                 <div className="text-[10px] font-bold text-text-muted uppercase mb-2 tracking-wider">Competition Level</div>
                                 <div className="text-lg font-bold text-text-main flex items-center gap-2 capitalize">{selectedSite.niche.competitionLvl} <ShieldCheck className="w-5 h-5 text-green-500" /></div>
                              </div>
                           </div>
                        </div>

                        <div className="col-span-2 space-y-8">
                           {/* E-E-A-T Hardening Panel */}
                           {selectedSite.persona && (
                             <div className="card-minimal p-8 space-y-8">
                                <div className="flex items-center gap-3">
                                   <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                      <ShieldCheck className="w-5 h-5" />
                                   </div>
                                   <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">E-E-A-T Verified Profile</h4>
                                </div>
                                <div className="flex items-center gap-4 py-6 border-y border-border">
                                   <div className="w-12 h-12 bg-brand-light rounded-xl flex items-center justify-center text-brand">
                                      <Monitor className="w-6 h-6" />
                                   </div>
                                   <div>
                                      <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Author Entity</div>
                                      <div className="text-lg font-bold text-text-main">{selectedSite.persona.founderName}</div>
                                      <div className="text-xs font-semibold text-text-muted mt-0.5">{selectedSite.persona.founderTitle}</div>
                                   </div>
                                </div>
                                <div className="space-y-4">
                                   <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Factual Accuracy Score</span>
                                      <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">{selectedSite.reliability?.accuracyScore}%</span>
                                   </div>
                                   <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-green-500 transition-all duration-2000" style={{ width: `${selectedSite.reliability?.accuracyScore || 0}%` }} />
                                   </div>
                                   <p className="text-[10px] text-text-muted leading-relaxed font-medium uppercase">Note: Identity cryptographically signed to maintain search authority.</p>
                                </div>
                             </div>
                           )}

                           <div className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2 pt-4">
                              <div className="w-4 h-[2px] bg-brand" />
                              Site Structure
                           </div>
                           <div className="card-minimal p-4 space-y-2">
                              {selectedSite.structure.pages.map(page => (
                                <div key={page} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                                   <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-brand transition-colors" />
                                      <span className="text-sm font-semibold text-text-main group-hover:text-brand transition-colors">{page}</span>
                                   </div>
                                   <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Cached</div>
                                </div>
                              ))}
                           </div>
                        </div>
                     </div>

                     <div className="pt-20 border-t border-border">
                        <div className="flex items-center justify-between mb-8">
                           <div className="flex items-center gap-4">
                              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                                <Clock className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="text-2xl font-bold tracking-tight text-text-main mb-0.5">Project Evolution</h4>
                                <div className="text-xs font-semibold text-text-muted">Key milestones & historical growth</div>
                              </div>
                           </div>
                        </div>
                        <div className="card-minimal p-10">
                           <div className="relative">
                              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
                              <div className="space-y-12 relative">
                                 {[
                                   { date: "Month 1", title: "Asset Origination", desc: "Niche synthesis and initial neural map deployment." },
                                   { date: "Month 2", title: "Content Acceleration", desc: "Semantic keyword expansion and E-E-A-T profile hardening." },
                                   { date: "Month 4", title: "Revenue Integration", desc: "Monetization protocols activated. Yield optimization pulse initiated." },
                                   { date: "Month 6", title: "Market Authority", desc: "Tier-1 authority status achieved. Global network scaling active." }
                                 ].map((item, idx) => (
                                   <div key={idx} className="flex gap-10 items-start group">
                                      <div className="relative">
                                         <div className="w-8 h-8 rounded-full bg-white border-2 border-brand flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform">
                                            <div className="w-2 h-2 rounded-full bg-brand" />
                                         </div>
                                      </div>
                                      <div className="flex-1 pt-0.5">
                                         <div className="text-[10px] font-bold text-brand uppercase tracking-[0.2em] mb-1">{item.date}</div>
                                         <h5 className="text-lg font-bold text-text-main mb-2">{item.title}</h5>
                                         <p className="text-sm text-text-muted leading-relaxed font-medium">{item.desc}</p>
                                      </div>
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="pt-20 border-t border-border">
                        <div className="flex items-center justify-between mb-12">
                           <div className="flex items-center gap-4">
                              <div className="p-3 bg-brand-light rounded-xl text-brand">
                                <PenTool className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="text-2xl font-bold tracking-tight text-text-main mb-0.5">Content Assets</h4>
                                <div className="text-xs font-semibold text-text-muted">{selectedSite.articles.length} Published Articles</div>
                              </div>
                           </div>
                           <button className="px-6 py-2.5 bg-white border border-border rounded-xl text-sm font-semibold text-text-main hover:bg-gray-50 hover:text-brand transition-colors shadow-sm">Draft New Article</button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8 mb-20">
                           {selectedSite.articles.map((article, i) => (
                              <div key={i} className="flex gap-6 p-6 card-minimal group">
                                 <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-border">
                                    <img src={article.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerpolicy="no-referrer" />
                                 </div>
                                 <div className="flex flex-col justify-center flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                       <span className="text-[10px] font-bold text-brand uppercase tracking-wider bg-brand-light px-2 py-0.5 rounded">Article</span>
                                       <span className="text-[10px] font-semibold text-text-muted">{article.readingTime || "8 min"} read</span>
                                    </div>
                                    <h5 className="text-lg font-bold mb-2 group-hover:text-brand transition-colors leading-tight text-text-main">{article.title}</h5>
                                    <p className="text-xs text-text-muted font-medium leading-relaxed line-clamp-2">{article.excerpt}</p>
                                 </div>
                              </div>
                           ))}
                        </div>

                        {/* Expert Spotlight Section */}
                        <div className="space-y-10">
                           <div className="flex items-center gap-4">
                              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                <Layout className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="text-2xl font-bold tracking-tight text-text-main mb-0.5">Expert Spotlight</h4>
                                <div className="text-xs font-semibold text-text-muted">High-Authority contributors for top assets</div>
                              </div>
                           </div>

                           <div className="grid grid-cols-3 gap-8">
                             {selectedSite.articles.slice(0, 3).map((article, idx) => (
                               <div key={idx} className="card-minimal p-8 space-y-6 relative overflow-hidden group">
                                 <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full opacity-50 transition-transform group-hover:scale-150 duration-700" />
                                 <div className="flex items-center gap-4 relative">
                                   <div className="w-14 h-14 bg-gray-100 rounded-full border-2 border-white shadow-sm overflow-hidden">
                                     <img src={`https://picsum.photos/seed/face${idx}/100/100`} className="w-full h-full object-cover" referrerpolicy="no-referrer" />
                                   </div>
                                   <div>
                                     <h5 className="font-bold text-text-main italic text-sm">Dr. Elias Vance</h5>
                                     <div className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">SME: {(article.category || "Intelligence").toUpperCase()}</div>
                                   </div>
                                 </div>
                                 <div className="space-y-3 relative">
                                   <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Expertise Summary</div>
                                   <p className="text-[11px] text-text-muted leading-relaxed font-medium italic">"15+ years experience in domain-specific neural mapping and semantic structuralism for high-authority assets."</p>
                                 </div>
                                 <div className="pt-4 border-t border-border flex justify-between items-center relative">
                                   <span className="text-[9px] font-bold text-text-muted uppercase italic">Credentials Verified</span>
                                   <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                 </div>
                               </div>
                             ))}
                           </div>
                        </div>
                     </div>
                 </div>
                 <div className="h-32" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deployment Confirmation Dialog */}
      <AnimatePresence>
        {siteToDeploy && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-6"
            onClick={() => setSiteToDeploy(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl border border-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-brand-light rounded-full flex items-center justify-center text-brand mb-2">
                  <Rocket className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-text-main mb-2">Confirm Deployment</h3>
                  <p className="text-sm font-medium text-text-muted leading-relaxed">
                    You are about to deploy <span className="text-brand font-bold">"{siteToDeploy.structure.title}"</span> to the production network. This asset will be live and accessible.
                  </p>
                </div>
                
                <div className="w-full space-y-3">
                  <button 
                    onClick={() => {
                      deploySite(siteToDeploy.id);
                      setSiteToDeploy(null);
                    }}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl text-sm font-bold shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Authorize Deployment
                  </button>
                  <button 
                    onClick={() => setSiteToDeploy(null)}
                    className="w-full py-4 bg-white border border-border text-text-muted rounded-2xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deletion Confirmation Dialog */}
      <AnimatePresence>
        {siteToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-6"
            onClick={() => setSiteToDelete(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl border border-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
                  <Trash2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-text-main mb-2">Delete Asset?</h3>
                  <p className="text-sm font-medium text-text-muted leading-relaxed">
                    This action <span className="text-red-600 font-bold">cannot be undone</span>. All variants, articles, and SEO data for <span className="text-text-main font-bold">"{siteToDelete.structure.title}"</span> will be permanently removed.
                  </p>
                </div>
                
                <div className="w-full space-y-3">
                  <button 
                    onClick={() => {
                      deleteSite(siteToDelete.id);
                      setSiteToDelete(null);
                    }}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Confirm Deletion
                  </button>
                  <button 
                    onClick={() => setSiteToDelete(null)}
                    className="w-full py-4 bg-white border border-border text-text-muted rounded-2xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch Deletion Confirmation Dialog */}
      <AnimatePresence>
        {batchActionType === "delete" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-6"
            onClick={() => setBatchActionType(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl border border-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2 border border-red-100 shadow-inner">
                  <Trash2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-text-main mb-2 italic">Purge Batch Process?</h3>
                  <p className="text-sm font-medium text-text-muted leading-relaxed uppercase tracking-wide">
                    You are about to permanently remove <span className="text-red-600 font-bold text-lg px-2 underline decoration-red-200">{selectedSiteIds.size}</span> distinct assets from the neural mainframe.
                  </p>
                </div>
                
                <div className="w-full space-y-3">
                  <button 
                    onClick={() => {
                      executeBatchAction("delete");
                      setBatchActionType(null);
                    }}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest"
                  >
                    Confirm Batch Purge
                  </button>
                  <button 
                    onClick={() => setBatchActionType(null)}
                    className="w-full py-4 bg-white border border-border text-text-muted rounded-2xl text-sm font-semibold hover:bg-gray-50 transition-colors uppercase tracking-widest"
                  >
                    Abort Action
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConsole && (
          <ThinkingConsole 
            logs={logs} 
            onClose={() => setShowConsole(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
