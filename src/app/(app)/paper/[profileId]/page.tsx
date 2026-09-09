import { notFound } from "next/navigation";
import { getProfile } from "@/lib/paper/profiles";
import ProfileScreen from "./ProfileScreen";

export const dynamic = "force-dynamic";

export default async function PaperProfilePage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  if (!getProfile(profileId)) notFound();
  return <ProfileScreen profileId={profileId} />;
}
