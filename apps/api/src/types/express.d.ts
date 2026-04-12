export interface SupabaseUser {
  id: string; // Supabase User ID (UUID)
  email: string;
  role: string; // 'authenticated'
}

declare global {
  namespace Express {
    export interface Request {
      user: SupabaseUser | null;
    }
  }
}
