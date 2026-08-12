import assert from "node:assert/strict";
import test from "node:test";

import { createEurofolioAuth } from "@/server/auth-factory";
import { createTestDatabase } from "@/server/test/database";

const secret = "test-better-auth-secret-at-least-thirty-two-characters";

test("Better Auth bootstraps exactly one owner and signs that owner in", async () => {
  const { db, close } = await createTestDatabase();
  try {
    const bootstrapAuth = createEurofolioAuth({
      db,
      secret,
      baseURL: "http://localhost:3000",
      allowBootstrap: true,
    });
    const first = await bootstrapAuth.api.signUpEmail({
      body: { name: "Owner", email: "owner@example.com", password: "correct-horse-battery" },
    });
    assert.equal(first.user.email, "owner@example.com");

    await assert.rejects(() =>
      bootstrapAuth.api.signUpEmail({
        body: { name: "Intruder", email: "other@example.com", password: "correct-horse-battery" },
      }),
    );

    const signedIn = await bootstrapAuth.api.signInEmail({
      body: { email: "owner@example.com", password: "correct-horse-battery" },
    });
    assert.equal(signedIn.user.email, "owner@example.com");

    const productionAuth = createEurofolioAuth({
      db,
      secret,
      baseURL: "http://localhost:3000",
    });
    await assert.rejects(() =>
      productionAuth.api.signUpEmail({
        body: { name: "No signup", email: "blocked@example.com", password: "correct-horse-battery" },
      }),
    );
  } finally {
    close();
  }
});
