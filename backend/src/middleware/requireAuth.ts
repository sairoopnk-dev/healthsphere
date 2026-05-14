import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Auth-aware request type. The `auth` field is populated by the `requireAuth`
 * middleware when a valid JWT cookie is present.
 *
 * Scoped to `/api/hospital/*` for now (design §Components and Interfaces →
 * requireAuth.ts and design §Backward Compatibility). Extending to other
 * namespaces would be additive and is out of scope for this feature.
 */
export interface AuthedRequest extends Request {
  auth?: {
    userId: string;
    role: 'patient' | 'doctor';
  };
}

interface JwtPayload {
  userId: string;
  role: 'patient' | 'doctor';
}

/**
 * Gate middleware for hospital routes.
 *
 * Reads the `jwt` cookie set by `generateToken.ts`, verifies it against
 * `JWT_SECRET` (falling back to `'secret'` to match the signing side), and
 * attaches the decoded `{ userId, role }` to `req.auth`.
 *
 * Returns HTTP 401 `{ message: 'Not authorized' }` when the cookie is missing
 * or fails verification (Req 9.6).
 */
export const requireAuth = (
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.cookies?.jwt;
  if (!token) {
    res.status(401).json({ message: 'Not authorized' });
    return;
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as JwtPayload;
    req.auth = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized' });
  }
};

export default requireAuth;
