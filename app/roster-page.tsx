import { notFound } from "next/navigation";

import { RosterApp } from "@/components/roster-app";
import { getCurrentUser } from "@/lib/auth";
import { inventoryCatalog } from "@/lib/coriolis-presets";
import { getRoster, getRosterReadonly } from "@/lib/roster";
import { getTeam, getTeamReadonly } from "@/lib/team";

type RosterPageProps = {
  characterId?: string;
};

export async function RosterPage({ characterId }: RosterPageProps) {
  const currentUser = await getCurrentUser();
  const [characters, team] = await Promise.all(
    currentUser
      ? [getRoster(), getTeam()]
      : [getRosterReadonly(), getTeamReadonly()],
  );

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
