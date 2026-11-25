import React, { useState, useEffect } from "react";
import { Database, RefreshCw, FileSpreadsheet } from "lucide-react";

export default function DatabasePage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sheets/database");
      const json = await res.json();
      if (json.success) {
        setData(json.orders || []);
      } else {
        setError(json.message || "Failed to fetch data");
      }
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 overflow-y-auto pr-2">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Database className="w-8 h-8 text-sky-600" />
            Database
          </h1>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto text-sky-500" />
          <p className="mt-4 font-bold text-slate-600 dark:text-slate-400">Loading Database...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/30 p-6 rounded-3xl text-center">
          <p className="text-red-600 dark:text-red-400 font-bold">{error}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider border-b border-slate-200 dark:border-slate-800">
                  {data.length > 0 && Object.keys(data[0]).map((header) => (
                    <th key={header} className="py-3.5 px-6 whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    {Object.values(row).map((val: any, i) => (
                      <td key={i} className="py-3 px-6 whitespace-nowrap text-slate-900 dark:text-white">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
