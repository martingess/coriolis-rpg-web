import { redirect } from "next/navigation";

import { getCompactCharacterHref } from "@/lib/roster-routes";

export const dynamic = "force-dynamic";

type CharacterPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CharacterPage({ params }: CharacterPageProps) {
  const { id } = await params;

  redirect(getCompactCharacterHref(id));
}
