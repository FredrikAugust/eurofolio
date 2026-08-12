import assert from "node:assert/strict";
import test from "node:test";

import { sql } from "drizzle-orm";

import { accounts } from "@/server/db/schema";
import { createTestDatabase } from "@/server/test/database";

test("migration supports insert, uniqueness, rollback, and batch reads", async () => {
  const { db, close } = await createTestDatabase();
  const now = "2026-01-01T00:00:00.000Z";
  await db.insert(accounts).values({
    id: "a",
    name: "Primary",
    institution: "Bank",
    defaultCurrency: "EUR",
    createdAt: now,
    updatedAt: now,
  });
  await assert.rejects(() =>
    db.insert(accounts).values({
      id: "b",
      name: "Primary",
      institution: "Other",
      defaultCurrency: "EUR",
      createdAt: now,
      updatedAt: now,
    }),
  );

  await assert.rejects(() =>
    db.batch([
      db.insert(accounts).values({
        id: "c",
        name: "Rollback me",
        institution: "",
        defaultCurrency: "EUR",
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(accounts).values({
        id: "d",
        name: "Primary",
        institution: "",
        defaultCurrency: "EUR",
        createdAt: now,
        updatedAt: now,
      }),
    ]),
  );
  const [countResult, rows] = await db.batch([
    db.get<{ count: number }>(sql`select count(*) as count from accounts`),
    db.select().from(accounts),
  ]);
  assert.equal(countResult?.count, 1);
  assert.equal(rows.length, 1);
  close();
});
