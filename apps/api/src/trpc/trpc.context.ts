import { Injectable, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseUser } from '../types/express';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { PrismaClient } from '@prisma/client';

export interface TrpcContext {
  req: Request;
  res: Response;
  user: SupabaseUser | null;
  prisma: PrismaClient;
  rolesService: RolesService;
}

@Injectable()
export class TrpcContextFactory {
  private readonly logger = new Logger(TrpcContextFactory.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
  ) {}

  async createContext(opts: {
    req: Request;
    res: Response;
  }): Promise<TrpcContext> {
    const { req, res } = opts;
    let user: SupabaseUser | null = null;
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.split('Bearer ')[1];
      if (token) {
        try {
          const { data, error } = await this.supabase
            .getAdminClient()
            .auth.getUser(token);

          if (error) {
            this.logger.warn('Invalid JWT:', error.message);
          } else if (data.user) {
            user = {
              id: data.user.id,
              email: data.user.email!,
              role: data.user.role!,
            };
            req.user = user;
          }
        } catch (error) {
          this.logger.error('Error validating token:', error);
        }
      }
    }

    return {
      req,
      res,
      user,
      prisma: this.prisma,
      rolesService: this.rolesService,
    };
  }
}