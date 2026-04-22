import { Test, TestingModule } from '@nestjs/testing';
import { RolesRouter } from './roles.router';
import { AccessControlService } from '../documents/access-control.service';
import { TRPCError } from '@trpc/server';

describe('RolesRouter', () => {
  let router: RolesRouter;
  let accessControlService: jest.Mocked<AccessControlService>;
  let prismaMock: any;

  beforeEach(async () => {
    accessControlService = {
      requirePermission: jest.fn(),
      checkPermission: jest.fn(),
      generateAclWhereClause: jest.fn(),
    } as any;

    prismaMock = {
      role: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesRouter,
        { provide: AccessControlService, useValue: accessControlService },
      ],
    }).compile();

    router = module.get<RolesRouter>(RolesRouter);
  });

  it('should be defined', () => {
    expect(router).toBeDefined();
  });

  const createContext = (dbUserOverrides: any = {}) => {
    return {
      prisma: prismaMock,
      user: { id: 'test-user-id' } as any,
      dbUser: { id: 'test-user-id', roles: [], departmentId: 'dept-1', ...dbUserOverrides } as any,
      session: {} as any,
    };
  };

  describe('createRole', () => {
    it('should throw an error if no departmentId is provided and user has no department', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'test-user-id', roles: [], departmentId: null });
      
      const trpcRouter = router.createRouter();
      const createRoleCaller = trpcRouter.createCaller(createContext({ departmentId: null }));

      await expect(
        createRoleCaller.createRole({ name: 'Test Role', level: 4 })
      ).rejects.toThrow(new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No Department ID found to create role under.',
      }));
    });

    it('should allow institution managers to create a role in any department', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'test-user-id', roles: [{ canManageInstitution: true }], departmentId: 'user-dept' });
      
      const trpcRouter = router.createRouter();
      const createRoleCaller = trpcRouter.createCaller(createContext({
        roles: [{ canManageInstitution: true }], 
        departmentId: 'user-dept'
      }));

      prismaMock.role.create.mockResolvedValue({ id: 'new-role' });

      await createRoleCaller.createRole({ 
        name: 'Test Role', 
        level: 4, 
        departmentId: 'target-dept' 
      });

      expect(prismaMock.role.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          departmentId: 'target-dept',
        }),
      }));
    });
  });

  describe('updateRole', () => {
    it('should prevent modifying executive roles (level 0)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'test-user-id', roles: [], departmentId: 'dept-1' });

      const trpcRouter = router.createRouter();
      const updateRoleCaller = trpcRouter.createCaller(createContext({ departmentId: 'dept-1' }));

      prismaMock.role.findUnique.mockResolvedValue({ id: 'role-1', level: 0, departmentId: 'dept-1' });

      await expect(
        updateRoleCaller.updateRole({ id: 'role-1', name: 'New Name' })
      ).rejects.toThrow(new TRPCError({
        code: 'FORBIDDEN',
        message: 'Executive roles cannot be modified.',
      }));
    });

    it('should prevent cross-department modifications without institution permissions', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'test-user-id', roles: [{ canManageInstitution: false }], departmentId: 'dept-1' });

      const trpcRouter = router.createRouter();
      const updateRoleCaller = trpcRouter.createCaller(createContext({ roles: [{ canManageInstitution: false }], departmentId: 'dept-1' }));

      prismaMock.role.findUnique.mockResolvedValue({ id: 'role-1', level: 4, departmentId: 'dept-2' });

      await expect(
        updateRoleCaller.updateRole({ id: 'role-1', name: 'New Name' })
      ).rejects.toThrow(new TRPCError({
        code: 'FORBIDDEN',
        message: 'Role not found or access denied.',
      }));
    });
  });

  describe('deleteRole', () => {
    it('should prevent deleting executive roles (level 0)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'test-user-id', roles: [], departmentId: 'dept-1' });

      const trpcRouter = router.createRouter();
      const deleteRoleCaller = trpcRouter.createCaller(createContext({ departmentId: 'dept-1' }));

      prismaMock.role.findUnique.mockResolvedValue({ id: 'role-1', level: 0, departmentId: 'dept-1' });

      await expect(
        deleteRoleCaller.deleteRole('role-1')
      ).rejects.toThrow(new TRPCError({
        code: 'FORBIDDEN',
        message: 'Executive roles cannot be deleted.',
      }));
    });
  });

  describe('assignRoleToUser', () => {
    it('should prevent assigning a leader role (level <= 1) if a department already has one', async () => {
      const trpcRouter = router.createRouter();
      const assignCaller = trpcRouter.createCaller(createContext({ roles: [{ canManageInstitution: false }], departmentId: 'dept-1' }));

      // Mock finding the role
      prismaMock.role.findUnique.mockResolvedValue({ id: 'role-1', level: 1, departmentId: 'dept-1' });
      // Mock finding the target user AND the logged-in user finding
      prismaMock.user.findUnique.mockImplementation((args: any) => {
        if (args.where.id === 'user-2') return Promise.resolve({ id: 'user-2', departmentId: 'dept-1', department: { name: 'IT' } });
        if (args.where.id === 'test-user-id') return Promise.resolve({ id: 'test-user-id', roles: [{ canManageInstitution: false }], departmentId: 'dept-1' });
        return Promise.resolve(null);
      });
      // Mock finding an existing leader
      prismaMock.user.findFirst.mockResolvedValue({ id: 'user-3', firstName: 'John', lastName: 'Doe', departmentId: 'dept-1' });

      await expect(
        assignCaller.assignRoleToUser({ userId: 'user-2', roleId: 'role-1' })
      ).rejects.toThrow(new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: "Department 'IT' already has a leader (John Doe). Please demote them first.",
      }));
    });
  });
});
