import { notFound } from "next/navigation";

import { CompactCharacterSheet } from "@/components/compact-character-sheet";
import { getCurrentUser } from "@/lib/auth";
import { getRoster, getRosterReadonly } from "@/lib/roster";

export const dynamic = "force-dynamic";

type CompactCharacterPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CompactCharacterPage({
  params,
}: CompactCharacterPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const characters = currentUser ? await getRoster() : await getRosterReadonly();
  const character = characters.find((entry) => entry.id === id);

  if (!character) {
    notFound();
  }

  return (
    <CompactCharacterSheet
      character={character}
      characters={characters.map(({ id: characterId, name }) => ({
        id: characterId,
        name,
      }))}
    />
  );
}
