// src/lib/authStore.ts
import crypto from 'crypto';

export interface UserRecord {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: 'SUPER_ADMIN' | 'CLIENT_ADMIN';
  tenant_id: string;
  created_at: string;
  is_active: boolean;
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function createSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Base de datos de usuarios persistente en memoria del servidor
const cristSalt = createSalt();
const registeredUsers: Map<string, UserRecord> = new Map();

// Usuario Super Administrador oficial
registeredUsers.set('cristadmin', {
  id: 999,
  username: 'CristAdmin',
  email: 'cristadmin@inventorysync.io',
  salt: cristSalt,
  passwordHash: hashPassword('ROAC060718#', cristSalt),
  role: 'SUPER_ADMIN',
  tenant_id: 'global-master',
  created_at: '2026-09-01T00:00:00Z',
  is_active: true
});

export function findUserByUsername(username: string): UserRecord | undefined {
  return registeredUsers.get(username.trim().toLowerCase());
}

export function registerNewUser(
  username: string,
  password: string,
  email: string,
  tenant_id: string = 'empresa-a'
): UserRecord {
  const cleanUsername = username.trim().toLowerCase();
  if (registeredUsers.has(cleanUsername)) {
    throw new Error('El nombre de usuario ya se encuentra registrado.');
  }

  const salt = createSalt();
  const newUser: UserRecord = {
    id: registeredUsers.size + 1,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    salt,
    passwordHash: hashPassword(password, salt),
    role: 'CLIENT_ADMIN',
    tenant_id,
    created_at: new Date().toISOString(),
    is_active: true
  };

  registeredUsers.set(cleanUsername, newUser);
  return newUser;
}

export function verifyUserCredentials(username: string, password: string): UserRecord | null {
  const user = findUserByUsername(username);
  if (!user) {
    return null;
  }

  if (!user.is_active) {
    throw new Error('Esta cuenta ha sido suspendida por el Super Administrador.');
  }

  const computedHash = hashPassword(password, user.salt);
  if (computedHash === user.passwordHash) {
    return user;
  }

  return null;
}
