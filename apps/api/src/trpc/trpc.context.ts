import { PrismaClient } from '@prisma/client';
// 1. The problematic 'Clerk' type import is no longer needed and has been removed.
// import type { Clerk } from '@clerk/backend';
import { clerkClient } from '@clerk/clerk-sdk-node';

// 2. The Context interface now uses 'typeof' to get the exact type
//    of the 'clerkClient' object. This is the correct and safe way to do this.
export interface Context {
  prisma: PrismaClient;
  clerk: typeof clerkClient;
}

const prisma = new PrismaClient();

// The return type annotation now correctly matches the interface.
export function createContext(): Context {
  return {
    prisma,
    clerk: clerkClient,
  };
}

