import React, { useState, useEffect } from "react";
import { Bell, Monitor, ChevronRight, LogOut, Activity, Wifi, ShieldAlert } from "lucide-react";
import { cn } from "../lib/utils";
import { User } from "../lib/firebase";

interface PageHeaderProps {
  title: string;
  isRunning: boolean;
  onToggleConsole: () => void;
  showConsole: boolean;
  user: User | null;
  onLogout: () => void;
  onToggleRun: () => void;
}

export const PageHeader = ({ title, isRunning, onToggleConsole, showConsole, user, onLogout, onToggleRun }: PageHeaderProps) => {
  const [stability, setStability] = useState(99.4);
  const [latency, setLatency] = useState(24);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setStability(prev => {
        const next = prev + (Math.random() - 0.5) * 0.1;
        return Math.min(100, Math.max(98.5, next));
      });
      setLatency(prev => {
        const next = prev + (Math.random() - 0.5) * 2;
        return Math.min(45, Math.max(12, Math.floor(next)));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <header className="h-20 bg-white border-b border-border flex items-center justify-between px-10 sticky top-0 z-40">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted/40 italic">Global_Node</span>
          <ChevronRight className="w-3 h-3 text-text-muted/30" />
          <h1 className="text-sm font-black uppercase tracking-widest text-text-main group hover:text-brand cursor-default transition-colors">
            {title}
            <span className="ml-2 text-[9px] text-brand/40 group-hover:text-brand font-medium tracking-tight">v4.22_STABLE</span>
          </h1>
        </div>

        {isRunning && (
          <div className="hidden lg:flex items-center gap-6 pl-6 border-l border-border">
             <div className="space-y-1">
                <div className="flex items-center gap-2 text-[9px] font-bold text-text-muted uppercase tracking-widest">
                   <Wifi className="w-3 h-3 text-green-500" /> Neural Stability
                </div>
                <div className="text-xs font-black tabular-nums text-text-main">{stability.toFixed(1)}%</div>
             </div>
             <div className="space-y-1">
                <div className="flex items-center gap-2 text-[9px] font-bold text-text-muted uppercase tracking-widest">
                   <Activity className="w-3 h-3 text-brand" /> Latency
                </div>
                <div className="text-xs font-black tabular-nums text-text-main">{latency}ms</div>
             </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-50 rounded-2xl border border-border shadow-inner group/status">
          <div className={cn(
            "w-2 h-2 rounded-full ring-4 transition-all duration-500 cursor-pointer",
            isRunning ? "bg-green-500 ring-green-500/10 animate-pulse" : "bg-gray-300 ring-transparent"
          )} onClick={onToggleRun} />
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted group-hover/status:text-text-main transition-colors">
            {isRunning ? "Neural Handshake: Online" : "Uplink Standby"}
          </span>
        </div>

        <div className="flex items-center gap-4">
            <button
              aria-label="Notifications"
              className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-gray-50 transition-all text-text-muted relative"
            >
              <Bell className="w-5 h-5" />
              <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand rounded-full border-2 border-white" />
            </button>
            
            <button 
              onClick={onToggleConsole}
              aria-label={showConsole ? "Hide Console" : "Show Console"}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-2xl transition-all",
                showConsole ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-text-muted hover:bg-gray-50"
              )}
            >
              <Monitor className="w-5 h-5" />
            </button>

            <div className="h-8 w-px bg-border mx-2" />

            <div className="flex items-center gap-3 pl-2 group">
               <div className="text-right">
                  <p className="text-[10px] font-black text-text-main leading-none">{user?.displayName || "System Agent"}</p>
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1">
                    {user?.email === "aaryapratik@gmail.com" ? "Master Architect" : "Enterprise Node"}
                  </p>
               </div>
               <div className="relative group/avatar">
                 <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand to-black flex items-center justify-center text-white text-xs font-black shadow-lg shadow-brand/10">
                   {getInitials(user?.displayName)}
                 </div>
                 
                 {/* Logout Dropdown Simulation */}
                 <button 
                  onClick={onLogout}
                  className="absolute top-0 right-0 w-full h-full opacity-0 cursor-pointer z-10 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
                  title="Logout"
                  aria-label="Logout Dropdown Trigger"
                 />
                 <div className="absolute -bottom-2 right-0 translate-y-full w-32 bg-white border border-border rounded-xl shadow-xl p-2 opacity-0 group-hover/avatar:opacity-100 transition-all pointer-events-none group-hover/avatar:pointer-events-auto">
                    <button 
                      onClick={onLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-red-500 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 rounded-lg transition-colors"
                    >
                      <LogOut className="w-3 h-3" />
                      Sign Out
                    </button>
                 </div>
               </div>
            </div>
        </div>
      </div>
    </header>
  );
};
