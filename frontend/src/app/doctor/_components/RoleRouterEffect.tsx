"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDoctor } from "../_context/DoctorContext";
import { decideTarget, type Session } from "../_context/roleRouter";

/**
 * Mounts the Role_Router effect once inside DoctorProvider scope.
 *
 * Reads the current `doctor` (from DoctorContext) plus `pathname` and issues
 * at most one `router.replace` per state change. Returns null — it exists only
 * for its side effect.
 *
 * Design §Role_Router / "Implementation notes":
 *   - `router.replace` (not `push`) so redirects don't pollute history.
 *   - Dependency list includes every session field that affects the decision.
 *   - `DoctorProvider` gates rendering until `doctor` is populated, so this
 *     effect never fires with a partial session.
 */
export default function RoleRouterEffect(): null {
  const pathname = usePathname();
  const router   = useRouter();
  const { doctor } = useDoctor();

  useEffect(() => {
    if (!doctor) return;

    const session: Session = {
      role: "doctor",
      isProfileCompleted: Boolean(doctor.isProfileCompleted),
      hospitalId: doctor.hospitalId ?? null,
      doctorRole: doctor.doctorRole ?? null,
    };

    const target = decideTarget(pathname ?? "/", session);
    if (target && target !== pathname) {
      router.replace(target);
    }
  }, [
    pathname,
    doctor?.id,
    doctor?.hospitalId,
    doctor?.doctorRole,
    doctor?.isProfileCompleted,
    doctor,
    router,
  ]);

  return null;
}
