# Requirements Document

## Introduction

This feature extends the existing HealthSphere Doctor Dashboard with a multi-phase onboarding flow that introduces hospitals, doctor-to-hospital linkage, and an Admin vs Doctor role model. The flow covers:

1. Exposing a unique Doctor ID at registration and on the Doctor Dashboard.
2. A one-time hospital setup screen for doctors who do not yet belong to a hospital.
3. A create-hospital form (name, location via map picker, address).
4. Automatic promotion of the hospital creator to the ADMIN role, and assignment of the DOCTOR role to teammates added by that admin.
5. An Admin Dashboard that lists the hospital's doctors and supports adding doctors by Doctor ID.
6. A role-aware post-login router and an admin-only view toggle between Admin and Doctor dashboards.

The feature must extend the existing Next.js App Router frontend (`frontend/src/app/doctor/`) and Express/Mongoose backend (`backend/src/`) without breaking existing authentication, profile-setup, appointment, or saved-patients functionality.

## Glossary

- **HealthSphere_Backend**: The Express/Mongoose API server located at `backend/src/`.
- **HealthSphere_Frontend**: The Next.js App Router client located at `frontend/src/app/`.
- **Doctor_Registration_Service**: The backend module that handles `POST /api/auth/doctor/register` (existing `registerDoctor` in `authController.ts`).
- **Auth_Service**: The backend module that handles `POST /api/auth/login` (existing `loginUser` in `authController.ts`).
- **Hospital_Service**: The new backend module that handles hospital creation, doctor addition, and doctor listing (new `hospitalController.ts` and `/api/hospital/*` routes).
- **Doctor_Record**: A single document in the MongoDB `doctors` collection, represented by the `Doctor` model.
- **Hospital_Record**: A single document in the new MongoDB `hospitals` collection, represented by a new `Hospital` model.
- **Doctor_ID**: A unique public identifier assigned to each Doctor_Record at registration, in the format `DOC-NNNNN` where `N` is a digit (existing `doctorId` field).
- **Hospital_ID**: A unique public identifier assigned to each Hospital_Record at creation, in the format `HOSP-NNNNN` where `N` is a digit.
- **Role**: An enumerated field on Doctor_Record with the values `ADMIN` or `DOCTOR`. A Doctor_Record without a Hospital_ID has no Role assigned.
- **Hospital_Setup_Screen**: The new Next.js page at `/doctor/setup-hospital` used for one-time hospital creation.
- **Create_Hospital_Form**: The form component rendered on Hospital_Setup_Screen that captures name, coordinates, and address.
- **Map_Picker**: The `@react-google-maps/api` component used to pick latitude/longitude on Create_Hospital_Form.
- **Use_Current_Location_Button**: A control on Create_Hospital_Form that populates coordinates from the browser Geolocation API.
- **Role_Router**: The client-side logic in the doctor layout/context that routes authenticated doctors to the correct screen after login.
- **Doctor_Dashboard**: The existing doctor workspace at `/doctor/overview`, `/doctor/weeklyschedule`, `/doctor/patientrecords`, `/doctor/clinic`.
- **Admin_Dashboard**: The new doctor workspace at `/doctor/admin` (and subroutes) showing hospital info, doctor list, and add-doctor controls.
- **Role_Toggle**: The new UI control in the doctor topbar that lets an ADMIN switch between Admin_Dashboard and Doctor_Dashboard views.
- **Registration_Success_Screen**: The UI state shown immediately after successful doctor registration that displays the newly generated Doctor_ID.
- **Doctor_Profile_Panel**: The doctor profile area (sidebar header and profile cards) that surfaces the logged-in doctor's Doctor_ID.

## Requirements

### Requirement 1: Unique Doctor ID generation and display

**User Story:** As a newly registered doctor, I want a unique Doctor ID to be issued and visibly surfaced, so that I can share it with hospital admins who need to add me to their hospital.

#### Acceptance Criteria

1. WHEN a doctor submits a valid registration payload to `POST /api/auth/doctor/register`, THE Doctor_Registration_Service SHALL generate a Doctor_ID that matches the regular expression `^DOC-\d{5}$`.
2. WHEN a doctor submits a valid registration payload to `POST /api/auth/doctor/register`, THE Doctor_Registration_Service SHALL persist the Doctor_ID on the created Doctor_Record in the `doctorId` field with a unique index.
3. WHEN `POST /api/auth/doctor/register` succeeds, THE Doctor_Registration_Service SHALL return a JSON body containing the Doctor_ID under the key `id`.
4. IF the generated Doctor_ID collides with an existing `doctorId` value, THEN THE Doctor_Registration_Service SHALL generate a new Doctor_ID and retry persistence up to 5 times before returning HTTP 500 with message `Doctor ID generation failed`.
5. WHEN the Registration_Success_Screen is rendered after a successful registration response, THE HealthSphere_Frontend SHALL display the returned Doctor_ID as text within the screen.
6. WHEN the Doctor_Profile_Panel is rendered for an authenticated doctor, THE HealthSphere_Frontend SHALL display the Doctor_ID of that doctor.
7. WHEN a lookup request is made with a Doctor_ID to `POST /api/hospital/add-doctor`, THE Hospital_Service SHALL locate the corresponding Doctor_Record by exact match on the `doctorId` field.

### Requirement 2: Hospital data model

**User Story:** As a system maintainer, I want hospitals to be stored as first-class records with their own identifier and coordinates, so that doctors can be linked to a hospital by a stable reference.

#### Acceptance Criteria

1. THE Hospital_Service SHALL persist Hospital_Records in a MongoDB collection named `hospitals`.
2. THE Hospital_Service SHALL store each Hospital_Record with the fields `hospitalId` (string), `name` (string), `latitude` (number), `longitude` (number), `address` (string), `createdBy` (string, storing the creator's Doctor_ID), `createdAt` (Date), and `updatedAt` (Date).
3. THE Hospital_Service SHALL enforce a unique index on the `hospitalId` field.
4. WHEN a Hospital_Record is created, THE Hospital_Service SHALL generate a Hospital_ID that matches the regular expression `^HOSP-\d{5}$`.
5. IF a generated Hospital_ID collides with an existing `hospitalId` value, THEN THE Hospital_Service SHALL generate a new Hospital_ID and retry persistence up to 5 times before returning HTTP 500 with message `Hospital ID generation failed`.
6. THE HealthSphere_Backend SHALL add two new fields to the Doctor_Record schema: `hospitalId` (string, nullable, default null) and `role` (string enum with allowed values `ADMIN` and `DOCTOR`, nullable, default null).
7. WHERE a Doctor_Record already exists before this feature is deployed, THE HealthSphere_Backend SHALL treat the absent `hospitalId` and absent `role` fields as `null` without requiring a data migration.

### Requirement 3: First-time hospital setup redirect

**User Story:** As a doctor who has not yet joined a hospital, I want to be guided to a dedicated setup screen after login, so that I can create my hospital before reaching the dashboard.

#### Acceptance Criteria

1. WHEN a doctor authenticates successfully through `POST /api/auth/login`, THE Auth_Service SHALL include the fields `hospitalId` and `role` from the Doctor_Record in the login response body.
2. WHEN an authenticated doctor's client session has `isProfileCompleted` equal to `true` and `hospitalId` equal to `null`, THE Role_Router SHALL navigate the browser to the path `/doctor/setup-hospital`.
3. WHILE a doctor's Doctor_Record has `hospitalId` equal to `null`, THE HealthSphere_Frontend SHALL prevent navigation to `/doctor/overview`, `/doctor/weeklyschedule`, `/doctor/patientrecords`, and `/doctor/clinic` by redirecting such navigation attempts to `/doctor/setup-hospital`.
4. WHEN a doctor's Doctor_Record transitions from `hospitalId` equal to `null` to a non-null Hospital_ID, THE Role_Router SHALL navigate the browser to `/doctor/overview` on the next render cycle.
5. WHILE a doctor's Doctor_Record has a non-null `hospitalId`, THE HealthSphere_Frontend SHALL prevent navigation to `/doctor/setup-hospital` by redirecting such navigation attempts to `/doctor/overview`.
6. WHEN a doctor's session has `isProfileCompleted` equal to `false`, THE Role_Router SHALL navigate the browser to `/doctor/setup-profile` and SHALL NOT evaluate the hospital setup condition until profile setup completes.

### Requirement 4: Hospital creation form

**User Story:** As a doctor who does not yet have a hospital, I want to create my hospital by entering a name, selecting a location on a map, and confirming an address, so that my clinic is registered in the system.

#### Acceptance Criteria

1. THE Hospital_Setup_Screen SHALL render a Create_Hospital_Form containing a text input for `Clinic/Hospital Name`, a Map_Picker with latitude/longitude state, a Use_Current_Location_Button, a textarea for `Address`, and a submit button labeled `Create Hospital`.
2. WHEN the Use_Current_Location_Button is clicked and the browser Geolocation API returns coordinates within 15 seconds, THE Create_Hospital_Form SHALL set the Map_Picker marker to the returned latitude and longitude.
3. IF the browser Geolocation API denies permission or fails within 15 seconds, THEN THE Create_Hospital_Form SHALL display an inline error message containing the text `Unable to access current location` and SHALL leave the existing Map_Picker marker unchanged.
4. WHEN the submit button is clicked, THE Create_Hospital_Form SHALL send a `POST` request to `/api/hospital/create` with a JSON body containing `name`, `latitude`, `longitude`, `address`, and `createdBy` where `createdBy` equals the authenticated doctor's Doctor_ID.
5. IF the request body to `POST /api/hospital/create` is missing any of the fields `name`, `latitude`, `longitude`, `address`, or `createdBy`, THEN THE Hospital_Service SHALL return HTTP 400 with a JSON body containing a `message` field that names the missing field.
6. IF `latitude` is outside the inclusive range -90 to 90 or `longitude` is outside the inclusive range -180 to 180 in the `POST /api/hospital/create` request body, THEN THE Hospital_Service SHALL return HTTP 400 with message `Invalid coordinates`.
7. IF the `createdBy` Doctor_ID in a `POST /api/hospital/create` request does not match any Doctor_Record, THEN THE Hospital_Service SHALL return HTTP 404 with message `Doctor not found`.
8. IF the Doctor_Record identified by `createdBy` in a `POST /api/hospital/create` request already has a non-null `hospitalId`, THEN THE Hospital_Service SHALL return HTTP 409 with message `Doctor already belongs to a hospital` and SHALL NOT create a new Hospital_Record.
9. WHEN `POST /api/hospital/create` passes all validation, THE Hospital_Service SHALL create a Hospital_Record, set the creator Doctor_Record's `hospitalId` to the new Hospital_ID, set the creator Doctor_Record's `role` to `ADMIN`, and return HTTP 201 with the created Hospital_Record in the response body.
10. WHEN `POST /api/hospital/create` returns HTTP 201 on the client, THE HealthSphere_Frontend SHALL update the stored client session so that `hospitalId` equals the new Hospital_ID and `role` equals `ADMIN`, and SHALL navigate to `/doctor/overview`.

### Requirement 5: Admin-only role toggle

**User Story:** As a doctor who is also a hospital admin, I want a visible toggle between Admin and Doctor views, so that I can manage my hospital without losing access to my own clinical dashboard.

#### Acceptance Criteria

1. WHILE a doctor's session has `role` equal to `ADMIN`, THE HealthSphere_Frontend SHALL render the Role_Toggle in the doctor topbar with two options labeled `Admin` and `Doctor`.
2. WHILE a doctor's session has `role` equal to `DOCTOR`, THE HealthSphere_Frontend SHALL NOT render the Role_Toggle.
3. WHILE a doctor's session has `role` equal to `null`, THE HealthSphere_Frontend SHALL NOT render the Role_Toggle.
4. WHEN the `Admin` option of the Role_Toggle is selected, THE Role_Router SHALL navigate the browser to `/doctor/admin`.
5. WHEN the `Doctor` option of the Role_Toggle is selected, THE Role_Router SHALL navigate the browser to `/doctor/overview`.
6. WHILE the browser path starts with `/doctor/admin`, THE Role_Toggle SHALL visually indicate `Admin` as the active option.
7. WHILE the browser path starts with `/doctor/overview`, `/doctor/weeklyschedule`, `/doctor/patientrecords`, or `/doctor/clinic`, THE Role_Toggle SHALL visually indicate `Doctor` as the active option.
8. IF a browser requests any path starting with `/doctor/admin` while the session's `role` is not `ADMIN`, THEN THE HealthSphere_Frontend SHALL redirect to `/doctor/overview`.

### Requirement 6: Admin Dashboard — hospital information and doctor list

**User Story:** As a hospital admin, I want to see my hospital's information and the list of doctors assigned to my hospital, so that I can confirm who is part of my clinic.

#### Acceptance Criteria

1. WHEN the Admin_Dashboard is rendered, THE HealthSphere_Frontend SHALL send a `GET` request to `/api/hospital/:hospitalId` using the admin's Hospital_ID and display the returned `name`, `address`, `latitude`, and `longitude`.
2. WHEN the Admin_Dashboard is rendered, THE HealthSphere_Frontend SHALL send a `GET` request to `/api/hospital/doctors?hospitalId=<id>` and display each returned doctor's Doctor_ID, name, specialization, and role in a list.
3. THE Hospital_Service SHALL respond to `GET /api/hospital/doctors?hospitalId=<id>` with an HTTP 200 JSON array containing every Doctor_Record whose `hospitalId` field equals the query value.
4. IF a `GET /api/hospital/doctors` request is made without a `hospitalId` query parameter, THEN THE Hospital_Service SHALL return HTTP 400 with message `hospitalId is required`.
5. WHEN the Admin_Dashboard's hospital info request returns HTTP 404, THE HealthSphere_Frontend SHALL display a message containing the text `Hospital not found` and SHALL hide the doctor list.

### Requirement 7: Admin adds a doctor by Doctor ID

**User Story:** As a hospital admin, I want to add an existing registered doctor to my hospital by entering their Doctor ID, so that the doctor can start using the dashboard under my hospital without repeating hospital setup.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL render an `Add Doctor` form with a text input labeled `Doctor ID` and a submit button labeled `Add Doctor`.
2. WHEN the `Add Doctor` form is submitted, THE HealthSphere_Frontend SHALL send a `POST` request to `/api/hospital/add-doctor` with a JSON body containing `hospitalId` (the admin's Hospital_ID), `adminDoctorId` (the admin's Doctor_ID), and `doctorId` (the value from the input).
3. IF the submitted `doctorId` in `POST /api/hospital/add-doctor` does not match any Doctor_Record, THEN THE Hospital_Service SHALL return HTTP 404 with message `Doctor ID not found`.
4. IF the Doctor_Record referenced by `adminDoctorId` in `POST /api/hospital/add-doctor` does not have `role` equal to `ADMIN` or does not have `hospitalId` equal to the `hospitalId` in the request body, THEN THE Hospital_Service SHALL return HTTP 403 with message `Only the hospital admin can add doctors`.
5. IF the Doctor_Record referenced by `doctorId` already has a non-null `hospitalId` that differs from the `hospitalId` in `POST /api/hospital/add-doctor`, THEN THE Hospital_Service SHALL return HTTP 409 with message `Doctor already belongs to another hospital` and SHALL NOT modify the Doctor_Record.
6. WHEN `POST /api/hospital/add-doctor` passes all validation, THE Hospital_Service SHALL set the target Doctor_Record's `hospitalId` to the request body's `hospitalId`, set the target Doctor_Record's `role` to `DOCTOR`, and return HTTP 200 with the updated Doctor_Record in the response body.
7. WHEN `POST /api/hospital/add-doctor` returns HTTP 200 on the client, THE Admin_Dashboard SHALL refresh the displayed doctor list by reissuing `GET /api/hospital/doctors?hospitalId=<id>`.
8. WHERE the target Doctor_Record already has `hospitalId` equal to the request body's `hospitalId`, THE Hospital_Service SHALL return HTTP 200 without modifying the Doctor_Record (idempotent re-add).

### Requirement 8: Role-based post-login routing

**User Story:** As a doctor or admin logging in, I want to land on the correct screen for my role without any manual navigation, so that the application feels coherent and predictable.

#### Acceptance Criteria

1. WHEN a login response from `POST /api/auth/login` has `isProfileCompleted` equal to `false`, THE Role_Router SHALL navigate the browser to `/doctor/setup-profile`.
2. WHEN a login response from `POST /api/auth/login` has `isProfileCompleted` equal to `true` and `hospitalId` equal to `null`, THE Role_Router SHALL navigate the browser to `/doctor/setup-hospital`.
3. WHEN a login response from `POST /api/auth/login` has `isProfileCompleted` equal to `true`, a non-null `hospitalId`, and `role` equal to `DOCTOR`, THE Role_Router SHALL navigate the browser to `/doctor/overview`.
4. WHEN a login response from `POST /api/auth/login` has `isProfileCompleted` equal to `true`, a non-null `hospitalId`, and `role` equal to `ADMIN`, THE Role_Router SHALL navigate the browser to `/doctor/overview`.
5. WHILE the client session's `role` equals `DOCTOR`, THE Role_Router SHALL redirect any navigation attempt to a path starting with `/doctor/admin` to `/doctor/overview`.
6. WHILE evaluating the post-login route, THE Role_Router SHALL NOT enter a navigation loop by ensuring that each redirect in this requirement is reachable in at most one navigation step from any of the paths `/login`, `/doctor/setup-profile`, `/doctor/setup-hospital`, `/doctor/overview`, and `/doctor/admin`.

### Requirement 9: Hospital API contract

**User Story:** As a frontend developer, I want a stable set of hospital endpoints, so that the onboarding UI can be implemented against a known contract.

#### Acceptance Criteria

1. THE HealthSphere_Backend SHALL expose `POST /api/hospital/create` that accepts the body defined in Requirement 4.4 and responds per Requirements 4.5 through 4.9.
2. THE HealthSphere_Backend SHALL expose `POST /api/hospital/add-doctor` that accepts the body defined in Requirement 7.2 and responds per Requirements 7.3 through 7.8.
3. THE HealthSphere_Backend SHALL expose `GET /api/hospital/doctors` that accepts the query defined in Requirement 6.3 and responds per Requirements 6.3 and 6.4.
4. THE HealthSphere_Backend SHALL expose `GET /api/hospital/:hospitalId` that returns HTTP 200 with the Hospital_Record when a matching `hospitalId` exists, or HTTP 404 with message `Hospital not found` when no match exists.
5. THE HealthSphere_Backend SHALL register the hospital routes in `backend/src/index.ts` under the base path `/api/hospital`.
6. THE Hospital_Service SHALL reject every request to `/api/hospital/*` that does not carry a valid authenticated session cookie by returning HTTP 401 with message `Not authorized`.

### Requirement 10: Location picker and onboarding UX

**User Story:** As a first-time admin doctor, I want the hospital setup UI to be clear and easy to use, so that I can complete onboarding without confusion.

#### Acceptance Criteria

1. THE Hospital_Setup_Screen SHALL render a heading with the text `Create Your Clinic` and a one-sentence instructional subtitle.
2. WHILE Create_Hospital_Form is not fully populated with a non-empty `name`, a latitude and longitude pair, and a non-empty `address`, THE Create_Hospital_Form SHALL render its submit button in a disabled state.
3. WHILE a `POST /api/hospital/create` request is in flight, THE Create_Hospital_Form SHALL render its submit button in a disabled state and SHALL display a loading indicator with the text `Creating hospital`.
4. WHEN the Map_Picker marker is moved by dragging, THE Create_Hospital_Form SHALL update its latitude and longitude state to match the marker's new position.
5. WHERE the `@react-google-maps/api` library fails to load within 10 seconds, THE Hospital_Setup_Screen SHALL display a fallback message containing the text `Map failed to load` and SHALL keep the latitude and longitude inputs editable as numeric fields.
6. THE Role_Toggle SHALL be rendered with a minimum clickable area of 44 by 44 CSS pixels for each option.

### Requirement 11: Backward compatibility with existing flows

**User Story:** As an existing HealthSphere user, I want my current authentication, profile setup, appointment, and saved-patient flows to keep working, so that onboarding changes do not regress features I already rely on.

#### Acceptance Criteria

1. THE HealthSphere_Backend SHALL preserve the existing request and response shapes of `POST /api/auth/doctor/register`, `POST /api/auth/patient/register`, `POST /api/auth/login`, and `POST /api/auth/logout` except for the additive response fields introduced in Requirements 1.3, 3.1, and 8.
2. THE HealthSphere_Backend SHALL preserve the existing behavior of every route under `/api/doctor/*`, `/api/appointments/*`, `/api/patient/*`, `/api/prescriptions/*`, `/api/medical-records/*`, and `/api/notifications/*`.
3. WHERE an existing Doctor_Record has `hospitalId` equal to `null` after this feature is deployed, THE Role_Router SHALL route that doctor through the Hospital_Setup_Screen on the next login as specified in Requirement 3.
4. THE HealthSphere_Frontend SHALL preserve the existing `/doctor/setup-profile`, `/doctor/overview`, `/doctor/weeklyschedule`, `/doctor/patientrecords`, and `/doctor/clinic` pages and SHALL NOT remove any component exported from `frontend/src/app/doctor/_components/`.
5. WHEN a patient user authenticates through `POST /api/auth/login`, THE Role_Router SHALL route the patient per the existing rules without evaluating `hospitalId` or `role`.
