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
    <div className="min-h-screen bg-bento-bg text-bento-text font-sans p-6 overflow-hidden flex flex-col gap-6">
      {/* Global Command Bar */}
      <div className="grid grid-cols-4 gap-4 pb-6 border-b border-bento-border">
        <div className="bg-bento-card border border-bento-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-bento-text-dim uppercase font-mono tracking-widest mb-1">Total Network Rev</div>
            <div className="text-xl font-bold font-mono">${globalStats.totalRevenue.toFixed(2)}</div>
          </div>
          <Database className="w-5 h-5 text-bento-warning opacity-30" />
        </div>
        <div className="bg-bento-card border border-bento-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-bento-text-dim uppercase font-mono tracking-widest mb-1">Combined Traffic</div>
            <div className="text-xl font-bold font-mono">{globalStats.totalTraffic.toLocaleString()}</div>
          </div>
          <Activity className="w-5 h-5 text-bento-accent opacity-30" />
        </div>
        <div className="bg-bento-card border border-bento-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-bento-text-dim uppercase font-mono tracking-widest mb-1">Active Assets</div>
            <div className="text-xl font-bold font-mono">{globalStats.activeSites} <span className="text-[10px] font-normal opacity-50">SITES</span></div>
          </div>
          <Globe className="w-5 h-5 text-bento-success opacity-30" />
        </div>
        <div className="bg-bento-card border border-bento-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-bento-text-dim uppercase font-mono tracking-widest mb-1">Network Growth</div>
            <div className="text-xl font-bold font-mono">+{globalStats.dailyGrowth}%</div>
          </div>
          <Zap className="w-5 h-5 text-bento-warning opacity-30" />
        </div>
      </div>

      <div className="grid grid-cols-4 grid-rows-3 gap-4 flex-grow">
        {/* ACTIVE NICHE SPOTLIGHT (Span 2W) */}
        <div className="col-span-2 bg-gradient-to-br from-[#1e1b4b] to-bento-card border border-[#312e81] rounded-2xl p-6 flex flex-col relative overflow-hidden group">
          <div className="text-[11px] text-bento-text-dim uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-bento-success shrink-0" />
            Step 02: Active Niche Validation
          </div>
          {isRunning && logs.findLast(l => l.agent === "Niche Analyzer Agent") ? (
            <>
              <h2 className="text-3xl font-extrabold mb-3 group-hover:text-bento-accent transition-colors">
                {logs.findLast(l => l.agent === "Niche Analyzer Agent")?.message.split(": ")[1] || "Discovering..."}
              </h2>
              <p className="text-bento-text-dim text-sm leading-relaxed mb-6">
                Analyzing keyword difficulty, search intent, and monetization potential for this segment. Automated SEO anchors ready.
              </p>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center opacity-20 text-center italic">
              <Search className="w-10 h-10 mb-2" />
              <p className="text-sm">Initiate mission to see niche spotlight</p>
            </div>
          )}
          
          <div className="flex gap-3 mt-auto">
            <div className="flex-1 bg-black/20 p-3 rounded-xl">
              <div className="text-[9px] text-bento-text-dim uppercase mb-1">Difficulty</div>
              <div className="text-sm font-semibold">Low (24/100)</div>
            </div>
            <div className="flex-1 bg-black/20 p-3 rounded-xl">
              <div className="text-[9px] text-bento-text-dim uppercase mb-1">Opportunity</div>
              <div className="text-sm font-semibold">High Yield</div>
            </div>
            <div className="flex-1 bg-black/20 p-3 rounded-xl">
              <div className="text-[9px] text-bento-text-dim uppercase mb-1">Monetization</div>
              <div className="text-sm font-semibold">Affiliate + Ads</div>
            </div>
          </div>
        </div>

        {/* AGENT FLEET STATUS (Span 2H) */}
        <div className="row-span-2 col-start-3 col-span-2 bg-bento-card border border-bento-border rounded-2xl p-6 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="text-[11px] text-bento-text-dim uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-3 h-3 text-bento-accent" />
              Agent Workforce Pipeline
            </div>
            <button 
              onClick={startLoop}
              disabled={isRunning}
              className={`text-[10px] font-bold px-3 py-1 rounded-md transition-all ${
                isRunning ? "text-bento-text-dim bg-white/5" : "text-white bg-bento-accent hover:bg-white hover:text-bento-accent shadow-lg shadow-bento-accent/20"
              }`}
            >
              {isRunning ? "RUNNING" : "START PIPELINE"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px]">
            {logs.slice(-10).map((log) => (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                key={log.id} 
                className="flex items-center justify-between py-1.5 border-b border-white/5 opacity-80"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-bento-text-dim">[{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]</span>
                  <span className={log.type === "success" ? "text-bento-success" : log.type === "error" ? "text-bento-warning" : "text-bento-accent"}>{log.agent.split(" ")[0]}</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-bento-success/40 ml-2 shrink-0" />
              </motion.div>
            ))}
            {logs.length === 0 && <div className="text-center py-20 text-bento-text-dim italic text-xs">Awaiting agent activation logs...</div>}
          </div>

          <div className="mt-6">
            <div className="text-[10px] text-bento-text-dim uppercase mb-2">Cycle Optimization</div>
            <div className="w-full h-1.5 bg-bento-border rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-bento-accent" 
                animate={{ width: isRunning ? `${(currentStep / 7) * 100}%` : "0%" }}
              />
            </div>
            <div className="mt-2 text-[10px] text-bento-text-dim font-mono flex justify-between uppercase">
              <span>{steps[Math.max(0, currentStep - 1)]?.name || "Ready"}</span>
              <span>{Math.round((currentStep / 7) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* DEPLOYMENT CARD */}
        <div className="bg-bento-card border border-bento-border rounded-2xl p-5 flex flex-col group hover:border-bento-accent/40 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="text-[11px] text-bento-text-dim uppercase tracking-widest flex items-center gap-2">
              <Globe className="w-3 h-3 text-bento-accent" />
              GitHub Vercel
            </div>
            <button className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded hover:bg-white/10 transition-all flex items-center gap-1">
              <Activity className="w-2.5 h-2.5" />
              SYNC
            </button>
          </div>
          <div className="text-4xl font-bold mb-1">99.9%</div>
          <div className="text-xs text-bento-text-dim font-mono">Workflow Status: PASS</div>
          <div className="mt-auto pt-4 text-[10px] font-mono text-bento-accent/80 leading-relaxed uppercase">
            CICD: Action Active<br />
            SSL: AES-256<br />
            CDN: GLOBAL-POP
          </div>
        </div>

        {/* SEO HEALTH */}
        <div className="bg-bento-card border border-bento-border rounded-2xl p-5 flex flex-col group hover:border-bento-success/40 transition-colors">
          <div className="text-[11px] text-bento-text-dim uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-bento-success" />
            Semantic Index
          </div>
          <div className="text-4xl font-bold mb-1">98<span className="text-sm text-bento-text-dim">/100</span></div>
          <div className="text-xs text-bento-text-dim font-mono">JSON-LD Graph Active</div>
          <div className="mt-auto h-12 flex items-end gap-1 pb-1">
            {[60, 80, 75, 90, 94, 98].map((h, i) => (
              <motion.div 
                key={i} 
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                className="flex-1 bg-bento-success/40 rounded-t-sm" 
              />
            ))}
          </div>
        </div>

        {/* CONTENT ENGINE (Span 2W) */}
        <div className="col-span-2 bg-bento-card border border-bento-border rounded-2xl p-6 flex flex-col">
          <div className="text-[11px] text-bento-text-dim uppercase tracking-widest mb-4 flex items-center gap-2">
            <PenTool className="w-3 h-3 text-bento-warning" />
            Content Engine Output
          </div>
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-3xl font-bold">1,240 <span className="text-sm font-normal text-bento-text-dim">Words</span></div>
              <div className="text-[10px] text-bento-text-dim font-mono">Avg. Human-Score: 98.4%</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold italic">20 Articles</div>
              <div className="text-[10px] text-bento-text-dim font-mono">Daily Batch Target</div>
            </div>
          </div>
          <div className="bg-black/20 p-3 rounded-xl font-mono text-[9px] space-y-1 overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-bento-success">✓</span> The Best Linear Switches for Coding 2024.md
            </div>
            <div className="flex items-center gap-2">
              <span className="text-bento-success">✓</span> Understanding Gasket Mount vs Tray Mount.md
            </div>
            <div className="flex items-center gap-2">
              <span className="text-bento-accent animate-pulse">●</span> Advanced Lubrication Techniques... (Writing)
            </div>
          </div>
        </div>

        {/* GROWTH STATS */}
        <div className="bg-bento-card border border-bento-border rounded-2xl p-5 flex flex-col group hover:border-bento-accent/40 transition-colors">
          <div className="text-[11px] text-bento-text-dim uppercase tracking-widest mb-4 flex items-center gap-2">
            <BarChart3 className="w-3 h-3 text-bento-accent" />
            Week Growth
          </div>
          <div className="text-4xl font-bold text-bento-success">+14%</div>
          <div className="text-xs text-bento-text-dim font-mono">CTR Optimization</div>
          <div className="mt-auto space-y-2">
            <div className="flex justify-between text-[10px] font-mono border-t border-white/5 pt-2 uppercase">
              <span className="text-bento-text-dim">Impressions</span>
              <span>12.4k</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono uppercase">
              <span className="text-bento-text-dim">Avg Post.</span>
              <span>18.2</span>
            </div>
          </div>
        </div>

        {/* REVENUE */}
        <div className="bg-bento-card border border-bento-border rounded-2xl p-5 flex flex-col group hover:border-bento-warning/40 transition-colors">
          <div className="text-[11px] text-bento-text-dim uppercase tracking-widest mb-4 flex items-center gap-2">
            <Database className="w-3 h-3 text-bento-warning" />
            Fleet Revenue
          </div>
          <div className="text-4xl font-bold">$12.42</div>
          <div className="text-xs text-bento-text-dim font-mono">Est. Accrued Daily</div>
          <div className="mt-auto flex items-center gap-2 px-3 py-1.5 bg-bento-warning/10 rounded-full border border-bento-warning/20">
            <div className="w-2 h-2 rounded-full bg-bento-warning" />
            <span className="text-[9px] font-bold text-bento-warning uppercase">AdSense Reviewing</span>
          </div>
        </div>
      </div>

      {/* SEO PREVIEW & PORTFOLIO */}
      <div className="grid grid-cols-12 gap-5 h-48 shrink-0">
        <div className="col-span-4 bg-bento-card border border-bento-border rounded-2xl p-4 flex flex-col">
          <div className="text-[10px] text-bento-text-dim uppercase tracking-widest mb-3">Google SERP Preview (Simulated)</div>
          {selectedSite ? (
            <div className="space-y-1">
              <div className="text-[#8ab4f8] text-sm font-medium hover:underline cursor-pointer truncate">
                {selectedSite.structure.title} - {selectedSite.structure.tagline}
              </div>
              <div className="text-[#34a853] text-[10px] truncate">https://nicheflow.ai/site/{selectedSite.title.toLowerCase().replace(/\s+/g, "-")}</div>
              <p className="text-bento-text-dim text-[11px] line-clamp-2">
                Discover {selectedSite.niche.name} with {selectedSite.structure.title}. {selectedSite.articles[0]?.excerpt || selectedSite.structure.tagline}
              </p>
              <div className="pt-2 flex gap-4 text-[10px] items-center">
                 <span className="text-bento-success">98 Performance</span>
                 <span className="text-bento-text-dim">{selectedSite.articles.length} pages index-ready</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[10px] text-bento-text-dim italic opacity-20">Select site to view SERP preview</div>
          )}
        </div>

        {/* PORTFOLIO RAIL */}
        <div className="col-span-8 bg-bento-card/50 border border-bento-border rounded-2xl p-4 flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-bento-text-dim uppercase tracking-widest flex items-center gap-2">
              <Rocket className="w-3 h-3 text-bento-accent" />
              Deployed Portfolio
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {sites.map((site) => (
              <button 
                key={site.url}
                onClick={() => setSelectedSite(site)}
                className={`flex flex-col gap-1 p-3 rounded-xl border transition-all shrink-0 min-w-[180px] ${
                  selectedSite?.url === site.url ? "bg-bento-accent text-white border-bento-accent shadow-lg shadow-bento-accent/20" : "bg-white/5 border-bento-border hover:border-white/20 text-bento-text-dim"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] font-mono text-bento-success">{site.niche.competitionLvl || "LOW"} COMP</span>
                   <span className="text-[10px] font-mono">{site.stats.traffic} VISITS</span>
                </div>
                <span className="text-xs font-bold uppercase truncate">{site.structure.title}</span>
                <span className="text-[9px] opacity-60 font-mono tracking-tight line-clamp-1">{site.structure.tagline}</span>
                <div className="mt-2 text-[9px] border-t border-white/10 pt-1 flex justify-between">
                   <span>CPC: {site.niche.estimatedCPC}</span>
                   <span className="font-bold">${site.stats.revenue.toFixed(2)}</span>
                </div>
              </button>
            ))}
            {sites.length === 0 && (
              <div className="flex-1 flex items-center justify-center gap-3 opacity-20">
                <Database className="w-5 h-5" />
                <span className="text-[10px] italic">No active assets in pipeline.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

