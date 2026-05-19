import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Zap, 
  Flame, 
  Hammer, 
  Target, 
  Cpu, 
  Database, 
  Activity, 
  ChevronRight,
  RotateCcw,
  Box,
  Layers,
  Thermometer,
  ShieldCheck
} from "lucide-react";
import { cn } from "../lib/utils";

interface ForgeCoreProps {
  onForge: (seed: string, strategy: string, config: ForgeConfig) => void;
  isRunning: boolean;
  error?: string | null;
  onClearError?: () => void;
}

export interface ForgeConfig {
  temperature: number;
  depth: number;
  engine: string;
}

export const ForgeCore = ({ onForge, isRunning, error, onClearError }: ForgeCoreProps) => {
  const [seed, setSeed] = useState("");
  const [strategy, setStrategy] = useState("authority");
  const [config, setConfig] = useState<ForgeConfig>({
    temperature: 0.7,
    depth: 5,
    engine: "neural-v4"
  });
  const [heatLevel, setHeatLevel] = useState(0);
  const [isForging, setIsForging] = useState(false);

  useEffect(() => {
    if (isRunning) {
      setIsForging(true);
      const interval = setInterval(() => {
        setHeatLevel(prev => Math.min(100, prev + (Math.random() * 5)));
      }, 300);
      return () => clearInterval(interval);
    } else {
      setHeatLevel(0);
      setIsForging(false);
    }
  }, [isRunning]);

  useEffect(() => {
    if (error) {
      setIsForging(false);
    }
  }, [error]);

  const strategies = [
    { id: "authority", name: "Global Authority", desc: "Editorial-first, deep semantic tree", icon: Target },
    { id: "saas", name: "SaaS Protocol", desc: "Feature-driven, conversion optimized", icon: Box },
    { id: "ghost", name: "Ghost Network", desc: "Minimalist, high-velocity distribution", icon: Cpu }
  ];

  const handleStartForge = () => {
    if (!seed || isForging) return;
    setIsForging(true);
    setHeatLevel(100);
    onForge(seed, strategy, config);
    
    // Reset forging state after a timeout to allow subsequent forging attempts
    // since the server-side process is async and doesn't send a completion signal directly back to this component state.
    setTimeout(() => {
      setIsForging(false);
      setHeatLevel(0);
    }, 5000);
  };

  return (
    <div className="space-y-8 p-6 lg:p-12 bg-[#0A0A0C] min-h-full font-sans text-white/90">
      {/* Forge Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 border-b border-white/5 pb-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
            <Flame className="w-4 h-4 fill-orange-500 animate-pulse" />
            Forge Core Active
          </div>
          <h2 className="text-6xl lg:text-8xl font-black tracking-tight text-white uppercase italic transform -skew-x-6">
            Manual <span className="text-orange-500">Override</span>
          </h2>
          <p className="text-xl text-white/40 font-medium max-w-2xl font-mono leading-relaxed">
            "Direct manual control of the neural synthesis engine. Circumvent autonomous cycles to forge specific strategic assets."
          </p>
        </div>

        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex items-center gap-8 backdrop-blur-xl">
           <div className="space-y-2">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Core Temperature</span>
              <div className="flex items-center gap-3">
                 <Thermometer className={cn("w-6 h-6", heatLevel > 80 ? "text-orange-500" : "text-white/40")} />
                 <span className="text-3xl font-black font-mono tracking-tighter">{Math.floor(heatLevel)}°C</span>
              </div>
           </div>
           <div className="w-px h-12 bg-white/10" />
           <div className="space-y-2 text-right">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Uplink Status</span>
              <div className="flex items-center gap-3 justify-end text-green-500">
                 <ShieldCheck className="w-6 h-6" />
                 <span className="text-xl font-bold uppercase tracking-tighter whitespace-nowrap">Secure</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 pt-8">
        {/* Input Chamber */}
        <div className="col-span-12 lg:col-span-7 space-y-8">
           <div className="bg-white/5 rounded-[40px] border border-white/10 p-10 space-y-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px] -mr-48 -mt-48 transition-opacity opacity-0 group-hover:opacity-100" />
              
              <div className="space-y-4 relative z-10">
                <label htmlFor="seed-input" className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] ml-2 block">
                  Seed Niche Entry
                </label>
                <div className="relative">
                   <div className="absolute left-6 top-1/2 -translate-y-1/2">
                      <Zap className="w-6 h-6 text-orange-500" />
                   </div>
                   <input 
                     id="seed-input"
                     type="text"
                     value={seed}
                     onChange={(e) => setSeed(e.target.value)}
                     placeholder="ENTER ARCHETYPE SEED (e.g. DeFi Arbitrage, Vertical Bio-Hack)..."
                     className="w-full bg-black/40 border-2 border-white/5 rounded-[32px] px-16 py-8 text-xl font-bold placeholder:text-white/10 focus:border-orange-500/40 focus:outline-none transition-all"
                   />
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                 <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] ml-2 block">
                    Structural Strategy
                 </label>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {strategies.map(s => (
                       <button
                         key={s.id}
                         onClick={() => setStrategy(s.id)}
                         className={cn(
                           "p-8 rounded-[32px] border-2 transition-all flex flex-col items-start gap-4 text-left group/strategy",
                           strategy === s.id 
                            ? "bg-white/10 border-orange-500 shadow-2xl shadow-orange-500/10" 
                            : "bg-white/5 border-transparent hover:border-white/20"
                         )}
                       >
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                            strategy === s.id ? "bg-orange-500 text-white" : "bg-white/5 text-white/40 group-hover/strategy:bg-white/10"
                          )}>
                             <s.icon className="w-6 h-6" />
                          </div>
                          <div>
                             <h4 className="font-bold text-sm tracking-tight">{s.name}</h4>
                             <p className="text-[10px] text-white/30 font-medium uppercase mt-1 tracking-tighter leading-tight">{s.desc}</p>
                          </div>
                       </button>
                    ))}
                 </div>
              </div>

               <div className="space-y-8 relative z-10 p-8 bg-black/20 rounded-[32px] border border-white/5">
                  <div className="flex items-center justify-between">
                     <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] ml-2 block">
                        Precision Tuning
                     </label>
                     <div className="flex items-center gap-2 text-orange-500/50 text-[10px] font-bold uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                        <Activity className="w-3 h-3" /> Manual Mode
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                           <label htmlFor="temp-input" className="text-xs font-bold text-white/60">Divergent Temp</label>
                           <span className="text-sm font-mono font-black text-orange-500">{config.temperature.toFixed(2)}</span>
                        </div>
                        <input 
                           id="temp-input"
                           type="range" 
                           min="0" 
                           max="1" 
                           step="0.05"
                           value={config.temperature}
                           onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value)})}
                           className="w-full accent-orange-500 bg-white/10 h-1.5 rounded-full appearance-none cursor-pointer"
                        />
                        <p className="text-[9px] text-white/20 font-medium px-2 italic uppercase">Higher values synthesize unpredictable, creative logic patterns</p>
                     </div>

                     <div className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                           <label htmlFor="depth-input" className="text-xs font-bold text-white/60">Expansion Depth</label>
                           <span className="text-sm font-mono font-black text-orange-500">{config.depth} Units</span>
                        </div>
                        <input 
                           id="depth-input"
                           type="range" 
                           min="1" 
                           max="15" 
                           step="1"
                           value={config.depth}
                           onChange={(e) => setConfig({...config, depth: parseInt(e.target.value)})}
                           className="w-full accent-orange-500 bg-white/10 h-1.5 rounded-full appearance-none cursor-pointer"
                        />
                        <p className="text-[9px] text-white/20 font-medium px-2 italic uppercase">Volume of neural nodes to generate in a single burst</p>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] ml-2 block">
                        Neural Engine
                     </label>
                     <div className="flex gap-4">
                        {["neural-v4", "logic-core", "creative-x"].map((engine) => (
                           <button
                             key={engine}
                             onClick={() => setConfig({...config, engine})}
                             className={cn(
                               "flex-1 py-3 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                               config.engine === engine 
                                 ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20" 
                                 : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                             )}
                           >
                              {engine.replace("-", " ")}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-start gap-4 group/error"
                  >
                    <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-grow">
                       <h5 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Synthesizer Failure</h5>
                       <p className="text-xs font-bold leading-relaxed text-red-100/70">{error}</p>
                    </div>
                    <button 
                      onClick={onClearError}
                      aria-label="Clear error"
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-6">
                 <button 
                   onClick={handleStartForge}
                   disabled={isForging || !seed}
                   className="w-full h-24 bg-orange-500 rounded-[32px] flex items-center justify-center gap-4 text-white text-xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale transition-all overflow-hidden relative group/btn"
                 >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                    <Hammer className="w-8 h-8 relative z-10" />
                    <span className="relative z-10">Initiate Synthesis</span>
                 </button>
              </div>
           </div>
        </div>

        {/* Forge Telemetry */}
        <div className="col-span-12 lg:col-span-5 space-y-8">
           <div className="bg-white/5 rounded-[40px] border border-white/10 p-10 h-full relative overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white/40">Real-time Telemetry</h3>
                 <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Live Flow</span>
                 </div>
              </div>

              {/* Visualization Placeholder */}
              <div className="flex-grow flex items-center justify-center relative">
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[300px] h-[300px] rounded-full border-2 border-dashed border-white/5 animate-[spin_20s_linear_infinite]" />
                    <div className="absolute w-[200px] h-[200px] rounded-full border-2 border-orange-500/10 animate-[spin_12s_linear_infinite_reverse]" />
                 </div>
                 
                 <div className="relative z-10 text-center space-y-6">
                    <AnimatePresence mode="wait">
                       {isRunning ? (
                         <motion.div 
                           key="active"
                           initial={{ opacity: 0, scale: 0.9 }}
                           animate={{ opacity: 1, scale: 1 }}
                           exit={{ opacity: 0, scale: 0.9 }}
                           className="space-y-6"
                         >
                            <div className="w-24 h-24 bg-orange-500 rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(249,115,22,0.4)]">
                               <RotateCcw className="w-10 h-10 text-white animate-spin" />
                            </div>
                            <div>
                               <p className="text-2xl font-black font-mono tracking-tighter">SYNTHESIZING...</p>
                               <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mt-2">Divergent logic applied</p>
                            </div>
                         </motion.div>
                       ) : (
                         <motion.div 
                           key="standby"
                           initial={{ opacity: 0, scale: 0.9 }}
                           animate={{ opacity: 1, scale: 1 }}
                           exit={{ opacity: 0, scale: 0.9 }}
                           className="space-y-4"
                         >
                            <Box className="w-20 h-20 text-white/10 mx-auto" />
                            <p className="text-sm font-bold text-white/20 uppercase tracking-[0.4em]">Engine Idle</p>
                         </motion.div>
                       )}
                    </AnimatePresence>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/5">
                 <div className="bg-white/5 p-4 rounded-2xl space-y-1">
                    <span className="text-[9px] font-bold text-white/30 uppercase">Neural Load</span>
                    <p className="text-sm font-mono font-bold text-white/60">4.2 PB/s</p>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl space-y-1 text-right">
                    <span className="text-[9px] font-bold text-white/30 uppercase">Entropy</span>
                    <p className="text-sm font-mono font-bold text-orange-500">Minimal</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
