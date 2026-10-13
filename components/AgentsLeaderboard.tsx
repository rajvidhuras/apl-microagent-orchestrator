import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Microservice } from '../types';

interface AgentsLeaderboardProps {
  agents: Microservice[];
}

export const AgentsLeaderboard: React.FC<AgentsLeaderboardProps> = ({ agents }) => {
  const data = agents
    .filter(a => a.isAgentic)
    .sort((a, b) => b.usageCount - a.usageCount);

  // If no agents are active yet, show a placeholder
  if (data.length === 0) {
      return (
          <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl bg-white">
              <p className="text-slate-700 text-lg font-medium">No active agent data recorded.</p>
              <p className="text-slate-500 text-sm mt-2">Promote services to agents and run tasks in the Studio to see analytics.</p>
          </div>
      )
  }

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h3 className="text-xl font-semibold text-slate-900">Top 10 Agent Executions</h3>
            <p className="text-sm text-slate-600">Ranking micro-agents by total task invocations</p>
        </div>
        <div className="flex gap-4 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="flex items-center gap-2"><span className="w-3 h-3 bg-sky-500 rounded-sm"></span> High Usage</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 bg-slate-400 rounded-sm"></span> Standard Usage</span>
        </div>
      </div>
      
      <div className="h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 40, top: 20, bottom: 20 }}>
            <CartesianGrid stroke="#e2e8f0" horizontal={false} strokeDasharray="3 3" opacity={0.8} />
            <XAxis type="number" hide />
            <YAxis 
                dataKey="name" 
                type="category" 
                tick={{ fill: '#0f172a', fontSize: 14, fontWeight: 500 }} 
                width={180}
                axisLine={false}
                tickLine={false}
            />
            <Tooltip 
                cursor={{ fill: '#e2e8f0', opacity: 0.6 }}
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 6px 18px rgba(15,23,42,0.12)' }}
                itemStyle={{ color: '#0284c7' }}
                formatter={(value: number) => [`${value} executions`, 'Total Runs']}
            />
            <Bar dataKey="usageCount" radius={[0, 4, 4, 0]} barSize={40}>
              {data.map((entry, index) => (
                <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? '#0ea5e9' : index === 1 ? '#22d3ee' : '#94a3b8'} 
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
