# Implementation Plan: Privacy Engine Integration

## Overview

Wire the pre-built Privacy Engine (Synthetic Data Module) into HealthSphere's Doctor Portal. The integration is purely additive: two existing files receive minimal surgical edits, and all new functionality lives in self-contained new files. The module communicates exclusively with its own Express server via three endpoints and degrades gracefully on any error.

## Tasks

- [x] 1. Modify existing shell files (sidebar + layout)
  - [x] 1.1 Add Privacy Engine entry to `DoctorSidebar.tsx` NAV array
    - Import `Lock` from `lucide-react` (verify it is not already imported — it is used in `overview/page.tsx` but the sidebar imports must be checked)
    - Append `{ id: "privacy-engine", href: "/doctor/privacy-engine", label: "Privacy Engine", icon: Lock }` to the `NAV` constant in `frontend/src/app/doctor/_components/DoctorSidebar.tsx`
    - Preserve the `as const` assertion and the existing three entries in their original order
    - No other changes to this file
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Register `/doctor/privacy-engine` in `layout.tsx` DASHBOARD_ROUTES
    - Add `"/doctor/privacy-engine"` to the `DASHBOARD_ROUTES` array in `frontend/src/app/doctor/layout.tsx`
    - Preserve the existing three routes in their original order
    - No other changes to this file
    - _Requirements: 2.2, 2.3_

- [x] 2. Create TypeScript types and the reusable ErrorBoundary
  - [x] 2.1 Create `frontend/src/modules/privacy-engine/types.ts`
    - Define and export all interfaces: `GenerateParams`, `SyntheticRecord`, `GenerateResult`, `CompareParams`, `DistributionStat`, `CompareResult`, `DownloadParams`, `PrivacyEngineError`
    - Match the exact shapes specified in the design document's Data Models section
    - _Requirements: 3.1, 7.2, 7.3, 7.4_

  - [x] 2.2 Create `frontend/src/components/ui/ErrorBoundary.tsx`
    - Implement a React class component error boundary with `Props { children: ReactNode; fallback: ReactNode }` and `State { hasError: boolean }`
    - Implement `static getDerivedStateFromError()` returning `{ hasError: true }`
    - Export as a named export `ErrorBoundary`
    - _Requirements: 2.4_

- [x] 3. Implement the Privacy Engine API client
  - [x] 3.1 Create `frontend/src/modules/privacy-engine/lib/privacyEngineApi.ts`
    - Read `NEXT_PUBLIC_PRIVACY_ENGINE_URL` from `process.env`, defaulting to `"http://localhost:6000"`
    - Implement `generateSyntheticData(params: GenerateParams): Promise<GenerateResult>` — POST to `${PE_BASE_URL}/generate`
    - Implement `compareData(params: CompareParams): Promise<CompareResult>` — POST to `${PE_BASE_URL}/compare`
    - Implement `downloadReport(params: DownloadParams): Promise<Blob>` — GET to `${PE_BASE_URL}/download`
    - For each function: throw a descriptive `Error` when `res.ok` is false, using the server's `body.message` if available, otherwise a generic fallback string
    - No function may construct a URL containing `/api/`
    - _Requirements: 3.1, 3.3, 3.4_

  - [ ]* 3.2 Write property test for endpoint isolation (Property 1)
    - Install `fast-check` as a dev dependency in the frontend package if not already present
    - Create `frontend/src/modules/privacy-engine/lib/__tests__/privacyEngineApi.property.test.ts`
    - **Property 1: Endpoint Isolation**
    - For any action (`"generate"`, `"compare"`, `"download"`) with any valid params, mock `fetch` to capture the URL, call the corresponding API function, and assert: (a) the captured URL starts with `PE_BASE_URL`, (b) the path matches `/generate`, `/compare`, or `/download` respectively, (c) the URL does not contain `"/api/"`
    - Use `fc.oneof(fc.constant("generate"), fc.constant("compare"), fc.constant("download"))` and `fc.record({ recordCount: fc.integer({ min: 1, max: 1000 }) })` as arbitraries
    - Run with `{ numRuns: 100 }`
    - **Validates: Requirements 3.1**

  - [ ]* 3.3 Write unit tests for `privacyEngineApi.ts`
    - Create `frontend/src/modules/privacy-engine/lib/__tests__/privacyEngineApi.test.ts`
    - Test: successful `generateSyntheticData` call returns parsed JSON
    - Test: `generateSyntheticData` with non-ok response throws with server's `message` field
    - Test: `generateSyntheticData` with non-ok response and no parseable body throws with generic fallback message
    - Repeat the same three patterns for `compareData` and `downloadReport`
    - _Requirements: 3.4_

- [x] 4. Implement the Privacy Engine module UI components
  - [x] 4.1 Create `frontend/src/modules/privacy-engine/components/DataTable.tsx`
    - Accept `records: SyntheticRecord[]` as a prop
    - Render a responsive table with columns: ID, Age, Gender, Blood Group, Height (cm), Weight (kg), Diagnosis
    - Use Tailwind CSS v4 utility classes and light-theme colors (`bg-white`, `border-slate-100`, `text-slate-800`, etc.)
    - Show an empty-state message when `records` is an empty array
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [x] 4.2 Create `frontend/src/modules/privacy-engine/components/GeneratePanel.tsx`
    - Accept props: `onGenerate: (params: GenerateParams) => void`, `loading: boolean`, `result: GenerateResult | null`
    - Render a card with a "Generate Synthetic Data" heading, a numeric input for `recordCount` (default 100, min 1, max 10000), and a "Generate" button
    - Show a `Loader2` spinner (lucide-react) when `loading` is true; disable the button while loading
    - When `result` is non-null, render `<DataTable records={result.records} />` and a `generatedAt` timestamp below the table
    - Use `Database` icon (lucide-react) in the card header
    - _Requirements: 5.1, 5.2, 7.2_

  - [x] 4.3 Create `frontend/src/modules/privacy-engine/components/ComparePanel.tsx`
    - Accept props: `onCompare: () => void`, `loading: boolean`, `result: CompareResult | null`, `disabled: boolean`
    - Render a card with a "Compare Distributions" heading and a "Compare" button
    - Disable the button when `disabled` is true (no generate result yet) or `loading` is true
    - When `result` is non-null, render a stats table showing each `DistributionStat` field: field name, real mean, synthetic mean, real std dev, synthetic std dev, and fidelity score (formatted as a percentage)
    - Show overall fidelity score prominently at the top of the results
    - Use `GitCompare` icon (lucide-react) in the card header
    - _Requirements: 5.1, 5.2, 7.3_

  - [x] 4.4 Create `frontend/src/modules/privacy-engine/components/DownloadPanel.tsx`
    - Accept props: `onDownload: (params: DownloadParams) => void`, `loading: boolean`, `disabled: boolean`
    - Render a card with a "Download Report" heading, a format selector (`csv` / `json`), and a "Download" button
    - Disable the button when `disabled` is true (no generate result yet) or `loading` is true
    - On successful download, trigger a browser file download by creating a temporary `<a>` element with an object URL from the returned `Blob`
    - Use `Download` icon (lucide-react) in the card header
    - _Requirements: 5.1, 5.2, 7.4_

- [x] 5. Implement the Privacy Engine module root component
  - [x] 5.1 Create `frontend/src/modules/privacy-engine/page.tsx`
    - Mark with `"use client"` directive
    - Manage local state: `generateResult: GenerateResult | null`, `compareResult: CompareResult | null`, `loading: "generate" | "compare" | "download" | null`, `error: PrivacyEngineError | null`
    - Implement `handleGenerate`: set `loading = "generate"`, call `generateSyntheticData`, set `generateResult` on success, set `error` on failure, clear `loading` in finally
    - Implement `handleCompare`: set `loading = "compare"`, call `compareData({ syntheticRecords: generateResult.records })`, set `compareResult` on success, set `error` on failure, clear `loading` in finally
    - Implement `handleDownload`: set `loading = "download"`, call `downloadReport`, trigger browser download via Blob URL, set `error` on failure, clear `loading` in finally
    - Render: page header card (blue `Database` icon, "Privacy Engine" title, subtitle), inline error card (shown when `error` is non-null, with `AlertCircle` icon, action label, message, and dismiss/retry button), then `<GeneratePanel>`, `<ComparePanel>`, `<DownloadPanel>` in vertical stack
    - No imports from any HealthSphere context, controller, service, or utility outside `./lib/privacyEngineApi` and `./types`
    - _Requirements: 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 5.5, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 5.2 Write property test for error handling and retry availability (Property 2)
    - Create `frontend/src/modules/privacy-engine/__tests__/PrivacyEngineModule.property.test.tsx`
    - **Property 2: Error Handling and Retry Availability**
    - For any HTTP error status (400–599) from any endpoint, mock `fetch` to return that status, render `<PrivacyEngineModule />`, trigger the corresponding action, and assert: (a) an inline error message is visible in the DOM, (b) the component is still mounted (not crashed), (c) a retry/dismiss button is present
    - Use `fc.oneof(fc.constant("generate"), fc.constant("compare"), fc.constant("download"))` and `fc.integer({ min: 400, max: 599 })` as arbitraries
    - Run with `{ numRuns: 100 }`
    - **Validates: Requirements 3.4, 7.5**

  - [ ]* 5.3 Write unit tests for `PrivacyEngineModule`
    - Create `frontend/src/modules/privacy-engine/__tests__/PrivacyEngineModule.test.tsx`
    - Test: renders header with "Privacy Engine" title
    - Test: renders Generate, Compare, and Download panels
    - Test: shows `Loader2` spinner when an action is in-flight
    - Test: shows inline error card when `error` state is set
    - Test: error card disappears when the dismiss button is clicked
    - _Requirements: 3.4, 5.1, 7.5_

- [x] 6. Checkpoint — Ensure all frontend tests pass
  - Run `npx vitest --run` (or the project's configured test command) from the `frontend/` directory
  - Ensure all unit and property tests created in tasks 3–5 pass
  - Fix any TypeScript type errors reported by `tsc --noEmit`
  - Ask the user if any questions arise before proceeding

- [x] 7. Create the Next.js page with auth guard and error boundary
  - [x] 7.1 Create `frontend/src/app/doctor/privacy-engine/page.tsx`
    - Mark with `"use client"` directive
    - Implement auth guard using `onAuthStateChanged` from `firebase/auth` and `auth` from `@/lib/firebase`
    - In the `onAuthStateChanged` callback: if `firebaseUser` is null → `router.push("/login")`; otherwise parse `localStorage.getItem("user")` — if absent, malformed, or `user.role !== "doctor"` → `router.push("/login")`; otherwise `setAuthorized(true)`
    - While `authorized === null`, render a centered blue spinner (`border-blue-600 border-t-transparent animate-spin`)
    - When `authorized === true`, render `<ErrorBoundary fallback={...}><PrivacyEngineModule /></ErrorBoundary>`
    - The `ErrorBoundary` fallback must be a static `bg-red-50` card with a "Privacy Engine failed to load" message — it must not crash the rest of the HealthSphere app
    - _Requirements: 2.1, 2.4, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 7.2 Write property test for access control redirect (Property 4)
    - Create `frontend/src/app/doctor/privacy-engine/__tests__/PrivacyEnginePage.property.test.tsx`
    - **Property 4: Access Control Redirect**
    - For any user value that is `null`, `{ role: "patient" }`, `{ role: "admin" }`, or any object with an arbitrary non-`"doctor"` role string, mock `localStorage.getItem("user")` to return the serialized value (or `null`), mock `onAuthStateChanged` to call back with a valid `firebaseUser`, render `<PrivacyEnginePage />`, and assert: (a) `router.push` was called with `"/login"`, (b) `<PrivacyEngineModule />` is NOT rendered
    - Use `fc.oneof(fc.constant(null), fc.constant({ role: "patient" }), fc.constant({ role: "admin" }), fc.string().map(role => ({ role })).filter(u => u.role !== "doctor"))` as the arbitrary
    - Run with `{ numRuns: 100 }`
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 7.3 Write unit tests for `PrivacyEnginePage`
    - Create `frontend/src/app/doctor/privacy-engine/__tests__/PrivacyEnginePage.test.tsx`
    - Test: redirects to `/login` when Firebase user is null
    - Test: redirects to `/login` when `localStorage` user has role `"patient"`
    - Test: redirects to `/login` when `localStorage` `"user"` key is absent
    - Test: renders `<PrivacyEngineModule />` when user is authenticated with role `"doctor"`
    - Test: shows loading spinner while auth state is resolving (before `onAuthStateChanged` fires)
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. Implement the backend DB adapter
  - [x] 8.1 Create `backend/src/modules/privacy-engine/lib/dbAdapter.ts`
    - Export interface `PatientDataSample { age: number | null; gender: string; bloodGroup: string; height: number | null; weight: number | null; recordCount: number }`
    - Import `Patient` from `"../../../models/Patient"` and `MedicalRecord` from `"../../../models/MedicalRecord"` (read-only — no writes)
    - Implement `fetchPatientData(): Promise<PatientDataSample[]>`:
      - Query `Patient.find({}, { dob: 1, gender: 1, bloodGroup: 1, height: 1, weight: 1, patientId: 1 }).lean()`
      - Aggregate record counts: `MedicalRecord.aggregate([{ $group: { _id: "$patientId", count: { $sum: 1 } } }])`
      - Build a `Map<string, number>` from the aggregation result
      - Map each patient to `PatientDataSample`, computing `age` as `Math.floor((Date.now() - new Date(p.dob).getTime()) / 31557600000)` when `dob` is present, otherwise `null`
    - Do NOT modify `Patient.ts`, `MedicalRecord.ts`, or any other existing model/controller/service
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 8.2 Create the Privacy Engine server's `getData()` wrapper (in the same file or a co-located `server.ts`)
    - Wrap `fetchPatientData()` in a try/catch
    - On success, return the result
    - On any error: call `console.error("[PrivacyEngine] DB adapter failed, using mock data:", err)` and return `mockFetchData()`
    - The error must not propagate to the HTTP response as a fatal failure
    - _Requirements: 4.4, 4.5_

  - [ ]* 8.3 Write property test for DB adapter fallback (Property 3)
    - Create `backend/src/modules/privacy-engine/lib/__tests__/dbAdapter.property.test.ts`
    - Install `fast-check` as a dev dependency in the backend package if not already present
    - **Property 3: DB Adapter Fallback**
    - For any error thrown by `fetchPatientData` (connection refused, query timeout, or any arbitrary error message), mock `fetchPatientData` to throw that error, call `getData()`, and assert: (a) the result equals `mockFetchData()` output, (b) `console.error` was called with a message containing `"[PrivacyEngine] DB adapter failed"`
    - Use `fc.oneof(fc.constant(new Error("Connection refused")), fc.constant(new Error("Query timeout")), fc.string().map(msg => new Error(msg)))` as the arbitrary
    - Run with `{ numRuns: 100 }`
    - **Validates: Requirements 4.4**

  - [ ]* 8.4 Write unit tests for `dbAdapter.ts`
    - Create `backend/src/modules/privacy-engine/lib/__tests__/dbAdapter.test.ts`
    - Test: returns correctly shaped `PatientDataSample[]` from mocked Mongoose queries
    - Test: calculates age correctly from a known `dob` string
    - Test: returns `null` for `age` when `dob` is absent or empty
    - Test: maps record counts correctly from the aggregation result (including patients with zero records)
    - _Requirements: 4.1_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Run all frontend tests: `npx vitest --run` from `frontend/`
  - Run all backend tests from `backend/`
  - Verify TypeScript compilation: `tsc --noEmit` in both `frontend/` and `backend/`
  - Confirm the two modified files (`DoctorSidebar.tsx`, `layout.tsx`) have no other changes beyond the single-line additions
  - Confirm no existing HealthSphere controller, model, service, or route file was modified
  - Ask the user if any questions arise before considering the integration complete

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The two checkpoints (tasks 6 and 9) ensure incremental validation before and after the backend work
- Property tests validate universal correctness guarantees; unit tests validate specific examples and edge cases
- `fast-check` must be installed as a dev dependency in whichever package runs the property tests (`frontend/` and/or `backend/`)
- The `NEXT_PUBLIC_PRIVACY_ENGINE_URL` environment variable should be documented in `frontend/.env.local` (or an `.env.local.example` file) pointing to the Privacy Engine server (default: `http://localhost:6000`)
- The DB adapter (`dbAdapter.ts`) is a backend module — it is never imported by the Next.js frontend
