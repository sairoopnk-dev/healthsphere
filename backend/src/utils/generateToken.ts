import jwt from 'jsonwebtoken';
import { Response } from 'express';

const generateToken = (res: Response, userId: string, role: 'patient' | 'doctor') => {
  const token = jwt.sign({ userId, role }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',   // 'strict' blocks cross-origin cookie sending (e.g. localhost:3000 → localhost:5000)
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

export default generateToken;
