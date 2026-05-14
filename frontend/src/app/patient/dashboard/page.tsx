"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PatientDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/patient/overview");
  }, [router]);
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-teal-600 font-bold text-lg">
        <div className="w-6 h-6 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"/>
        Redirecting...
      </div>
    </div>
  );
}
