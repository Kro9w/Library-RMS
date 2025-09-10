// src/auth/clerk.ts
import * as Clerk from '@clerk/clerk-sdk-node';
import type { Request } from 'express';

export async function getUserFromReq(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return { userId: null };

  const token = authHeader.slice('Bearer '.length);

  try {
    // verify the session token
    const session = await Clerk.verifyToken(token, {});

    return { userId: session.userId };
  } catch (err) {
    console.error('Clerk token verification failed', err);
    return { userId: null };
  }
}