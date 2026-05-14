"use client";

import { Salad } from "lucide-react";
import DietPlanTab from "../dashboard/DietPlanTab";
import { usePatient } from "../_context/PatientContext";

export default function PatientDietPlan() {
  const { profile, setProfile, setEditHeight, setEditWeight } = usePatient();

  return (
    <div>

      <DietPlanTab
        profile={profile}
        onProfileUpdate={(updated: any) => {
          setProfile({ ...updated, id: updated.patientId });
          setEditHeight(updated.height ? String(updated.height) : "");
          setEditWeight(updated.weight ? String(updated.weight) : "");
        }}
      />
    </div>
  );
}
