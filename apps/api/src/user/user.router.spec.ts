import { Test, TestingModule } from '@nestjs/testing';
import { UserRouter } from './user.router';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';

describe('UserRouter - determineInitialRole', () => {
  let router: UserRouter;
  let prismaMock: any;
  let logMock: any;

  beforeEach(async () => {
    prismaMock = {
      role: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    logMock = {
      logAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRouter,
        { provide: PrismaService, useValue: prismaMock },
        { provide: LogService, useValue: logMock },
      ],
    }).compile();

    router = module.get<UserRouter>(UserRouter);
  });

  it('should assign University President role if email matches and department is Office of the University President', async () => {
    const mockRole = { id: 'role-1', name: 'University President' };
    prismaMock.role.findFirst.mockResolvedValueOnce(mockRole);

    // Call the private method (we bypass TypeScript's visibility modifier for testing)
    const result = await (router as any).determineInitialRole(
      'jakecalantas.blis@gmail.com',
      'Office of the University President',
      'dept-1',
    );

    expect(prismaMock.role.findFirst).toHaveBeenCalledWith({
      where: {
        departmentId: 'dept-1',
        name: 'University President',
      },
    });
    expect(result).toEqual(mockRole);
  });

  it('should assign vacant Apex role (level 1 or 0) if department is not University President and role has no users', async () => {
    const mockApexRole = { id: 'role-2', name: 'Director', users: [] };
    // Mocks:
    // 1st call for president check will not be called (due to short circuit)
    prismaMock.role.findFirst.mockResolvedValueOnce(mockApexRole);

    const result = await (router as any).determineInitialRole(
      'test@example.com',
      'IT Department',
      'dept-2',
    );

    expect(prismaMock.role.findFirst).toHaveBeenCalledWith({
      where: {
        departmentId: 'dept-2',
        level: { lte: 1 },
      },
      include: {
        users: true,
      },
    });
    expect(result).toEqual(mockApexRole);
  });

  it('should fallback to creating User role if apex role is taken', async () => {
    const mockApexRoleTaken = { id: 'role-2', name: 'Director', users: [{ id: 'user-1' }] };
    const mockNewUserRole = { id: 'role-3', name: 'User' };

    prismaMock.role.findFirst
      .mockResolvedValueOnce(mockApexRoleTaken) // Apex role check
      .mockResolvedValueOnce(null); // 'User' role lookup

    prismaMock.role.create.mockResolvedValueOnce(mockNewUserRole);

    const result = await (router as any).determineInitialRole(
      'test@example.com',
      'IT Department',
      'dept-2',
    );

    expect(prismaMock.role.create).toHaveBeenCalledWith({
      data: {
        name: 'User',
        canManageUsers: false,
        canManageRoles: false,
        canManageDocuments: false,
        departmentId: 'dept-2',
      },
    });
    expect(result).toEqual(mockNewUserRole);
  });
});
