import Whiteboard from "@/components/Whiteboard";
import { requireAdminUser } from "@/lib/auth";

export default async function HomePage() {
  const adminUser = await requireAdminUser();

  return <Whiteboard userId={adminUser.id} userEmail={adminUser.email} />;
}
