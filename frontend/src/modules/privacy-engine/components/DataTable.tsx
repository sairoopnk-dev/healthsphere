import type { SyntheticRecord } from "../types";

interface DataTableProps {
  records: SyntheticRecord[];
}

export default function DataTable({ records }: DataTableProps) {
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
        <p className="text-slate-400 text-sm font-medium">No synthetic records generated yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {["ID", "Age", "Gender", "Blood Group", "Height (cm)", "Weight (kg)", "Diagnosis"].map(
              (col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {col}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-4 py-3 text-sm text-slate-700 font-mono">{record.id}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{record.age}</td>
              <td className="px-4 py-3 text-sm text-slate-700 capitalize">{record.gender}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{record.bloodGroup}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{record.height}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{record.weight}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{record.diagnosis ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
