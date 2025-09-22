import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';
import type { AuthObject, ClerkClient as ClerkClientType } from '@clerk/backend';
import type { Request } from 'express';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export interface Context {
  prisma: PrismaClient;
  auth: AuthObject;
  clerk: ClerkClientType;
}

const prisma = new PrismaClient();

export function createContext({ req }: { req: Request }): Context {
  const auth = req.auth; 
  
  return {
    prisma,
    auth,
    clerk: clerkClient,
  };
}

