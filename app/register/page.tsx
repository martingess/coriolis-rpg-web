import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/login?error=Account%20creation%20is%20restricted%20to%20the%20superadmin.");
}
