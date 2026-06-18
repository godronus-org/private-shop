import { Cache } from "fastedge::cache";

export const SESSION_COOKIE = "session_id";
export const SESSION_TTL = 60 * 60 * 8; // 8 hours

const PREFIX = "private-shop-sessions:";
const INDEX_KEY = `${PREFIX}_index`;

export type SessionRecord = { id: string; username: string; createdAt: number };

export async function createSession(username: string): Promise<string> {
  const id = crypto.randomUUID();
  await Cache.set(`${PREFIX}${id}`, JSON.stringify({ username }), { ttl: SESSION_TTL });
  const records = await getIndex();
  records.push({ id, username, createdAt: Math.floor(Date.now() / 1000) });
  await Cache.set(INDEX_KEY, JSON.stringify(records));
  return id;
}

export async function lookupSession(id: string): Promise<string | null> {
  const entry = await Cache.get(`${PREFIX}${id}`);
  if (!entry) return null;
  const { username } = (await entry.json()) as { username: string };
  return username;
}

export async function deleteSession(id: string): Promise<void> {
  await Cache.delete(`${PREFIX}${id}`);
  const records = await getIndex();
  await Cache.set(INDEX_KEY, JSON.stringify(records.filter((r) => r.id !== id)));
}

export async function listSessions(): Promise<SessionRecord[]> {
  const records = await getIndex();
  const alive = await Promise.all(
    records.map(async (r) => ((await Cache.exists(`${PREFIX}${r.id}`)) ? r : null)),
  );
  const live = alive.filter((r): r is SessionRecord => r !== null);
  if (live.length !== records.length) {
    await Cache.set(INDEX_KEY, JSON.stringify(live));
  }
  return live;
}

export async function deleteAllSessions(): Promise<void> {
  // purgePrefix deletes all session entries AND the index (both start with PREFIX)
  await Cache.purgePrefix(PREFIX);
}

async function getIndex(): Promise<SessionRecord[]> {
  const entry = await Cache.get(INDEX_KEY);
  if (!entry) return [];
  return (await entry.json()) as SessionRecord[];
}
