import React from "react";
import { 
  Database, 
  BarChart3, 
  RotateCcw, 
  ArrowUpRight, 
  ArrowDownRight,
  Target
} from "lucide-react";
import { cn } from "../lib/utils";

interface StatsGridProps {
  globalStats: {
    totalRevenue: number;
    totalTraffic: number;
    activeCategories: number;
    dailyGrowth: number;
  };
}

export const StatsGrid = ({ globalStats }: StatsGridProps) => {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Revenue Card */}
      <div className="col-span-12 lg:col-span-4 card-minimal p-8 flex flex-col justify-between group overflow-hidden relative bg-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-12">
            <div className="p-4 bg-brand text-white rounded-3xl shadow-xl shadow-brand/20">
              <Database className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="stat-label mb-1 uppercase tracking-[0.2em]">Empire Value</div>
              <div className="flex items-center gap-2 justify-end">
                <div className="text-2xl font-black text-text-main leading-none tracking-tight">
                  ${globalStats.totalRevenue.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-muted">Conversion Power</span>
                <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +12.4%
                </span>
             </div>
             <div className="w-full h-2 bg-gray-50 rounded-full border border-border">
                <div className="w-[68%] h-full bg-brand rounded-full" />
             </div>
          </div>
        </div>
      </div>

      {/* Traffic Card */}
      <div className="col-span-12 lg:col-span-4 card-minimal p-8 flex flex-col justify-between bg-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-12">
            <div className="p-4 bg-gray-50 border border-border rounded-3xl">
              <BarChart3 className="w-6 h-6 text-text-main" />
            </div>
            <div className="text-right">
              <div className="stat-label mb-1 uppercase tracking-[0.2em]">Network Reach</div>
              <div className="text-2xl font-black text-text-main leading-none tracking-tight">
                {globalStats.totalTraffic.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-1">
             <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Growth Velocity</p>
             <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-text-main tracking-tighter">7.4ms</span>
                <span className="text-sm font-medium text-text-muted">/per node</span>
             </div>
          </div>
        </div>
      </div>

      {/* Categories Card */}
      <div className="col-span-12 lg:col-span-4 card-minimal p-8 flex flex-col justify-between bg-gray-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/20 blur-[60px] -mr-16 -mt-16" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-12">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10">
              <Target className="w-6 h-6 text-brand" />
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">Developed Clusters</div>
              <div className="text-2xl font-black text-white leading-none tracking-tight">
                {globalStats.activeCategories} <span className="text-brand/40 text-sm">Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex-grow">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1 shadow-sm">
                   <span className="text-white/40">Network Cluster Load</span>
                   <span className="text-brand">Optimal</span>
                </div>
                <div className="grid grid-cols-12 gap-1">
                   {[...Array(12)].map((_, i) => (
                     <div key={i} className={cn("h-4 rounded-sm", i < 9 ? "bg-brand" : "bg-white/5")} />
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
