import * as constants from '../constants';

/**
 * Tuning overrides loaded from public/config/*.json before the game starts.
 *
 * Each file maps an exported constant name (e.g. "TIMER_CONFIG") to a partial copy of it.
 * Values are merged into the live constant objects, so every system sees them.
 * Unknown names/keys and values of the wrong type are ignored with a warning;
 * keys starting with "_" are treated as comments.
 */
const CONFIG_FILES = ['economy', 'randomization', 'timings'] as const;

type Obj = Record<string, unknown>;
const isPlainObject = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function mergeInto(target: Obj, source: unknown, path: string, warn: (msg: string) => void): void {
  if (!isPlainObject(source)) {
    warn(`${path}: expected an object`);
    return;
  }
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith('_')) continue;
    if (!(key in target)) {
      warn(`${path}.${key}: unknown setting, ignored`);
      continue;
    }
    const current = target[key];
    if (isPlainObject(current)) {
      mergeInto(current, value, `${path}.${key}`, warn);
    } else if (typeof current === 'number') {
      if (typeof value === 'number' && Number.isFinite(value)) target[key] = value;
      else warn(`${path}.${key}: expected a number, got ${JSON.stringify(value)}`);
    } else if (typeof current === 'boolean' || typeof current === 'string') {
      if (typeof value === typeof current) target[key] = value;
      else warn(`${path}.${key}: expected a ${typeof current}, got ${JSON.stringify(value)}`);
    } else {
      warn(`${path}.${key}: this setting can't be changed from a config file`);
    }
  }
}

/** Merge one parsed config file into the given registry of constant objects. */
export function applyConfig(
  json: unknown,
  source: string,
  registry: Obj = constants as unknown as Obj,
  warn: (msg: string) => void = (msg) => console.warn(`[config] ${msg}`)
): void {
  if (!isPlainObject(json)) {
    warn(`${source}: expected a JSON object at the top level`);
    return;
  }
  for (const [name, value] of Object.entries(json)) {
    if (name.startsWith('_')) continue;
    const target = registry[name];
    if (!isPlainObject(target)) {
      warn(`${source}: unknown section "${name}", ignored`);
      continue;
    }
    mergeInto(target, value, `${source}:${name}`, warn);
  }
}

/** Fetch and apply every config file. Missing or broken files fall back to the built-in defaults. */
export async function loadConfig(): Promise<void> {
  await Promise.all(CONFIG_FILES.map(async (file) => {
    const url = `${import.meta.env.BASE_URL}config/${file}.json`;
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) {
        console.warn(`[config] ${url}: HTTP ${res.status}, using defaults`);
        return;
      }
      applyConfig(await res.json(), `${file}.json`);
    } catch (error) {
      console.warn(`[config] ${url}: could not be loaded (${error}), using defaults`);
    }
  }));

  // Keep the derived cycle length consistent with the phases
  for (const timers of [constants.TIMER_CONFIG, constants.DEV_TIMER_CONFIG]) {
    timers.FULL_DAY_CYCLE = timers.DAY_DURATION + timers.NIGHT_DURATION;
  }
}

if (import.meta.env.DEV) {
  // Self-check for the merge rules
  const registry = { A: { n: 1, s: 'x', nested: { m: 2 }, list: [1] } };
  const warnings: string[] = [];
  applyConfig(
    { A: { n: 5, s: 7, nested: { m: 3, bogus: 1 }, list: [2], _note: 'ok' }, B: {} },
    'test',
    registry,
    (m) => warnings.push(m)
  );
  console.assert(registry.A.n === 5 && registry.A.nested.m === 3, '[config] merge failed', registry);
  console.assert(registry.A.s === 'x' && registry.A.list[0] === 1, '[config] type guard failed', registry);
  console.assert(warnings.length === 4, '[config] expected 4 warnings', warnings);
}
