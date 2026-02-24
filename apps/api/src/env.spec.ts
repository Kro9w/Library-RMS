import { envSchema } from './env.schema';

describe('envSchema', () => {
  const validBaseEnv = {
    DATABASE_URL: 'http://localhost:5432',
    DIRECT_URL: 'http://localhost:5432',
    SUPABASE_URL: 'https://xyz.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'some-key',
  };

  it('should fail if NODE_ENV is production and CORS_ORIGINS is missing', () => {
    const result = envSchema.safeParse({
      ...validBaseEnv,
      NODE_ENV: 'production',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'CORS_ORIGINS must be set in production',
      );
    }
  });

  it('should pass if NODE_ENV is production and CORS_ORIGINS is provided', () => {
    const result = envSchema.safeParse({
      ...validBaseEnv,
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://example.com,https://api.example.com',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CORS_ORIGINS).toEqual([
        'https://example.com',
        'https://api.example.com',
      ]);
    }
  });

  it('should use localhost defaults in development if CORS_ORIGINS is missing', () => {
    const result = envSchema.safeParse({
      ...validBaseEnv,
      NODE_ENV: 'development',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CORS_ORIGINS).toEqual([
        'http://localhost:5173',
        'https://localhost:5173',
        'https://localhost:3000',
      ]);
    }
  });

  it('should use localhost defaults in test if CORS_ORIGINS is missing', () => {
    const result = envSchema.safeParse({
      ...validBaseEnv,
      NODE_ENV: 'test',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CORS_ORIGINS).toEqual([
        'http://localhost:5173',
        'https://localhost:5173',
        'https://localhost:3000',
      ]);
    }
  });

  it('should use provided origins in development if provided', () => {
    const result = envSchema.safeParse({
      ...validBaseEnv,
      NODE_ENV: 'development',
      CORS_ORIGINS: 'https://dev.example.com',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CORS_ORIGINS).toEqual(['https://dev.example.com']);
    }
  });
});
