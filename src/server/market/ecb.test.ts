import assert from "node:assert/strict";
import test from "node:test";

import { EcbProvider, parseEcbCsv } from "@/server/market/ecb";

const fixture = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-08-11,1.1673
EXR.D.DKK.EUR.SP00.A,D,DKK,EUR,SP00,A,2026-08-11,7.4748`;

test("ECB CSV validates and preserves foreign units per EUR", () => {
  const observations = parseEcbCsv(fixture, "2026-08-12T12:00:00.000Z");
  assert.equal(observations.length, 2);
  assert.deepEqual(observations[0], {
    baseCurrency: "EUR",
    quoteCurrency: "USD",
    provider: "ecb",
    rate: "1.1673",
    observedOn: "2026-08-11",
    retrievedAt: "2026-08-12T12:00:00.000Z",
    rawMetadata: { series: "EXR.D.USD.EUR.SP00.A" },
  });
});

test("ECB provider rejects HTTP failures and malformed responses", async () => {
  const failed = new EcbProvider(async () => new Response("no", { status: 503 }));
  await assert.rejects(() => failed.fetchLatest(), /503/);
  const malformed = new EcbProvider(async () => new Response("wrong,columns\na,b"));
  await assert.rejects(() => malformed.fetchLatest(), /missing required columns/);
});

test("ECB provider requests a bounded historical range", async () => {
  let requested = "";
  const provider = new EcbProvider(async (input) => {
    requested = String(input);
    return new Response(fixture);
  });
  const observations = await provider.fetchHistory("2026-08-01", "2026-08-11");
  assert.match(requested, /startPeriod=2026-08-01/);
  assert.match(requested, /endPeriod=2026-08-11/);
  assert.equal(observations.length, 2);
});
