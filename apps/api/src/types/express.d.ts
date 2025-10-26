// import { DecodedIdToken } from 'firebase-admin/auth'; // Remove this

// This will be the shape of the user object from the Supabase JWT
export interface SupabaseUser {
  id: string; // Supabase User ID (UUID)
  email: string;
  role: string; // 'authenticated'
  // Add any other properties from the JWT you might need
}

declare global {
  namespace Express {
    export interface Request {
      // user: DecodedIdToken | null; // Remove this
      user: SupabaseUser | null; // Add this
    }
  }
}