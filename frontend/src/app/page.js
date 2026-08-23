"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import StatsCard from "@/components/StatsCard";
import DashboardCharts from "@/components/DashboardCharts";
import RecentActivity from "@/components/RecentActivity";
import JobsView from "@/components/JobsView";
import { statsData } from "@/data/dummyData";
import { Search, Bell, User } from "lucide-react";

export default function Home() {
  const [activePage, setActivePage] = useState("Dashboard");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <main className="flex-1 p-8">
        {/* Top bar — common to all pages */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold text-gray-800">Organization Admin Portal</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">
              <Search size={16} />
              <span>Search Anything</span>
            </div>
            <button className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center">
              <Bell size={16} className="text-gray-500" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
              <User size={16} className="text-gray-500" />
            </div>
          </div>
        </div>

        {/* Page-specific content */}
        {activePage === "Dashboard" && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Welcome Back, Elisa</h2>
              <p className="text-sm text-gray-400">Here&apos;s what&apos;s happening with your Organization today</p>
            </div>

            <div className="flex flex-wrap gap-4 mb-6">
              {statsData.map((stat) => (
                <StatsCard key={stat.label} {...stat} />
              ))}
            </div>

            <div className="mb-6">
              <DashboardCharts />
            </div>

            <RecentActivity />
          </>
        )}

        {activePage === "Jobs" && <JobsView />}

        {activePage !== "Dashboard" && activePage !== "Jobs" && (
          <div className="flex items-center justify-center h-[60vh] text-gray-400 text-sm">
            {activePage} page — coming soon
          </div>
        )}
      </main>
    </div>
  );
}