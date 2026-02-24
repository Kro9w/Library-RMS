import { Test, TestingModule } from '@nestjs/testing';
import { UserRouter } from './user.router';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { TRPCError } from '@trpc/server';

// Mock environment variables
jest.mock('../env', () => ({
  env: {
    DATABASE_URL: 'postgresql://mock:5432/mock',
    DIRECT_URL: 'postgresql://mock:5432/mock',
    SUPABASE_URL: 'https://mock.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
    NODE_ENV: 'test',
  },
}));

describe('UserRouter - createDepartmentAndJoin', () => {
  let router: UserRouter;
  let prismaService: any;
  let logService: any;

  beforeEach(async () => {
    prismaService = {
      organization: {
        findUnique: jest.fn(),
      },
      campus: {
        findUnique: jest.fn(),
      },
      department: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    logService = {
      logAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRouter,
        { provide: PrismaService, useValue: prismaService },
        { provide: LogService, useValue: logService },
      ],
    }).compile();

    router = module.get<UserRouter>(UserRouter);
  });

  it('Scenario 3 (Fixed): User is NOT first in Campus, but IS first in Department. Should become Admin', async () => {
    const trpcRouter = router.createRouter();

    // Mock Data
    const mockUser = { id: 'user-current', organizationId: null, roles: [] }; // User joining
    const mockCampus = {
      id: 'campus-1',
      organizationId: 'org-1',
      name: 'Main Campus',
    };
    const mockDept = { id: 'dept-new', name: 'New Dept', campusId: 'campus-1' };

    // Setup Mocks

    // Mock for Auth Middleware
    prismaService.user.findUnique.mockResolvedValue(mockUser);

    prismaService.campus.findUnique.mockResolvedValue(mockCampus);
    prismaService.department.findFirst.mockResolvedValue(null); // Dept doesn't exist
    prismaService.department.create.mockResolvedValue(mockDept);

    // CRITICAL: user.findFirst mock
    prismaService.user.findFirst.mockImplementation((args: any) => {
      // If code checks campusId, it finds someone (simulating populated campus)
      if (args.where.campusId === 'campus-1') {
        return Promise.resolve({ id: 'other-user-in-campus' });
      }
      // If code checks departmentId, it finds NO ONE (simulating new dept)
      if (args.where.departmentId === 'dept-new') {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    // Mock Roles
    prismaService.role.findFirst.mockImplementation((args: any) => {
      if (args.where.name === 'User')
        return Promise.resolve({ id: 'role-user-id', name: 'User' });
      if (args.where.name === 'Admin')
        return Promise.resolve({ id: 'role-admin-id', name: 'Admin' });
      return Promise.resolve(null);
    });

    const caller = trpcRouter.createCaller({
      user: { id: 'user-current' },
      dbUser: mockUser as any,
      prisma: prismaService,
    } as any);

    const input = {
      orgId: 'org-1',
      campusId: 'campus-1',
      departmentName: 'New Dept',
    };

    await caller.createDepartmentAndJoin(input);

    const updateCall = prismaService.user.update.mock.calls[0][0];
    const connectedRoleId = updateCall.data.roles.connect.id;

    // Expectation for FIXED behavior:
    expect(connectedRoleId).toBe('role-admin-id');
  });

  it('Scenario 4 (Fixed): User joins existing empty Department in populated Campus. Should become Admin', async () => {
    const trpcRouter = router.createRouter();

    const mockUser = { id: 'user-current', organizationId: null, roles: [] };
    const mockCampus = {
      id: 'campus-1',
      organizationId: 'org-1',
      name: 'Main Campus',
    };
    const mockDept = {
      id: 'dept-existing',
      name: 'Existing Dept',
      campusId: 'campus-1',
      campus: mockCampus,
    };
    const mockOrg = { id: 'org-1', name: 'Org 1' };

    prismaService.user.findUnique.mockResolvedValue(mockUser);
    prismaService.organization.findUnique.mockResolvedValue(mockOrg);
    prismaService.department.findUnique.mockResolvedValue(mockDept);
    prismaService.campus.findUnique.mockResolvedValue(mockCampus);

    // CRITICAL: user.findFirst mock
    prismaService.user.findFirst.mockImplementation((args: any) => {
      // If code checks campusId, it finds someone
      if (args.where.campusId === 'campus-1') {
        return Promise.resolve({ id: 'other-user-in-campus' });
      }
      // If code checks departmentId, it finds NO ONE
      if (args.where.departmentId === 'dept-existing') {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    // Mock Roles
    prismaService.role.findFirst.mockImplementation((args: any) => {
      if (args.where.name === 'User')
        return Promise.resolve({ id: 'role-user-id', name: 'User' });
      if (args.where.name === 'Admin')
        return Promise.resolve({ id: 'role-admin-id', name: 'Admin' });
      return Promise.resolve(null);
    });

    const caller = trpcRouter.createCaller({
      user: { id: 'user-current' },
      dbUser: mockUser as any,
      prisma: prismaService,
    } as any);

    const input = {
      orgId: 'org-1',
      campusId: 'campus-1',
      departmentId: 'dept-existing',
    };

    await caller.joinOrganization(input);

    const updateCall = prismaService.user.update.mock.calls[0][0];
    const connectedRoleId = updateCall.data.roles.connect.id;

    // Expectation for FIXED behavior:
    expect(connectedRoleId).toBe('role-admin-id');
  });
});
