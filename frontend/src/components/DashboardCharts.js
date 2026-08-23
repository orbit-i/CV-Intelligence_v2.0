"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { hiringOverviewData, candidatesByStage } from "@/data/dummyData";

export default function DashboardCharts() {
  const totalCandidates = candidatesByStage.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Hiring Overview */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Hiring Overview</h3>
          <span className="text-xs text-gray-400">Last 30 Days</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={hiringOverviewData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Candidates by Stages */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Candidates by Stages</h3>
          <span className="text-xs text-gray-400">{totalCandidates.toLocaleString()} Total</span>
        </div>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="55%" height={190}>
            <PieChart>
              <Pie
                data={candidatesByStage}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={2}
              >
                {candidatesByStage.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 text-xs">
            {candidatesByStage.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-500">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}