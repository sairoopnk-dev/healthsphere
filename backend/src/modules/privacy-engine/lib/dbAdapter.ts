import Patient from "../../../models/Patient";
import MedicalRecord from "../../../models/MedicalRecord";

export interface PatientDataSample {
  age: number | null;
  gender: string;
  bloodGroup: string;
  height: number | null;
  weight: number | null;
  recordCount: number;
}

export async function fetchPatientData(): Promise<PatientDataSample[]> {
  const [patients, recordCounts] = await Promise.all([
    Patient.find(
      {},
      { dob: 1, gender: 1, bloodGroup: 1, height: 1, weight: 1, patientId: 1 }
    ).lean(),
    MedicalRecord.aggregate([
      { $group: { _id: "$patientId", count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map<string, number>(
    recordCounts.map((r: { _id: string; count: number }) => [r._id, r.count])
  );

  return patients.map((p: any) => ({
    age: p.dob
      ? Math.floor(
          (Date.now() - new Date(p.dob).getTime()) / 31557600000
        )
      : null,
    gender: p.gender ?? "",
    bloodGroup: p.bloodGroup ?? "",
    height: p.height ?? null,
    weight: p.weight ?? null,
    recordCount: countMap.get(p.patientId) ?? 0,
  }));
}

// Mock fallback data
export function mockFetchData(): PatientDataSample[] {
  return [
    { age: 34, gender: "male",   bloodGroup: "A+",  height: 175, weight: 72, recordCount: 3 },
    { age: 28, gender: "female", bloodGroup: "B-",  height: 162, weight: 58, recordCount: 1 },
    { age: 45, gender: "male",   bloodGroup: "O+",  height: 180, weight: 85, recordCount: 5 },
    { age: 52, gender: "female", bloodGroup: "AB+", height: 158, weight: 65, recordCount: 2 },
    { age: 31, gender: "male",   bloodGroup: "A-",  height: 170, weight: 68, recordCount: 4 },
  ];
}

// getData: tries real DB, falls back to mock on any error
export async function getData(): Promise<PatientDataSample[]> {
  try {
    return await fetchPatientData();
  } catch (err) {
    console.error("[PrivacyEngine] DB adapter failed, using mock data:", err);
    return mockFetchData();
  }
}
