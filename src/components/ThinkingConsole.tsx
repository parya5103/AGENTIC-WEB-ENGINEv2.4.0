import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface Log {
  id: string;
  agent: string;
  message: string;
  type: "info" | "success" | "error" | "process";
  timestamp: string;
}

interface ThinkingConsoleProps {
  logs: Log[];
  onClose: () => void;
}

// ⚡ Bolt Optimization: Wrap LogItem in React.memo()
// Streaming 50+ logs per render drops frames. Wrapping this in memo ensures
// React only diffs the newest appended log element, preventing O(n) rendering.
const LogItem = React.memo(({ log }: { log: Log }) => {
  return (
    <div className="group border-b border-white/5 pb-2 last:border-0">
      <div className="flex items-center justify-between mb-1 opacity-50">
        <span className="text-[9px] font-bold uppercase tracking-widest text-brand">[{log.agent.replace(" Agent", "")}]</span>
        <span className="text-[9px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
      </div>
      <div className="flex gap-2">
        <span className="text-white/20 select-none">❯</span>
        <p className={log.type === 'error' ? 'text-red-400' : ''}>{log.message}<span className="thinking-cursor" /></p>
      </div>
    </div>
  );
});

export const ThinkingConsole = ({ logs, onClose }: ThinkingConsoleProps) => {
  return (
    <motion.div 
      initial={{ y: 100, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 100, opacity: 0, scale: 0.95 }}
      className="fixed bottom-10 right-10 w-[500px] h-[600px] bg-gray-950/95 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl flex flex-col z-[100] overflow-hidden"
    >
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          <h3 className="text-white text-xs font-black uppercase tracking-widest">Neural Trace Console</h3>
        </div>
        <button 
          onClick={onClose}
          className="text-white/40 hover:text-white transition-colors text-[10px] font-bold"
        >
          DISCONNECT
        </button>
      </div>

      <div className="flex-grow overflow-y-auto p-8 font-mono text-[13px] leading-relaxed text-gray-300 space-y-6 scrollbar-hide">
        {logs.map((log, i) => (
          <LogItem key={i} log={log} />
        ))}
        {logs.length === 0 && (
            <div className="h-full flex items-center justify-center text-center">
                <p className="text-white/20 text-xs italic tracking-widest uppercase">Initializing Secure Neural Handshake...</p>
            </div>
        )}
      </div>
    </motion.div>
  );
};
