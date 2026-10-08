import { expect, test } from "bun:test";
import { createDefaultSnapshot } from "../../src/domain/legacy/read-snapshot";
import { SyncController } from "../../src/lib/supabase/sync-controller";
import { fingerprint } from "../../src/lib/storage/fingerprint";
import {
  accountCacheKey,
  type StoragePort,
} from "../../src/lib/storage/account-cache";
import type { Snapshot } from "../../src/domain/schemas/snapshot";
const id = "11111111-1111-4111-8111-111111111111";
function store(): StoragePort {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
test("sync never uploads initial defaults; edits save locally then explicitly flush", async () => {
  const storage = store(),
    writes: Snapshot[] = [];
  const ctl = new SyncController(
    id,
    {
      load: async () => null,
      save: async (snapshot) => {
        writes.push(snapshot);
      },
    },
    storage,
    () => () => {},
  );
  await ctl.start();
  expect(writes).toHaveLength(0);
  ctl.edit((snapshot) => {
    snapshot.profile.name = "New";
  });
  expect(
    JSON.parse(storage.getItem(accountCacheKey(id)) ?? "{}").profile.name,
  ).toBe("New");
  expect(writes).toHaveLength(0);
  expect(await ctl.flush()).toBe(true);
  expect(writes[0]?.profile.name).toBe("New");
  ctl.dispose();
});
test("failed cloud reads block uploads, including edits to an offline cache", async () => {
  const storage = store(),
    local = createDefaultSnapshot();
  storage.setItem(accountCacheKey(id), JSON.stringify(local));
  let writes = 0;
  const ctl = new SyncController(
    id,
    {
      load: async () => {
        throw new Error("Offline");
      },
      save: async () => {
        writes++;
      },
    },
    storage,
    () => () => {},
  );
  await ctl.start();
  expect(ctl.view.status).toBe("offline");
  ctl.edit((snapshot) => {
    snapshot.profile.name = "Offline edit";
  });
  expect(await ctl.flush()).toBe(false);
  expect(writes).toBe(0);
  ctl.dispose();
});
test("divergent cloud/cache copies require a choice and never upload by themselves", async () => {
  const storage = store(),
    local = createDefaultSnapshot(),
    remote = createDefaultSnapshot();
  local.profile.name = "Local";
  remote.profile.name = "Remote";
  let writes = 0;
  storage.setItem(accountCacheKey(id), JSON.stringify(local));
  const ctl = new SyncController(
    id,
    {
      load: async () => remote,
      save: async () => {
        writes++;
      },
    },
    storage,
  );
  await ctl.start();
  expect(ctl.view.status).toBe("conflict");
  expect(writes).toBe(0);
  expect(() => ctl.edit(() => {})).toThrow();
  ctl.resolve("cloud");
  expect(ctl.view.snapshot?.profile.name).toBe("Remote");
  expect(writes).toBe(0);
  ctl.dispose();
});
test("invalid cloud data blocks replacement and account disposal cancels queued work", async () => {
  let writes = 0;
  const ctl = new SyncController(
    id,
    {
      load: async () => ({ routines: "bad" }),
      save: async () => {
        writes++;
      },
    },
    store(),
  );
  await ctl.start();
  expect(ctl.view.status).toBe("error");
  expect(await ctl.flush()).toBe(false);
  ctl.dispose();
  expect(writes).toBe(0);
});
test("in-flight writes are serialized and edits made during an upload are not dropped", async () => {
  let release: () => void = () => {};
  const blocker = new Promise<void>((accept) => {
      release = accept;
    }),
    writes: string[] = [];
  const ctl = new SyncController(
    id,
    {
      load: async () => null,
      save: async (snapshot) => {
        writes.push(snapshot.profile.name ?? "");
        if (writes.length === 1) await blocker;
      },
    },
    store(),
    () => () => {},
  );
  await ctl.start();
  ctl.edit((snapshot) => {
    snapshot.profile.name = "First";
  });
  const upload = ctl.flush();
  ctl.edit((snapshot) => {
    snapshot.profile.name = "Second";
  });
  release();
  await upload;
  expect(writes).toEqual(["First", "Second"]);
  expect(ctl.view.status).toBe("synced");
  ctl.dispose();
});
test("fingerprints are stable across JSONB object ordering", () => {
  expect(fingerprint({ a: 1, b: { x: 2, y: 3 } })).toBe(
    fingerprint({ b: { y: 3, x: 2 }, a: 1 }),
  );
});
test("overlapping recovery reads ignore stale results and preserve both conflict copies", async () => {
  const storage = store(),
    local = createDefaultSnapshot(),
    first = createDefaultSnapshot(),
    second = createDefaultSnapshot();
  local.profile.name = "Local";
  first.profile.name = "Stale";
  second.profile.name = "Current";
  storage.setItem(accountCacheKey(id), JSON.stringify(local));
  let release: (value: Snapshot) => void = () => {},
    calls = 0;
  const delayed = new Promise<Snapshot>((resolve) => {
    release = resolve;
  });
  const ctl = new SyncController(
    id,
    {
      load: async () => (++calls === 1 ? delayed : second),
      save: async () => {},
    },
    storage,
  );
  const initial = ctl.start();
  await ctl.start();
  release(first);
  await initial;
  expect(ctl.view.status).toBe("conflict");
  ctl.resolve("cloud");
  expect(ctl.view.snapshot?.profile.name).toBe("Current");
  expect(
    JSON.parse(
      storage.getItem(
        `${accountCacheKey(id)}:cloud-conflict:${fingerprint(second)}`,
      ) ?? "{}",
    ).profile.name,
  ).toBe("Current");
  expect(
    JSON.parse(
      storage.getItem(
        `${accountCacheKey(id)}:local-conflict:${fingerprint(local)}`,
      ) ?? "{}",
    ).profile.name,
  ).toBe("Local");
  ctl.dispose();
});

test("clean devices refresh cloud changes without a conflict", async () => {
  let remote = createDefaultSnapshot();
  const storage = store();
  const ctl = new SyncController(
    id,
    {
      load: async () => remote,
      save: async (value) => {
        remote = structuredClone(value);
      },
    },
    storage,
    () => () => {},
  );
  await ctl.start();
  ctl.edit((value) => {
    value.profile.name = "Saved here";
  });
  await ctl.flush();
  remote = structuredClone(remote);
  remote.profile.name = "Saved on phone";
  await ctl.refresh();
  expect(ctl.view.status).toBe("synced");
  expect(ctl.view.snapshot?.profile.name).toBe("Saved on phone");
  expect(JSON.parse(storage.getItem(accountCacheKey(id))!).profile.name).toBe(
    "Saved on phone",
  );
  ctl.dispose();
});

test("pending edits are not replaced by automatic refresh", async () => {
  const remote = createDefaultSnapshot();
  let reads = 0;
  const ctl = new SyncController(
    id,
    {
      load: async () => {
        reads++;
        return remote;
      },
      save: async () => {},
    },
    store(),
    () => () => {},
  );
  await ctl.start();
  ctl.edit((value) => {
    value.profile.name = "Pending";
  });
  await ctl.refresh();
  expect(reads).toBe(1);
  expect(ctl.view.snapshot?.profile.name).toBe("Pending");
  ctl.dispose();
});

test("a rejected stale upload requires a choice and backs up both devices", async () => {
  const { RemoteStateChanged } =
    await import("../../src/lib/supabase/state-repository");
  const storage = store();
  let remote = createDefaultSnapshot(),
    writes = 0;
  const ctl = new SyncController(
    id,
    {
      load: async () => remote,
      save: async () => {
        writes++;
        throw new RemoteStateChanged();
      },
    },
    storage,
    () => () => {},
  );
  await ctl.start();
  ctl.edit((value) => {
    value.profile.name = "Here";
  });
  remote = structuredClone(remote);
  remote.profile.name = "Other device";
  expect(await ctl.flush()).toBe(false);
  expect(ctl.view.status).toBe("conflict");
  expect(writes).toBe(1);
  expect(
    JSON.parse(
      storage.getItem(
        `${accountCacheKey(id)}:cloud-conflict:${fingerprint(remote)}`,
      )!,
    ).profile.name,
  ).toBe("Other device");
  expect(() => ctl.edit(() => {})).toThrow();
  ctl.resolve("cloud");
  expect(ctl.view.snapshot?.profile.name).toBe("Other device");
  ctl.dispose();
});

test("automatic cloud refresh waits for unsaved form drafts", async () => {
  let remote = createDefaultSnapshot();
  const ctl = new SyncController(
    id,
    { load: async () => remote, save: async () => {} },
    store(),
    () => () => {},
  );
  await ctl.start();
  const release = ctl.holdRefresh();
  remote = structuredClone(remote);
  remote.profile.name = "Remote change";
  await ctl.refresh();
  expect(ctl.view.snapshot?.profile.name).not.toBe("Remote change");
  release();
  release();
  await ctl.refresh();
  expect(ctl.view.snapshot?.profile.name).toBe("Remote change");
  ctl.dispose();
});
