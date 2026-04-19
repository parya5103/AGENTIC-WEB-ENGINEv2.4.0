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
  BarChart3, 
  Zap, 
  ShieldCheck, 
  ExternalLink, 
  Clock, 
  Activity,
  ChevronRight,
  Monitor,
  Database,
  ArrowUpRight,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Menu,
  Settings,
  Bell,
  Trash2,
  Play,
  DollarSign,
  RotateCcw
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

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
  monetizationStrategy?: {
    ads: string[];
    affiliate: string[];
    premium: string[];
    suggestedSaaS?: string;
  };
  createdAt: string;
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
  const [activeTab, setActiveTab] = useState<"overview" | "sites" | "logs" | "monetization">("overview");
  const [adsenseConfig, setAdsenseConfig] = useState({ publisherId: "", clientId: "" });
  const logEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on("init", (data: any) => {
      setLogs(data.logs);
      setSites(data.generatedSites);
      setIsRunning(data.loopRunning);
      if (data.globalStats) setGlobalStats(data.globalStats);
      if (data.adsenseConfig) setAdsenseConfig(data.adsenseConfig);
    });

    socketRef.current.on("log", (log: Log) => {
      setLogs((prev) => [...prev, log]);
    });

    socketRef.current.on("status", (status: any) => {
      setIsRunning(status.running);
      setCurrentStep(status.step);
    });

    socketRef.current.on("globalStats", (stats: GlobalStats) => {
      setGlobalStats(stats);
    });

    socketRef.current.on("newSite", (site: Site) => {
      setSites((prev) => [site, ...prev]);
    });

    socketRef.current.on("siteUpdated", (updatedSite: Site) => {
      setSites((prev) => prev.map(s => s.id === updatedSite.id ? updatedSite : s));
    });

    socketRef.current.on("siteDeleted", (siteId: string) => {
      setSites((prev) => prev.filter(s => s.id !== siteId));
      setSelectedSite(prev => prev?.id === siteId ? null : prev);
      setSelectedSiteIds(prev => {
        const next = new Set(prev);
        next.delete(siteId);
        return next;
      });
    });

    socketRef.current.on("siteDeployStatus", (data: { siteId: string, status: string, progress: number, error?: string }) => {
      setSites((prev) => prev.map(s => {
        if (s.id === data.siteId) {
          return { 
            ...s, 
            isDeploying: data.status !== "completed" && data.status !== "failed",
            deployProgress: data.progress,
            deployStatus: data.status,
            deployError: data.error
          };
        }
        return s;
      }));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const startLoop = async () => {
    await fetch("/api/start", { method: "POST" });
  };

  const resetMetrics = async () => {
    if (!confirm("This will reset all simulated dashboard revenue and traffic to zero. Continue?")) return;
    const res = await fetch("/api/stats/reset", { method: "POST" });
  };

  const toggleSimulation = async (enabled: boolean) => {
    await fetch("/api/stats/toggle-simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled })
    });
  };

  const syncMonetization = async () => {
    await fetch("/api/monetization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adsenseConfig)
    });
  };

  const deploySite = async (siteId: string) => {
    await fetch("/api/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId })
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
    if (selectedSiteIds.size === 0) return;
    
    await fetch("/api/sites/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        siteIds: Array.from(selectedSiteIds),
        action 
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
    await fetch(`/api/sites/${siteId}`, {
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

  return (
    <div className="min-h-screen bg-bg-light text-text-main font-sans flex flex-col antialiased relative overflow-hidden">
      
      {/* Sidebar / Navigation */}
      <nav className="fixed left-0 top-0 bottom-0 w-80 bg-surface border-r border-border flex flex-col z-[100]">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center text-white shadow-subtle">
              <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 22V10L22 22V10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight block">NicheFlow</span>
              <span className="text-[10px] uppercase font-semibold text-text-muted tracking-wider">v4.22</span>
            </div>
          </div>

          <div className="space-y-4">
            {[
               { id: "overview", label: "Overview", icon: BarChart3 },
               { id: "sites", label: "Managed Assets", icon: Globe },
               { id: "monetization", label: "Monetization", icon: DollarSign },
               { id: "logs", label: "Agent Logs", icon: Activity },
            ].map(item => (
               <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === item.id ? "bg-bg-light text-brand" : "text-text-muted hover:bg-gray-50 hover:text-brand"}`}
               >
                  <item.icon className="w-4 h-4" />
                  {item.label}
               </button>
            ))}
          </div>
        </div>

        <div className="mt-auto p-8">
          <div className="bg-bg-light rounded-2xl p-5 mb-6 border border-border">
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="font-medium text-text-muted">Credits</span>
              <span className="font-semibold text-brand">$12.44</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-brand w-[82%] rounded-full" />
            </div>
          </div>
          <button className="w-full flex items-center gap-3 text-sm font-medium text-text-muted hover:text-brand transition-colors">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="ml-80 flex-grow flex flex-col min-h-screen relative z-10">
        {/* Header Bar */}
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-8 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold capitalize text-text-muted/70">{activeTab}</h1>
            <ChevronRight className="w-3 h-3 text-text-muted/40" />
            <span className="text-sm font-medium text-text-main">Workspace</span>
          </div>
          
          <div className="flex items-center gap-4 text-text-muted">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {isRunning ? "Active" : "Standby"}
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <button className="hover:text-brand transition-colors relative">
              <Bell className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-xs font-semibold">
              AP
            </div>
          </div>
        </header>

        {/* Content View */}
        <div className="p-8 max-w-[1600px] mx-auto w-full">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                {/* Top Action Row */}
                <div className="flex justify-between items-center card-minimal p-8 pl-10">
                  <div className="flex items-center gap-6">
                    <div className={`w-3 h-3 rounded-full ${isRunning ? "bg-green-500 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" : "bg-gray-200"}`} />
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-text-main">Workspace Overview</h2>
                      <p className="text-xs font-medium text-text-muted mt-1.5 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" /> 
                        Status: <span className={isRunning ? "text-green-600" : "text-brand"}>{isRunning ? "Generating Pipeline Active" : "Standing By"}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={resetMetrics}
                      className="text-xs font-bold text-text-muted hover:text-red-500 flex items-center gap-2 transition-colors px-4 py-2 border border-border rounded-lg"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Metrics
                    </button>
                    <button 
                      onClick={startLoop}
                      disabled={isRunning}
                      className="group bg-brand text-white px-8 py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-3 transition-all hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      {isRunning ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                      {isRunning ? "Running Tasks" : "Generate New Asset"}
                    </button>
                  </div>
                </div>

                {/* Bento Grid Stats */}
                <div className="grid grid-cols-12 gap-6">
                   {/* Hero Card: Revenue */}
                  <div className="col-span-12 lg:col-span-4 card-minimal p-8 flex flex-col justify-between group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                    
                    <div className="relative z-10">
                       <div className="flex justify-between items-start mb-12">
                          <div className="p-3 bg-gray-50 rounded-2xl border border-border">
                             <Database className="w-6 h-6 text-brand" />
                          </div>
                          <div className="text-right">
                             <div className="stat-label mb-1">Projected Today</div>
                             <div className="text-xl font-semibold text-green-600">
                               {globalStats.simulationEnabled ? `+$12.44` : "$0.00"}
                             </div>
                          </div>
                       </div>
                       <div>
                          <div className="flex items-center justify-between mb-2">
                             <div className="stat-label">Estimated Revenue</div>
                             <div className="flex items-center gap-1 text-[10px] bg-brand-light text-brand px-2 py-0.5 rounded-full font-bold">
                                {globalStats.simulationEnabled ? "SIMULATED" : "REAL-TIME"}
                             </div>
                          </div>
                          <div className="stat-value">${globalStats.totalRevenue.toFixed(2)}</div>
                          <p className="text-[10px] text-text-muted mt-2">
                            {globalStats.simulationEnabled 
                              ? "Figures are estimated based on simulation models." 
                              : "True revenue tracking active. Connect AdSense for data."}
                          </p>
                       </div>
                    </div>
                  </div>

                  {/* Secondary Bento: Traffic */}
                  <div className="col-span-12 lg:col-span-5 card-minimal p-8 flex flex-col relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-6 z-10 relative">
                       <div>
                          <div className="stat-label mb-2">Projected Impressions</div>
                          <h4 className="text-4xl font-semibold tracking-tight text-text-main flex items-baseline gap-2">
                            {globalStats.totalTraffic.toLocaleString()} 
                          </h4>
                       </div>
                       <button 
                         onClick={() => toggleSimulation(!globalStats.simulationEnabled)}
                         className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${globalStats.simulationEnabled ? 'text-green-700 bg-green-50 border-green-200' : 'text-text-muted bg-gray-50 border-border'}`}
                        >
                          {globalStats.simulationEnabled ? <Zap className="w-3.5 h-3.5 fill-current" /> : <Settings className="w-3.5 h-3.5" />}
                          {globalStats.simulationEnabled ? "Simulator On" : "Real Data Mode"}
                       </button>
                    </div>
                    <div className="flex-grow h-[140px] min-h-[140px] mt-4 relative z-10 w-full -ml-[4px]">
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={globalStats.history.slice(-10)}>
                           <defs>
                             <linearGradient id="colorTraffic2" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                               <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                             </linearGradient>
                           </defs>
                           <Area 
                             type="monotone" 
                             dataKey="traffic" 
                             stroke="#10B981" 
                             strokeWidth={3} 
                             fillOpacity={1} 
                             fill="url(#colorTraffic2)"
                             animationDuration={1500}
                           />
                         </AreaChart>
                       </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Mini Bento Cards */}
                  <div className="col-span-12 lg:col-span-3 grid grid-rows-2 gap-6">
                     <div className="card-minimal p-6 flex flex-col justify-center gap-2 group hover:border-gray-300">
                        <div className="flex items-center justify-between mb-1">
                          <div className="stat-label">Active Sites</div>
                          <Globe className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors" />
                        </div>
                        <div className="text-3xl font-semibold tracking-tight">{globalStats.activeSites}</div>
                     </div>
                     <div className="card-minimal p-6 flex flex-col justify-center gap-2 group hover:border-gray-300">
                        <div className="flex items-center justify-between mb-1">
                          <div className="stat-label">Efficiency</div>
                          <Zap className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-3xl font-semibold tracking-tight text-amber-600">+{globalStats.dailyGrowth}%</div>
                     </div>
                  </div>
                </div>

                {/* Advanced Data Cluster */}
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-12 lg:col-span-8 card-minimal p-8">
                    <div className="flex items-center justify-between mb-8">
                       <div className="flex items-center gap-3">
                          <BarChart3 className="w-5 h-5 text-brand" />
                          <h3 className="text-lg font-semibold text-text-main">Financial Velocity</h3>
                       </div>
                       <div className="flex bg-gray-50 p-1 rounded-lg border border-border">
                          <button className="px-4 py-1.5 bg-white shadow-sm rounded-md text-xs font-semibold text-brand">Revenue</button>
                          <button className="px-4 py-1.5 text-text-muted hover:text-text-main rounded-md text-xs font-medium transition-colors">Yield %</button>
                       </div>
                    </div>
                    <div className="h-[350px] w-full">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={globalStats.history} margin={{ left: -24 }}>
                             <defs>
                                <linearGradient id="mainRev2" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="5%" stopColor="#111111" stopOpacity={0.1}/>
                                   <stop offset="95%" stopColor="#111111" stopOpacity={0}/>
                                </linearGradient>
                             </defs>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAEA" />
                             <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888888', fontWeight: 500 }} dy={10} />
                             <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888888', fontWeight: 500 }} dx={-10} />
                             <Tooltip 
                                contentStyle={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAEAEA', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', padding: '16px' }}
                                cursor={{ stroke: '#EAEAEA', strokeWidth: 1, strokeDasharray: '4 4' }}
                                itemStyle={{ color: '#111111', fontWeight: 600, fontSize: '14px' }}
                                labelStyle={{ color: '#888888', fontSize: '12px', marginBottom: '8px' }}
                             />
                             <Area type="monotone" dataKey="revenue" stroke="#111111" strokeWidth={3} fill="url(#mainRev2)" dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: '#111111' }} activeDot={{ r: 6, fill: '#111111' }} />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="col-span-12 lg:col-span-4 card-minimal p-8 flex flex-col relative overflow-hidden">
                    <h4 className="flex items-center gap-2 stat-label mb-8">
                      <Activity className="w-3.5 h-3.5 text-brand" />
                      Agent Telemetry Log
                    </h4>
                    <div className="space-y-6 flex-grow">
                       {logs.slice(-4).map((log, i) => (
                          <div key={i} className="flex gap-4 border-l-2 border-gray-100 pl-4 relative group hover:border-gray-300 transition-colors">
                             <div className="absolute -left-1.5 top-0 w-2.5 h-2.5 rounded-full bg-white border-2 border-gray-300 group-hover:border-brand transition-colors" />
                             <div className="w-full">
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="text-[11px] font-semibold text-brand tracking-wide">
                                    {log.agent.replace(" Agent", "")}
                                  </div>
                                  <span className="text-[10px] text-text-muted font-medium bg-gray-50 px-1.5 py-0.5 rounded">T+{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-[13px] leading-snug text-text-main/80 font-medium">"{log.message}"</p>
                             </div>
                          </div>
                       ))}
                       {logs.length === 0 && <p className="text-sm text-text-muted italic">Awaiting secure uplink handshake...</p>}
                    </div>
                    <button 
                       onClick={() => setActiveTab("logs")}
                       className="mt-8 w-full py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-semibold text-text-main transition-colors border border-border"
                    >
                       View Full Logs
                    </button>
                  </div>
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
                     <button className="px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all flex items-center gap-2 shadow-sm">
                        <Rocket className="w-4 h-4" /> 
                        Deploy Asset
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
                             <div className="space-y-2">
                               <div className="flex justify-between items-center text-[10px] font-bold text-brand uppercase italic">
                                 <span>Deploying...</span>
                                 <span>{site.deployProgress || 0}%</span>
                               </div>
                               <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${site.deployProgress || 0}%` }}
                                   className="h-full bg-brand"
                                 />
                               </div>
                               <div className="text-[9px] font-medium text-text-muted truncate italic lowercase">
                                 {site.deployStatus}...
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
                           Cloud Primary: <span className="text-text-main">GPT-4o</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                           <div className="w-2.5 h-2.5 rounded-full bg-green-500" /> 
                           Redundancy: <span className="text-text-main">Gemini 1.5</span>
                        </div>
                     </div>
                     <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider bg-white px-2.5 py-1 rounded-md border border-border">v4.22_STABLE</span>
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
            {activeTab === "monetization" && (
              <motion.div 
                key="monetization"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center card-minimal p-8 pl-10">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-text-main mb-1.5">Monetization</h2>
                    <p className="text-xs font-medium text-text-muted">Configure yield parameters and connect ad networks.</p>
                  </div>
                  <div className="text-brand p-3 bg-brand-light rounded-2xl">
                     <DollarSign className="w-6 h-6" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="card-minimal p-10">
                      <div className="flex items-center gap-5 mb-10 text-text-main">
                         <div className="p-3 bg-brand-light rounded-xl text-brand">
                            <Monitor className="w-6 h-6" />
                         </div>
                         <div>
                            <h3 className="text-xl font-semibold tracking-tight">Google AdSense</h3>
                            <p className="text-xs font-medium text-text-muted mt-1 uppercase tracking-wider">Primary Network</p>
                         </div>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-xs font-semibold text-text-main block">Publisher ID (pub-xxxx...)</label>
                            <input 
                              type="text" 
                              placeholder="pub-0123456789012345"
                              value={adsenseConfig.publisherId}
                              onChange={(e) => setAdsenseConfig(prev => ({ ...prev, publisherId: e.target.value }))}
                              className="w-full bg-gray-50 border border-border p-4 rounded-xl text-sm font-medium focus:outline-none focus:border-gray-300 focus:bg-white transition-all text-text-main"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-semibold text-text-main block">Client ID (ca-pub-xxxx...)</label>
                            <input 
                              type="text" 
                              placeholder="ca-pub-0123456789012345"
                              value={adsenseConfig.clientId}
                              onChange={(e) => setAdsenseConfig(prev => ({ ...prev, clientId: e.target.value }))}
                              className="w-full bg-gray-50 border border-border p-4 rounded-xl text-sm font-medium focus:outline-none focus:border-gray-300 focus:bg-white transition-all text-text-main"
                            />
                         </div>
                         <button 
                            onClick={syncMonetization}
                            className="w-full py-4 bg-gray-900 border border-transparent text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm mt-4 uppercase tracking-widest"
                         >
                            Sync Ad Network
                         </button>
                      </div>
                   </div>

                   <div className="card-minimal p-10 h-fit">
                      <div className="flex items-center justify-between mb-8 text-text-main">
                        <div className="flex items-center gap-5">
                           <div className="p-3 bg-brand-light rounded-xl text-brand">
                              <RefreshCcw className="w-6 h-6" />
                           </div>
                           <div>
                              <h3 className="text-xl font-semibold tracking-tight">Strategy Lab</h3>
                             <p className="text-xs font-medium text-text-muted mt-1 italic uppercase tracking-wider">Automated Monetization Blueprint</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-8">
                         <div className="space-y-3">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest italic block">Select Active Asset</label>
                            <select 
                              value={selectedSite?.id || ""}
                              onChange={(e) => {
                                const siteId = e.target.value;
                                const found = sites.find(s => s.id === siteId);
                                setSelectedSite(found || null);
                              }}
                              className="w-full bg-gray-50 border border-border p-4 rounded-xl text-sm font-semibold focus:outline-none focus:border-gray-300 focus:bg-white transition-all text-text-main cursor-pointer"
                            >
                              <option value="">Choose an asset...</option>
                              {sites.map(s => (
                                <option key={s.id} value={s.id}>{s.structure?.title || s.title}</option>
                              ))}
                            </select>
                         </div>

                         {selectedSite && (
                           <motion.div 
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             className="space-y-6 pt-4 border-t border-gray-100"
                           >
                              {!selectedSite.monetizationStrategy ? (
                                <button 
                                  onClick={() => generateMonetizationStrategy(selectedSite.id)}
                                  disabled={isGeneratingStrategy}
                                  className="w-full py-5 bg-brand text-white rounded-2xl text-sm font-bold shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
                                >
                                  {isGeneratingStrategy ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                  {isGeneratingStrategy ? "Developing Protocol..." : "Generate Yield Strategy"}
                                </button>
                              ) : (
                                <div className="space-y-8 text-text-main">
                                   <div className="grid grid-cols-2 gap-4">
                                      <div className="bg-gray-50 p-6 rounded-2xl border border-border">
                                         <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Monitor className="w-3 h-3 text-brand" /> Ad Placements
                                         </div>
                                         <ul className="space-y-2.5">
                                            {selectedSite.monetizationStrategy.ads.map((ad, idx) => (
                                              <li key={idx} className="text-xs font-semibold flex items-start gap-2 italic leading-tight">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-1.5" />
                                                {ad}
                                              </li>
                                            ))}
                                         </ul>
                                      </div>
                                      <div className="bg-gray-50 p-6 rounded-2xl border border-border">
                                         <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <ExternalLink className="w-3 h-3 text-brand" /> Affiliate Core
                                         </div>
                                         <ul className="space-y-2.5 text-brand">
                                            {selectedSite.monetizationStrategy.affiliate.map((aff, idx) => (
                                              <li key={idx} className="text-xs font-semibold flex items-start gap-2 italic leading-tight">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-1.5" />
                                                {aff}
                                              </li>
                                            ))}
                                         </ul>
                                      </div>
                                   </div>

                                   <div className="bg-gray-900 text-white p-8 rounded-3xl relative overflow-hidden group">
                                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand/30 blur-[80px] -mr-16 -mt-16" />
                                      <div className="relative z-10">
                                         <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Rocket className="w-3 h-3 text-brand" /> SaaS & Premium Expansion
                                         </div>
                                         <div className="text-lg font-bold tracking-tight mb-4 italic leading-snug">
                                            "{selectedSite.monetizationStrategy.suggestedSaaS}"
                                         </div>
                                         <div className="flex gap-4">
                                           {selectedSite.monetizationStrategy.premium.map((p, idx) => (
                                             <div key={idx} className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/10 text-white">
                                               {p}
                                             </div>
                                           ))}
                                         </div>
                                      </div>
                                   </div>
                                   
                                   <button 
                                     onClick={() => generateMonetizationStrategy(selectedSite.id)}
                                     className="w-full py-4 text-[10px] font-bold text-brand uppercase tracking-widest hover:underline flex items-center justify-center gap-2"
                                   >
                                     <RefreshCcw className="w-3 h-3" /> Re-Optimize Protocol
                                   </button>
                                </div>
                              )}
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
                     <div className="relative group rounded-3xl overflow-hidden border border-border shadow-md bg-white">
                        <div className="aspect-[16/9] relative">
                            <div className="absolute top-0 left-0 w-full h-10 bg-gray-100 flex items-center px-4 gap-2 z-10 border-b border-border">
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                              <div className="flex-grow flex justify-center">
                                <span className="text-[10px] font-mono text-text-muted">Preview Mode</span>
                              </div>
                            </div>
                            <iframe 
                              src={`/site/${(selectedSite.title || selectedSite.structure?.title || "untitled").toLowerCase().replace(/\s+/g, "-")}`}
                              className="w-full h-full pt-10 bg-white"
                              title="Site Preview"
                            />
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
    </div>
  );
}
