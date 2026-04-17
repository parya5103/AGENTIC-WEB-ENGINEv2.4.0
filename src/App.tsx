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
  Database
} from "lucide-react";
import { io, Socket } from "socket.io-client";

interface Log {
  id: string;
  agent: string;
  message: string;
  type: "info" | "success" | "error" | "process";
  timestamp: string;
}

  interface Site {
  title: string;
  niche: { name: string; selectedReason: string; targetAudience: string; estimatedCPC: string; competitionLvl: string };
  structure: { title: string; tagline: string; pages: string[]; colors: any; typography: string };
  articles: any[];
  stats: { traffic: number; revenue: number; growth: number };
  url: string;
  createdAt: string;
}

interface GlobalStats {
  totalRevenue: number;
  totalTraffic: number;
  activeSites: number;
  dailyGrowth: number;
}

export default function App() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({ totalRevenue: 0, totalTraffic: 0, activeSites: 0, dailyGrowth: 1.2 });
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [viewMode, setViewMode] = useState<"dashboard" | "site">("dashboard");
  const logEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on("init", (data: any) => {
      setLogs(data.logs);
      setSites(data.generatedSites);
      setIsRunning(data.loopRunning);
      if (data.globalStats) setGlobalStats(data.globalStats);
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

  const getAgentIcon = (agent: string) => {
    switch (agent) {
      case "Trend Research Agent": return <Search className="w-4 h-4" />;
      case "Niche Analyzer Agent": return <Zap className="w-4 h-4" />;
      case "Website Builder Agent": return <Layout className="w-4 h-4" />;
      case "Content Writer Agent": return <PenTool className="w-4 h-4" />;
      case "SEO Optimizer Agent": return <Activity className="w-4 h-4" />;
      case "DevOps Agent": return <Globe className="w-4 h-4" />;
      case "Monetization Agent": return <Database className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
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
    <div className="min-h-screen bg-bento-bg text-bento-text font-sans p-6 overflow-hidden flex flex-col gap-6 selection:bg-bento-accent selection:text-white">
      {/* Global Command Bar */}
      <div className="grid grid-cols-4 gap-4 pb-6 border-b border-bento-border relative">
        <div className="absolute -top-3 left-0 bg-bento-bg px-2 text-[10px] font-mono text-bento-text-dim uppercase tracking-[0.3em]">Network Authority Console</div>
        <div className="bg-bento-card border border-bento-border p-4 rounded-xl flex items-center justify-between group hover:border-bento-warning/50 transition-colors">
          <div>
            <div className="text-[10px] text-bento-text-dim uppercase font-mono tracking-widest mb-1">Portfolio MRR</div>
            <div className="text-xl font-bold font-mono text-bento-warning">${globalStats.totalRevenue.toFixed(2)}</div>
          </div>
          <Database className="w-5 h-5 text-bento-warning opacity-30 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="bg-bento-card border border-bento-border p-4 rounded-xl flex items-center justify-between group hover:border-bento-accent/50 transition-colors">
          <div>
            <div className="text-[10px] text-bento-text-dim uppercase font-mono tracking-widest mb-1">Global Impressions</div>
            <div className="text-xl font-bold font-mono text-bento-accent">{globalStats.totalTraffic.toLocaleString()}</div>
          </div>
          <Activity className="w-5 h-5 text-bento-accent opacity-30 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="bg-bento-card border border-bento-border p-4 rounded-xl flex items-center justify-between group hover:border-bento-success/50 transition-colors">
          <div>
            <div className="text-[10px] text-bento-text-dim uppercase font-mono tracking-widest mb-1">Managed Nodes</div>
            <div className="text-xl font-bold font-mono text-bento-success">{globalStats.activeSites} <span className="text-[10px] font-normal opacity-50 italic">SITES</span></div>
          </div>
          <Globe className="w-5 h-5 text-bento-success opacity-30 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="bg-bento-card border border-bento-border p-4 rounded-xl flex items-center justify-between group hover:border-bento-warning/50 transition-colors">
          <div>
            <div className="text-[10px] text-bento-text-dim uppercase font-mono tracking-widest mb-1">Efficiency Delta</div>
            <div className="text-xl font-bold font-mono">+{globalStats.dailyGrowth}%</div>
          </div>
          <Zap className="w-5 h-5 text-bento-warning opacity-30 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "dashboard" ? (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-4 grid-rows-3 gap-4 flex-grow"
          >
            {/* ACTIVE NICHE SPOTLIGHT (Span 2W) */}
            <div className="col-span-2 bg-[#0c0c0e] border border-bento-border rounded-2xl p-6 flex flex-col relative overflow-hidden">
              <div className="text-[11px] text-bento-text-dim uppercase tracking-widest mb-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-bento-accent animate-ping" : "bg-white/10"}`} />
                LATEST BLUEPRINT: SEARCH ARBITRAGE
              </div>
              {isRunning && logs.findLast(l => l.agent === "Niche Analyzer Agent") ? (
                <>
                  <h2 className="text-4xl font-black mb-3 tracking-tighter uppercase italic">
                    {logs.findLast(l => l.agent === "Niche Analyzer Agent")?.message.split(": ")[1].replace('"', '') || "Discovering..."}
                  </h2>
                  <p className="text-bento-text-dim text-sm leading-relaxed mb-6 max-w-lg">
                    Cross-referenced search intent vs CPC profitability. High-yield content cluster being drafted by writer agents.
                  </p>
                </>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center opacity-20 text-center italic py-10">
                  <Activity className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm font-mono lowercase tracking-tighter">awaiting autonomous pipeline trigger [0x00]</p>
                </div>
              )}
              
              <div className="flex gap-4 mt-auto">
                <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/5">
                  <div className="text-[8px] text-bento-text-dim uppercase font-mono mb-1">Competition</div>
                  <div className="text-xs font-bold text-bento-success">OPT-LOW</div>
                </div>
                <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/5">
                  <div className="text-[8px] text-bento-text-dim uppercase font-mono mb-1">Target CPC</div>
                  <div className="text-xs font-bold text-bento-warning">$18.42</div>
                </div>
                <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/5">
                  <div className="text-[8px] text-bento-text-dim uppercase font-mono mb-1">SEO Velocity</div>
                  <div className="text-xs font-bold text-bento-accent">94%</div>
                </div>
              </div>
            </div>

            {/* LIVE FLEET ACTIVITY (Span 2H) */}
            <div className="row-span-2 col-start-3 col-span-2 bg-bento-card border border-bento-border rounded-2xl p-6 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="text-[10px] text-bento-text-dim uppercase tracking-[0.2em] font-mono flex items-center gap-2">
                  <span className="w-2 h-2 bg-bento-accent rounded-sm animate-pulse" />
                  Fleet Telemetry
                </div>
                <button 
                  onClick={startLoop}
                  disabled={isRunning}
                  className={`text-[9px] font-black px-4 py-2 rounded-lg transition-all border ${
                    isRunning ? "text-bento-text-dim border-bento-border bg-black/40" : "text-white bg-bento-accent border-bento-accent hover:invert"
                  }`}
                >
                  {isRunning ? "PROCESSING CYCLES" : "LAUNCH WORKFORCE"}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-none">
                {logs.slice(-15).map((log) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={log.id} 
                    className="group"
                  >
                    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors border-l-2 border-transparent hover:border-bento-accent">
                       <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${
                         log.type === "success" ? "bg-bento-success" : 
                         log.type === "error" ? "bg-bento-warning" : 
                         log.type === "process" ? "bg-bento-accent animate-pulse" : "bg-bento-text-dim"
                       }`} />
                       <div className="flex-1">
                          <div className="flex justify-between items-center mb-0.5">
                             <span className="text-[10px] font-mono font-bold uppercase text-bento-text-dim group-hover:text-white transition-colors">{log.agent}</span>
                             <span className="text-[9px] font-mono opacity-30 italic">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}</span>
                          </div>
                          <p className="text-[10px] text-bento-text-dim leading-snug">{log.message}</p>
                       </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-bento-border">
                <div className="flex justify-between items-end mb-2">
                   <div className="text-[9px] font-mono uppercase text-bento-text-dim tracking-widest">Phase {currentStep}/7: {steps[Math.max(0, currentStep - 1)]?.name}</div>
                   <div className="text-[12px] font-mono font-bold">{Math.round((currentStep / 7) * 100)}%</div>
                </div>
                <div className="w-full h-1 bg-bento-border rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-bento-accent" 
                    animate={{ width: isRunning ? `${(currentStep / 7) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            </div>

            {/* DEPLOYMENT SECRETS */}
            <div className="bg-bento-card border border-bento-border rounded-2xl p-5 flex flex-col group hover:border-bento-accent/40 transition-colors">
              <div className="flex justify-between items-center mb-4">
                <div className="text-[10px] text-bento-text-dim uppercase tracking-widest font-mono">Infra Status</div>
                <div className="px-2 py-0.5 bg-bento-success/10 text-bento-success border border-bento-success/30 rounded text-[8px] font-bold">ALL GREEN</div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-auto">
                 <div className="p-2 bg-black/40 rounded-lg border border-white/5 text-[9px] font-mono text-bento-text-dim">
                    SSL CERT<br/><span className="text-white">VALID_2048</span>
                 </div>
                 <div className="p-2 bg-black/40 rounded-lg border border-white/5 text-[9px] font-mono text-bento-text-dim">
                    VERCEL API<br/><span className="text-white">AUTH_ACTIVE</span>
                 </div>
                 <div className="p-2 bg-black/40 rounded-lg border border-white/5 text-[9px] font-mono text-bento-text-dim">
                    GH_TOKEN<br/><span className="text-white">RW_OPS</span>
                 </div>
                 <div className="p-2 bg-black/40 rounded-lg border border-white/5 text-[9px] font-mono text-bento-text-dim">
                    REGISTRY<br/><span className="text-white">EDGE_SYNCD</span>
                 </div>
              </div>
            </div>

            {/* CONTENT PIPELINE */}
            <div className="bg-bento-card border border-bento-border rounded-2xl p-5 flex flex-col group hover:border-bento-warning/40 transition-colors">
              <div className="text-[10px] text-bento-text-dim uppercase tracking-widest font-mono mb-4">Content Volume</div>
              <div className="text-4xl font-black italic tracking-tighter mb-1">
                 {sites.length * 5} <span className="text-lg font-normal opacity-40 not-italic">ARTICLES</span>
              </div>
              <div className="text-[9px] text-bento-text-dim uppercase font-mono mb-6">Total Generated Fleet Corpus</div>
              <div className="mt-auto h-16 flex items-end gap-1.5 overflow-hidden">
                {[4, 8, 3, 10, 15, 12, 18, 14, 22, 19, 25].map((h, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ height: 0 }}
                    animate={{ height: `${h * 4}%` }}
                    className="w-full bg-bento-warning/20 border-t border-bento-warning/40 rounded-t-[2px]" 
                  />
                ))}
              </div>
            </div>

            {/* NICHE ENGINE (Span 2W) */}
            <div className="col-span-2 bg-[#0c0c0e] border border-bento-border rounded-2xl p-6 flex flex-col relative group">
              <div className="text-[11px] text-bento-text-dim uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart3 className="w-3 h-3 text-bento-success" />
                Network Authority Scoring
              </div>
              <div className="flex gap-10 items-center justify-between mb-4">
                 <div className="flex-1">
                    <div className="text-[9px] text-bento-text-dim uppercase font-mono mb-1 italic">Average Domain Authority</div>
                    <div className="text-2xl font-bold font-mono">DA 42+ <span className="text-xs text-bento-success">PRO</span></div>
                 </div>
                 <div className="flex-1 text-right">
                    <div className="text-[9px] text-bento-text-dim uppercase font-mono mb-1 italic">Index Latency</div>
                    <div className="text-2xl font-bold font-mono"><span className="text-[10px] opacity-40">ms</span> 420.2</div>
                 </div>
              </div>
              <div className="mt-auto flex gap-2 overflow-hidden italic text-[9px] opacity-20 font-mono tracking-tighter whitespace-nowrap">
                 <span>SYNCING_SEMANTIC_ANCHORS...</span>
                 <span>INJECTING_JSON_LD_FRAGMENTS...</span>
                 <span>AWAITING_GOOGLE_BOT_CRAWL...</span>
                 <span>SEO_RANK_PREDICTION_ACTIVE_98%...</span>
              </div>
            </div>

            {/* PORTFOLIO ACCRUAL */}
            <div className="bg-bento-card border border-bento-border rounded-2xl p-5 flex items-center justify-between group hover:border-bento-success/40 transition-colors">
              <div className="flex-1">
                <div className="text-[10px] text-bento-text-dim uppercase font-mono tracking-widest mb-2 font-bold">Total Payouts</div>
                <div className="text-3xl font-bold text-white tracking-widest">$0.42 <span className="text-[10px] text-bento-success">+18%</span></div>
                <div className="text-[8px] text-bento-text-dim font-mono mt-2 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-bento-success rounded-full" />
                   STRIPE_REALTIME_HOOKS
                </div>
              </div>
            </div>

            {/* AD REVENUE */}
            <div className="bg-bento-card border border-bento-border rounded-2xl p-5 flex items-center justify-between group hover:border-bento-warning/40 transition-colors">
              <div className="flex-1">
                <div className="text-[10px] text-bento-text-dim uppercase font-mono tracking-widest mb-2 font-bold font-mono">AdSense Accrual</div>
                <div className="text-3xl font-bold text-bento-warning tracking-widest">$0.00 <span className="text-[10px] opacity-40 font-normal italic lowercase tracking-tight">review...</span></div>
                <div className="text-[8px] text-bento-text-dim font-mono mt-2">ID: PUB-7412E-99-F3</div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="site"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-grow flex flex-col gap-6"
          >
            {selectedSite ? (
              <div className="flex-grow grid grid-cols-12 gap-6">
                <div className="col-span-3 flex flex-col gap-6">
                   <div className="bg-bento-card border border-bento-border rounded-2xl p-6">
                      <button 
                        onClick={() => setViewMode("dashboard")}
                        className="text-[10px] text-bento-text-dim mb-6 flex items-center gap-2 hover:text-white transition-colors uppercase font-bold tracking-widest"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" /> Back to Terminal
                      </button>
                      <div className="text-[10px] text-bento-text-dim uppercase font-mono mb-2 tracking-[0.2em] italic">Active Sub-Domain</div>
                      <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4 leading-none">{selectedSite.structure.title}</h2>
                      <p className="text-xs text-bento-text-dim mb-6 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">{selectedSite.structure.tagline}</p>
                      
                      <div className="space-y-3">
                         <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-[10px] text-bento-text-dim uppercase font-mono">Domain Auth</span>
                            <span className="text-sm font-bold text-bento-success">DA 44</span>
                         </div>
                         <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-[10px] text-bento-text-dim uppercase font-mono">Sem Rush Difficulty</span>
                            <span className="text-sm font-bold text-bento-warning">LOW</span>
                         </div>
                         <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-[10px] text-bento-text-dim uppercase font-mono">Est. Monthly Rev</span>
                            <span className="text-sm font-bold text-bento-accent">$124.00</span>
                         </div>
                      </div>
                      
                      <a 
                        href={`/site/${selectedSite.title.toLowerCase().replace(/\s+/g, "-")}`} 
                        target="_blank" 
                        className="mt-8 w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        VIEW ASSET EXTERNAL <ExternalLink className="w-3 h-3" />
                      </a>
                   </div>
                   
                   <div className="bg-bento-card border border-bento-border rounded-2xl p-6 flex-grow flex flex-col">
                      <div className="text-[10px] text-bento-text-dim uppercase font-mono mb-6 tracking-widest">Niche Blueprint Vitals</div>
                      <div className="space-y-6">
                         <div>
                            <div className="text-[9px] text-bento-text-dim uppercase font-mono mb-2">Target Audience Segment</div>
                            <div className="text-xs font-bold bg-white/5 p-3 rounded-xl border border-white/5 italic">"{selectedSite.niche.targetAudience}"</div>
                         </div>
                         <div>
                            <div className="text-[9px] text-bento-text-dim uppercase font-mono mb-2">Alpha Strategy</div>
                            <div className="text-xs font-bold bg-white/5 p-3 rounded-xl border border-white/5 italic">"{selectedSite.niche.selectedReason}"</div>
                         </div>
                         <div>
                            <div className="text-[9px] text-bento-text-dim uppercase font-mono mb-2">Monetization DNA</div>
                            <div className="flex gap-2 flex-wrap">
                               {["AD_ARBITRAGE", "AFFILIATE_LINKING", "SPONSORED_VENEER"].map(tag => (
                                 <span key={tag} className="px-2 py-1 bg-white/5 rounded border border-white/5 text-[8px] font-mono text-bento-text-dim font-bold">{tag}</span>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="col-span-9 flex flex-col gap-6 overflow-hidden">
                   <div className="grid grid-cols-3 gap-6 h-32">
                      <div className="bg-bento-card/40 border border-bento-border rounded-2xl p-4 flex flex-col justify-center">
                         <div className="text-[9px] text-bento-text-dim uppercase font-mono mb-1">Index Health</div>
                         <div className="text-3xl font-black text-bento-success tracking-tighter uppercase italic">Instant</div>
                      </div>
                      <div className="bg-bento-card/40 border border-bento-border rounded-2xl p-4 flex flex-col justify-center">
                         <div className="text-[9px] text-bento-text-dim uppercase font-mono mb-1">Traffic Velocity</div>
                         <div className="text-3xl font-black text-bento-accent tracking-tighter uppercase italic">Accelerating</div>
                      </div>
                      <div className="bg-bento-card/40 border border-bento-border rounded-2xl p-4 flex flex-col justify-center">
                         <div className="text-[9px] text-bento-text-dim uppercase font-mono mb-1">Semantic Saturation</div>
                         <div className="text-3xl font-black text-bento-warning tracking-tighter uppercase italic">98.2%</div>
                      </div>
                   </div>

                   <div className="bg-bento-card border border-bento-border rounded-2xl p-6 flex-grow flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between mb-8">
                         <div className="text-[10px] text-bento-text-dim uppercase font-mono tracking-widest font-bold flex items-center gap-2">
                           <PenTool className="w-3 h-3 text-bento-accent" />
                           High-Fidelity Content Inventory
                         </div>
                         <div className="text-[10px] text-bento-text-dim italic font-mono uppercase tracking-tighter">Human Output Simulated v.PRO.SEO.AI</div>
                      </div>
                      
                      <div className="flex-grow overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                         <div className="grid grid-cols-1 gap-6">
                            {selectedSite.articles.map((article, i) => (
                              <div key={i} className="flex gap-8 group">
                                 <div className="w-48 h-32 rounded-2xl overflow-hidden shrink-0 border border-white/5 grayscale group-hover:grayscale-0 transition-all duration-500">
                                    <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerpolicy="no-referrer" />
                                 </div>
                                 <div className="flex-1 flex flex-col justify-center">
                                    <div className="flex items-center gap-3 mb-2">
                                       <span className="text-[9px] font-mono font-bold text-bento-accent bg-bento-accent/10 px-2 rounded">ARTICLE_{i+1}</span>
                                       <span className="text-[9px] font-mono text-bento-text-dim uppercase tracking-widest italic">{article.readingTime || "8 MIN"} READ LEVEL</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 tracking-tight leading-tight group-hover:text-bento-accent transition-colors">"{article.title}"</h3>
                                    <p className="text-xs text-bento-text-dim leading-relaxed line-clamp-2 italic opacity-80 mb-4">{article.excerpt}</p>
                                    <div className="flex gap-2">
                                       {article.keywords.slice(0, 3).map((k: string) => (
                                         <span key={k} className="text-[8px] font-mono text-bento-text-dim font-bold uppercase tracking-tighter italic">#{k}</span>
                                       ))}
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-bento-text-dim hover:text-white transition-all">
                                       <ChevronRight className="w-5 h-5" />
                                    </button>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center opacity-10">
                  <Database className="w-24 h-24 mb-6" />
                  <p className="text-3xl font-black uppercase italic tracking-tighter">Null Site Pointer 0x01</p>
                  <button onClick={() => setViewMode("dashboard")} className="mt-8 text-sm font-mono underline">REVERT_TO_TELEMETRY</button>
               </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEO PREVIEW & PORTFOLIO RAIL */}
      <div className="grid grid-cols-12 gap-5 h-48 shrink-0 mt-auto border-t border-bento-border pt-6">
        <div className="col-span-3 bg-bento-card border border-bento-border rounded-2xl p-4 flex flex-col relative group">
          <div className="text-[9px] text-bento-text-dim uppercase tracking-[0.2em] mb-4 font-mono font-bold flex justify-between">
             SERP Simulation Index
             <Search className="w-3 h-3 opacity-30" />
          </div>
          {selectedSite ? (
            <div className="space-y-1.5 flex flex-col justify-center h-full">
              <div className="text-[#8ab4f8] text-[13px] font-medium hover:underline cursor-pointer truncate">
                {selectedSite.structure.title} - {selectedSite.structure.tagline}
              </div>
              <div className="text-[#34a853] text-[10px] truncate leading-none mb-1">https://nicheflow.ai/site/{selectedSite.title.toLowerCase().replace(/\s+/g, "-")}</div>
              <p className="text-bento-text-dim text-[11px] line-clamp-2 leading-snug">
                {selectedSite.articles[0]?.excerpt || selectedSite.structure.tagline} Discover expert insights and professional resources...
              </p>
              <div className="pt-2 flex gap-4 text-[9px] font-mono items-center opacity-40 uppercase tracking-tighter">
                 <span className="text-bento-success font-bold">● 98 Perf</span>
                 <span>● {selectedSite.articles.length} Core Nodes Index-Ready</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[10px] text-bento-text-dim italic opacity-20 font-mono tracking-tighter lowercase">
              awaiting_selection_signal [0xNULL]
            </div>
          )}
        </div>

        {/* PORTFOLIO RAIL */}
        <div className="col-span-9 bg-[#0c0c0e] border border-bento-border rounded-2xl p-4 flex flex-col relative overflow-hidden group hover:border-bento-accent/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] text-bento-text-dim uppercase tracking-[0.2em] font-mono font-bold flex items-center gap-2">
              <Rocket className="w-3 h-3 text-bento-accent" />
              Strategic Yield Units
            </div>
            <div className="text-[10px] font-mono text-bento-text-dim opacity-30 italic">SCROLL_FOR_ASSETS →</div>
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
            {sites.map((site) => (
              <button 
                key={site.url}
                onClick={() => {
                   setSelectedSite(site);
                   setViewMode("site");
                }}
                className={`flex flex-col gap-1 p-4 rounded-xl border transition-all shrink-0 min-w-[220px] relative overflow-hidden group/card ${
                  selectedSite?.url === site.url ? "bg-white text-black border-white shadow-xl scale-[1.02] z-10" : "bg-white/5 border-white/5 hover:border-white/20 text-bento-text-dim"
                }`}
              >
                {selectedSite?.url === site.url && (
                  <div className="absolute top-0 right-0 p-2 opacity-20">
                     <Zap className="w-10 h-10 -rotate-12" />
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                   <div className="px-2 py-0.5 bg-bento-success/10 rounded uppercase text-[8px] font-mono font-black text-bento-success tracking-tighter">Tier_01</div>
                   <div className="text-[9px] font-mono font-bold uppercase tracking-tighter italic opacity-60">Est: +$1.2 / DAY</div>
                </div>
                <span className="text-sm font-black uppercase tracking-tighter italic leading-none truncate mb-1">{site.structure.title}</span>
                <span className="text-[9px] opacity-40 font-mono font-bold lowercase tracking-tighter line-clamp-1">{site.niche.name}</span>
                
                <div className={`mt-3 pt-3 border-t flex justify-between items-center ${selectedSite?.url === site.url ? "border-black/10" : "border-white/5"}`}>
                   <div className="flex flex-col">
                      <span className="text-[8px] font-mono opacity-40 uppercase tracking-widest leading-none mb-1">Traffic Unit</span>
                      <span className="text-[11px] font-mono font-bold italic tracking-tighter">{site.stats.traffic.toLocaleString()} <span className="text-[9px] font-normal not-italic">impr</span></span>
                   </div>
                   <div className="text-right flex flex-col">
                      <span className="text-[8px] font-mono opacity-40 uppercase tracking-widest leading-none mb-1">Arbitrage</span>
                      <span className="text-[11px] font-mono font-bold italic tracking-tighter text-bento-accent group-hover/card:text-black">94.2%</span>
                   </div>
                </div>
              </button>
            ))}
            {sites.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center opacity-10 py-4 font-mono italic text-[10px] lowercase tracking-tighter">
                [telemetry_silence] awaiting autonomous build cycle [0xSTART]
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

