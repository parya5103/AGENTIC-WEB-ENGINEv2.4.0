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
  ShieldAlert,
  ExternalLink, 
  Activity,
  ChevronRight,
  Monitor,
  RefreshCcw,
  CheckCircle2,
  Trash2,
  Play,
  RotateCcw,
  Hammer,
  Target,
  Brain,
  DollarSign,
  ArrowUpRight,
  Database,
  Bell,
  Settings,
  Clock,
  Plus,
  Layers
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { auth, signIntoApp, logoutFromApp, onAuthStateChanged, User } from "./lib/firebase";
import { cn } from "./lib/utils";

// SaaS Components
import { Sidebar } from "./components/Sidebar";
import { PageHeader } from "./components/PageHeader";
import { StatsGrid } from "./components/StatsGrid";
import { NetworkChart } from "./components/NetworkChart";
import { ThinkingConsole } from "./components/ThinkingConsole";
import { ForgeCore } from "./components/ForgeCore";

interface Log {
  id: string;
  agent: string;
  message: string;
  type: "info" | "success" | "error" | "process";
  timestamp: string;
}

interface Post {
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  createdAt: string;
}

interface Category {
  slug: string;
  name: string;
  description: string;
  status: "architected" | "developed" | "live" | "failed";
  style?: { primaryColor: string; accentColor: string; icons: string[] };
  monetization?: any;
  analytics?: { projectedMonthlyTraffic: number; predictedRevenue: string; confidenceScore: number };
  url?: string;
  createdAt: string;
}

interface GlobalStats {
  totalRevenue: number;
  totalTraffic: number;
  activeCategories: number;
  autoDeploy?: boolean;
  dailyGrowth: number;
  simulationEnabled?: boolean;
  history: Array<{ time: string; revenue: number; traffic: number }>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logs, setLogs] = useState<Log[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({ 
    totalRevenue: 0, 
    totalTraffic: 0, 
    activeCategories: 0,
    autoDeploy: true,
    dailyGrowth: 0,
    simulationEnabled: false,
    history: []
  });
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const handleLogin = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      await signIntoApp();
    } catch (error: any) {
      console.error("[Auth] Auth error:", error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchState = async () => {
      try {
        const res = await fetch(`/api/state?userId=${user.uid}`);
        const data = await res.json();
        if (data.categories) setCategories(data.categories);
        if (data.globalStats) setGlobalStats(prev => ({ ...prev, ...data.globalStats }));
        if (data.loopRunning !== undefined) setIsRunning(data.loopRunning);
      } catch (e) {
        console.error("State fetch failed", e);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    socketRef.current = io();
    socketRef.current.on("connect", () => {
      if (user) socketRef.current?.emit("setUserId", user.uid);
    });
    
    socketRef.current.on("init", (data: any) => {
      if (data.categories) setCategories(data.categories);
      if (data.globalStats) setGlobalStats(data.globalStats);
      if (data.loopRunning !== undefined) setIsRunning(data.loopRunning);
    });

    socketRef.current.on("log", (log: any) => {
      setLogs(prev => prev.some(l => l.id === log.id) ? prev : [...prev, log]);
    });

    socketRef.current.on("taskStatusChange", (data: any) => {
      if (data.status === "completed") {
        fetch(`/api/state?userId=${user?.uid}`).then(r => r.json()).then(d => {
          if (d.categories) setCategories(d.categories);
        });
      }
    });

    return () => { socketRef.current?.disconnect(); };
  }, [user]);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const handleStart = () => user && fetch("/api/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.uid }) });
  const handleStop = () => user && fetch("/api/stop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.uid }) });

  if (authLoading) return <div className="h-screen w-screen bg-white flex items-center justify-center font-bold text-gray-400">Loading NicheFlow...</div>;

  if (!user) return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      <div className="max-w-xl w-full bg-white p-12 rounded-[40px] shadow-2xl border border-gray-100 text-center space-y-8">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl"><Rocket className="w-10 h-10" /></div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight italic">NICHE<span className="text-blue-600">FLOW</span> EMPIRE</h1>
          <p className="text-gray-500 font-medium">Autonomous Multi-Niche Scaling Agent System</p>
        </div>
        <button onClick={handleLogin} disabled={isAuthenticating} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl disabled:opacity-50">
          {isAuthenticating ? "Authenticating..." : "Access Control Center"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Simplified Top Bar */}
        <header className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><Zap className="w-5 h-5" /></div>
               <span className="font-black italic tracking-tighter text-xl">NF.EMPIRE</span>
             </div>
             <div className="h-6 w-px bg-gray-100" />
             <div className="flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full", isRunning ? "bg-green-500 animate-pulse" : "bg-gray-300")} />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{isRunning ? "System Active" : "Standby"}</span>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <button onClick={isRunning ? handleStop : handleStart} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg", isRunning ? "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white" : "bg-gray-900 text-white hover:bg-blue-600")}>
               {isRunning ? "Stop Agents" : "Run Agents"}
             </button>
             <button onClick={logoutFromApp} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden p-6 gap-6">
          {/* Main Console: Categories */}
          <div className="flex-[3] flex flex-col gap-6 overflow-hidden">
             {/* Simple Stats Overlay */}
             <div className="grid grid-cols-3 gap-6 shrink-0">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Activity className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Network Yield</p><p className="text-2xl font-black">${globalStats.totalRevenue.toFixed(2)}</p></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center"><Globe className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Paths</p><p className="text-2xl font-black">{categories.length}</p></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center"><Zap className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Growth rate</p><p className="text-2xl font-black">{globalStats.dailyGrowth}%</p></div>
                </div>
             </div>

             {/* Niche Grid */}
             <div className="flex-1 bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 px-8 border-b border-gray-50 flex items-center justify-between">
                   <h3 className="font-black italic uppercase tracking-tighter text-xl">Target Nodes</h3>
                   <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{categories.length} Online</span>
                </div>
                <div className="flex-1 overflow-y-auto p-8 pt-4">
                   {categories.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center"><Plus className="w-8 h-8 text-gray-400" /></div>
                        <p className="font-bold text-gray-400">No nodes detected. Click "Run" to initiate discovery.</p>
                     </div>
                   ) : (
                     <div className="grid grid-cols-2 gap-6 pb-8">
                        {categories.map((cat) => (
                           <div key={cat.slug} className="p-6 rounded-3xl border border-gray-100 hover:border-blue-200 transition-all group bg-gray-50/30">
                              <div className="flex items-start justify-between mb-6">
                                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"><Globe className="w-6 h-6" /></div>
                                 <div className={cn("text-[9px] font-black uppercase px-2 py-1 rounded", cat.status === "live" ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-600")}>{cat.status}</div>
                              </div>
                              <h4 className="font-black text-lg text-gray-900 leading-tight mb-2">{cat.name}</h4>
                              <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-6 font-medium italic opacity-70">"{cat.description}"</p>
                              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                                 <div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-blue-500" /><span className="text-xs font-bold text-gray-600">{cat.analytics?.confidenceScore || 0}% Power</span></div>
                                 <a href={cat.url || `/cat/${cat.slug}`} target="_blank" className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline">View Uplink <ExternalLink className="w-3 h-3" /></a>
                              </div>
                           </div>
                        ))}
                     </div>
                   )}
                </div>
             </div>
          </div>

          {/* Side Console: Neural Stream */}
          <div className="flex-[1.2] flex flex-col gap-6 overflow-hidden">
             <div className="flex-1 bg-gray-900 rounded-[40px] p-8 flex flex-col overflow-hidden text-white border border-gray-800 shadow-2xl relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Monitor className="w-48 h-48" /></div>
                <div className="flex items-center justify-between mb-8 shrink-0 relative z-10">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Core Telemetry</h4>
                   </div>
                   <span className="text-[8px] font-bold text-gray-500 font-mono tracking-tighter">EST: {new Date().toLocaleTimeString()}</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar relative z-10">
                   {logs.slice(-50).map((log, i) => (
                      <div key={log.id || i} className="group flex gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                         <div className="w-0.5 bg-blue-500/20 group-hover:bg-blue-500 transition-all rounded-full shrink-0" />
                         <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                               <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">{log.agent.split(' ')[0]}</span>
                               <span className="text-[8px] text-gray-600 font-mono italic">@{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className={cn("text-xs leading-relaxed opacity-80", log.type === "error" ? "text-red-400" : log.type === "success" ? "text-green-400" : "text-gray-300")}>
                               {log.message}
                            </p>
                         </div>
                      </div>
                   ))}
                   <div ref={logEndRef} />
                </div>
                
                {isRunning && (
                  <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center gap-4 animate-pulse relative z-10">
                     <div className="w-8 h-8 rounded-full border-2 border-t-blue-500 border-transparent animate-spin shrink-0" />
                     <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Agents Processing Matrix...</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
