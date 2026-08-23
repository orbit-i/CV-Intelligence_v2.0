"use client";

import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserCog,
  CalendarDays,
  BarChart3,
  Settings,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Jobs", icon: Briefcase },
  { name: "Candidates", icon: Users },
  { name: "Recruiters", icon: UserCog },
  { name: "Interviews", icon: CalendarDays },
  { name: "Report", icon: BarChart3 },
  { name: "Settings", icon: Settings },
];

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <aside
      className="w-64 min-h-screen text-white flex flex-col p-5 justify-between relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #8B87F0 0%, #5B6EF5 60%, #4C5FE8 100%)",
        boxShadow: "6px 0 20px rgba(76, 95, 232, 0.25)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.15) 0%, transparent 45%)",
        }}
      />

      <div className="relative z-10">
        <div className="flex justify-center mb-8">
          <div className="relative w-32 h-32">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, #7DD3FC 0%, #38BDF8 60%, transparent 75%)",
                transform: "translate(6px, 6px)",
              }}
            />
            <div className="absolute inset-0 rounded-full bg-black flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="ORBIT-I" className="w-[85%] h-[85%] object-contain" />
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setActivePage(item.name)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? "bg-white text-indigo-600"
                    : "text-white/90 hover:bg-white/10"
                }`}
              >
                <Icon size={18} />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="relative z-10 bg-white/15 rounded-xl p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/30 flex items-center justify-center text-sm font-semibold">
          EM
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Elisa Musk</div>
          <div className="text-xs text-white/70">elisamusk@gmail.com</div>
        </div>
      </div>
    </aside>
  );
}