# Design Document: Privacy Engine Integration

## Overview

This document describes the technical design for integrating the pre-built Privacy Engine (Synthetic Data Module) into HealthSphere's Doctor Portal. The integration is purely additive — it wires the module into the existing shell (sidebar, routing, layout) and optionally connects it to the existing MongoDB database for real data distributions. No existing APIs, schemas, controllers, or backend routes are modified.

The Privacy Engine lives as a self-contained module under `frontend/src/modules/privacy-engine/`. It communicates with its own Express server (separate from the HealthSphere backend) via three endpoints: `/generate`, `/compare`, and `/download`. The HealthSphere frontend acts as the host shell; the module is a guest that must conform to the host's visual and structural conventions.

### Key Design Principles

- **Zero regression**: No existing file is modified except `DoctorSidebar.tsx` (one array entry) and `layout.tsx` (one array entry). All other changes are purely additive.
- **Module isolation**: The Privacy Engine module has no imports from HealthSphere's controllers, services, or utilities. It is self-contained under `frontend/src/modules/privacy-engine/`.
- **Graceful degradation**: If the Privacy Engine backend is unreachable, or if the optional DB adapter fails, the module degrades gracefully with inline error messages — it never crashes the host application.
- **Visual consistency**: The module uses the same Tailwind CSS v4 classes, `lucide-react` icons, Inter font, and light-theme color palette as the rest of the Doctor Portal.

---

## Architecture

The integration has three layers:

```
┌─────────────────────────────────────────────────────────────────┐
│  HealthSphere Frontend (Next.js 15 App Router)                  │
│                                                                 │
│  ┌──────────────────┐   ┌──────────────────────────────────┐   │
│  │  DoctorSidebar   │   │  /doctor/privacy-engine (page)   │   │
│  │  (NAV entry)     │──▶│  PrivacyEnginePage               │   │
│  └──────────────────┘   │  └─ <ErrorBoundary>              │   │
│                         │      └─ <PrivacyEngineModule />  │   │
│                         └──────────────────────────────────┘   │
│                                        │                        │
│                         ┌──────────────▼──────────────────┐    │
│                         │  privacyEngineApi.ts             │    │
│                         │  (fetch wrapper for PE server)   │    │
│                         └──────────────┬────────────────── ┘    │
└──────────────────────────────────────── │ ──────────────────────┘
                                          │ HTTP
┌─────────────────────────────────────────▼──────────────────────┐
│  Privacy Engine Express Server (separate process/port)          │
│  POST /generate   POST /compare   GET /download                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Optional DB Adapter (dbAdapter.ts)                      │  │
│  │  Read-only queries → HealthSphere MongoDB                │  │
│  │  Falls back to mock fetch_data() on any error            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. Doctor clicks "Privacy Engine" in the sidebar → Next.js navigates to `/doctor/privacy-engine`.
2. `DoctorLayout` detects the route is in `DASHBOARD_ROUTES` → renders sidebar + topbar shell.
3. `PrivacyEnginePage` checks auth (localStorage `user.role === "doctor"` + Firebase `onAuthStateChanged`). If unauthorized → redirect to `/login`.
4. `PrivacyEngineModule` renders inside the shell. User triggers Generate / Compare / Download.
5. `privacyEngineApi.ts` sends HTTP requests to the Privacy Engine Express server.
6. The Privacy Engine server optionally calls `dbAdapter.ts` to fetch real patient data from MongoDB (read-only). On failure, falls back to mock data.
7. Results are returned to the frontend and rendered in the module UI.

---

## Components and Interfaces

### 1. Sidebar Navigation Entry (`DoctorSidebar.tsx`)

**Change**: Add one entry to the existing `NAV` constant array.

```typescript
// Before (existing entries):
const NAV = [
  { id: "overview",       href: "/doctor/overview",       label: "Overview",        icon: BarChart2 },
  { id: "weeklyschedule", href: "/doctor/weeklyschedule", label: "Weekly Schedule", icon: Calendar  },
  { id: "patientrecords", href: "/doctor/patientrecords", label: "Patient Records", icon: Search    },
] as const;

// After (add Privacy Engine entry):
const NAV = [
  { id: "overview",        href: "/doctor/overview",         label: "Overview",        icon: BarChart2 },
  { id: "weeklyschedule",  href: "/doctor/weeklyschedule",   label: "Weekly Schedule", icon: Calendar  },
  { id: "patientrecords",  href: "/doctor/patientrecords",   label: "Patient Records", icon: Search    },
  { id: "privacy-engine",  href: "/doctor/privacy-engine",   label: "Privacy Engine",  icon: Lock      },
] as const;
```

The `Lock` icon is already imported in `DoctorSidebar.tsx` (used in the overview stats card). No new import is needed.

The existing nav rendering loop handles active/inactive state automatically via `pathname === href` comparison — no additional logic is required.

### 2. Doctor Layout Route Registration (`layout.tsx`)

**Change**: Add `/doctor/privacy-engine` to `DASHBOARD_ROUTES`.

```typescript
// Before:
const DASHBOARD_ROUTES = ["/doctor/overview", "/doctor/weeklyschedule", "/doctor/patientrecords"];

// After:
const DASHBOARD_ROUTES = [
  "/doctor/overview",
  "/doctor/weeklyschedule",
  "/doctor/patientrecords",
  "/doctor/privacy-engine",
];
```

This ensures the sidebar + topbar shell is rendered for the Privacy Engine page, consistent with all other dashboard routes.

### 3. Next.js Page (`frontend/src/app/doctor/privacy-engine/page.tsx`)

This is the Next.js App Router page component. It handles auth guard and error boundary, then delegates rendering to the module.

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import PrivacyEngineModule from "@/modules/privacy-engine/page";

export default function PrivacyEnginePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) { router.push("/login"); return; }
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!user || user.role !== "doctor") { router.push("/login"); return; }
      setAuthorized(true);
    });
    return () => unsubscribe();
  }, [router]);

  if (authorized === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <p className="text-red-600 font-semibold">Privacy Engine failed to load.</p>
        <p className="text-red-400 text-sm mt-1">Please refresh the page or contact support.</p>
      </div>
    }>
      <PrivacyEngineModule />
    </ErrorBoundary>
  );
}
```

**Rationale for auth in the page (not layout)**: The `DoctorLayout` already handles auth for the existing routes via `DoctorContext`. However, `DoctorContext` is tightly coupled to the doctor's schedule and patient data. The Privacy Engine page uses a lightweight, self-contained auth check to avoid pulling in unrelated context state. This keeps the module isolated.

### 4. Error Boundary (`frontend/src/components/ui/ErrorBoundary.tsx`)

A reusable React class component error boundary. If one does not already exist, it must be created.

```typescript
import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
```

### 5. Privacy Engine Module (`frontend/src/modules/privacy-engine/page.tsx`)

The root component of the Privacy Engine module. It is self-contained and uses only:
- React hooks
- Tailwind CSS utility classes (light theme)
- `lucide-react` icons
- The `privacyEngineApi` client (internal to the module)

It does **not** import from any HealthSphere context, controller, service, or utility.

```typescript
"use client";

import { useState } from "react";
import { Database, GitCompare, Download, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { generateSyntheticData, compareData, downloadReport } from "./lib/privacyEngineApi";
import type { GenerateResult, CompareResult } from "./types";

export default function PrivacyEngineModule() {
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);
  const [compareResult, setCompareResult]   = useState<CompareResult | null>(null);
  const [loading, setLoading]               = useState<"generate" | "compare" | "download" | null>(null);
  const [error, setError]                   = useState<{ action: string; message: string } | null>(null);

  // ... action handlers (see Data Models section)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Database size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Privacy Engine</h1>
            <p className="text-sm text-slate-400">Synthetic Data Generation &amp; Analysis</p>
          </div>
        </div>
      </div>

      {/* Inline error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-700 font-semibold text-sm">{error.action} failed</p>
            <p className="text-red-500 text-xs mt-0.5">{error.message}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {/* Action cards: Generate, Compare, Download */}
      {/* ... (rendered from action config array) */}
    </div>
  );
}
```

### 6. Privacy Engine API Client (`frontend/src/modules/privacy-engine/lib/privacyEngineApi.ts`)

Thin fetch wrapper. All calls target the Privacy Engine Express server exclusively.

```typescript
const PE_BASE_URL = process.env.NEXT_PUBLIC_PRIVACY_ENGINE_URL ?? "http://localhost:6000";

export async function generateSyntheticData(params: GenerateParams): Promise<GenerateResult> {
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

export async function compareData(params: CompareParams): Promise<CompareResult> {
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
  const res = await fetch(`${PE_BASE_URL}/download`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Download failed: HTTP ${res.status}`);
  }
  return res.blob();
}
```

The `NEXT_PUBLIC_PRIVACY_ENGINE_URL` environment variable allows the Privacy Engine server URL to be configured per environment without code changes.

### 7. DB Adapter (`frontend/src/modules/privacy-engine/lib/dbAdapter.ts`)

The DB adapter is a **backend-side** module (used by the Privacy Engine Express server, not the Next.js frontend). It reuses the existing Mongoose connection from `backend/src/config/db.ts` and performs read-only queries.

```typescript
// backend/src/modules/privacy-engine/lib/dbAdapter.ts
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
  const patients = await Patient.find({}, {
    dob: 1, gender: 1, bloodGroup: 1, height: 1, weight: 1, patientId: 1,
  }).lean();

  const recordCounts = await MedicalRecord.aggregate([
    { $group: { _id: "$patientId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(recordCounts.map((r: any) => [r._id, r.count]));

  return patients.map((p: any) => ({
    age: p.dob ? Math.floor((Date.now() - new Date(p.dob).getTime()) / 31557600000) : null,
    gender: p.gender ?? "",
    bloodGroup: p.bloodGroup ?? "",
    height: p.height ?? null,
    weight: p.weight ?? null,
    recordCount: countMap.get(p.patientId) ?? 0,
  }));
}
```

The Privacy Engine server wraps this in a try/catch and falls back to mock data on any error:

```typescript
// In the Privacy Engine Express server
import { fetchPatientData } from "./lib/dbAdapter";
import { mockFetchData } from "./lib/mockData";

async function getData() {
  try {
    return await fetchPatientData();
  } catch (err) {
    console.error("[PrivacyEngine] DB adapter failed, using mock data:", err);
    return mockFetchData();
  }
}
```

---

## Data Models

### TypeScript Types (`frontend/src/modules/privacy-engine/types.ts`)

```typescript
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
```

### Module State Shape

The `PrivacyEngineModule` component manages the following local state:

| State field       | Type                                    | Description                                      |
|-------------------|-----------------------------------------|--------------------------------------------------|
| `generateResult`  | `GenerateResult \| null`                | Result from the last successful Generate call    |
| `compareResult`   | `CompareResult \| null`                 | Result from the last successful Compare call     |
| `loading`         | `"generate" \| "compare" \| "download" \| null` | Which action is currently in-flight      |
| `error`           | `PrivacyEngineError \| null`            | Last error, cleared on retry or dismiss          |

No global state, no context, no Redux. All state is local to the module.

---

## File Structure

```
frontend/src/
├── app/
│   └── doctor/
│       ├── layout.tsx                          ← MODIFIED: add /doctor/privacy-engine to DASHBOARD_ROUTES
│       ├── privacy-engine/
│       │   └── page.tsx                        ← NEW: auth guard + error boundary wrapper
│       └── _components/
│           └── DoctorSidebar.tsx               ← MODIFIED: add Privacy Engine to NAV array
│
├── components/
│   └── ui/
│       └── ErrorBoundary.tsx                   ← NEW (if not exists): reusable error boundary
│
└── modules/
    └── privacy-engine/                         ← NEW: self-contained module
        ├── page.tsx                            ← Module root component
        ├── types.ts                            ← TypeScript interfaces
        ├── components/
        │   ├── GeneratePanel.tsx               ← Generate action UI
        │   ├── ComparePanel.tsx                ← Compare results UI
        │   ├── DownloadPanel.tsx               ← Download action UI
        │   └── DataTable.tsx                   ← Reusable table for synthetic records
        └── lib/
            └── privacyEngineApi.ts             ← Fetch wrapper for PE endpoints

backend/src/
└── modules/
    └── privacy-engine/
        └── lib/
            └── dbAdapter.ts                    ← NEW: read-only MongoDB adapter
```

**Files modified in existing codebase** (minimal, surgical):
1. `frontend/src/app/doctor/_components/DoctorSidebar.tsx` — add one object to `NAV` array
2. `frontend/src/app/doctor/layout.tsx` — add one string to `DASHBOARD_ROUTES` array

All other changes are new files.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Endpoint Isolation

*For any* user action triggered in the Privacy Engine module (Generate, Compare, or Download), the outgoing HTTP request URL must target one of the three allowed Privacy Engine endpoints (`/generate`, `/compare`, `/download`) and must not target any HealthSphere backend endpoint (`/api/*`).

**Validates: Requirements 3.1**

### Property 2: Error Handling and Retry Availability

*For any* HTTP error response (status 4xx or 5xx) returned by any of the three Privacy Engine endpoints, the module must: (a) display a descriptive inline error message identifying which action failed, (b) remain mounted and functional (not crash), and (c) allow the user to retry the failed action.

**Validates: Requirements 3.4, 7.5**

### Property 3: DB Adapter Fallback

*For any* error thrown during the DB adapter's MongoDB query (connection failure, query error, timeout, or any exception), the Privacy Engine server must return data sourced from the mock `fetch_data()` implementation and must log the error — the error must not propagate to the end user as a fatal failure.

**Validates: Requirements 4.4**

### Property 4: Access Control Redirect

*For any* user whose `localStorage` `"user"` key is absent, malformed, or contains a `role` value other than `"doctor"`, navigating to `/doctor/privacy-engine` must result in a redirect to `/login` and must not render the `PrivacyEngineModule` component.

**Validates: Requirements 6.1, 6.2**

---

## Error Handling

### Frontend Error Handling

| Scenario | Handling |
|---|---|
| Privacy Engine server unreachable (network error) | `privacyEngineApi.ts` catches the fetch rejection and throws a descriptive `Error`. The module catches it, sets `error` state, renders inline error card with retry button. |
| Privacy Engine server returns 4xx/5xx | Same as above — non-ok responses are converted to thrown errors with the server's message if available. |
| `PrivacyEngineModule` throws a render error | `ErrorBoundary` in `PrivacyEnginePage` catches it and renders a static fallback message. The rest of the HealthSphere app is unaffected. |
| Firebase auth state unavailable | `onAuthStateChanged` callback redirects to `/login`. Loading spinner shown until auth state resolves. |
| `localStorage` missing or malformed `user` key | Treated as unauthenticated — redirect to `/login`. |

### Backend Error Handling (DB Adapter)

| Scenario | Handling |
|---|---|
| MongoDB connection not established | `fetchPatientData()` throws. Privacy Engine server catches, logs, returns mock data. |
| Query returns empty result | Returns empty array — Privacy Engine uses it as-is (valid empty dataset). |
| Mongoose query throws (timeout, network) | Caught by try/catch in the server's `getData()` wrapper. Falls back to mock data. |
| `MONGODB_URI` not set | `connectDB()` throws on startup. Privacy Engine server should handle this gracefully and operate in mock-only mode. |

### Error Message Format

All inline error messages in the module follow this structure:
- **Action label**: "Generate failed", "Compare failed", "Download failed"
- **Reason**: The error message from the server response, or a generic fallback ("Network error — please check your connection")
- **Retry affordance**: A button or icon that re-triggers the failed action

---

## Testing Strategy

### Unit Tests

Unit tests cover specific examples, edge cases, and integration points. They use Jest + React Testing Library (matching the project's existing test setup if present, or this standard Next.js stack).

**`privacyEngineApi.ts`**:
- Successful `generateSyntheticData` call returns parsed JSON
- `generateSyntheticData` with non-ok response throws with server message
- `generateSyntheticData` with non-ok response and no body throws with generic message
- Same patterns for `compareData` and `downloadReport`

**`PrivacyEngineModule` component**:
- Renders header with "Privacy Engine" title
- Renders Generate, Compare, Download action panels
- Shows loading spinner when an action is in-flight
- Shows inline error card when `error` state is set
- Error card disappears when dismissed

**`PrivacyEnginePage` component**:
- Redirects to `/login` when Firebase user is null
- Redirects to `/login` when `localStorage` user has non-doctor role
- Renders `PrivacyEngineModule` when user is authenticated doctor
- Shows loading spinner while auth state is resolving

**`dbAdapter.ts`**:
- Returns correctly shaped `PatientDataSample[]` from mocked Mongoose queries
- Calculates age correctly from `dob` field
- Returns `null` for age when `dob` is absent
- Maps record counts correctly from aggregation result

**`DoctorSidebar.tsx`**:
- Renders "Privacy Engine" nav item with Lock icon
- Applies active styles when pathname is `/doctor/privacy-engine`
- Applies inactive styles when pathname is a different route
- All original nav items (Overview, Weekly Schedule, Patient Records) still render

### Property-Based Tests

Property-based tests use **fast-check** (the standard PBT library for TypeScript/JavaScript). Each test runs a minimum of 100 iterations.

**Property 1 — Endpoint Isolation**
```
// Feature: privacy-engine-integration, Property 1: Endpoint Isolation
// For any action (generate/compare/download) with any valid params,
// the fetch URL must match one of the three allowed PE endpoints.
fc.assert(fc.asyncProperty(
  fc.oneof(fc.constant("generate"), fc.constant("compare"), fc.constant("download")),
  fc.record({ recordCount: fc.integer({ min: 1, max: 1000 }) }),
  async (action, params) => {
    const capturedUrls: string[] = [];
    // Mock fetch to capture URLs
    // Call the appropriate API function
    // Assert all captured URLs start with PE_BASE_URL and match /generate|/compare|/download
    // Assert no URL contains "/api/"
  }
), { numRuns: 100 });
```

**Property 2 — Error Handling and Retry Availability**
```
// Feature: privacy-engine-integration, Property 2: Error Handling and Retry Availability
// For any HTTP error status (400–599) from any endpoint,
// the module must show an error message and remain mounted.
fc.assert(fc.asyncProperty(
  fc.oneof(fc.constant("generate"), fc.constant("compare"), fc.constant("download")),
  fc.integer({ min: 400, max: 599 }),
  async (action, statusCode) => {
    // Mock fetch to return the given status code
    // Render PrivacyEngineModule, trigger the action
    // Assert error message is visible
    // Assert module is still mounted (not crashed)
    // Assert retry button is present
  }
), { numRuns: 100 });
```

**Property 3 — DB Adapter Fallback**
```
// Feature: privacy-engine-integration, Property 3: DB Adapter Fallback
// For any error thrown by the DB query, getData() must return mock data.
fc.assert(fc.asyncProperty(
  fc.oneof(
    fc.constant(new Error("Connection refused")),
    fc.constant(new Error("Query timeout")),
    fc.string().map(msg => new Error(msg)),
  ),
  async (dbError) => {
    // Mock fetchPatientData to throw dbError
    // Call getData()
    // Assert result equals mockFetchData() output
    // Assert error was logged (spy on console.error)
  }
), { numRuns: 100 });
```

**Property 4 — Access Control Redirect**
```
// Feature: privacy-engine-integration, Property 4: Access Control Redirect
// For any user role that is not "doctor", the page must redirect to /login.
fc.assert(fc.asyncProperty(
  fc.oneof(
    fc.constant(null),                          // no user in localStorage
    fc.constant({ role: "patient" }),
    fc.constant({ role: "admin" }),
    fc.string().map(role => ({ role })),        // any arbitrary role string
  ),
  async (user) => {
    // Set localStorage "user" to the generated value (or clear it)
    // Mock Firebase onAuthStateChanged to return a valid firebaseUser
    // Render PrivacyEnginePage
    // Assert router.push was called with "/login"
    // Assert PrivacyEngineModule is NOT rendered
  }
), { numRuns: 100 });
```

### Integration Tests

Integration tests verify the end-to-end flow with a running Privacy Engine server (or a local mock server):

1. **Full Generate → Compare → Download flow**: Navigate to `/doctor/privacy-engine`, click Generate, assert data table renders, click Compare, assert stats render, click Download, assert file download is initiated.
2. **DB adapter with real MongoDB**: Start the Privacy Engine server with `MONGODB_URI` set, call `/generate`, assert the response contains records shaped like real patient data.
3. **DB adapter fallback**: Start the Privacy Engine server with `MONGODB_URI` unset or pointing to an unreachable host, call `/generate`, assert the response contains mock data and the server does not crash.

### Smoke Tests

- `DASHBOARD_ROUTES` in `layout.tsx` contains `/doctor/privacy-engine`
- `NAV` in `DoctorSidebar.tsx` contains an entry with `href: "/doctor/privacy-engine"` and `icon: Lock`
- `frontend/src/modules/privacy-engine/page.tsx` exists and exports a default React component
- `NEXT_PUBLIC_PRIVACY_ENGINE_URL` is documented in `.env.local.example`
