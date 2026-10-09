import Link from "next/link";
import { ArrowLeft, Pencil, Package, Image as ImageIcon, Layers3 } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import ProductVariants from "@/components/products/ProductVariants";
import ProductMediaManager from "@/components/products/ProductMediaManager";
import ProductShopifyPublish from "@/components/products/ProductShopifyPublish";
import ProductAmazonListing from "@/components/products/ProductAmazonListing";
import ProductWooCommerceCatalog from "@/components/products/ProductWooCommerceCatalog";
import ProductWooCommercePublish from "@/components/products/ProductWooCommercePublish";
import AmazonOfferLayer from "@/components/products/AmazonOfferLayerDynamic";
import { DizitoBadge, DizitoCard, DizitoPage, DizitoPageHeader, DizitoSectionHeader } from "@/components/dizito/DizitoUI";
import { authOptions } from "@/lib/auth";
import { getProductDetails } from "@/lib/commerce/products/service";

interface Params { params: Promise<{ id: string }> }
export default async function ProductPage({ params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const product = await getProductDetails(id, Number(session.user.id));
  if (!product) notFound();

  return (
    <DizitoPage className="px-4 sm:px-6">
      <Link href="/products" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"><ArrowLeft size={16} /> Products</Link>
      <DizitoPageHeader eyebrow="Product catalog" title={product.name} description={product.brand || "Manage canonical product details, media, variants, and supported channel workflows."} action={<Link href={`/products/${product.id}/edit`} className="dizito-button dizito-button-primary"><Pencil size={15} /> Edit product</Link>} />
      <div className="mb-5 flex flex-wrap gap-2"><DizitoBadge>{product.status}</DizitoBadge>{product.category && <DizitoBadge>{product.category}</DizitoBadge>}</div>
      <DizitoCard>
        <DizitoSectionHeader title="Product overview" description="Canonical product information shared across connected commerce channels." />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Brand</p><p className="mt-1 break-words font-semibold text-slate-800">{product.brand || "—"}</p></div>
          <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Category</p><p className="mt-1 break-words font-semibold text-slate-800">{product.category || "—"}</p></div>
          <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Variants</p><p className="mt-1 inline-flex items-center gap-2 font-semibold text-slate-800"><Package size={16} />{product.variants.length}</p></div>
        </div>
        {product.description && <div className="mt-5 border-t border-slate-100 pt-5"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{product.description}</p></div>}
      </DizitoCard>
      <div className="mt-5 space-y-5">
        <ProductShopifyPublish productId={String(product.id)} hasVariants={product.variants.length > 0} />
        <ProductWooCommercePublish product={product} />
        <ProductWooCommerceCatalog productId={String(product.id)} />
        <ProductAmazonListing productId={String(product.id)} />
        <AmazonOfferLayer productId={String(product.id)} />
      </div>
      <div className="mt-5">
        <DizitoCard>
          <DizitoSectionHeader title="Product media" description="Images attached to this product." />
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-500"><ImageIcon size={16} /> Manage product imagery</div>
          <ProductMediaManager productId={Number(product.id)} initialMedia={product.media} />
        </DizitoCard>
      </div>
      <div className="mt-5">
        <DizitoCard>
          <DizitoSectionHeader title="Variants" description="Variant-level identifiers and attributes for commerce workflows." action={<Layers3 size={18} className="text-violet-600" />} />
          <ProductVariants productId={Number(product.id)} initialVariants={product.variants} />
        </DizitoCard>
      </div>
    </DizitoPage>
  );
}
