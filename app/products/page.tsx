import Link from "next/link";
import { Plus } from "lucide-react";
import { DizitoButton, DizitoPageHeader } from "@/components/dizito/DizitoUI";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProducts } from "@/lib/commerce/products/service";
import ProductCatalog from "@/components/products/ProductCatalog";

export default async function ProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const products = await getProducts(Number(session.user.id));

  return (
    <div className="mx-auto max-w-7xl">
      <DizitoPageHeader
        eyebrow="Commerce context"
        title="Products"
        description="Manage the canonical products that Dizito can understand, feature and carry into marketing decisions."
        action={<Link href="/products/new"><DizitoButton><Plus size={15} />Add product</DizitoButton></Link>}
      />
      <ProductCatalog products={products} />
    </div>
  );
}
