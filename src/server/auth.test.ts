import assert from "node:assert/strict";
import test from "node:test";

import {
  redactSecrets,
  secureEqual,
  verifyOwnerToken,
} from "@/server/auth";

const token = "correct-owner-token-with-at-least-32-characters";

test("owner tokens use fixed digest timing-safe comparison", () => {
  assert.equal(secureEqual("a", "a"), true);
  assert.equal(secureEqual("a", "b"), false);
  assert.equal(verifyOwnerToken(token, token), true);
  assert.equal(verifyOwnerToken("short", token), false);
});

test("secret-like log text is redacted", () => {
  assert.equal(redactSecrets(`Authorization: Bearer ${token}`).includes(token), false);
  assert.equal(redactSecrets(`token=${token}`).includes(token), false);
});
