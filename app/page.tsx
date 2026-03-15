import { RosterApp } from "@/components/roster-app";
import { inventoryCatalog } from "@/lib/coriolis-presets";
import { getRoster } from "@/lib/roster";
import { getTeam } from "@/lib/team";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [characters, team] = await Promise.all([getRoster(), getTeam()]);

  return (
    <RosterApp
      initialCharacters={characters}
      inventoryCatalog={inventoryCatalog}
      initialTeam={team}
    />
  );
}
