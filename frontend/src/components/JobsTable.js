"use client";

import { Search, Filter, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { jobsData } from "@/data/dummyData";

const statusStyles = {
  Active: "text-green-500",
  Draft: "text-orange-400",
  Closed: "text-red-500",
};

export default function JobsTable() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 flex-1 min-w-[220px]">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search Jobs by Title, Department"
            className="bg-transparent outline-none w-full text-gray-600 placeholder-gray-400"
          />
        </div>

        <button className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600">
          All Department <ChevronDown size={14} />
        </button>

        <button className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600">
          All Status <ChevronDown size={14} />
        </button>

        <button className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600">
          <Filter size={14} /> Filter
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
              <th className="px-5 py-3 font-medium">Job Title</th>
              <th className="px-5 py-3 font-medium">Department</th>
              <th className="px-5 py-3 font-medium">Location</th>
              <th className="px-5 py-3 font-medium">Applicants</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Posted Date</th>
            </tr>
          </thead>
          <tbody>
            {jobsData.map((job) => (
              <tr key={job.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-700 whitespace-nowrap">{job.title}</td>
                <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{job.department}</td>
                <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{job.location}</td>
                <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{job.applicants}</td>
                <td className={`px-5 py-4 font-medium whitespace-nowrap ${statusStyles[job.status]}`}>
                  {job.status}
                </td>
                <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{job.posted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 text-xs text-gray-400">
        <span>Showing 1 to {jobsData.length} of {jobsData.length} Users</span>
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100">
            <ChevronLeft size={14} />
          </button>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`w-7 h-7 flex items-center justify-center rounded-md text-xs ${
                n === 1 ? "bg-indigo-500 text-white" : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              {n}
            </button>
          ))}
          <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}