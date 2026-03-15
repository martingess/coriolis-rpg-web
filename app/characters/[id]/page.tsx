import { RosterPage } from "@/app/roster-page";

export const dynamic = "force-dynamic";

type CharacterPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CharacterPage({ params }: CharacterPageProps) {
  const { id } = await params;

  return <RosterPage characterId={id} />;
}
