import React from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

interface NetworkChartProps {
  data: any[];
}

export const NetworkChart = ({ data }: NetworkChartProps) => {
  return (
    <div className="card-minimal p-8 h-[400px] flex flex-col bg-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-text-main tracking-tight">Empire Performance Architecture</h3>
          <p className="text-xs font-semibold text-text-muted mt-1 uppercase tracking-widest text-[9px]">Neural Throughput vs Revenue Projections</p>
        </div>
        <div className="flex gap-4">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand" />
              <span className="text-[10px] font-bold text-text-muted uppercase">Revenue</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-200" />
              <span className="text-[10px] font-bold text-text-muted uppercase">Traffic</span>
           </div>
        </div>
      </div>
      
      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#111111" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#111111" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F1F1" />
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 600, fill: '#999999' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 600, fill: '#999999' }}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: '1px solid #EEEEEE',
                boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                fontSize: '12px',
                fontWeight: 'bold'
              }} 
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#111111" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRev)" 
              animationDuration={1500}
            />
            <Area 
              type="monotone" 
              dataKey="traffic" 
              stroke="#EEEEEE" 
              strokeWidth={2}
              fill="transparent" 
              strokeDasharray="5 5"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
