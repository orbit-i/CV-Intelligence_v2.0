import { Plus } from "lucide-react";
import StatsCard from "./StatsCard";
import JobsTable from "./JobsTable";
import { jobStatsData } from "@/data/dummyData";

export default function JobsView() {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Jobs</h2>
          <p className="text-sm text-gray-400">Manage All Job Posting and their Status.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-indigo-600">
          <Plus size={16} /> Create Jobs
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        {jobStatsData.map((stat) => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </div>

      <JobsTable />
    </>
  );
}