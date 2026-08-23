import { recentActivity } from "@/data/dummyData";

const statusStyles = {
  Success: "text-green-600 bg-green-50",
  Info: "text-blue-600 bg-blue-50",
  Pending: "text-orange-600 bg-orange-50",
};

export default function RecentActivity() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Recent Activity</h3>
        <a href="#" className="text-xs text-indigo-500 font-medium hover:underline">
          View All
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
              <th className="pb-2 font-medium">Time</th>
              <th className="pb-2 font-medium">Activity</th>
              <th className="pb-2 font-medium">Details</th>
              <th className="pb-2 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentActivity.map((row, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="py-3 text-gray-500 whitespace-nowrap">{row.time}</td>
                <td className="py-3 text-gray-700 font-medium whitespace-nowrap">{row.activity}</td>
                <td className="py-3 text-gray-500">{row.details}</td>
                <td className="py-3 text-right">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[row.status]}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}