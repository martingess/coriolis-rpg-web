import { CompactTeamSheet } from "@/components/compact-team-sheet";
import { getCurrentUser } from "@/lib/auth";
import { getRoster, getRosterReadonly } from "@/lib/roster";
import { getTeam, getTeamReadonly } from "@/lib/team";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const currentUser = await getCurrentUser();
  const [characters, team] = await Promise.all([
    currentUser ? getRoster() : getRosterReadonly(),
    currentUser ? getTeam() : getTeamReadonly(),
  ]);

  return <CompactTeamSheet characters={characters} team={team} />;
}
