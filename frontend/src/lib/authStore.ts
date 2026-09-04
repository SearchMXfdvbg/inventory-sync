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
  try {
    return crypto.createHash('sha256').update(password + ':' + salt).digest('hex');
  } catch (e) {
    return Buffer.from(password + ':' + salt).toString('base64');
  }
}

function createSalt(): string {
  try {
    return crypto.randomBytes(16).toString('hex');
  } catch (e) {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
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

export interface TenantInfo {
  id: string;
  name: string;
  owner: string;
  email: string;
  plan: string;
  maxSkus: number;
  activeSkus: number;
  channels: string[];
  status: 'ACTIVE' | 'SUSPENDED';
  commission_rate: string;
  created_at: string;
  last_sync: string;
}

export function getAllTenants(): TenantInfo[] {
  const list: TenantInfo[] = [];
  registeredUsers.forEach((user) => {
    if (user.role !== 'SUPER_ADMIN') {
      list.push({
        id: `TNT-${user.id.toString().padStart(3, '0')}`,
        name: user.username,
        owner: user.username,
        email: user.email,
        plan: 'Plan Básico (<200 SKUs)',
        maxSkus: 200,
        activeSkus: 0,
        channels: ['Shopify', 'Mercado Libre'],
        status: user.is_active ? 'ACTIVE' : 'SUSPENDED',
        commission_rate: '25%',
        created_at: user.created_at,
        last_sync: 'En Línea'
      });
    }
  });
  return list;
}

export function updateTenantStatus(idOrUsername: string, status: 'ACTIVE' | 'SUSPENDED'): boolean {
  let found = false;
  registeredUsers.forEach((user, key) => {
    if (user.role !== 'SUPER_ADMIN') {
      if (`TNT-${user.id.toString().padStart(3, '0')}` === idOrUsername || user.username.toLowerCase() === idOrUsername.toLowerCase()) {
        user.is_active = (status === 'ACTIVE');
        registeredUsers.set(key, user);
        found = true;
      }
    }
  });
  return found;
}

export function deleteTenant(idOrUsername: string): boolean {
  let toDeleteKey: string | null = null;
  registeredUsers.forEach((user, key) => {
    if (user.role !== 'SUPER_ADMIN') {
      if (`TNT-${user.id.toString().padStart(3, '0')}` === idOrUsername || user.username.toLowerCase() === idOrUsername.toLowerCase()) {
        toDeleteKey = key;
      }
    }
  });
  if (toDeleteKey) {
    registeredUsers.delete(toDeleteKey);
    return true;
  }
  return false;
}
