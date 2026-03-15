import { afterEach, describe, expect, it } from "vitest";

import { getRoster, seedRosterIfEmpty } from "@/lib/roster";
import { cleanupTestDatabases, createTestClient } from "@/tests/test-db";

afterEach(() => {
  cleanupTestDatabases();
});

describe("seeded roster behavior", () => {
  it("only inserts sample characters when the database is empty", async () => {
    const client = createTestClient();

    try {
      const firstLoad = await getRoster(client);

      expect(firstLoad).toHaveLength(2);
      expect(firstLoad.map((character) => character.name)).toEqual([
        "Sabah al-Malik",
        "Nassim Vale",
      ]);
      expect(firstLoad[0]).toMatchObject({
        originCulture: "firstcome",
        originSystem: "kua",
        upbringing: "stationary",
      });
      expect(firstLoad[1]).toMatchObject({
        originCulture: "zenithian",
        originSystem: "kua",
        upbringing: "privileged",
      });

      await seedRosterIfEmpty(client);
      const secondLoad = await getRoster(client);

      expect(secondLoad).toHaveLength(2);
      expect(await client.character.count()).toBe(2);
    } finally {
      await client.$disconnect();
    }
  });
});
