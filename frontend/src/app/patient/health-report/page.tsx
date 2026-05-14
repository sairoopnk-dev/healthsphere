"use client";

import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import HealthReport from "../_components/HealthReport";

export default function HealthReportPage() {
  const [userId, setUserId] = useState("");

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserId(user.id || user.patientId || "");
      }
    } catch {}
  }, []);

  if (!userId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-teal-600 font-bold text-lg">
          <div className="w-6 h-6 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <HealthReport userId={userId} />
    </div>
  );
}
