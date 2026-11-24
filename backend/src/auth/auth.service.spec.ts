jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));
jest.mock('@nestjs/jwt', () => ({
  JwtService: class {},
}));
jest.mock('../notifications/notifications.service', () => ({
  NotificationsService: class {},
}));

import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  isInstitutionalDomain,
  resolveInstitutionalDomain,
} from './domain-routing.util';
import { RegisterDto } from './dto/register.dto';
import { RoleEntity } from './entities/role.entity';
import { UserEntity } from './entities/user.entity';

describe('AuthService', () => {
  const mockRole: RoleEntity = {
    id: 'role-uuid-1',
    name: 'ROLE_CITIZEN',
    description: 'Ciudadano',
    permissions: [],
  };

  const makeService = (overrides?: {
    existingUser?: Partial<UserEntity> | null;
    role?: RoleEntity | null;
  }) => {
    const usersRepo = {
      findOne: jest.fn().mockResolvedValue(overrides?.existingUser ?? null),
      create: jest.fn((data: Partial<UserEntity>) => ({
        id: 'user-uuid-1',
        createdAt: new Date('2026-11-17T00:00:00Z'),
        ...data,
      })),
      save: jest.fn((user: UserEntity) => Promise.resolve(user)),
    };

    const rolesRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue(
          overrides && 'role' in overrides ? overrides.role : mockRole,
        ),
    };

    const service = new AuthService(usersRepo as never, rolesRepo as never);
    return { service, usersRepo, rolesRepo };
  };

  const dto: RegisterDto = {
    firstName: 'Juan Carlos',
    lastName: 'Hernández Ayala',
    email: '  Juan@Correo.COM ',
    phone: '8711234567',
    password: 'Password123',
  };

  it('registers a new citizen with hashed password and normalized email', async () => {
    const { service, usersRepo } = makeService();

    const result = await service.register(dto);

    expect(usersRepo.findOne).toHaveBeenCalledWith({
      where: { email: 'juan@correo.com' },
      select: { id: true },
    });
    expect(result.user.email).toBe('juan@correo.com');
    expect(result.user.role).toBe('ROLE_CITIZEN');
    expect(
      (result.user as Record<string, unknown>).passwordHash,
    ).toBeUndefined();
  });

  it('throws ConflictException when email already exists', async () => {
    const { service } = makeService({ existingUser: { id: 'existing-1' } });

    await expect(service.register(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws InternalServerErrorException when ROLE_CITIZEN is missing', async () => {
    const { service } = makeService({ role: null });

    await expect(service.register(dto)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('blocks public web registration for institutional domains', async () => {
    const { service } = makeService();

    await expect(
      service.register({ ...dto, email: 'jesus@simas.com.mx' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.register({ ...dto, email: 'roberto@operador.laola.com.mx' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('resolves institutional admin and operator domains regardless of username', () => {
    expect(resolveInstitutionalDomain('jesus@simas.com.mx')).toMatchObject({
      roleName: 'ROLE_SUPERVISOR',
      departmentCode: 'SIM',
      redirectTo: '/dashboard-admins',
    });
    expect(
      resolveInstitutionalDomain('roberto@operador.simas.com.mx'),
    ).toMatchObject({
      roleName: 'ROLE_CREW',
      departmentCode: 'SIM',
      redirectTo: '/dashboard-tecnicos',
    });
    expect(resolveInstitutionalDomain('admin@laola.com.mx')).toMatchObject({
      roleName: 'ROLE_SUPERVISOR',
      departmentCode: 'OLA',
      redirectTo: '/dashboard-admins',
    });
    expect(
      resolveInstitutionalDomain('operador@operador.laola.com.mx'),
    ).toMatchObject({
      roleName: 'ROLE_CREW',
      departmentCode: 'OLA',
      redirectTo: '/dashboard-tecnicos',
    });
    expect(
      resolveInstitutionalDomain('admin@obraspublicas.com.mx'),
    ).toMatchObject({
      roleName: 'ROLE_SUPERVISOR',
      departmentCode: 'OBP',
      redirectTo: '/dashboard-admins',
    });
    expect(
      resolveInstitutionalDomain('operador@operador.obraspublicas.com.mx'),
    ).toMatchObject({
      roleName: 'ROLE_CREW',
      departmentCode: 'OBP',
      redirectTo: '/dashboard-tecnicos',
    });
    expect(isInstitutionalDomain('ciudadano@gmail.com')).toBe(false);
  });
});
