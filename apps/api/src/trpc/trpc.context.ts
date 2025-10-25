// apps/api/src/trpc/trpc.context.ts
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// import { getAuth } from '@clerk/clerk-sdk-node'; // Removed
import { FirebaseAdminService } from '../firebase/firebase-admin.service'; // Added
import { User } from '@prisma/client'; // Added
import * as trpcExpress from '@trpc/server/adapters/express';
import { DecodedIdToken } from 'firebase-admin/auth'; // Added

interface CreateContextOptions {
  req: trpcExpress.CreateExpressContextOptions['req'];
  res: trpcExpress.CreateExpressContextOptions['res'];
  prisma: PrismaService;
  firebaseAdmin: FirebaseAdminService; // Added
}

// Added new context interface
export interface TrpcContext {
  req: trpcExpress.CreateExpressContextOptions['req'];
  res: trpcExpress.CreateExpressContextOptions['res'];
  prisma: PrismaService;
  firebaseUser: DecodedIdToken | null; // Firebase user from token
  dbUser: User | null; // User from our database
}

export async function createContext(
  opts: CreateContextOptions,
): Promise<TrpcContext> {
  const { req, res, prisma, firebaseAdmin } = opts;

  let firebaseUser: DecodedIdToken | null = null;
  let dbUser: User | null = null;

  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split('Bearer ')[1];
    if (token) {
      try {
        firebaseUser = await firebaseAdmin.auth.verifyIdToken(token);
        if (firebaseUser) {
          // Find the user in our database
          dbUser = await prisma.user.findUnique({
            where: { firebaseUid: firebaseUser.uid },
          });
        }
      } catch (error) {
        // Token is invalid or expired
        console.warn('Invalid auth token:', (error as Error).message);
      }
    }
  }

  return {
    req,
    res,
    prisma,
    firebaseUser,
    dbUser,
  };
}

export function trpcContextFactory(app: INestApplication) {
  const prismaService = app.get(PrismaService);
  const firebaseAdminService = app.get(FirebaseAdminService); // Added
  return (opts: trpcExpress.CreateExpressContextOptions) => {
    return createContext({
      ...opts,
      prisma: prismaService,
      firebaseAdmin: firebaseAdminService, // Pass service to context
    });
  };
}