import Link from "next/link";
import { Package, Plus, Search } from "lucide-react";
import { DizitoButton, DizitoCard, DizitoPage, DizitoPageHeader, DizitoState } from "@/components/dizito/DizitoUI";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProducts } from "@/lib/commerce/products/service";

export default async function ProductsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const products = await getProducts(Number(session.user.id));

  return (
    <div className="max-w-7xl mx-auto">
      {/* HEADER */}
      <DizitoPageHeader eyebrow="Commerce context" title="Products" description="Manage the canonical products that Dizito can understand, feature and carry into marketing decisions." action={<Link href="/products/new"><DizitoButton><Plus size={15}/>Add product</DizitoButton></Link>}/>
      <div className="hidden">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>

          <p className="text-gray-500 mt-1">
            Manage your products, variants and product media.
          </p>
        </div>

        <Link
          href="/products/new"
          className="
            inline-flex
            items-center
            justify-center
            bg-blue-600
            text-white
            px-5
            py-3
            rounded-lg
            font-medium
            hover:bg-blue-700
          "
        >
          + Add Product
        </Link>
      </div>

      {/* FILTER BAR */}
      <DizitoCard tone="soft" className="mb-5">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Search products..."
            className="
              flex-1
              border
              rounded-lg
              px-4
              py-2.5
              outline-none
              focus:ring-2
              focus:ring-blue-500
            "
          />

          <button
            className="
              border
              rounded-lg
              px-4
              py-2.5
              text-gray-700
              hover:bg-gray-50
            "
          >
            All
          </button>

          <button
            className="
              border
              rounded-lg
              px-4
              py-2.5
              text-gray-700
              hover:bg-gray-50
            "
          >
            Active
          </button>

          <button
            className="
              border
              rounded-lg
              px-4
              py-2.5
              text-gray-700
              hover:bg-gray-50
            "
          >
            Draft
          </button>
        </div>
      </DizitoCard>

      {/* PRODUCTS */}
      <DizitoCard className="overflow-hidden !p-0">
        {products.length === 0 ? (
          <div className="py-20 text-center px-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-violet-600"><Package size={22}/></div>

            <h2 className="text-xl font-semibold">No products yet</h2>

            <p className="text-gray-500 mt-2 mb-6">
              Create your first product to start building your catalog.
            </p>

            <Link
              href="/products/new"
              className="
                inline-flex
                bg-blue-600
                text-white
                px-5
                py-3
                rounded-lg
                font-medium
                hover:bg-blue-700
              "
            >
              Create Product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-4 text-sm font-semibold">
                    Product
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold">
                    Category
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold">
                    Status
                  </th>

                  <th className="text-right px-6 py-4 text-sm font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {products.map((product: any) => (
                  <tr
                    key={product.id}
                    className="border-b last:border-b-0 hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/products/${product.id}`}
                        className="font-bold hover:text-violet-600"
                      >
                        {product.name}
                      </Link>

                      {product.brand && (
                        <div className="text-sm text-gray-500 mt-1">
                          {product.brand}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {product.category || "—"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`
                          inline-flex
                          px-2.5
                          py-1
                          rounded-full
                          text-xs
                          font-medium
                          ${
                            product.status === "active"
                              ? "bg-green-100 text-green-700"
                              : product.status === "archived"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-yellow-100 text-yellow-700"
                          }
                        `}
                      >
                        {product.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/products/${product.id}`}
                        className="text-violet-700 font-bold hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DizitoCard>
    </div>
  );
}
