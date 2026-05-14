"use client";

import { Pill } from "lucide-react";
import MedicationsTab from "../dashboard/MedicationsTab";
import { usePatient } from "../_context/PatientContext";

export default function PatientMedications() {
  const { profile } = usePatient();

  return (
    <div>

      <MedicationsTab profile={profile} />
    </div>
  );
}
