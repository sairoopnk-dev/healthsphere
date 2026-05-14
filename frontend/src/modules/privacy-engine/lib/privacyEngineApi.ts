import type {
  GenerateParams,
  GenerateResult,
  CompareParams,
  CompareResult,
  DownloadParams,
} from "../types";

const PE_BASE_URL =
  process.env.NEXT_PUBLIC_PRIVACY_ENGINE_URL ?? "http://localhost:8000";

export async function generateSyntheticData(
  params: GenerateParams
): Promise<GenerateResult> {
  const res = await fetch(`${PE_BASE_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Generate failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function compareData(
  params: CompareParams
): Promise<CompareResult> {
  const res = await fetch(`${PE_BASE_URL}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Compare failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function downloadReport(params: DownloadParams): Promise<Blob> {
  const url = new URL(`${PE_BASE_URL}/download`);
  url.searchParams.set("format", params.format);

  const res = await fetch(url.toString(), {
    method: "GET",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Download failed: HTTP ${res.status}`);
  }
  return res.blob();
}
