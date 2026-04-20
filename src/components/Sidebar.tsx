import React from "react";
import { 
  Rocket, 
  Layout, 
  BarChart3, 
  Zap, 
  ShieldCheck, 
  Settings,
  Target,
  Brain,
  ChevronRight,
  LogOut,
  HelpCircle,
  Activity
} from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isRunning: boolean;
}

export const Sidebar = ({ activeTab, setActiveTab, isRunning }: SidebarProps) => {
  const menuItems = [
    { id: "overview", label: "Dashboard", icon: BarChart3 },
    { id: "strategy", label: "Strategic Vision", icon: Brain },
    { id: "sites", label: "Asset Manager", icon: Layout },
    { id: "logs", label: "Neural Trace", icon: Activity },
  ];

  const bottomItems = [
    { id: "settings", label: "Integrations", icon: Zap },
    { id: "config", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-80 h-screen fixed left-0 top-0 bg-surface border-r border-border flex flex-col z-50">
      <div className="p-8 pb-12">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 bg-brand text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20 group-hover:rotate-12 transition-transform duration-500">
            <Rocket className="w-6 h-6 fill-current" />
          </div>
          <div>
             <h1 className="text-xl font-bold tracking-tight text-text-main">NicheFlow</h1>
             <p className="text-[10px] font-bold text-brand uppercase tracking-widest mt-0.5 opacity-70">Empire OS v4.2</p>
          </div>
        </div>
      </div>

      <nav className="flex-grow px-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group",
                isActive 
                  ? "bg-white shadow-sm border border-border text-brand" 
                  : "text-text-muted hover:bg-gray-50 hover:text-text-main"
              )}
            >
              <div className="flex items-center gap-4">
                <Icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                <span className="text-sm font-semibold tracking-tight">{item.label}</span>
              </div>
              {isActive && (
                <motion.div layoutId="activeBall">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_8px_rgba(17,17,17,0.3)]" />
                </motion.div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-6 space-y-6">
        <div className="px-2 space-y-1">
          {bottomItems.map((item) => {
             const Icon = item.icon;
             const isActive = activeTab === item.id;
             return (
               <button 
                 key={item.id} 
                 onClick={() => setActiveTab(item.id)}
                 className={cn(
                   "w-full flex items-center gap-4 p-4 transition-all text-sm font-semibold rounded-2xl",
                   isActive 
                     ? "bg-white shadow-sm border border-border text-brand" 
                     : "text-text-muted hover:text-text-main hover:bg-gray-50"
                 )}
               >
                 <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
                 {item.label}
               </button>
             );
          })}
        </div>

        <div className="p-6 bg-gray-50 rounded-3xl border border-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <ShieldCheck className="w-5 h-5 text-brand" />
                <span className="text-[10px] font-bold text-brand uppercase tracking-widest bg-brand/10 px-2 py-0.5 rounded">Pro Plan</span>
             </div>
             <div>
                <p className="text-xs font-bold text-text-main">Neural Capacity</p>
                <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                   <div className="w-3/4 h-full bg-brand" />
                </div>
                <p className="text-[10px] text-text-muted mt-2">75% of search tokens utilized</p>
             </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

import { motion } from "motion/react";
