import { notFound } from "next/navigation";

import { RosterApp } from "@/components/roster-app";
import { inventoryCatalog } from "@/lib/coriolis-presets";
import { getRoster } from "@/lib/roster";
import { getTeam } from "@/lib/team";

type RosterPageProps = {
  characterId?: string;
};

export async function RosterPage({ characterId }: RosterPageProps) {
  const [characters, team] = await Promise.all([getRoster(), getTeam()]);

  if (characterId && !characters.some((character) => character.id === characterId)) {
    notFound();
  }

  return (
    <RosterApp
      initialCharacters={characters}
      inventoryCatalog={inventoryCatalog}
      initialTeam={team}
    />
  );
}
