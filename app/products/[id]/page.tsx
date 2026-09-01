import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import ProductVariants from "@/components/products/ProductVariants";
import { authOptions } from "@/lib/auth";
import { getProductDetails } from "@/lib/commerce/products/service";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductPage({ params }: Params) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const product = await getProductDetails(id, Number(session.user.id));

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link
            href="/products"
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            ← Products
          </Link>

          <div className="flex items-center gap-3 mt-3">
            <h1 className="text-3xl font-bold">{product.name}</h1>

            <span
              className={`
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
          </div>

          {product.brand && (
            <p className="text-gray-500 mt-1">{product.brand}</p>
          )}
        </div>

        <div className="flex gap-3">
          <Link
            href={`/products/${product.id}/edit`}
            className="
              border
              px-4
              py-2.5
              rounded-lg
              font-medium
              hover:bg-gray-50
            "
          >
            Edit Product
          </Link>
        </div>
      </div>

      {/* OVERVIEW */}

      <section className="bg-white border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-5">Overview</h2>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-500">Brand</div>

            <div className="font-medium mt-1">{product.brand || "—"}</div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Category</div>

            <div className="font-medium mt-1">{product.category || "—"}</div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Variants</div>

            <div className="font-medium mt-1">{product.variants.length}</div>
          </div>
        </div>

        {product.description && (
          <div className="mt-6 pt-6 border-t">
            <div className="text-sm text-gray-500 mb-2">Description</div>

            <p className="text-gray-700 whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        )}
      </section>

      {/* MEDIA */}

      <section className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold">Product Media</h2>

            <p className="text-sm text-gray-500 mt-1">
              Images used for this product.
            </p>
          </div>

          <button
            className="
              border
              px-4
              py-2
              rounded-lg
              text-sm
              font-medium
              hover:bg-gray-50
            "
          >
            + Add Media
          </button>
        </div>

        {product.media.length === 0 ? (
          <div className="border border-dashed rounded-xl py-12 text-center">
            <div className="text-4xl mb-3">🖼️</div>

            <p className="font-medium">No product images</p>

            <p className="text-sm text-gray-500 mt-1">
              Add images from your Media Library.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {product.media.map((media: any) => (
              <div
                key={media.id}
                className="
                  relative
                  aspect-square
                  rounded-xl
                  overflow-hidden
                  border
                  bg-gray-50
                "
              >
                <img
                  src={media.secure_url}
                  alt={media.original_name || "Product image"}
                  className="w-full h-full object-cover"
                />

                {media.is_primary && (
                  <div
                    className="
                      absolute
                      top-2
                      left-2
                      bg-white
                      px-2
                      py-1
                      rounded-full
                      text-xs
                      font-semibold
                      shadow
                    "
                  >
                    ★ Primary
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* VARIANTS */}

      <ProductVariants
        productId={Number(product.id)}
        initialVariants={product.variants}
      />
    </div>
  );
}
