
import { Test, TestingModule } from '@nestjs/testing';
import { UserRouter } from '../src/user/user.router';
import { PrismaService } from '../src/prisma/prisma.service';
import { LogService } from '../src/log/log.service';

// Mock env
jest.mock('../src/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://mock:5432/mock',
    DIRECT_URL: 'postgresql://mock:5432/mock',
    SUPABASE_URL: 'https://mock.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
    SUPABASE_BUCKET_NAME: 'documents',
    NODE_ENV: 'test',
  },
}));

describe('UserRouter Performance', () => {
  let userRouter: UserRouter;
  let prismaService: PrismaService;
  
  const mockDbUser = {
    id: 'user-123',
    organizationId: 'org-123',
    roles: [{ id: 'role-1', name: 'Admin' }],
    organization: { id: 'org-123', name: 'Test Org' },
  };

  const mockFullUser = {
    ...mockDbUser,
    campus: { id: 'campus-1', name: 'Main Campus' },
    department: { id: 'dept-1', name: 'IT' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRouter,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: LogService,
          useValue: {
            logAction: jest.fn(),
          },
        },
      ],
    }).compile();

    userRouter = module.get<UserRouter>(UserRouter);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('getMe should fetch only missing relations', async () => {
    // Setup mocks
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (prismaService.user.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockDbUser) // For isAuthed middleware
      .mockResolvedValueOnce({ // For getMe query - only returns requested fields
        campus: mockFullUser.campus,
        department: mockFullUser.department,
      });

    const router = userRouter.createRouter();
    const caller = router.createCaller({
      user: { id: 'user-123' },
      prisma: prismaService,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await caller.getMe();

    // The result should still be the full user object (composed)
    expect(result).toEqual(mockFullUser);
    
    // Check call counts
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prismaService.user.findUnique).toHaveBeenCalledTimes(2);

    // Check arguments of the second call (the one in getMe)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const secondCallArgs = (prismaService.user.findUnique as jest.Mock).mock.calls[1][0];
    
    // Expect optimized query
    expect(secondCallArgs).toEqual({
      where: { id: 'user-123' },
      select: {
        campus: true,
        department: true,
      },
    });
  });
});
