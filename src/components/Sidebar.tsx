import React from "react";
import { motion } from "motion/react";
import { Rocket, BarChart3, Settings } from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isRunning: boolean;
}

export const Sidebar = ({ activeTab, setActiveTab, isRunning }: SidebarProps) => {
  const menuItems = [
    { id: "dashboard", label: "Console", icon: BarChart3 },
    { id: "settings", label: "Config", icon: Settings },
  ];

  return (
    <aside className="w-20 h-screen bg-gray-900 flex flex-col items-center py-8 gap-10 shrink-0 relative z-50">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
        <Rocket className="w-6 h-6" />
      </div>

      <nav className="flex-1 flex flex-col gap-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "p-3 rounded-2xl transition-all relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900",
                isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-6 items-center">
         <div className={cn("w-2 h-2 rounded-full", isRunning ? "bg-green-500 animate-pulse" : "bg-gray-700")} />
      </div>
    </aside>
  );
};
