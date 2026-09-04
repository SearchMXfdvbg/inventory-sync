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
  rawPassword?: string;
  role: 'SUPER_ADMIN' | 'CLIENT_ADMIN';
  tenant_id: string;
  created_at: string;
  is_active: boolean;
  plan?: string;
  maxSkus?: number;
  commission_rate?: string;
  channels?: string[];
  suspension_reason?: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  owner: string;
  email: string;
  password?: string;
  plan: string;
  maxSkus: number;
  activeSkus: number;
  channels: string[];
  status: 'ACTIVE' | 'SUSPENDED';
  suspension_reason?: string;
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
const LOCAL_DATA_FILE = path.join(process.cwd(), 'data', 'users.json');

const cristSalt = createSalt();
const defaultSuperAdmin: UserRecord = {
  id: 999,
  username: 'CristAdmin',
  email: 'cristadmin@inventorysync.io',
  salt: cristSalt,
  passwordHash: hashPassword('ROAC060718#', cristSalt),
  rawPassword: 'ROAC060718#',
  role: 'SUPER_ADMIN',
  tenant_id: 'global-master',
  created_at: '2026-09-01T00:00:00Z',
  is_active: true
};

function readPersistedUsers(): Map<string, UserRecord> {
  const map = new Map<string, UserRecord>();
  map.set('cristadmin', defaultSuperAdmin);

  // Try reading from LOCAL_DATA_FILE first, then STORAGE_FILE
  const filesToTry = [LOCAL_DATA_FILE, STORAGE_FILE];
  for (const f of filesToTry) {
    try {
      if (fs.existsSync(f)) {
        const data = fs.readFileSync(f, 'utf-8');
        const parsed: Record<string, UserRecord> = JSON.parse(data);
        Object.keys(parsed).forEach((key) => {
          if (key.toLowerCase() !== 'cristadmin') {
            map.set(key.toLowerCase(), parsed[key]);
          }
        });
      }
    } catch (err) {
      console.warn('[authStore] Error al leer archivo persistido:', f, err);
    }
  }

  return map;
}

function savePersistedUsers(map: Map<string, UserRecord>) {
  try {
    const obj: Record<string, UserRecord> = {};
    map.forEach((val, key) => {
      obj[key] = val;
    });
    const serialized = JSON.stringify(obj, null, 2);

    try {
      const dir = path.dirname(LOCAL_DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(LOCAL_DATA_FILE, serialized, 'utf-8');
    } catch {}

    try {
      fs.writeFileSync(STORAGE_FILE, serialized, 'utf-8');
    } catch {}
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
  plan: string = 'Plan Guest',
  maxSkus: number = 0,
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
    existing.rawPassword = password;
    existing.email = email.trim().toLowerCase();
    // Conservar estado de activación y razón de suspensión si ya existían
    registeredUsers.set(cleanUsername, existing);
    savePersistedUsers(registeredUsers);
    return existing;
  }

  const salt = createSalt();
  const newUser: UserRecord = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    username: username.trim(),
    email: email.trim().toLowerCase(),
    salt,
    passwordHash: hashPassword(password, salt),
    rawPassword: password,
    role: 'CLIENT_ADMIN',
    tenant_id,
    created_at: new Date().toISOString(),
    is_active: true,
    plan,
    maxSkus,
    commission_rate,
    channels,
    suspension_reason: ''
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
      const cleanName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
      list.push({
        id: `TNT-${cleanName || user.id.toString()}`,
        name: user.username,
        owner: user.username,
        email: user.email,
        password: user.rawPassword || 'ClienteSeguro2026#',
        plan: user.plan || 'Plan Guest',
        maxSkus: user.maxSkus ?? 0,
        activeSkus: 0,
        channels: user.channels || ['Shopify', 'Mercado Libre'],
        status: user.is_active ? 'ACTIVE' : 'SUSPENDED',
        suspension_reason: user.suspension_reason || '',
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
      if (clean && clean !== 'cristadmin') {
        const salt = createSalt();
        const pwd = t.password || 'ClienteSeguro2026#';
        const existing = registeredUsers.get(clean);
        const newUser: UserRecord = {
          id: existing ? existing.id : (Date.now() + Math.floor(Math.random() * 1000)),
          username: (t.name || t.owner).trim(),
          email: t.email?.trim().toLowerCase() || `${clean}@empresa.com`,
          salt,
          passwordHash: hashPassword(pwd, salt),
          rawPassword: pwd,
          role: 'CLIENT_ADMIN',
          tenant_id: 'empresa-a',
          created_at: t.created_at || new Date().toISOString(),
          is_active: t.status === 'ACTIVE',
          plan: t.plan || 'Plan Guest',
          maxSkus: t.maxSkus ?? 0,
          commission_rate: t.commission_rate || '25%',
          channels: t.channels || ['Shopify', 'Mercado Libre'],
          suspension_reason: t.suspension_reason || ''
        };
        registeredUsers.set(clean, newUser);
      }
    });
    savePersistedUsers(registeredUsers);
  }
  return getAllTenants();
}

export function updateTenantDetails(
  idOrUsername: string,
  updates: Partial<TenantInfo> & { password?: string }
): boolean {
  registeredUsers = readPersistedUsers();
  let found = false;
  const target = idOrUsername.trim().toLowerCase().replace(/^tnt-/, '');

  registeredUsers.forEach((user, key) => {
    if (user.role !== 'SUPER_ADMIN') {
      const userClean = user.username.toLowerCase();
      const userCleanNoSpecial = userClean.replace(/[^a-z0-9]/g, '');
      if (userClean === target || userCleanNoSpecial === target || `tnt-${user.id}` === target || `tnt-${userCleanNoSpecial}` === target) {
        if (updates.name) user.username = updates.name.trim();
        if (updates.email) user.email = updates.email.trim().toLowerCase();
        if (updates.plan) user.plan = updates.plan;
        if (updates.maxSkus !== undefined) user.maxSkus = Number(updates.maxSkus);
        if (updates.commission_rate) user.commission_rate = updates.commission_rate;
        if (updates.channels) user.channels = updates.channels;
        if (updates.status) {
          user.is_active = (updates.status === 'ACTIVE');
          if (user.is_active) {
            user.suspension_reason = '';
          }
        }
        if (updates.suspension_reason !== undefined) {
          user.suspension_reason = updates.suspension_reason;
        }
        if (updates.password && updates.password.trim()) {
          const salt = createSalt();
          user.salt = salt;
          user.passwordHash = hashPassword(updates.password.trim(), salt);
          user.rawPassword = updates.password.trim();
        }
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

export function updateTenantStatus(idOrUsername: string, status: 'ACTIVE' | 'SUSPENDED'): boolean {
  return updateTenantDetails(idOrUsername, { status });
}

export function deleteTenant(idOrUsername: string): boolean {
  registeredUsers = readPersistedUsers();
  let toDeleteKey: string | null = null;
  const target = idOrUsername.trim().toLowerCase().replace(/^tnt-/, '');

  registeredUsers.forEach((user, key) => {
    if (user.role !== 'SUPER_ADMIN') {
      const userClean = user.username.toLowerCase();
      const userCleanNoSpecial = userClean.replace(/[^a-z0-9]/g, '');
      if (userClean === target || userCleanNoSpecial === target || `tnt-${user.id}` === target || `tnt-${userCleanNoSpecial}` === target) {
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

