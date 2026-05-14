export interface GenerateParams {
  recordCount: number;
  fields?: string[];
  seed?: number;
}

export interface SyntheticRecord {
  id: string;
  age: number;
  gender: string;
  bloodGroup: string;
  height: number;
  weight: number;
  diagnosis?: string;
}

export interface GenerateResult {
  records: SyntheticRecord[];
  generatedAt: string;
  count: number;
}

export interface CompareParams {
  syntheticRecords: SyntheticRecord[];
}

export interface DistributionStat {
  field: string;
  realMean: number;
  syntheticMean: number;
  realStdDev: number;
  syntheticStdDev: number;
  fidelityScore: number; // 0–1
}

export interface CompareResult {
  stats: DistributionStat[];
  overallFidelity: number;
  comparedAt: string;
}

export interface DownloadParams {
  format: "csv" | "json";
}

export interface PrivacyEngineError {
  action: "Generate" | "Compare" | "Download";
  message: string;
}
