// src/lib/authStore.ts
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

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
  plan?: string;
  maxSkus?: number;
  commission_rate?: string;
  channels?: string[];
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

const STORAGE_FILE = path.join(os.tmpdir(), 'inventory_sync_users_registry.json');

const cristSalt = createSalt();
const defaultSuperAdmin: UserRecord = {
  id: 999,
  username: 'CristAdmin',
  email: 'cristadmin@inventorysync.io',
  salt: cristSalt,
  passwordHash: hashPassword('ROAC060718#', cristSalt),
  role: 'SUPER_ADMIN',
  tenant_id: 'global-master',
  created_at: '2026-09-01T00:00:00Z',
  is_active: true
};

function readPersistedUsers(): Map<string, UserRecord> {
  const map = new Map<string, UserRecord>();
  map.set('cristadmin', defaultSuperAdmin);

  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed: Record<string, UserRecord> = JSON.parse(data);
      Object.keys(parsed).forEach((key) => {
        if (key.toLowerCase() !== 'cristadmin') {
          map.set(key.toLowerCase(), parsed[key]);
        }
      });
    }
  } catch (err) {
    console.warn('[authStore] Error al leer archivo persistido:', err);
  }

  return map;
}

function savePersistedUsers(map: Map<string, UserRecord>) {
  try {
    const obj: Record<string, UserRecord> = {};
    map.forEach((val, key) => {
      obj[key] = val;
    });
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[authStore] Error al guardar archivo persistido:', err);
  }
}

// In-memory + persisted store
let registeredUsers: Map<string, UserRecord> = readPersistedUsers();

export function findUserByUsername(username: string): UserRecord | undefined {
  registeredUsers = readPersistedUsers();
  return registeredUsers.get(username.trim().toLowerCase());
}

export function registerNewUser(
  username: string,
  password: string,
  email: string,
  tenant_id: string = 'empresa-a',
  plan: string = 'Plan Básico (<200 SKUs)',
  maxSkus: number = 200,
  commission_rate: string = '25%',
  channels: string[] = ['Shopify', 'Mercado Libre']
): UserRecord {
  registeredUsers = readPersistedUsers();
  const cleanUsername = username.trim().toLowerCase();
  
  if (registeredUsers.has(cleanUsername) && cleanUsername !== 'cristadmin') {
    const existing = registeredUsers.get(cleanUsername)!;
    const salt = createSalt();
    existing.passwordHash = hashPassword(password, salt);
    existing.salt = salt;
    existing.email = email.trim().toLowerCase();
    existing.is_active = true;
    registeredUsers.set(cleanUsername, existing);
    savePersistedUsers(registeredUsers);
    return existing;
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
    is_active: true,
    plan,
    maxSkus,
    commission_rate,
    channels
  };

  registeredUsers.set(cleanUsername, newUser);
  savePersistedUsers(registeredUsers);
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

export function getAllTenants(): TenantInfo[] {
  registeredUsers = readPersistedUsers();
  const list: TenantInfo[] = [];

  registeredUsers.forEach((user) => {
    if (user.role !== 'SUPER_ADMIN') {
      list.push({
        id: `TNT-${user.id.toString().padStart(3, '0')}`,
        name: user.username,
        owner: user.username,
        email: user.email,
        plan: user.plan || 'Plan Básico (<200 SKUs)',
        maxSkus: user.maxSkus || 200,
        activeSkus: 0,
        channels: user.channels || ['Shopify', 'Mercado Libre'],
        status: user.is_active ? 'ACTIVE' : 'SUSPENDED',
        commission_rate: user.commission_rate || '25%',
        created_at: user.created_at,
        last_sync: 'En Línea'
      });
    }
  });

  return list;
}

export function syncTenantsBatch(tenants: TenantInfo[]): TenantInfo[] {
  registeredUsers = readPersistedUsers();
  if (Array.isArray(tenants)) {
    tenants.forEach((t) => {
      const clean = (t.name || t.owner || '').trim().toLowerCase();
      if (clean && !registeredUsers.has(clean) && clean !== 'cristadmin') {
        const salt = createSalt();
        const newUser: UserRecord = {
          id: registeredUsers.size + 1,
          username: (t.name || t.owner).trim(),
          email: t.email?.trim().toLowerCase() || `${clean}@empresa.com`,
          salt,
          passwordHash: hashPassword('ClienteSeguro2026#', salt),
          role: 'CLIENT_ADMIN',
          tenant_id: 'empresa-a',
          created_at: t.created_at || new Date().toISOString(),
          is_active: t.status === 'ACTIVE',
          plan: t.plan || 'Plan Básico (<200 SKUs)',
          maxSkus: t.maxSkus || 200,
          commission_rate: t.commission_rate || '25%',
          channels: t.channels || ['Shopify', 'Mercado Libre']
        };
        registeredUsers.set(clean, newUser);
      }
    });
    savePersistedUsers(registeredUsers);
  }
  return getAllTenants();
}

export function updateTenantStatus(idOrUsername: string, status: 'ACTIVE' | 'SUSPENDED'): boolean {
  registeredUsers = readPersistedUsers();
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

  if (found) {
    savePersistedUsers(registeredUsers);
  }
  return found;
}

export function deleteTenant(idOrUsername: string): boolean {
  registeredUsers = readPersistedUsers();
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
    savePersistedUsers(registeredUsers);
    return true;
  }
  return false;
}
