import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { makePrisma, makeConfig } from '../../test-utils/prisma.mock';

const jwt = { signAsync: jest.fn().mockResolvedValue('tok'), verifyAsync: jest.fn() } as never;
const config = makeConfig({
  JWT_SECRET: 's', JWT_EXPIRES_IN: '7d', JWT_REFRESH_SECRET: 'r', JWT_REFRESH_EXPIRES_IN: '7d',
});

describe('AuthService', () => {
  it('registers a new user and issues tokens', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u1', email: 'a@b.c' });
    const svc = new AuthService(prisma, jwt, config);

    const res = await svc.register({ email: 'a@b.c', password: 'supersecret' });
    expect(res.accessToken).toBe('tok');
    expect(res.refreshToken).toBe('tok');
  });

  it('rejects a duplicate email', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    const svc = new AuthService(prisma, jwt, config);
    await expect(svc.register({ email: 'a@b.c', password: 'supersecret' })).rejects.toThrow(ConflictException);
  });

  it('logs in with valid credentials', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.c', passwordHash: await bcrypt.hash('pw123456', 10) });
    const svc = new AuthService(prisma, jwt, config);
    const res = await svc.login({ email: 'a@b.c', password: 'pw123456' });
    expect(res.accessToken).toBe('tok');
  });

  it('rejects a wrong password', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.c', passwordHash: await bcrypt.hash('right', 10) });
    const svc = new AuthService(prisma, jwt, config);
    await expect(svc.login({ email: 'a@b.c', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
  });

  it('refreshes tokens', async () => {
    const prisma = makePrisma();
    const jwtRefresh = { signAsync: jest.fn().mockResolvedValue('tok'), verifyAsync: jest.fn().mockResolvedValue({ sub: 'u1', email: 'a@b.c' }) } as never;
    const svc = new AuthService(prisma, jwtRefresh, config);
    const res = await svc.refresh('sometoken');
    expect(res.accessToken).toBe('tok');
  });
});
