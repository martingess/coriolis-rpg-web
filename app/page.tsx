import { RosterApp } from "@/components/roster-app";
import { inventoryCatalog } from "@/lib/coriolis-presets";
import { getRoster } from "@/lib/roster";

export const dynamic = "force-dynamic";

export default async function Home() {
  const characters = await getRoster();

  return (
    <RosterApp
      initialCharacters={characters}
      inventoryCatalog={inventoryCatalog}
    />
  );
}
