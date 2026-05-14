/**
 * Pure Role_Router decision function.
 *
 * Inputs are a URL pathname and the current session. Output is the path the
 * router should navigate to, or `null` to stay on `pathname`.
 *
 * This module has no React imports and no side effects so it can be unit- and
 * property-tested in isolation (design §Role_Router, Property P10).
 *
 * The decision table (R0–R6) from the design is evaluated top-to-bottom; the
 * first matching clause wins. This priority ordering is what makes the
 * profile-setup gate fire before the hospital-setup gate (Req 3.6).
 */

export type Session = {
  /**
   * User's authentication role (not to be confused with `doctorRole`).
   * Patient sessions are out of scope for this router (Req 11.5).
   */
  role: "patient" | "doctor";
  isProfileCompleted: boolean;
  /** HOSP-NNNNN when linked, null when no hospital yet. */
  hospitalId: string | null;
  /** ADMIN / DOCTOR for linked doctors, null when no hospital yet. */
  doctorRole: "ADMIN" | "DOCTOR" | null;
};

const SETUP_PROFILE   = "/doctor/setup-profile";
const SETUP_HOSPITAL  = "/doctor/setup-hospital";
const OVERVIEW        = "/doctor/overview";

/**
 * Return the target path for the current session + pathname, or null if the
 * user should stay where they are.
 *
 * Fixed-point guarantee (Req 8.6, Property P10): for every pair of (pathname,
 * session), applying this function twice produces the same result as applying
 * it once. See design §Role_Router "Fixed-point / idempotence argument".
 */
export function decideTarget(
  pathname: string,
  session: Session
): string | null {
  // R0 — patient sessions are handled by their own routes, not this router.
  if (session.role !== "doctor") return null;

  // R1 — profile not yet completed → force setup-profile.
  if (session.isProfileCompleted === false) {
    return pathname === SETUP_PROFILE ? null : SETUP_PROFILE;
  }

  // R5 — profile completed but still on setup-profile → advance to overview.
  if (pathname === SETUP_PROFILE && session.isProfileCompleted === true) {
    return OVERVIEW;
  }

  // R2 — profile OK but no hospital yet → force setup-hospital.
  if (session.hospitalId === null) {
    return pathname === SETUP_HOSPITAL ? null : SETUP_HOSPITAL;
  }

  // R3 — hospital now linked but user is stuck on setup-hospital → advance.
  if (pathname === SETUP_HOSPITAL && session.hospitalId !== null) {
    return OVERVIEW;
  }

  // R4 — non-admins cannot access admin routes.
  if (pathname.startsWith("/doctor/admin") && session.doctorRole !== "ADMIN") {
    return OVERVIEW;
  }

  // R6 — stay put.
  return null;
}
