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
  niche: { name: string; selectedReason: string; targetAudience: string; estimatedCPC: string };
  structure: { title: string; tagline: string; pages: string[]; colors: any };
  articles: any[];
  url: string;
  createdAt: string;
}

export default function App() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on("init", (data: any) => {
      setLogs(data.logs);
      setSites(data.generatedSites);
      setIsRunning(data.loopRunning);
    });

    socketRef.current.on("log", (log: Log) => {
      setLogs((prev) => [...prev, log]);
    });

    socketRef.current.on("status", (status: any) => {
      setIsRunning(status.running);
      setCurrentStep(status.step);
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
    <div className="min-h-screen bg-bento-bg text-bento-text font-sans p-6 overflow-hidden flex flex-col gap-5">
      {/* Header - Bento Style */}
      <header className="flex justify-between items-center pb-4 border-b border-bento-border">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            AGENTIC WEB ENGINE 
            <span className="text-bento-text-dim font-normal ml-3 text-sm">v2.4.0</span>
          </h1>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border transition-colors ${
          isRunning ? "bg-bento-success/10 text-bento-success border-bento-success animate-pulse" : "bg-white/5 text-bento-text-dim border-bento-border"
        }`}>
          Pipeline: {isRunning ? "Active Looping" : "Idle"}
        </div>
      </header>

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
          <div className="text-[11px] text-bento-text-dim uppercase tracking-widest mb-4 flex items-center gap-2">
            <Globe className="w-3 h-3 text-bento-accent" />
            Vercel Edge
          </div>
          <div className="text-4xl font-bold mb-1">99.9%</div>
          <div className="text-xs text-bento-text-dim font-mono">Uptime Status</div>
          <div className="mt-auto pt-4 text-[10px] font-mono text-bento-accent/80 leading-relaxed uppercase">
            GIT: v2.4-stable<br />
            SSL: AES-256<br />
            CDN: GLOBAL-POP
          </div>
        </div>

        {/* SEO HEALTH */}
        <div className="bg-bento-card border border-bento-border rounded-2xl p-5 flex flex-col group hover:border-bento-success/40 transition-colors">
          <div className="text-[11px] text-bento-text-dim uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-bento-success" />
            SEO Index
          </div>
          <div className="text-4xl font-bold mb-1">94<span className="text-sm text-bento-text-dim">/100</span></div>
          <div className="text-xs text-bento-text-dim font-mono">Core Web Vitals</div>
          <div className="mt-auto h-12 flex items-end gap-1 pb-1">
            {[40, 60, 80, 75, 90, 94].map((h, i) => (
              <div key={i} className="flex-1 bg-bento-accent/40 rounded-t-sm" style={{ height: `${h}%` }} />
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

      {/* PORTFOLIO RAIL */}
      <div className="h-16 border-t border-bento-border bg-bento-card/50 px-6 -mx-6 flex items-center gap-6 overflow-x-auto scrollbar-hide shrink-0">
        <div className="flex items-center gap-2 text-[10px] font-bold text-bento-text-dim uppercase tracking-[0.2em] whitespace-nowrap">
          <Rocket className="w-3 h-3 text-bento-accent" /> DEPLOYED SITES:
        </div>
        {sites.map((site) => (
          <button 
            key={site.url}
            onClick={() => setSelectedSite(site)}
            className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
              selectedSite?.url === site.url ? "bg-bento-accent text-white border-bento-accent" : "bg-white/5 border-bento-border hover:border-white/20 text-bento-text-dim"
            }`}
          >
            <span className="text-xs font-bold uppercase truncate max-w-[120px]">{site.structure.title}</span>
            <span className="text-[9px] opacity-60">v1.2</span>
          </button>
        ))}
        {sites.length === 0 && <span className="text-[10px] italic text-bento-text-dim opacity-30">Awaiting autonomous deployments...</span>}
      </div>
    </div>
  );
}

