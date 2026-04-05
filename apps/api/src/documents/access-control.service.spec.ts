import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from './access-control.service';
import { TRPCError } from '@trpc/server';
import { Role } from '@prisma/client';

describe('AccessControlService', () => {
  let service: AccessControlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccessControlService],
    }).compile();

    service = module.get<AccessControlService>(AccessControlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkPermission', () => {
    it('should return false if user or roles are missing', () => {
      expect(service.checkPermission(undefined, 'canManageUsers')).toBe(false);
      expect(service.checkPermission({} as any, 'canManageUsers')).toBe(false);
      expect(service.checkPermission({ roles: [] }, 'canManageUsers')).toBe(
        false,
      );
    });

    it('should return true if any role has the requested permission', () => {
      const user = {
        roles: [
          { canManageUsers: false } as Role,
          { canManageUsers: true } as Role,
        ],
      };
      expect(service.checkPermission(user, 'canManageUsers')).toBe(true);
    });

    it('should return false if no role has the requested permission', () => {
      const user = {
        roles: [
          { canManageUsers: false } as Role,
          { canManageUsers: false } as Role,
        ],
      };
      expect(service.checkPermission(user, 'canManageUsers')).toBe(false);
    });

    it('should return true for any permission if user has a role with canManageInstitution', () => {
      const user = {
        roles: [
          { canManageInstitution: true, canManageDocuments: false } as Role,
        ],
      };
      expect(service.checkPermission(user, 'canManageDocuments')).toBe(true);
      expect(service.checkPermission(user, 'canManageUsers')).toBe(true);
    });
  });

  describe('requirePermission', () => {
    it('should not throw if checkPermission returns true', () => {
      const user = {
        roles: [{ canManageUsers: true } as Role],
      };
      expect(() =>
        service.requirePermission(user, 'canManageUsers'),
      ).not.toThrow();
    });

    it('should throw TRPCError if checkPermission returns false', () => {
      const user = {
        roles: [{ canManageUsers: false } as Role],
      };
      try {
        service.requirePermission(user, 'canManageUsers');
        fail('Should have thrown an error');
      } catch (err: any) {
        expect(err).toBeInstanceOf(TRPCError);
        expect(err.code).toBe('FORBIDDEN');
        expect(err.message).toBe(
          'You do not have permission to canManageUsers.',
        );
      }
    });
  });

  describe('generateAclWhereClause', () => {
    it('should generate a correct where clause with no extra fields', () => {
      const result = service.generateAclWhereClause({
        id: 'user-1',
      });
      expect(result).toEqual({
        documentAccesses: {
          some: {
            OR: [{ userId: 'user-1' }],
          },
        },
      });
    });

    it('should add READ permission by default or WRITE if specified', () => {
      const resultWrite = service.generateAclWhereClause(
        { id: 'user-1' },
        'WRITE',
      );
      expect(resultWrite).toEqual({
        documentAccesses: {
          some: {
            OR: [{ userId: 'user-1' }],
            permission: 'WRITE',
          },
        },
      });
    });

    it('should build full OR clauses based on user context', () => {
      const result = service.generateAclWhereClause({
        id: 'user-1',
        institutionId: 'inst-1',
        campusId: 'camp-1',
        departmentId: 'dept-1',
        roles: [{ id: 'role-1' }, { id: 'role-2' }],
      });

      expect(result).toEqual({
        documentAccesses: {
          some: {
            OR: [
              { userId: 'user-1' },
              { institutionId: 'inst-1' },
              { campusId: 'camp-1' },
              { departmentId: 'dept-1' },
              { roleId: { in: ['role-1', 'role-2'] } },
            ],
          },
        },
      });
    });
  });
});
