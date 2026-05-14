# Design Document

## Overview

This design layers a new hospital-onboarding flow on top of the existing HealthSphere Doctor experience without disturbing current auth, profile-setup, appointment, or saved-patient functionality.

The flow has three concerns:

1. **Identity** — Every doctor already receives a `DOC-NNNNN` Doctor_ID at registration. This design surfaces it on the Registration_Success_Screen and in the Doctor_Profile_Panel, and treats it as the key that admins type to add doctors to a hospital.
2. **Hospital ownership** — A new `hospitals` collection stores a first-class Hospital_Record keyed by `HOSP-NNNNN`. A doctor with `hospitalId == null` goes through a one-time `/doctor/setup-hospital` screen that either creates a hospital (making them `ADMIN`) or receives them via an admin's `Add Doctor` form (making them `DOCTOR`).
3. **Role-aware routing** — A deterministic client-side Role_Router evaluates `isProfileCompleted`, `hospitalId`, and `role` to pick exactly one landing path per session state. The state machine is designed so every redirect converges in one step (no-loop contract, Req 8.6).

The backend adds one model (`Hospital`), one controller (`hospitalController`), one route module (`hospitalRoutes`) mounted at `/api/hospital`, and two additive fields on the `Doctor` schema (`hospitalId`, `role`, both nullable). The login response gains two additive fields of the same names. No other existing schema, controller, route, or response shape is changed (Req 11.1, 11.2).

The frontend adds two pages (`/doctor/setup-hospital`, `/doctor/admin`), one component (`RoleToggle`), a thin extension of `DoctorContext`, a modest integration inside `DoctorTopbar`, and a new client effect inside `doctor/layout.tsx` that owns the Role_Router decision. Existing dashboard pages and `_components/` files are not removed or refactored (Req 11.4).

### High-level diagram

```mermaid
flowchart TD
    subgraph Client
      L[/"/login"/]
      SP[/"/doctor/setup-profile"/]
      SH[/"/doctor/setup-hospital"/]
      OV[/"/doctor/overview"/]
      AD[/"/doctor/admin"/]
      RR{{"Role_Router<br/>(effect in doctor/layout.tsx)"}}
      DC[(DoctorContext<br/>+hospitalId +role)]
      DT[DoctorTopbar<br/>+ RoleToggle]
    end

    subgraph Backend
      AU["/api/auth/login<br/>+hospitalId +role (additive)"]
      HC["/api/hospital/create"]
      HAD["/api/hospital/add-doctor"]
      HDOC["/api/hospital/doctors"]
      HGET["/api/hospital/:hospitalId"]
      AM[[requireAuth<br/>(JWT cookie)]]
    end

    subgraph Mongo
      DOC[(doctors<br/>+hospitalId +role)]
      HOS[(hospitals<br/>NEW)]
    end

    L -->|POST /api/auth/login| AU
    AU --> DOC
    AU -. session payload .-> DC
    DC --> RR
    RR -->|!isProfileCompleted| SP
    RR -->|profile OK & hospitalId=null| SH
    RR -->|profile OK & hospitalId!=null| OV
    RR -. only role=ADMIN .-> AD
    DT --> RR

    SH -->|POST create| AM --> HC --> HOS
    HC -->|promote ADMIN| DOC
    AD -->|POST add-doctor| AM --> HAD --> DOC
    AD -->|GET doctors| AM --> HDOC --> DOC
    AD -->|GET hospital| AM --> HGET --> HOS
```

### No-loop routing contract (Req 8.6)

The Role_Router is the only place in the doctor app that issues automatic redirects. Every other navigation comes from explicit user action (link click, form submit, Role_Toggle click). The contract is:

- For any session state *S* and any entry path *P* in the set `{/login, /doctor/setup-profile, /doctor/setup-hospital, /doctor/overview, /doctor/admin}`, the router issues **at most one** redirect before the page settles.
- The chosen landing path is a *fixed point* of the router for that session state. Re-running the router on the landing path is a no-op.
- The router does not observe its own intermediate redirects; it observes only `pathname` and session. This prevents ping-pong between two paths.

The state-machine in §5 enumerates every (state, entry-path) pair and the resulting action. Correctness Property 2 formalises the fixed-point guarantee for property-based testing.

---

## Architecture

### Layering

```
┌─────────────────────────────────────────────────────────────────┐
│ Next.js App Router (frontend/src/app)                           │
│                                                                 │
│  login/page.tsx ──► sets localStorage.user (with hospitalId,    │
│                      role) ──► router.push("/doctor/...")        │
│                                                                 │
│  doctor/layout.tsx                                              │
│    └─ DoctorProvider                                            │
│         └─ Role_Router effect (reads doctor + pathname)         │
│         └─ DoctorSidebar  | DoctorTopbar (+ RoleToggle if ADMIN)│
│         └─ <children>                                           │
│              ├─ setup-profile/page.tsx  (existing, untouched)   │
│              ├─ setup-hospital/page.tsx (NEW)                   │
│              ├─ overview/...            (existing, untouched)   │
│              └─ admin/page.tsx          (NEW)                   │
└─────────────────────────────────────────────────────────────────┘
                                │  fetch
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Express API (backend/src)                                       │
│                                                                 │
│  /api/auth/*        authController (loginUser returns +fields)  │
│  /api/hospital/*    hospitalController (NEW) + requireAuth      │
│  /api/doctor/*      unchanged                                   │
│  /api/appointments, /api/patients, ...  unchanged               │
└─────────────────────────────────────────────────────────────────┘
                                │ Mongoose
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ MongoDB                                                         │
│   doctors (existing) + additive hospitalId, role                │
│   hospitals (NEW)                                               │
│   HospitalLocation (legacy, untouched)                          │
└─────────────────────────────────────────────────────────────────┘
```

### Trust boundaries

- The browser cannot be trusted for `adminDoctorId` or `createdBy`. The backend re-validates both fields against persisted Doctor_Records on every hospital endpoint (Req 4.7, 4.8, 7.4, 7.5).
- The JWT cookie set by `generateToken` is the only source of session identity on the server. The client-side `localStorage.user` mirror is used only for UX routing, never for authorization.

### Key design decisions

| Decision | Rationale |
|---|---|
| Additive `hospitalId` / `role` on `Doctor`, both nullable, default `null` | Zero-migration deployment (Req 2.7, 11.3). Existing documents read back `null`. |
| New collection `hospitals` instead of reusing `HospitalLocation` | `HospitalLocation` is a legacy per-doctor clinic address with different semantics (`synced`, `updatedByDoctorId`). Req glossary explicitly names `Hospital` as a new first-class entity (Req 2.1). Leaving `HospitalLocation` untouched satisfies Req 11.2. |
| Role_Router lives in `doctor/layout.tsx` as a client effect, not in a middleware | The existing app already uses `localStorage.user` + `onAuthStateChanged` in `DoctorProvider`. Centralising routing in the layout effect keeps the decision next to the context that already holds `doctor`, avoids duplicating logic across pages, and keeps Next.js middleware free of Firebase/localStorage concerns. |
| `requireAuth` middleware for `/api/hospital/*` only | Req 9.6 mandates 401 for unauthenticated requests. Existing routes deliberately do *not* require auth in this codebase (e.g. `/api/doctor/*` uses `doctorId` in the URL). Scoping the new middleware to `/api/hospital` preserves existing behaviour (Req 11.2) while satisfying the new requirement. |
| `HOSP-NNNNN` / `DOC-NNNNN` generation uses same retry pattern | Consistency with existing `DOC-NNNNN` generation in `registerDoctor`; see §Data Models for the bounded-retry algorithm. |
| Idempotent re-add (Req 7.8) implemented by early-return before mutation | Makes the endpoint safe to call twice from a flaky UI without double-writes, and makes the property test trivial. |

---

## Components and Interfaces

### Backend

#### `backend/src/models/Hospital.ts` (new)

```ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IHospital extends Document {
  hospitalId: string;      // "HOSP-NNNNN"
  name: string;
  latitude: number;        // -90..90
  longitude: number;       // -180..180
  address: string;
  createdBy: string;       // Doctor_ID of creator (e.g. "DOC-12345")
  createdAt: Date;
  updatedAt: Date;
}

const HospitalSchema: Schema = new Schema(
  {
    hospitalId: { type: String, required: true, unique: true, index: true },
    name:       { type: String, required: true },
    latitude:   { type: Number, required: true, min: -90, max: 90 },
    longitude:  { type: Number, required: true, min: -180, max: 180 },
    address:    { type: String, required: true },
    createdBy:  { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IHospital>('Hospital', HospitalSchema);
```

Enforces Req 2.1–2.5. Schema-level `min`/`max` on coordinates is a defence-in-depth check; the controller still returns a dedicated `Invalid coordinates` 400 before mongoose validation runs (Req 4.6).

#### `backend/src/models/Doctor.ts` (additive edit only)

Add two optional fields; the rest of the schema and exports remain unchanged:

```ts
// add to DoctorSchema
hospitalId: { type: String, default: null, index: true },
role:       { type: String, enum: ['ADMIN', 'DOCTOR', null], default: null },
```

Also extend `IDoctor`:

```ts
hospitalId?: string | null;
role?: 'ADMIN' | 'DOCTOR' | null;
```

No migration script. Existing documents return `undefined`/absent, which the controllers coerce to `null` using `doctor.hospitalId ?? null` (Req 2.7, 11.3).

#### `backend/src/controllers/hospitalController.ts` (new)

Exports four handlers. Each validates, returns the exact error shape defined in §API Contract, and logs on 5xx.

```ts
// Simplified signatures
export const createHospital       : (req, res) => Promise<void>;
export const addDoctorToHospital  : (req, res) => Promise<void>;
export const getHospitalDoctors   : (req, res) => Promise<void>;
export const getHospitalById      : (req, res) => Promise<void>;
```

Internal helper:

```ts
async function generateUniqueHospitalId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `HOSP-${Math.floor(10000 + Math.random() * 90000)}`;
    const collision = await Hospital.exists({ hospitalId: candidate });
    if (!collision) return candidate;
  }
  throw new Error('Hospital ID generation failed'); // → 500 with that message (Req 2.5)
}
```

The same pattern is used to harden Doctor_ID generation in `registerDoctor`: the current code does a single random pick and relies on the unique index to fail, which does not satisfy Req 1.4's "retry up to 5 times" language. The registration flow will be updated to use a parallel helper `generateUniqueDoctorId` that loops up to 5 times before returning 500 `Doctor ID generation failed`. This is additive to the existing response shape — only the failure path changes.

#### `backend/src/routes/hospitalRoutes.ts` (new)

```ts
import express from 'express';
import { requireAuth } from '../middleware/requireAuth';
import {
  createHospital,
  addDoctorToHospital,
  getHospitalDoctors,
  getHospitalById,
} from '../controllers/hospitalController';

const router = express.Router();

router.use(requireAuth);                       // Req 9.6
router.post('/create',        createHospital);
router.post('/add-doctor',    addDoctorToHospital);
router.get ('/doctors',       getHospitalDoctors);
router.get ('/:hospitalId',   getHospitalById);

export default router;
```

#### `backend/src/middleware/requireAuth.ts` (new, minimal)

No auth middleware currently exists in the codebase (`grep` for `jwt.verify`, `protect`, `authenticate` returns only `generateToken.ts`). This design introduces a single tiny middleware reused only by `hospitalRoutes`:

```ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedRequest extends Request {
  auth?: { userId: string; role: 'patient' | 'doctor' };
}

export const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction): void => {
  const token = req.cookies?.jwt;
  if (!token) { res.status(401).json({ message: 'Not authorized' }); return; }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    req.auth = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized' });
  }
};
```

This reuses the JWT pattern already produced by `generateToken.ts` (cookie name `jwt`, HS256, 30-day lifetime). It does not alter any existing route, so Req 11.2 remains satisfied.

#### `backend/src/controllers/authController.ts` (additive edit to `loginUser` only)

Current response shape is preserved; two fields are added:

```ts
res.json({
  _id: user._id,
  id: role === 'doctor' ? user.doctorId : user.patientId,
  name: user.name,
  email: user.email,
  role,
  isProfileCompleted: user.isProfileCompleted ?? false,
  // NEW — present only when role === 'doctor'
  hospitalId: role === 'doctor' ? (user.hospitalId ?? null) : undefined,
  doctorRole: role === 'doctor' ? (user.role ?? null) : undefined,
});
```

`doctorRole` is emitted instead of `role` for the hospital-role field to avoid overloading the existing `role` key (which is `'patient' | 'doctor'`). The frontend type-maps `doctorRole` → `DoctorContext.role` with values `'ADMIN' | 'DOCTOR' | null`. Req 3.1 is satisfied: both `hospitalId` and the hospital-role are in the body.

(Patients are unaffected; their response omits both new fields, preserving Req 11.1 and 11.5.)

#### `backend/src/index.ts` wiring

Add a single import/mount alongside the existing block:

```ts
import hospitalRoutes from './routes/hospitalRoutes';
app.use('/api/hospital', hospitalRoutes);
```

No other line in `index.ts` changes.

### Frontend

#### `frontend/src/app/doctor/setup-hospital/page.tsx` (new)

Owns the Create_Hospital_Form. Layout responsibility is delegated to `doctor/layout.tsx`, which already short-circuits for non-dashboard routes; `/doctor/setup-hospital` is added to the list of routes that render *without* the sidebar chrome (same pattern as `/doctor/setup-profile`). State shape:

```ts
type FormState = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  submitting: boolean;
  error: string | null;
  mapLoadFailed: boolean;   // flips true after 10s timeout (Req 10.5)
  geoError: string | null;  // set on geolocation denial (Req 4.3)
};
```

The submit button is disabled unless `name`, `latitude`, `longitude`, `address` are all truthy and `submitting === false` (Req 10.2, 10.3). On 201, the page:

1. Rewrites `localStorage.user` with the new `hospitalId` and `doctorRole = 'ADMIN'`.
2. Updates `DoctorContext` in-place via a context setter so the Role_Toggle appears immediately.
3. Calls `router.push('/doctor/overview')` (Req 4.10).

#### `frontend/src/app/doctor/admin/page.tsx` (new)

Two stacked cards:

1. **Hospital info card** — reads `GET /api/hospital/:hospitalId` on mount (Req 6.1). On 404, renders the "Hospital not found" message and hides the second card (Req 6.5).
2. **Doctors card** — reads `GET /api/hospital/doctors?hospitalId=…` (Req 6.2, 6.3) and renders a table with columns `Doctor ID | Name | Specialization | Role`. Below the table sits the **Add Doctor** form (Req 7.1). On successful POST, the list is re-fetched (Req 7.7).

The page is guarded: if `doctorRole !== 'ADMIN'`, the Role_Router redirects to `/doctor/overview` before this component mounts (Req 5.8).

#### `frontend/src/app/doctor/_components/RoleToggle.tsx` (new)

A segmented control with two options labelled `Admin` and `Doctor`. Rendered only when `doctor.doctorRole === 'ADMIN'` (Req 5.1–5.3). Each option is a `button` sized `min-w-[44px] min-h-[44px]` (Req 10.6). Active state mirrors `pathname` (Req 5.6, 5.7). `onClick` calls `router.push(target)`; it does not mutate context.

#### `frontend/src/app/doctor/_components/DoctorTopbar.tsx` (additive edit)

Insert `<RoleToggle />` between the page-title block and the right-side status block. The component self-gates on `role`, so the Topbar needs only to import and render it. Existing `LanguageSwitcher` and "Online" pill remain.

The Topbar and/or the Doctor_Profile_Panel in `DoctorSidebar` will also surface `doctor.id` (the Doctor_ID) as read-only text (Req 1.6). The simplest placement is under the doctor's name in the sidebar profile card — a single extra `<p>` showing `ID: {doctor.id}`.

#### `frontend/src/app/doctor/_context/DoctorContext.tsx` (additive edit)

Extend the `doctor` shape returned by the login payload:

```ts
type Doctor = {
  id: string;                // existing — DOC-NNNNN
  _id: string;
  name: string;
  email: string;
  role: 'doctor';
  isProfileCompleted: boolean;
  hospitalId: string | null;     // NEW
  doctorRole: 'ADMIN' | 'DOCTOR' | null; // NEW
};
```

Expose two new setters so that `setup-hospital` and `admin` pages can update the cached profile without a full re-login:

```ts
updateHospitalMembership(hospitalId: string, doctorRole: 'ADMIN' | 'DOCTOR'): void;
```

The setter writes through to both in-memory state and `localStorage.user` (keeping the mirror consistent). The existing `onAuthStateChanged` effect remains the source of truth on first mount.

#### `frontend/src/app/doctor/layout.tsx` (additive edit)

Add a client effect that implements the Role_Router decision tree described in §Role_Router. The effect runs on every `pathname` change and on every `doctor` change:

```ts
useEffect(() => {
  if (!doctor) return;                                 // wait for provider
  const target = decideTarget(pathname, doctor);
  if (target && target !== pathname) router.replace(target);
}, [pathname, doctor]);
```

`decideTarget` is a pure function, exported from `doctor/_context/roleRouter.ts`, used both by the layout and by the property test.

#### Registration_Success_Screen — Doctor_ID display (Req 1.5)

`frontend/src/app/register/page.tsx` today redirects straight to `/doctor/setup-profile` on success without showing the generated id. Minimal change: between the successful POST response and the `router.push`, surface the returned `data.id` inside a small success toast or modal reading e.g. "Your Doctor ID is **DOC-12345** — you can share this with your hospital admin." The existing flow still completes automatically after the user dismisses (or after a short timeout), so no user-facing regression.

---

## Data Models

### `hospitals` collection (new)

| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | mongoose default |
| `hospitalId` | string | required, **unique index**, matches `^HOSP-\d{5}$` |
| `name` | string | required |
| `latitude` | number | required, `-90 ≤ x ≤ 90` |
| `longitude` | number | required, `-180 ≤ x ≤ 180` |
| `address` | string | required |
| `createdBy` | string | required, references `doctors.doctorId` (no FK, application-level) |
| `createdAt` | Date | `{ timestamps: true }` |
| `updatedAt` | Date | `{ timestamps: true }` |

### `doctors` collection (additive fields)

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `hospitalId` | string \| null | default `null`, indexed | enables `find({ hospitalId })` for the Admin_Dashboard listing |
| `role` | `'ADMIN' \| 'DOCTOR' \| null` | enum, default `null` | mapped to `doctorRole` in API/UI to avoid clashing with auth-role |

All other fields are untouched.

### `HOSP-NNNNN` generation

```
generateUniqueHospitalId():
  for attempt in 0..4:
    n = randomInt(10000, 99999)
    candidate = "HOSP-" + n
    if not Hospital.exists({ hospitalId: candidate }):
      return candidate
  throw "Hospital ID generation failed"
```

Collision probability on a cold db is `0` and grows as `|db| / 90000`. At five attempts and 9000 existing hospitals (10% of id space), the probability of exhausting all five attempts is `(0.1)^5 = 1e-5`, giving a comfortable safety margin for the lifetime of a single-tenant clinic deployment. The same bounded-retry applies to Doctor_ID (Req 1.4).

Birthday-problem note: with uniform 5-digit ids, the 50% collision point for *any* pair is at ~375 existing hospitals. Per-insert collision probability at that point is still `375 / 90000 ≈ 0.4%`, so a 5-attempt retry succeeds with probability `1 − (0.004)^5 ≈ 1 − 10^-12`.

---

## Role_Router

### Decision function

`decideTarget(pathname, session)` is a pure function exported from `frontend/src/app/doctor/_context/roleRouter.ts`. Inputs:

```ts
type Session = {
  role: 'patient' | 'doctor';           // from existing login payload
  isProfileCompleted: boolean;
  hospitalId: string | null;            // ignored when role !== 'doctor' (Req 11.5)
  doctorRole: 'ADMIN' | 'DOCTOR' | null;
};
```

Output: the target path (`string`) or `null` (meaning "stay on `pathname`").

The decision is evaluated top-to-bottom; the **first** matching clause wins. This priority ordering is what makes Req 3.6 hold: the profile check fires before the hospital check.

| # | Guard | Output |
|---|---|---|
| R0 | `session.role !== 'doctor'` | `null` (patient routes are out of scope; Req 11.5) |
| R1 | `session.isProfileCompleted === false` | `/doctor/setup-profile` if `pathname !== '/doctor/setup-profile'`, else `null` |
| R2 | `session.hospitalId === null` | `/doctor/setup-hospital` if `pathname !== '/doctor/setup-hospital'`, else `null` |
| R3 | `pathname === '/doctor/setup-hospital'` and `session.hospitalId !== null` | `/doctor/overview` (Req 3.5) |
| R4 | `pathname.startsWith('/doctor/admin')` and `session.doctorRole !== 'ADMIN'` | `/doctor/overview` (Req 5.8, 8.5) |
| R5 | `pathname === '/doctor/setup-profile'` and `session.isProfileCompleted === true` | `/doctor/overview` (avoid getting stuck on setup after completion) |
| R6 | otherwise | `null` |

### Post-login entry

The `login/page.tsx` performs a single initial `router.push` based on the login payload (it already does this today for `setup-profile` vs `overview`). For doctors, the new logic is:

```ts
if (!data.isProfileCompleted)                         router.push('/doctor/setup-profile');
else if (data.hospitalId == null)                     router.push('/doctor/setup-hospital');
else                                                  router.push('/doctor/overview');
```

This is *redundant* with the Role_Router inside `doctor/layout.tsx` — that's intentional. The login-time push saves one render cycle, but even without it the layout effect would converge to the same path in one additional step, still satisfying Req 8.6.

### Admin landing and toggle

Login never sends a doctor to `/doctor/admin` directly (Req 8.3, 8.4 explicitly land at `/doctor/overview`). The only way to reach `/doctor/admin` is by clicking the `Admin` option on the Role_Toggle, which requires `doctorRole === 'ADMIN'` to be visible (Req 5.1). This keeps the router decision tree acyclic: user-initiated navigation to `/doctor/admin` is gated by R4 and passes the gate by construction.

### Fixed-point / idempotence argument

The five named paths are `L = /login`, `SP = /doctor/setup-profile`, `SH = /doctor/setup-hospital`, `OV = /doctor/overview`, `AD = /doctor/admin`. For any session state `S`:

- If `S.isProfileCompleted === false`: the only target is `SP`. `decideTarget(SP, S) = null`. Fixed-point after one step.
- If profile OK and `hospitalId == null`: the only target is `SH`. `decideTarget(SH, S) = null`.
- If profile OK, `hospitalId != null`, and pathname ∈ {L, SP, SH}: target is `OV` (via R5 for SP, R3 for SH; for L the layout never runs because `L` is not under `/doctor/*` — the login page's own push sets `OV`). `decideTarget(OV, S) = null`.
- If profile OK, `hospitalId != null`, `doctorRole !== 'ADMIN'`, pathname = `AD`: target is `OV`. `decideTarget(OV, S) = null`.
- If profile OK, `hospitalId != null`, `doctorRole === 'ADMIN'`, pathname = `AD`: no rule fires; target is `null`. `AD` is itself the fixed point.

Every cell in the cross-product of `{L, SP, SH, OV, AD} × S` terminates in at most one redirect, proving Req 8.6. This is formalised as Correctness Property P10.

### Implementation notes

- The layout effect uses `router.replace` (not `push`) so that a redirect is not added to the history stack — users don't see a "Back" button bounce.
- The effect depends on `[pathname, doctor?.id, doctor?.hospitalId, doctor?.doctorRole, doctor?.isProfileCompleted]` so transitions (e.g. `null → HOSP-…`) re-run the decision.
- `DoctorProvider` already gates rendering behind a loading spinner until `doctor` is populated, so the router effect never fires with a partial session.

---

## API Contract

All responses are `application/json`. Error bodies share the shape `{ "message": string }`. Success bodies are documented per endpoint. Every endpoint is mounted under `/api/hospital` and runs through `requireAuth` — unauthenticated callers always get `401 { "message": "Not authorized" }` (Req 9.6).

### POST /api/hospital/create

**Request body**

```json
{
  "name": "string",
  "latitude": number,
  "longitude": number,
  "address": "string",
  "createdBy": "DOC-NNNNN"
}
```

**Success — 201**

```json
{
  "_id": "…",
  "hospitalId": "HOSP-12345",
  "name": "…",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "address": "…",
  "createdBy": "DOC-12345",
  "createdAt": "…",
  "updatedAt": "…"
}
```

**Errors**

| Status | Message | When |
|---|---|---|
| 400 | `"<field> is required"` where `<field>` ∈ {`name`, `latitude`, `longitude`, `address`, `createdBy`} | Any listed field missing (Req 4.5) |
| 400 | `"Invalid coordinates"` | `latitude ∉ [-90, 90]` or `longitude ∉ [-180, 180]` (Req 4.6) |
| 404 | `"Doctor not found"` | No Doctor_Record with `doctorId === createdBy` (Req 4.7) |
| 409 | `"Doctor already belongs to a hospital"` | Creator's `hospitalId !== null` (Req 4.8) |
| 500 | `"Hospital ID generation failed"` | 5 consecutive collisions (Req 2.5) |

### POST /api/hospital/add-doctor

**Request body**

```json
{
  "hospitalId": "HOSP-NNNNN",
  "adminDoctorId": "DOC-NNNNN",
  "doctorId": "DOC-NNNNN"
}
```

**Success — 200**

```json
{
  "_id": "…",
  "doctorId": "DOC-56789",
  "name": "…",
  "email": "…",
  "hospitalId": "HOSP-12345",
  "role": "DOCTOR",
  // …all other existing Doctor fields retained
}
```

**Errors**

| Status | Message | When |
|---|---|---|
| 404 | `"Doctor ID not found"` | No Doctor_Record matches `doctorId` (Req 7.3) |
| 403 | `"Only the hospital admin can add doctors"` | `adminDoctor.role !== 'ADMIN'` OR `adminDoctor.hospitalId !== body.hospitalId` (Req 7.4) |
| 409 | `"Doctor already belongs to another hospital"` | `target.hospitalId !== null && target.hospitalId !== body.hospitalId` (Req 7.5) |

**Idempotent re-add (Req 7.8)**: if `target.hospitalId === body.hospitalId`, the handler returns 200 with the *current* Doctor_Record and performs no write.

### GET /api/hospital/doctors?hospitalId=HOSP-NNNNN

**Success — 200**

```json
[
  { "doctorId": "DOC-…", "name": "…", "specialization": "…", "role": "ADMIN", "hospitalId": "HOSP-…" },
  { "doctorId": "DOC-…", "name": "…", "specialization": "…", "role": "DOCTOR", "hospitalId": "HOSP-…" }
]
```

Response array may be empty.

**Errors**

| Status | Message | When |
|---|---|---|
| 400 | `"hospitalId is required"` | Missing query parameter (Req 6.4) |

### GET /api/hospital/:hospitalId

**Success — 200**: the full Hospital_Record (same shape as `POST /create` success).

**Errors**

| Status | Message | When |
|---|---|---|
| 404 | `"Hospital not found"` | No Hospital_Record matches (Req 9.4) |

### Additive fields on existing `/api/auth/login`

Request shape is **unchanged**. The response for `role === 'doctor'` gains `hospitalId: string | null` and `doctorRole: 'ADMIN' | 'DOCTOR' | null`. For `role === 'patient'` the body is byte-for-byte identical to the current behaviour (Req 11.1, 11.5).

---

## Map Picker Design

### Composition

Reuses the existing `@react-google-maps/api` + `use-places-autocomplete` stack already shipped in `ClinicLocation.tsx`. The setup-hospital picker is slimmer than that component — it only captures coordinates for a *new* hospital, not the existing per-doctor synced flow. Components:

- `<LoadScript googleMapsApiKey={MAPS_KEY} libraries={['places']}>` wraps the picker.
- `<GoogleMap>` centred initially on `12.9716, 77.5946` (Bengaluru) if geolocation hasn't resolved yet.
- `<Marker draggable onDragEnd={handleDrag}>` — `handleDrag(e)` reads `e.latLng.lat()` / `e.latLng.lng()` and updates form state (Req 10.4).
- `<PlacesInput>` autocomplete over Indian addresses, identical to the pattern in `ClinicLocation.tsx`.

### Use-Current-Location button

```ts
function handleUseCurrent() {
  if (!navigator.geolocation) {
    setGeoError('Unable to access current location');
    return;
  }
  const abort = setTimeout(() => setGeoError('Unable to access current location'), 15_000);
  navigator.geolocation.getCurrentPosition(
    pos => { clearTimeout(abort); setLatLng(pos.coords.latitude, pos.coords.longitude); },
    ()  => { clearTimeout(abort); setGeoError('Unable to access current location'); },
    { timeout: 15_000, maximumAge: 0 }
  );
}
```

This satisfies both the 15s outer timeout (Req 4.3) and the geolocation API's own timeout. On failure the marker state is *not* touched, keeping any previously-set coordinates (Req 4.3).

### 10s map-load timeout

`LoadScript` fires `onLoad` / `onError`. A separate `useEffect`-driven timer provides the timeout:

```ts
useEffect(() => {
  const t = setTimeout(() => {
    if (!mapsLoaded) setMapLoadFailed(true);        // Req 10.5
  }, 10_000);
  return () => clearTimeout(t);
}, [mapsLoaded]);
```

When `mapLoadFailed === true`, the map area is replaced by:

```
┌────────────────────────────────────────────┐
│  Map failed to load                        │
│                                            │
│  Latitude  [ number input ]                │
│  Longitude [ number input ]                │
└────────────────────────────────────────────┘
```

Both `<input type="number" step="any" min/max>` controls update the same `latitude` / `longitude` state used by the map, so the rest of the form (submit predicate, request body) is agnostic to which input path set the values.

### Form state transitions

```
          ┌───────────┐
          │  initial  │  submit.disabled=true
          └──────┬────┘
                 │ user fills fields
                 ▼
          ┌───────────┐
          │   ready   │  submit.disabled=false
          └──────┬────┘
                 │ click submit
                 ▼
          ┌───────────┐
          │ submitting│  submit.disabled=true; show "Creating hospital"
          └──────┬────┘
           201 ◄─┴─► 4xx/5xx
            │           │
            ▼           ▼
        ┌────────┐  ┌───────────┐
        │success │  │error(show)│ → back to ready
        └────────┘  └───────────┘
             │
             ▼
   update context + router.push('/doctor/overview')
```

---

## Add-Doctor Flow (UI states)

The `Add Doctor` form on `/doctor/admin` has an explicit state machine so the UI maps 1:1 to server responses. Only one state is active at a time.

| State | Trigger | UI | Effect on list |
|---|---|---|---|
| `idle` | Mount, or after success/error toast dismissed | Input enabled, button enabled when input ≥ 1 char | — |
| `loading` | Submit click | Input disabled, button shows spinner | — |
| `success` | 200 response | Toast: `Doctor DOC-XXXXX added` | Refetch `GET /api/hospital/doctors` (Req 7.7); reset to `idle` |
| `success_noop` | 200 response **and** target was already in the hospital (idempotent re-add, Req 7.8) | Toast: `Doctor DOC-XXXXX is already in this hospital` | Refetch (safe no-op); reset to `idle` |
| `not_found` | 404 `Doctor ID not found` | Inline error under input | Reset to `idle` on next keystroke |
| `conflict` | 409 `Doctor already belongs to another hospital` | Inline error under input | Reset to `idle` on next keystroke |
| `forbidden` | 403 `Only the hospital admin can add doctors` | Full-card error banner (serious — indicates stale session or tampered request) | Trigger a background session refresh |

The UI treats `success_noop` distinctly from `success` so the admin gets honest feedback, but both paths lead back to the same `idle` state and trigger the same list refresh. Detection of "already a member" is simple: the server returns 200 in both cases; the client compares the returned Doctor_Record's `updatedAt` to the time just before the POST. If `updatedAt < sendTime`, it was a no-op re-add.

---

## Error Handling

### Shape

All error responses use `{ "message": "<human-readable>" }` with the exact messages listed in §API Contract. This shape is already used by `authController.ts` for `"Doctor already exists"`, `"Invalid email or password"`, etc., so consumers get a consistent experience (Req 11.1).

### Frontend strategy

Errors surface in two places:

1. **Inline messages** under the offending input for 4xx validation errors (`400`, `404`, `409`) on the setup-hospital and add-doctor forms. The message text is the server's `message` field verbatim — no client-side translation — to keep the requirements-mandated strings visible in DOM for testability.
2. **Toasts** for non-field errors (unexpected 500s, network failures). Toasts auto-dismiss after 4s (matches `ClinicLocation.tsx` pattern).

A single helper `useApiError()` hook maps `{ status, body }` to a local state `{ field?: string, message: string }`, so each form doesn't hand-roll the mapping.

### Backend strategy

Controllers follow the existing pattern in `authController.ts`:

```ts
try {
  // handler body
} catch (error) {
  if (error instanceof Error) res.status(500).json({ message: error.message });
  else res.status(500).json({ message: 'Server error' });
}
```

The `requireAuth` middleware handles the 401 path before controllers run, so controllers never need to re-check auth.

### Logging

Controllers log at `console.error(...)` for 5xx paths; 4xx paths are not logged (they are expected user errors). This matches existing code style in the repo.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property-based testing (PBT) is appropriate for a subset of this feature. The backend hospital controllers, the ID generation helpers, the `decideTarget` routing function, and the add-doctor idempotence behaviour all fit the PBT model (pure or pure-with-mocks functions with universal input/output contracts). The map picker UI, the DOM/CSS rendering details, and the infrastructure smoke checks (Mongoose index presence, route registration) are covered by example-based tests, smoke tests, or integration tests instead — they do not benefit from 100-iteration randomised input.

The properties below were derived via the prework analysis and consolidated in property reflection to remove redundant and subsumed properties.

### Property 1: Doctor_ID format and uniqueness

*For any* sequence of N successful calls to `POST /api/auth/doctor/register` with distinct valid payloads, every returned `id` matches the regular expression `^DOC-\d{5}$`, all returned ids are pairwise distinct, and every persisted `Doctor_Record` is retrievable by exact match on `doctorId`.

**Validates: Requirements 1.1, 1.2, 1.3, 1.7**

### Property 2: Hospital_ID format, uniqueness, and round-trip

*For any* sequence of N successful calls to `POST /api/hospital/create` with distinct valid payloads, every returned `hospitalId` matches `^HOSP-\d{5}$`, all returned ids are pairwise distinct, and for each created hospital `H`, `GET /api/hospital/:H.hospitalId` returns 200 with a record equivalent to `H` on `{hospitalId, name, latitude, longitude, address, createdBy}`.

**Validates: Requirements 2.4, 9.4**

### Property 3: createHospital success invariant

*For any* valid `POST /api/hospital/create` payload where `createdBy` references a Doctor_Record with `hospitalId === null`, after the call the following hold: the response status is 201; a `Hospital_Record` exists with fields matching the input `{name, latitude, longitude, address, createdBy}`; the creator Doctor_Record's `hospitalId` equals the newly returned `hospitalId`; and the creator Doctor_Record's `role` equals `'ADMIN'`.

**Validates: Requirements 4.4, 4.9**

### Property 4: createHospital validation rejects malformed input

*For any* `POST /api/hospital/create` payload missing at least one of `{name, latitude, longitude, address, createdBy}` OR carrying `latitude ∉ [-90, 90]` OR `longitude ∉ [-180, 180]`, the response status is 400, the `message` field names the violated constraint (the missing field name, or `"Invalid coordinates"`), and no Hospital_Record is inserted.

**Validates: Requirements 4.5, 4.6**

### Property 5: createHospital rejects doctors already in a hospital

*For any* Doctor_Record with `hospitalId !== null`, any subsequent `POST /api/hospital/create` where `createdBy` equals that Doctor_ID returns 409 with message `"Doctor already belongs to a hospital"`, and neither the Hospital_Record count nor any Doctor_Record is modified.

**Validates: Requirement 4.8**

### Property 6: addDoctor authorization and target-hospital guards

*For any* `POST /api/hospital/add-doctor` request: if the Doctor_Record referenced by `adminDoctorId` has `role !== 'ADMIN'` OR `hospitalId !== body.hospitalId`, the response is 403 `"Only the hospital admin can add doctors"`; otherwise, if the Doctor_Record referenced by `doctorId` has a non-null `hospitalId` that differs from `body.hospitalId`, the response is 409 `"Doctor already belongs to another hospital"`. In both cases no Doctor_Record is modified.

**Validates: Requirements 7.4, 7.5**

### Property 7: addDoctor success and idempotence

*For any* valid `POST /api/hospital/add-doctor` request where the target Doctor_Record has `hospitalId ∈ {null, body.hospitalId}`, the response status is 200 and after the call the target Doctor_Record satisfies `hospitalId === body.hospitalId` and `role === 'DOCTOR'`. Furthermore, executing the same request a second time (`f(f(x)) == f(x)`) leaves the post-state unchanged and still returns 200.

**Validates: Requirements 7.6, 7.8**

### Property 8: getHospitalDoctors returns exactly the matching set

*For any* database state and any `hospitalId` value `H`, the response to `GET /api/hospital/doctors?hospitalId=H` is a 200 JSON array whose contents are exactly the set `{ d ∈ doctors : d.hospitalId === H }`, i.e. every returned element has `hospitalId === H` and every Doctor_Record with `hospitalId === H` appears in the response.

**Validates: Requirements 6.2, 6.3**

### Property 9: Hospital endpoints reject unauthenticated requests

*For any* request to one of `POST /api/hospital/create`, `POST /api/hospital/add-doctor`, `GET /api/hospital/doctors`, `GET /api/hospital/:hospitalId` that does not carry a JWT cookie verifiable against `JWT_SECRET`, the response is 401 with message `"Not authorized"` and no controller logic runs.

**Validates: Requirement 9.6**

### Property 10: Role_Router has no navigation loop (fixed-point)

*For any* session state `S` and any entry path `P ∈ { '/login', '/doctor/setup-profile', '/doctor/setup-hospital', '/doctor/overview', '/doctor/admin' }`, let `T₁ = decideTarget(P, S)` and `T₂ = decideTarget(T₁ ?? P, S)`. Then `T₂ === null || T₂ === T₁`, i.e. applying `decideTarget` twice produces the same result as applying it once and at most one non-identity redirect occurs from any entry point.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 5.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 11.3, 11.5**

### Property 11: Login response carries hospital-membership fields

*For any* doctor Doctor_Record with any pair `(hospitalId, role)` in `{null, HOSP-NNNNN} × {null, 'ADMIN', 'DOCTOR'}`, a successful `POST /api/auth/login` for that doctor returns a body whose `hospitalId` and `doctorRole` fields equal the stored values, while every pre-existing key (`_id`, `id`, `name`, `email`, `role`, `isProfileCompleted`) retains its current meaning and value.

**Validates: Requirements 3.1, 11.1**

### Property 12: Role_Toggle visibility and active indication

*For any* doctor session with `doctorRole ∈ {null, 'ADMIN', 'DOCTOR'}` and any `pathname` under `/doctor/*`, the `RoleToggle` component is present in the DOM iff `doctorRole === 'ADMIN'`; and when present, its active option is `'Admin'` iff `pathname.startsWith('/doctor/admin')` and `'Doctor'` iff `pathname.startsWith('/doctor/overview' | '/doctor/weeklyschedule' | '/doctor/patientrecords' | '/doctor/clinic')`.

**Validates: Requirements 5.1, 5.2, 5.3, 5.6, 5.7**

### Property 13: Create_Hospital_Form submit-button predicate

*For any* `Create_Hospital_Form` state `F`, the submit button's `disabled` attribute is `true` iff `!(F.name && F.latitude != null && F.longitude != null && F.address && !F.submitting)`.

**Validates: Requirement 10.2**

---

## Testing Strategy

### Dual approach

- **Property tests (13 properties above)** verify universal behaviour — deterministic state transitions, ID generation invariants, endpoint contracts. Property tests use randomised inputs across 100+ iterations and catch edge cases at the generator boundary (empty strings, extreme coordinates, unicode names, very long ids).
- **Example-based unit tests** verify concrete UI interactions (success screen displays a specific id, geolocation-denied shows the exact error text, map-load-timeout falls back to numeric inputs, submit button text becomes "Creating hospital").
- **Integration tests** verify real HTTP behaviour against a test mongod instance (hospital lifecycle end-to-end, JWT cookie plumbing, `/api/hospital/*` auth gate).
- **Smoke tests** verify one-off configuration (Mongoose indexes, route registration in `index.ts`, schema paths exist, existing `_components/*.tsx` files present).

### Tooling

- **Backend**: the repo currently has no test framework set up. Introduce **Vitest** with **fast-check** for property tests against the Express handlers, using `supertest` for HTTP-level integration. Mongoose interactions use `mongodb-memory-server` for isolation.
- **Frontend**: Vitest + **React Testing Library** + **fast-check** for property tests. `jsdom` for DOM; `@testing-library/jest-dom` matchers. The Google Maps library is mocked via `vi.mock('@react-google-maps/api', …)` returning stub `<GoogleMap>` / `<Marker>` / `<LoadScript>` components.

### Property-test configuration

- **Minimum 100 iterations** per property (`fast-check`'s default is 100; where appropriate, bump to 500 for ID-collision properties to exercise birthday-paradox territory).
- **Deterministic seeds in CI** — set `{ seed: 42 }` so failures are reproducible; unseed locally for broad coverage.
- **Tagging**: each property test carries a comment header of the form:
  ```ts
  // Feature: doctor-hospital-onboarding, Property 7: For any valid POST /api/hospital/add-doctor request...
  ```
  so the property text in the design document remains the single source of truth.
- **One property → one test** — do not collapse multiple properties into one test; split P3 and P5 even though both touch `createHospital`.

### Test surfaces by property

| Property | Surface | Mocks |
|---|---|---|
| P1 | `registerDoctor` handler | `mongodb-memory-server` |
| P2 | `createHospital` + `getHospitalById` | `mongodb-memory-server` |
| P3 | `createHospital` | `mongodb-memory-server` |
| P4 | `createHospital` | none (rejected before DB) |
| P5 | `createHospital` | `mongodb-memory-server` |
| P6 | `addDoctorToHospital` | `mongodb-memory-server` |
| P7 | `addDoctorToHospital` | `mongodb-memory-server` |
| P8 | `getHospitalDoctors` | `mongodb-memory-server` |
| P9 | all hospital routes | mocked `jwt.verify` |
| P10 | `decideTarget` pure function | none |
| P11 | `loginUser` | `mongodb-memory-server` |
| P12 | `RoleToggle` component | `next/navigation` (`usePathname`, `useRouter`) |
| P13 | `setup-hospital/page.tsx` form | mocked `@react-google-maps/api` |

### Example / edge-case tests (non-exhaustive)

- Generator retry path: mock `Hospital.exists = () => true`; expect 500 `Hospital ID generation failed` and exactly 5 invocations (Req 2.5, mirrored for Doctor_ID Req 1.4).
- Registration success screen: render with `data={{id:'DOC-12345', ...}}`; assert text `DOC-12345` present (Req 1.5).
- Doctor_Profile_Panel: render `DoctorSidebar` with stub context; assert `DOC-12345` visible (Req 1.6).
- Geolocation denial: mock `navigator.geolocation.getCurrentPosition` to call error callback; assert inline error `Unable to access current location` (Req 4.3).
- Map load timeout: use `vi.useFakeTimers()`, advance 10 000 ms without firing `onLoad`; assert fallback text and numeric inputs (Req 10.5).
- Role_Toggle CSS size: measure `getBoundingClientRect()` on each option; assert ≥ 44×44 (Req 10.6).
- Patient login: property-test `decideTarget({role:'patient',…}, *) === null` for any session (Req 11.5).

### Integration tests

- **End-to-end happy path**: register a doctor → login → POST `/create` → login again → assert hospitalId + role in response.
- **Cross-endpoint auth**: POST `/add-doctor` from admin A for hospital A against target doctor T; then repeat from a non-admin caller; expect 200 then 403.
- **Backward compatibility sweep** (Req 11.2): smoke-hit one route from each of `/api/doctor/*`, `/api/appointments/*`, `/api/patient/*`, `/api/prescriptions/*`, `/api/medical-records/*`, `/api/notifications/*` and assert the existing 2xx response shape.

---

## Backward Compatibility

The following existing surface area is **guaranteed untouched** by this feature:

### Backend

| Area | Guarantee |
|---|---|
| `POST /api/auth/doctor/register` | Request shape unchanged. Response shape gains no new required keys (the `id` field already exists). The only behavioural change is a bounded retry on ID generation, observable only on collision (Req 1.4, 11.1). |
| `POST /api/auth/patient/register`, `POST /api/auth/login` (patient), `POST /api/auth/logout` | No changes (Req 11.1, 11.5). |
| `POST /api/auth/login` (doctor) | Response gains additive `hospitalId` and `doctorRole` fields; all existing keys preserved (Req 3.1, 11.1). |
| `/api/doctor/*` routes | Untouched. Existing `doctorController.ts` handlers are not edited (Req 11.2). |
| `/api/appointments/*` | Untouched (Req 11.2). |
| `/api/patients/*` | Untouched (Req 11.2). |
| `/api/prescriptions/*` | Untouched (Req 11.2). |
| `/api/medical-records/*` | Untouched (Req 11.2). |
| `/api/notifications/*` | Untouched (Req 11.2). |
| `/api/diet-plans/*`, `/api/reminders/*`, `/api/voice-booking/*`, `/api/places/*`, `/api/ai/*` | Untouched. |
| `backend/src/models/HospitalLocation.ts` | Legacy model; not read, not written, not imported by new code (Req 11.2). |
| `backend/src/controllers/hospitalLocationController.ts` | Legacy controller; untouched. |
| `backend/src/models/Doctor.ts` | Schema gains two nullable fields with `default: null`; no migration needed; existing documents read the new fields as `null` (Req 2.7, 11.3). |
| JWT cookie `jwt` from `generateToken.ts` | Reused as-is by the new `requireAuth` middleware. No cookie name, payload, or lifetime change. |

### Frontend

| Area | Guarantee |
|---|---|
| `frontend/src/app/doctor/setup-profile/page.tsx` | Untouched (Req 11.4). |
| `frontend/src/app/doctor/overview/page.tsx` | Untouched (Req 11.4). |
| `frontend/src/app/doctor/weeklyschedule/page.tsx` | Untouched (Req 11.4). |
| `frontend/src/app/doctor/patientrecords/page.tsx` | Untouched (Req 11.4). |
| `frontend/src/app/doctor/clinic/page.tsx` | Untouched (Req 11.4). |
| `frontend/src/app/doctor/dashboard/page.tsx` | Untouched. |
| `frontend/src/app/doctor/_components/ClinicLocation.tsx` | Untouched; the setup-hospital page uses its own lightweight picker rather than repurposing this component (Req 11.4). |
| `frontend/src/app/doctor/_components/DoctorSidebar.tsx` | Only additive change: one `<p>` line showing `ID: {doctor.id}` inside the existing profile card (Req 1.6). No props removed. |
| `frontend/src/app/doctor/_components/DoctorTopbar.tsx` | Only additive change: render `<RoleToggle />` between existing blocks. No existing element removed. |
| `frontend/src/app/doctor/_components/MedicineCard.tsx` | Untouched. |
| `frontend/src/app/doctor/_context/DoctorContext.tsx` | Only additive changes: `doctor` shape gains optional `hospitalId` / `doctorRole`; one new setter exported. No existing field, setter, or effect removed (Req 11.4). |
| `frontend/src/app/doctor/layout.tsx` | Only additive change: a new `useEffect` running `decideTarget`. The DASHBOARD_ROUTES array gains `/doctor/admin` and the sidebar-excluded routes include `/doctor/setup-hospital` (same pattern as `/doctor/setup-profile`). |
| `frontend/src/app/login/page.tsx` | Only additive change: post-login router.push considers the new fields. Existing Firebase flows, Google sign-in, error handling, and styling untouched. |
| `frontend/src/app/register/page.tsx` | Only additive change: a transient success screen surfaces `data.id` before the existing `router.push('/doctor/setup-profile')`. The existing flow still completes. |
| Patient routes (`/patient/*`) | Untouched (Req 11.5). |

### Data migration

None. All new schema fields are nullable with `default: null`, and all new code tolerates absent or null values (Req 2.7, 11.3). Existing doctors log in, land on the Hospital_Setup_Screen once (Req 11.3), and either create a hospital or wait to be added by an admin.

---

## Open Questions and Risks

### Open questions

1. **Auth middleware scope** — The design restricts `requireAuth` to `/api/hospital/*` to preserve existing untouched routes (Req 11.2). A future hardening pass should extend it to `/api/doctor/*` and similar, but that is out of scope for this feature and would require coordinated frontend changes (e.g. `fetch(..., { credentials: 'include' })`). *Assumption*: all frontend `fetch` calls to `/api/hospital/*` will be updated to pass `credentials: 'include'`; verify against the existing CORS config in `index.ts` (`credentials: true` is already set).

2. **Google Maps API key provisioning** — `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is already wired via `frontend/.env.local` per `ClinicLocation.tsx`. The setup-hospital page reuses the same key. *Risk*: if the key is missing in deployment, `LoadScript` silently fails and the 10s fallback (Req 10.5) kicks in — users can still submit a hospital via the numeric inputs. Document this in the deployment README as part of this feature rollout.

3. **`role` field overloading** — The existing login response uses `role` for `'patient' | 'doctor'`. This design introduces a second role concept (`'ADMIN' | 'DOCTOR'`) and exposes it under a different key `doctorRole` to avoid ambiguity. *Question for review*: is the name `doctorRole` acceptable, or should it be `hospitalRole`? Either works; `doctorRole` aligns with the Doctor_Record field name, `hospitalRole` better conveys scope.

4. **Registration_Success_Screen UX** — Req 1.5 only says "display the returned Doctor_ID as text". The minimal implementation is a toast/modal that resolves after the user acknowledges (or a short timeout). *Question*: should the user be blocked until they dismiss (ensuring they see the ID), or should the success screen auto-advance? Recommendation: a non-dismissible modal with a "Continue" button that does `router.push('/doctor/setup-profile')` — guarantees the ID was visible without breaking the first-login flow.

5. **Admin_Dashboard visual design** — Requirements only mandate the data shown (Req 6.1, 6.2, 7.1). The design reuses the existing slate/blue palette and card styling from `DoctorSidebar` / `ClinicLocation` for consistency. Specific component choices (table vs card grid for the doctor list) can be decided at implementation time.

### Risks

1. **Router flash** — Between `DoctorProvider` populating `doctor` from `localStorage` and the first `decideTarget` run, a user may briefly see the "wrong" page. *Mitigation*: `DoctorProvider` already renders a loading spinner until `doctor` is set, so the effect fires before the child routes render.

2. **Admin-view stale session** — An admin whose role was revoked server-side (e.g. their hospitalId was nulled by a DB operator) might retain the Role_Toggle until their next login. *Mitigation*: `/api/hospital/*` always re-checks authorization server-side (P6), so the admin cannot act on a stale token. The UI will return 403 and show the `forbidden` state; recommend adding a session-refresh on 403.

3. **ID generation under high concurrency** — Two hospitals being created simultaneously could each pick the same 5-digit number and the unique index will reject one. With 5-attempt retry this is resolved transparently. With higher concurrency than expected (e.g. a bulk migration), the retry budget may be exceeded. *Mitigation*: monotonically-increasing ids (sequence collection) can replace random ids if this becomes a problem; out of scope for this feature.

4. **Legacy `HospitalLocation` divergence** — Having both `HospitalLocation` (per-doctor synced clinic address) and `Hospital` (clinic owned by an admin) can confuse future contributors. *Mitigation*: comment in both models pointing at each other; follow-up ticket to unify them is recommended but explicitly deferred per Req 11.2.

5. **`createdBy` is a string, not an ObjectId** — Storing `createdBy` as the Doctor_ID string (`DOC-NNNNN`) rather than the Doctor's ObjectId makes lookups easy but duplicates an identity. *Rationale*: The entire feature already exposes Doctor_IDs as the primary external identifier (admins type them into the add-doctor form); using the same identifier inside the Hospital_Record keeps the mental model consistent. If a future feature needs graph traversal in MongoDB, an ObjectId foreign key can be added additively.

