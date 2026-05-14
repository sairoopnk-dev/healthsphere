# Requirements Document

## Introduction

This document defines the requirements for integrating the Privacy Engine (Synthetic Data Module) into HealthSphere. The Privacy Engine is a fully functional, pre-built module that generates synthetic patient data, compares it against real data distributions, and produces downloadable reports. The integration must embed the module into the HealthSphere frontend shell (sidebar navigation, routing, and UI consistency) and optionally connect it to the existing HealthSphere database — without modifying any existing APIs, database schemas, or HealthSphere business logic.

The integration targets the Doctor Portal, as synthetic data generation is a clinical/administrative capability. Access may optionally be restricted to authorized roles.

---

## Glossary

- **Privacy_Engine**: The pre-built Synthetic Data Module being integrated into HealthSphere.
- **HealthSphere**: The existing Next.js/Node.js healthcare platform into which the Privacy Engine is embedded.
- **Sidebar**: The fixed left-side navigation panel rendered within the Doctor Portal layout (`DoctorSidebar.tsx`).
- **Shell**: The HealthSphere layout wrapper that includes the Sidebar and Topbar components.
- **Route**: A Next.js App Router page path that maps a URL to a rendered component.
- **Privacy_Engine_Page**: The Next.js page component at `/privacy-engine` that renders the Privacy Engine module UI.
- **Module_UI**: The React component exported from `@/modules/privacy-engine/page` that contains the Privacy Engine's full interface.
- **Generate_Endpoint**: The Privacy Engine's backend endpoint at `/generate` used to produce synthetic data.
- **Compare_Endpoint**: The Privacy Engine's backend endpoint at `/compare` used to compare synthetic and real data distributions.
- **Download_Endpoint**: The Privacy Engine's backend endpoint at `/download` used to retrieve generated reports.
- **DB_Adapter**: An optional data-fetching layer that replaces the Privacy Engine's mock `fetch_data()` function with a real HealthSphere database query.
- **Authorized_User**: A logged-in HealthSphere user whose role permits access to the Privacy Engine feature.
- **Doctor_Role**: A user authenticated with `role === "doctor"` as stored in `localStorage` and validated via Firebase Auth.
- **Light_Theme**: HealthSphere's existing visual design system — white/light-gray backgrounds (`#FFFFFF`, `#F8FAFC`, `#F0FDF4`), Inter font, Tailwind CSS utility classes, and `lucide-react` icons.

---

## Requirements

### Requirement 1: Sidebar Navigation Entry

**User Story:** As a Doctor, I want to see a "Privacy Engine" item in the sidebar navigation, so that I can access the Privacy Engine feature from within the HealthSphere portal.

#### Acceptance Criteria

1. THE `Sidebar` SHALL render a navigation item with the label "Privacy Engine" and a `Lock` icon from `lucide-react`.
2. WHEN the current route is `/doctor/privacy-engine`, THE `Sidebar` SHALL render the "Privacy Engine" navigation item in the active state, visually consistent with other active navigation items (blue gradient background, white text, white dot indicator).
3. WHEN the current route is not `/doctor/privacy-engine`, THE `Sidebar` SHALL render the "Privacy Engine" navigation item in the inactive state, visually consistent with other inactive navigation items (muted text, hover highlight).
4. THE `Sidebar` SHALL place the "Privacy Engine" navigation item within the existing `NAV` array in `DoctorSidebar.tsx`, preserving the order and rendering of all existing navigation items.

---

### Requirement 2: Next.js Route Registration

**User Story:** As a Developer, I want a dedicated Next.js route at `/doctor/privacy-engine`, so that the Privacy Engine module UI is accessible via a stable URL within the Doctor Portal.

#### Acceptance Criteria

1. THE `HealthSphere` SHALL expose a page route at `/doctor/privacy-engine` that renders the `Module_UI` component imported from `@/modules/privacy-engine/page`.
2. WHEN a user navigates to `/doctor/privacy-engine`, THE `HealthSphere` SHALL render the `Module_UI` within the Doctor Portal Shell (sidebar + topbar), consistent with other dashboard routes such as `/doctor/overview`.
3. THE `Doctor_Layout` SHALL include `/doctor/privacy-engine` in its `DASHBOARD_ROUTES` array so that the Shell is applied to the Privacy Engine page.
4. IF the `Module_UI` component throws a render error, THEN THE `Privacy_Engine_Page` SHALL display a fallback error boundary message without crashing the rest of the HealthSphere application.

---

### Requirement 3: Backend Endpoint Isolation

**User Story:** As a Developer, I want the Privacy Engine to use only its own backend endpoints, so that existing HealthSphere APIs remain unmodified and unaffected.

#### Acceptance Criteria

1. THE `Privacy_Engine` SHALL communicate exclusively with the `Generate_Endpoint` (`/generate`), `Compare_Endpoint` (`/compare`), and `Download_Endpoint` (`/download`) for all its operations.
2. THE `HealthSphere` backend (`backend/src/index.ts`) SHALL NOT be modified to add, remove, or alter any existing route registrations as part of this integration.
3. THE `Privacy_Engine` SHALL NOT import or invoke any existing HealthSphere API utility, controller, or service module.
4. IF the `Generate_Endpoint`, `Compare_Endpoint`, or `Download_Endpoint` returns an HTTP error status, THEN THE `Module_UI` SHALL display a descriptive error message to the user without crashing the HealthSphere application.

---

### Requirement 4: Optional Database Connection

**User Story:** As a Developer, I want the Privacy Engine to optionally fetch real patient data from the HealthSphere database, so that synthetic data generation is based on actual data distributions when a DB connection is available.

#### Acceptance Criteria

1. WHERE a HealthSphere database connection is available, THE `DB_Adapter` SHALL replace the Privacy Engine's mock `fetch_data()` function with a read-only query against the existing HealthSphere MongoDB collections.
2. THE `DB_Adapter` SHALL NOT modify any existing MongoDB collection schema, add new collections, or alter any existing HealthSphere database query.
3. THE `DB_Adapter` SHALL NOT modify any existing HealthSphere controller, model, or service file.
4. IF the database query in the `DB_Adapter` fails, THEN THE `Privacy_Engine` SHALL fall back to the mock `fetch_data()` implementation and log the error without surfacing it to the end user as a fatal failure.
5. WHERE a HealthSphere database connection is not available or not configured, THE `Privacy_Engine` SHALL operate using the mock `fetch_data()` implementation without any degradation of core functionality.

---

### Requirement 5: UI Consistency

**User Story:** As a User, I want the Privacy Engine interface to look and feel like the rest of HealthSphere, so that the experience is seamless and visually coherent.

#### Acceptance Criteria

1. THE `Module_UI` SHALL use the Light_Theme: white or light-gray backgrounds (`#FFFFFF`, `#F8FAFC`), `Inter` font family, and spacing consistent with existing HealthSphere dashboard pages.
2. THE `Module_UI` SHALL use `lucide-react` icons where icons are required, consistent with the icon library used throughout HealthSphere.
3. THE `Module_UI` SHALL NOT introduce dark-mode-only styles or CSS that conflicts with HealthSphere's global stylesheet (`globals.css`).
4. THE `Module_UI` SHALL NOT import or bundle a separate CSS framework or design system that overrides HealthSphere's existing Tailwind CSS v4 configuration.
5. WHEN the `Module_UI` is rendered inside the Doctor Portal Shell, THE layout SHALL NOT overflow, break, or obscure the Sidebar or Topbar components.

---

### Requirement 6: Access Control (Optional)

**User Story:** As an Administrator, I want the Privacy Engine to be accessible only to authorized users, so that sensitive synthetic data operations are protected from unauthorized access.

#### Acceptance Criteria

1. WHERE access control is enabled, THE `Privacy_Engine_Page` SHALL verify that the currently authenticated user has the `Doctor_Role` before rendering the `Module_UI`.
2. WHERE access control is enabled, WHEN a user without the `Doctor_Role` navigates to `/doctor/privacy-engine`, THE `Privacy_Engine_Page` SHALL redirect the user to `/login`.
3. WHERE access control is enabled, THE access check SHALL use the existing HealthSphere authentication pattern: reading `role` from the `localStorage` `"user"` key and validating Firebase Auth state via `onAuthStateChanged`.
4. WHERE access control is enabled, THE `Privacy_Engine_Page` SHALL NOT introduce a new authentication mechanism, middleware, or token system separate from the existing HealthSphere auth flow.

---

### Requirement 7: End-to-End Flow Verification

**User Story:** As a Doctor, I want to complete the full Privacy Engine workflow from within HealthSphere, so that I can generate synthetic data, compare it, and download a report without leaving the portal.

#### Acceptance Criteria

1. WHEN a Doctor navigates to `/doctor/privacy-engine` from the Sidebar, THE `Module_UI` SHALL load and render without errors within the Doctor Portal Shell.
2. WHEN a Doctor clicks the "Generate" action in the `Module_UI`, THE `Privacy_Engine` SHALL send a request to the `Generate_Endpoint` and display the resulting synthetic data table in the `Module_UI`.
3. WHEN a Doctor clicks the "Compare" action in the `Module_UI`, THE `Privacy_Engine` SHALL send a request to the `Compare_Endpoint` and display the comparison results in the `Module_UI`.
4. WHEN a Doctor clicks the "Download" action in the `Module_UI`, THE `Privacy_Engine` SHALL send a request to the `Download_Endpoint` and initiate a file download in the browser.
5. IF any step in the flow (Generate → Compare → Download) fails due to a network or server error, THEN THE `Module_UI` SHALL display a descriptive inline error message and allow the Doctor to retry the failed action.
