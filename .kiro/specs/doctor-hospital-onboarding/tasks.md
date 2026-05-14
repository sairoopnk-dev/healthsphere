# Implementation Plan: Doctor-Hospital Onboarding

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

## Overview

The work is sequenced so that the backend data model exists before its controllers, controllers exist before routes, and routes exist before the login response exposes membership fields. The frontend starts with the context and pure `decideTarget` function (which are consumed by every later UI piece), then shared components, then the two new pages (`setup-hospital`, `admin`). Tests are scaffolded once per tier (backend, frontend) and property tests reference the numbered properties from the design document. Checkpoints sit between coherent slices so the tree stays green as work lands.

Implementation language: **TypeScript** (backend and frontend, matching the existing codebase and the design's typed signatures).

## Tasks

- [x] 1. Backend — data models and hardened ID generation
  - [x] 1.1 Create `backend/src/models/Hospital.ts`
    - Declare the `IHospital` interface with `hospitalId`, `name`, `latitude`, `longitude`, `address`, `createdBy`, `createdAt`, `updatedAt` per design §Data Models
    - Define the Mongoose `HospitalSchema` with `unique: true, index: true` on `hospitalId`, `min`/`max` coordinate bounds, and `{ timestamps: true }`
    - Export the compiled model as the default export
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.2 Extend `backend/src/models/Doctor.ts` with additive fields
    - Add `hospitalId: { type: String, default: null, index: true }` to the schema
    - Add `role: { type: String, enum: ['ADMIN', 'DOCTOR', null], default: null }` to the schema
    - Extend the `IDoctor` interface with `hospitalId?: string | null` and `role?: 'ADMIN' | 'DOCTOR' | null`
    - Do not remove or rename any existing field
    - _Requirements: 2.6, 2.7, 11.3_

  - [x] 1.3 Harden `registerDoctor` with a bounded-retry `generateUniqueDoctorId` helper
    - Introduce a local helper that loops up to 5 times picking `DOC-NNNNN` and checking `Doctor.exists({ doctorId })`
    - On 5 consecutive collisions, return HTTP 500 with message `Doctor ID generation failed`
    - Preserve the existing success response shape; only the collision failure path changes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 11.1_

- [x] 2. Backend — authentication middleware
  - [x] 2.1 Create `backend/src/middleware/requireAuth.ts`
    - Read the `jwt` cookie from `req.cookies`; respond HTTP 401 `{ message: 'Not authorized' }` when absent
    - Verify the token with `jwt.verify(token, process.env.JWT_SECRET || 'secret')` (same secret and cookie name as `generateToken.ts`)
    - On failure, respond HTTP 401 with the same message; on success, attach `{ userId, role }` to `req.auth` and call `next()`
    - Export an `AuthedRequest` type extending `Request` with the optional `auth` field
    - _Requirements: 9.6_

- [x] 3. Backend — hospital controller, routes, and login response
  - [x] 3.1 Implement `generateUniqueHospitalId` and `createHospital` in `backend/src/controllers/hospitalController.ts`
    - Helper loops up to 5 times picking `HOSP-NNNNN`; on exhaustion throw so the handler returns HTTP 500 `Hospital ID generation failed`
    - Validate body fields in order: missing-field 400 (message naming the field), coordinate-range 400 `Invalid coordinates`, 404 `Doctor not found`, 409 `Doctor already belongs to a hospital`
    - On success create the Hospital_Record, set the creator Doctor_Record's `hospitalId` to the new id and `role` to `'ADMIN'`, and respond HTTP 201 with the Hospital_Record
    - _Requirements: 2.4, 2.5, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [x] 3.2 Implement `addDoctorToHospital` in `hospitalController.ts`
    - Validate `doctorId`, `adminDoctorId`, `hospitalId` body fields
    - 404 `Doctor ID not found` when the target Doctor_Record is missing
    - 403 `Only the hospital admin can add doctors` when the admin record fails the `role === 'ADMIN' && hospitalId === body.hospitalId` check
    - 409 `Doctor already belongs to another hospital` when `target.hospitalId !== null && target.hospitalId !== body.hospitalId`
    - Idempotent branch: if `target.hospitalId === body.hospitalId` return HTTP 200 without writing; otherwise update `hospitalId` + `role = 'DOCTOR'` and return 200 with the full Doctor_Record
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.8_

  - [x] 3.3 Implement `getHospitalDoctors` and `getHospitalById` in `hospitalController.ts`
    - `getHospitalDoctors`: reject requests missing `hospitalId` query param with HTTP 400 `hospitalId is required`; otherwise return HTTP 200 with every Doctor_Record whose `hospitalId` equals the query value (array may be empty)
    - `getHospitalById`: look up by `hospitalId` URL param; return HTTP 200 with the Hospital_Record, or HTTP 404 `Hospital not found`
    - Wrap both handlers in `try/catch` → 500 `{ message }`, matching the existing controller style
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 9.4_

  - [x] 3.4 Create `backend/src/routes/hospitalRoutes.ts` and mount it
    - `router.use(requireAuth)` so every sub-route is protected
    - Register `POST /create`, `POST /add-doctor`, `GET /doctors`, `GET /:hospitalId` bound to the four controller handlers
    - Import the router in `backend/src/index.ts` and add `app.use('/api/hospital', hospitalRoutes)` next to the existing route mounts; do not edit any other line in `index.ts`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 3.5 Extend `loginUser` in `backend/src/controllers/authController.ts` with additive fields
    - When `role === 'doctor'`, include `hospitalId: user.hospitalId ?? null` and `doctorRole: user.role ?? null` in the response body
    - Preserve every existing key (`_id`, `id`, `name`, `email`, `role`, `isProfileCompleted`); do not change request shape
    - When `role === 'patient'`, omit both new keys so the body is byte-for-byte identical to current behaviour
    - _Requirements: 3.1, 8.1, 8.2, 8.3, 8.4, 11.1, 11.5_

- [x] 4. Checkpoint — backend implementation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Backend — test scaffolding
  - [x] 5.1 Install and configure Vitest, fast-check, supertest, mongodb-memory-server
    - Add dev dependencies in `backend/package.json` and pin exact versions
    - Add a `vitest.config.ts` with the `node` environment and a `test` script
    - Wire a global setup file that boots `mongodb-memory-server` before the suite and tears it down after
    - _Requirements: 11.1_

  - [ ] 5.2 Add shared test helpers in `backend/src/__tests__/helpers.ts`
    - `withApp()` returns a fresh `supertest` agent bound to the Express app used in `index.ts`
    - `issueJwt(payload)` signs a token with the same `JWT_SECRET` the app uses so `requireAuth` accepts it
    - `insertDoctor`, `insertHospital` seed valid fixture records with deterministic ids
    - _Requirements: 9.6_

- [ ] 6. Backend — property tests for IDs and hospital creation (optional)
  - [ ]* 6.1 Write property test for Doctor_ID format and uniqueness
    - **Property 1: Doctor_ID format and uniqueness**
    - Randomise N distinct valid registration payloads, assert every returned `id` matches `^DOC-\d{5}$`, all ids are pairwise distinct, and each record is retrievable by exact `doctorId` match
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.7**
    - _Property: P1_

  - [ ]* 6.2 Write property test for Hospital_ID format, uniqueness, and round-trip
    - **Property 2: Hospital_ID format, uniqueness, and round-trip**
    - Create N hospitals with distinct valid payloads; assert ids match `^HOSP-\d{5}$`, are pairwise distinct, and `GET /api/hospital/:id` returns an equivalent record on `{hospitalId, name, latitude, longitude, address, createdBy}`
    - **Validates: Requirements 2.4, 9.4**
    - _Property: P2_

  - [ ]* 6.3 Write property test for `createHospital` success invariant
    - **Property 3: createHospital success invariant**
    - For any valid payload whose creator has `hospitalId === null`, assert HTTP 201, a new Hospital_Record exists with the submitted fields, and the creator Doctor_Record is updated to `hospitalId = newId, role = 'ADMIN'`
    - **Validates: Requirements 4.4, 4.9**
    - _Property: P3_

  - [ ]* 6.4 Write property test for `createHospital` validation rejections
    - **Property 4: createHospital validation rejects malformed input**
    - Generate payloads that either drop a required field or place `latitude`/`longitude` outside valid ranges; assert HTTP 400, correct message text, and no Hospital_Record insert
    - **Validates: Requirements 4.5, 4.6**
    - _Property: P4_

  - [ ]* 6.5 Write property test for `createHospital` rejects doctors already in a hospital
    - **Property 5: createHospital rejects doctors already in a hospital**
    - Seed a Doctor_Record with non-null `hospitalId`; any subsequent `POST /create` with `createdBy` equal to that id returns HTTP 409 `Doctor already belongs to a hospital`, and neither collection counts nor any record change
    - **Validates: Requirement 4.8**
    - _Property: P5_

- [ ] 7. Backend — property tests for admin actions, auth, and login (optional)
  - [ ]* 7.1 Write property test for `addDoctor` authorization and target-hospital guards
    - **Property 6: addDoctor authorization and target-hospital guards**
    - Randomise admin role/hospital combinations and target-hospital states; assert 403 for the admin-guard violation and 409 for the cross-hospital violation, with no Doctor_Record mutation in either case
    - **Validates: Requirements 7.4, 7.5**
    - _Property: P6_

  - [ ]* 7.2 Write property test for `addDoctor` success and idempotence
    - **Property 7: addDoctor success and idempotence**
    - For valid requests where the target has `hospitalId ∈ {null, body.hospitalId}`, assert HTTP 200, post-state `hospitalId === body.hospitalId && role === 'DOCTOR'`, and that a repeat request (`f(f(x)) == f(x)`) is a no-op still returning 200
    - **Validates: Requirements 7.6, 7.8**
    - _Property: P7_

  - [ ]* 7.3 Write property test for `getHospitalDoctors` exact-set return
    - **Property 8: getHospitalDoctors returns exactly the matching set**
    - Seed a random set of Doctor_Records across multiple hospitals; assert the response equals `{ d ∈ doctors : d.hospitalId === H }` for each queried `H`
    - **Validates: Requirements 6.2, 6.3**
    - _Property: P8_

  - [ ]* 7.4 Write property test for `/api/hospital/*` auth gate
    - **Property 9: Hospital endpoints reject unauthenticated requests**
    - For arbitrary valid bodies/queries against all four endpoints without a `jwt` cookie (or with a tampered one), assert HTTP 401 `Not authorized` and confirm no controller code runs (mock controllers to fail the test if invoked)
    - **Validates: Requirement 9.6**
    - _Property: P9_

  - [ ]* 7.5 Write property test for login response hospital-membership fields
    - **Property 11: Login response carries hospital-membership fields**
    - Seed doctors with every `(hospitalId ∈ {null, HOSP-…}, role ∈ {null, 'ADMIN', 'DOCTOR'})` combination; assert `POST /api/auth/login` returns `hospitalId` and `doctorRole` equal to the stored values while preserving every pre-existing key
    - **Validates: Requirements 3.1, 11.1**
    - _Property: P11_

- [ ] 8. Backend — integration and backward-compatibility tests
  - [ ]* 8.1 Write end-to-end happy-path integration test
    - Register a doctor, log in, POST `/api/hospital/create`, log in again, confirm `hospitalId` and `doctorRole` on the second login match the created hospital and `'ADMIN'`
    - _Requirements: 3.1, 4.9, 4.10, 8.4_

  - [ ]* 8.2 Write cross-endpoint auth integration test
    - Admin A adds target T successfully (200); a non-admin caller attempting the same request receives 403; both outcomes come through the real `requireAuth` middleware
    - _Requirements: 7.4, 7.6, 9.6_

  - [ ]* 8.3 Write bounded-retry example test for ID generation
    - Mock `Hospital.exists` to always return a truthy value; assert `createHospital` responds HTTP 500 `Hospital ID generation failed` and `exists` was invoked exactly 5 times. Mirror the same test for `Doctor.exists` in `registerDoctor`
    - _Requirements: 1.4, 2.5_

  - [ ]* 8.4 Write backward-compatibility smoke sweep
    - For each existing namespace (`/api/doctor`, `/api/appointments`, `/api/patient`, `/api/prescriptions`, `/api/medical-records`, `/api/notifications`) hit one read-only route and assert a 2xx response with an unchanged body shape
    - _Requirements: 11.1, 11.2_

- [ ] 9. Checkpoint — backend tests green
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Frontend — DoctorContext and Role_Router
  - [x] 10.1 Extend `frontend/src/app/doctor/_context/DoctorContext.tsx`
    - Add `hospitalId: string | null` and `doctorRole: 'ADMIN' | 'DOCTOR' | null` to the `Doctor` type
    - Map the login payload's `hospitalId`/`doctorRole` into the provider state and mirror into `localStorage.user`
    - Expose `updateHospitalMembership(hospitalId: string, doctorRole: 'ADMIN' | 'DOCTOR')` that writes through both in-memory state and `localStorage.user`
    - Do not remove or rename any existing field, setter, or effect
    - _Requirements: 1.6, 3.1, 4.10, 11.4_

  - [x] 10.2 Create `frontend/src/app/doctor/_context/roleRouter.ts`
    - Export the pure function `decideTarget(pathname: string, session: Session): string | null` implementing the R0–R6 decision table from design §Role_Router
    - Export a `Session` type matching `{ role, isProfileCompleted, hospitalId, doctorRole }`
    - No React imports, no side effects — so the function can be unit-tested and property-tested in isolation
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 5.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 11.5_

  - [x] 10.3 Wire the Role_Router effect inside `frontend/src/app/doctor/layout.tsx`
    - Add a `useEffect` keyed on `[pathname, doctor?.id, doctor?.hospitalId, doctor?.doctorRole, doctor?.isProfileCompleted]` that calls `decideTarget` and `router.replace(target)` when the target differs from `pathname`
    - Extend the DASHBOARD_ROUTES / sidebar-excluded-routes arrays so `/doctor/admin` is recognised and `/doctor/setup-hospital` renders without sidebar chrome (same pattern as `/doctor/setup-profile`)
    - Gate the effect on `doctor` being populated so it never fires with a partial session
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 5.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 11.3, 11.5_

- [x] 11. Frontend — shared components and page edits
  - [x] 11.1 Create `frontend/src/app/doctor/_components/RoleToggle.tsx`
    - Render two buttons labelled `Admin` and `Doctor` as a segmented control; each button is at least `44px × 44px`
    - Self-gate on `doctor.doctorRole === 'ADMIN'`; return `null` for `'DOCTOR'` or `null`
    - Set the active option from `usePathname()` (Admin when path starts with `/doctor/admin`; Doctor when path starts with `/doctor/overview|weeklyschedule|patientrecords|clinic`)
    - Click handlers call `router.push('/doctor/admin')` or `router.push('/doctor/overview')` — no context mutation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 10.6_

  - [x] 11.2 Integrate `RoleToggle` into `frontend/src/app/doctor/_components/DoctorTopbar.tsx`
    - Import and render `<RoleToggle />` between the page-title block and the right-side status block
    - Do not remove or re-style existing elements (LanguageSwitcher, Online pill)
    - _Requirements: 5.1, 11.4_

  - [x] 11.3 Surface Doctor_ID inside `frontend/src/app/doctor/_components/DoctorSidebar.tsx`
    - Add one `<p>` element under the doctor's name showing `ID: {doctor.id}` inside the existing profile card
    - No changes to props, imports, or other markup
    - _Requirements: 1.6, 11.4_

  - [x] 11.4 Update `frontend/src/app/login/page.tsx` post-login routing
    - After a successful doctor login, branch on the additive payload: `!isProfileCompleted → /doctor/setup-profile`; `hospitalId == null → /doctor/setup-hospital`; otherwise `/doctor/overview`
    - Ensure the fetch call passes `credentials: 'include'` so the `jwt` cookie round-trips (matches open-question #1 in design)
    - Leave all existing Firebase/Google sign-in and error-handling logic intact
    - _Requirements: 3.1, 3.2, 8.1, 8.2, 8.3, 8.4, 11.1_

  - [x] 11.5 Update `frontend/src/app/register/page.tsx` with the Doctor_ID success screen
    - After a successful registration response, render a modal/success view that contains the returned `data.id` as literal text (e.g. `Your Doctor ID is DOC-12345`)
    - Advance to `/doctor/setup-profile` via the existing `router.push` after the user acknowledges (button or timed dismissal)
    - Do not change request shape or any error-handling path
    - _Requirements: 1.3, 1.5, 11.1_

- [x] 12. Frontend — setup-hospital page
  - [x] 12.1 Scaffold `frontend/src/app/doctor/setup-hospital/page.tsx` form shell
    - Render heading `Create Your Clinic` and the one-sentence subtitle; lay out the `name` input, Map_Picker placeholder, Use-current-location button, `address` textarea, and `Create Hospital` submit button
    - Maintain the `FormState` described in design §setup-hospital: `{ name, latitude, longitude, address, submitting, error, mapLoadFailed, geoError }`
    - Derive the submit-disabled predicate: `!(name && latitude != null && longitude != null && address && !submitting)`; show `Creating hospital` in the button body while `submitting`
    - _Requirements: 4.1, 10.1, 10.2, 10.3_

  - [x] 12.2 Embed the Google Maps picker with a draggable marker
    - Wrap the map in `<LoadScript googleMapsApiKey={NEXT_PUBLIC_GOOGLE_MAPS_API_KEY} libraries={['places']}>` and render `<GoogleMap>` centred on a default location
    - Render `<Marker draggable onDragEnd>` writing the new `lat`/`lng` back into form state
    - Reuse the Indian-address autocomplete pattern (`use-places-autocomplete`) from `ClinicLocation.tsx`
    - _Requirements: 4.1, 10.4_

  - [x] 12.3 Implement the Use-Current-Location button with a 15s timeout
    - On click, call `navigator.geolocation.getCurrentPosition` with `timeout: 15_000, maximumAge: 0` and a parallel `setTimeout(..., 15_000)` that sets `geoError`
    - On success, clear the timeout and write returned coords into form state
    - On denial/failure/timeout, set `geoError = 'Unable to access current location'` and leave the existing marker position untouched
    - _Requirements: 4.2, 4.3_

  - [x] 12.4 Add a 10s map-load timeout with numeric-input fallback
    - Start a `useEffect` timer that flips `mapLoadFailed` to `true` after 10_000 ms when `LoadScript` has not fired `onLoad`
    - When `mapLoadFailed`, render the literal text `Map failed to load` and two `<input type="number" step="any">` controls for latitude (`min=-90 max=90`) and longitude (`min=-180 max=180`) that write into the same form state fields
    - _Requirements: 10.5_

  - [x] 12.5 Wire the submit flow
    - On submit, `fetch('/api/hospital/create', { method: 'POST', credentials: 'include', headers, body: JSON.stringify({ name, latitude, longitude, address, createdBy: doctor.id }) })`
    - On 201: call `updateHospitalMembership(data.hospitalId, 'ADMIN')` and `router.push('/doctor/overview')`
    - On 4xx: render the server `message` inline on the form; on 5xx: render a toast; in both cases return to the `ready` state
    - _Requirements: 4.4, 4.10, 8.4_

- [x] 13. Frontend — admin page
  - [x] 13.1 Scaffold `frontend/src/app/doctor/admin/page.tsx` and fetch hospital info
    - On mount, `fetch('/api/hospital/' + doctor.hospitalId, { credentials: 'include' })`
    - Render the `name`, `address`, `latitude`, `longitude` inside a hospital-info card
    - On HTTP 404, render the literal text `Hospital not found` and do not render the doctor-list card (Req 6.5)
    - _Requirements: 6.1, 6.5_

  - [x] 13.2 Render the doctor list card
    - `fetch('/api/hospital/doctors?hospitalId=' + doctor.hospitalId, { credentials: 'include' })`
    - Display each doctor's Doctor_ID, name, specialization, and role in a list or table
    - Handle the empty-array case with a friendly placeholder
    - _Requirements: 6.2, 6.3_

  - [x] 13.3 Implement the Add Doctor form and its state machine
    - Render a text input labelled `Doctor ID` and a submit button labelled `Add Doctor`
    - Implement the `idle → loading → {success | success_noop | not_found | conflict | forbidden}` transitions from design §Add-Doctor Flow; detect `success_noop` by comparing the returned Doctor_Record's `updatedAt` against the pre-submit timestamp
    - Inline errors for 404/409 below the input; full-card banner + session refresh for 403
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.8_

  - [x] 13.4 Refetch the doctor list after a successful add
    - On 200 (both `success` and `success_noop`) re-issue `GET /api/hospital/doctors?hospitalId=…` and reset form state to `idle`
    - Keep the POST and GET requests both on `credentials: 'include'`
    - _Requirements: 7.6, 7.7_

- [x] 14. Checkpoint — frontend implementation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Frontend — test scaffolding
  - [ ] 15.1 Install and configure Vitest, React Testing Library, fast-check, jsdom
    - Add dev dependencies in `frontend/package.json` and pin exact versions
    - Add `vitest.config.ts` with the `jsdom` environment, `@testing-library/jest-dom` setup file, and a `test` script
    - Add shared mocks: `vi.mock('@react-google-maps/api', …)` returning stubbed `LoadScript`/`GoogleMap`/`Marker`, and `vi.mock('next/navigation', …)` returning controllable `useRouter`/`usePathname`
    - _Requirements: 11.4_

- [ ] 16. Frontend — property tests (optional)
  - [ ]* 16.1 Write property test for Role_Router fixed-point behaviour
    - **Property 10: Role_Router has no navigation loop (fixed-point)**
    - Generate random `Session` values and pathnames drawn from `{/login, /doctor/setup-profile, /doctor/setup-hospital, /doctor/overview, /doctor/admin}`; assert `decideTarget(decideTarget(p, s) ?? p, s) === null` or equals the first target
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 5.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 11.3, 11.5**
    - _Property: P10_

  - [ ]* 16.2 Write property test for `RoleToggle` visibility and active indication
    - **Property 12: Role_Toggle visibility and active indication**
    - Generate random `(doctorRole, pathname)` pairs; assert `RoleToggle` is present in the DOM iff `doctorRole === 'ADMIN'` and, when present, the active option matches the pathname-prefix rule
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.6, 5.7**
    - _Property: P12_

  - [ ]* 16.3 Write property test for Create_Hospital_Form submit predicate
    - **Property 13: Create_Hospital_Form submit-button predicate**
    - Generate random `FormState` values; assert the submit button's `disabled` attribute is `true` iff `!(name && latitude != null && longitude != null && address && !submitting)`
    - **Validates: Requirement 10.2**
    - _Property: P13_

- [ ] 17. Frontend — example and edge-case tests (optional)
  - [ ]* 17.1 Write unit test for Registration_Success_Screen Doctor_ID display
    - Render `register/page.tsx` with a mocked successful response containing `id: 'DOC-12345'`; assert the literal text `DOC-12345` is visible before navigation
    - _Requirements: 1.5_

  - [ ]* 17.2 Write unit test for Doctor_Profile_Panel Doctor_ID display
    - Render `DoctorSidebar` with a stub `DoctorContext` providing `doctor.id = 'DOC-12345'`; assert the text is visible
    - _Requirements: 1.6_

  - [ ]* 17.3 Write unit test for geolocation denial inline error
    - Mock `navigator.geolocation.getCurrentPosition` to invoke the error callback; click Use-Current-Location; assert the literal inline error `Unable to access current location` appears and the marker state is unchanged
    - _Requirements: 4.3_

  - [ ]* 17.4 Write unit test for 10s map-load timeout fallback
    - Use `vi.useFakeTimers()`; render the setup-hospital page; advance 10_000 ms without firing the mocked `LoadScript onLoad`; assert the literal text `Map failed to load` and both numeric inputs are present and editable
    - _Requirements: 10.5_

  - [ ]* 17.5 Write unit test for Role_Toggle minimum clickable area
    - Render `RoleToggle` with `doctorRole = 'ADMIN'`; for each option assert `getBoundingClientRect().width >= 44 && height >= 44`
    - _Requirements: 10.6_

- [x] 18. Final checkpoint — full suite green
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they cover property tests, integration tests, and UX edge-case checks that harden beyond the acceptance criteria.
- Each leaf task references either a requirement (`_Requirements: X.Y_`) or a correctness property (`_Property: PN_`), and most property sub-tasks cite both.
- The three checkpoints give natural pause points: backend implementation, backend tests, frontend implementation — before the final green-suite confirmation.
- All frontend `fetch` calls to `/api/hospital/*` pass `credentials: 'include'`, addressing open question #1 from the design.
- The design's Google Maps API key reuse (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) is honoured by task 12.2; no new env var is introduced.
