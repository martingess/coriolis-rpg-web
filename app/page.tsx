import { redirect } from "next/navigation";

import { TEAM_HREF } from "@/lib/roster-routes";

export default function Home() {
  redirect(TEAM_HREF);
}
