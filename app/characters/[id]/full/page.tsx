import { RosterPage } from "@/app/roster-page";

export const dynamic = "force-dynamic";

type FullCharacterPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function FullCharacterPage({ params }: FullCharacterPageProps) {
  const { id } = await params;

  return <RosterPage characterId={id} />;
}
