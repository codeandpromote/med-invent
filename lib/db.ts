import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  ComboPack,
  InventoryLog,
  OrderRecord,
  Product,
  SiteSettings,
} from './types';
import {
  SEED_COMBOS,
  SEED_INVENTORY_LOGS,
  SEED_ORDERS,
  SEED_PRODUCTS,
  SEED_SETTINGS,
} from './seed-data';

export interface StoreData {
  products: Product[];
  combos: ComboPack[];
  orders: OrderRecord[];
  inventoryLogs: InventoryLog[];
  settings: SiteSettings;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'medinvent-store.json');

let writeQueue: Promise<unknown> = Promise.resolve();

function createInitialStore(): StoreData {
  return {
    products: structuredClone(SEED_PRODUCTS),
    combos: structuredClone(SEED_COMBOS),
    orders: structuredClone(SEED_ORDERS),
    inventoryLogs: structuredClone(SEED_INVENTORY_LOGS),
    settings: structuredClone(SEED_SETTINGS),
  };
}

export async function readStore(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as StoreData;
    return {
      products: Array.isArray(parsed.products) ? parsed.products : SEED_PRODUCTS,
      combos: Array.isArray(parsed.combos) ? parsed.combos : SEED_COMBOS,
      orders: Array.isArray(parsed.orders) ? parsed.orders : SEED_ORDERS,
      inventoryLogs: Array.isArray(parsed.inventoryLogs)
        ? parsed.inventoryLogs
        : SEED_INVENTORY_LOGS,
      settings: parsed.settings ?? SEED_SETTINGS,
    };
  } catch {
    const initial = createInitialStore();
    await writeStore(initial);
    return initial;
  }
}

export async function writeStore(data: StoreData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempPath = `${STORE_PATH}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tempPath, STORE_PATH);
}

export async function mutateStore<T>(
  mutator: (draft: StoreData) => Promise<T> | T
): Promise<T> {
  const task = writeQueue.then(async () => {
    const current = await readStore();
    const result = await mutator(current);
    await writeStore(current);
    return result;
  });
  writeQueue = task.catch(() => undefined);
  return task;
}
