import { Users, UserCheck, Briefcase, CalendarDays } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const iconMap = {
  users: Users,
  userCheck: UserCheck,
  briefcase: Briefcase,
  calendar: CalendarDays,
};

const themeMap = {
  users: { text: "text-blue-500", bg: "bg-blue-50", line: "#3b82f6" },
  userCheck: { text: "text-green-500", bg: "bg-green-50", line: "#22c55e" },
  briefcase: { text: "text-orange-500", bg: "bg-orange-50", line: "#f97316" },
  calendar: { text: "text-purple-500", bg: "bg-purple-50", line: "#a855f7" },
};

const sparkData = [{ v: 4 }, { v: 7 }, { v: 5 }, { v: 9 }, { v: 6 }, { v: 10 }, { v: 8 }];

export default function StatsCard({ label, value, change, trend, icon }) {
  const Icon = iconMap[icon];
  const theme = themeMap[icon];
  const isUp = trend === "up";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex-1 min-w-[200px]">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${theme.bg}`}>
          <Icon size={15} className={theme.text} />
        </div>
        <span className={`text-sm font-semibold ${theme.text}`}>{label}</span>
      </div>

      <div className="text-2xl font-bold text-gray-800 mb-1">{value}</div>

            <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs whitespace-nowrap">
          <span className={`font-medium ${isUp ? "text-green-500" : "text-red-500"}`}>
            {isUp ? "↑" : "↓"} {change}
          </span>
          <span className="text-gray-400">Vs 30 last days</span>
        </div>
        <div className="w-12 h-6 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line type="monotone" dataKey="v" stroke={theme.line} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}