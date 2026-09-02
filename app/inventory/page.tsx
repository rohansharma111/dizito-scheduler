import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getInventory, getLocations } from "@/lib/commerce/inventory/service";

import InventoryClient from "@/components/inventory/InventoryClient";

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = Number(session.user.id);

  const [inventory, locations] = await Promise.all([
    getInventory(userId),
    getLocations(userId),
  ]);

  return <InventoryClient initialInventory={inventory} locations={locations} />;
}
