import { redirect } from "next/navigation";
import { getSessionClaims } from "@/lib/auth/session";

export default async function SettingsIndex() {
    const session = await getSessionClaims();
    redirect(`/app/${session.organizationId}/settings/profile`);
}
