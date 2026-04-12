import { Injectable, OnModuleInit } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { env } from '../env';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabaseAdmin!: SupabaseClient;

  onModuleInit() {
    this.supabaseAdmin = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  getAdminClient() {
    return this.supabaseAdmin;
  }
}
