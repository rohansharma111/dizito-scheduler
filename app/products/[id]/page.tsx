import Link from "next/link";
import { ArrowLeft, Pencil, Package, Image as ImageIcon, Layers3, ShoppingBag, ChevronDown } from "lucide-react";
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

function WorkflowPanel({ title, description, children, defaultOpen = false }: { title: string; description: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 transition hover:bg-slate-50 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block font-bold text-slate-900">{title}</span>
          <span className="mt-1 block text-sm leading-5 text-slate-500">{description}</span>
        </span>
        <ChevronDown size={18} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-100 p-3 sm:p-5">{children}</div>
    </details>
  );
}

export default async function ProductPage({ params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const product = await getProductDetails(id, Number(session.user.id));
  if (!product) notFound();

  return (
    <DizitoPage className="px-4 sm:px-6">
      <Link href="/products" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"><ArrowLeft size={16} /> All products</Link>

      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <DizitoPageHeader
          eyebrow="Product details"
          title={product.name}
          description={product.brand ? `${product.brand}${product.category ? ` · ${product.category}` : ""}` : "Manage product information, images, variants and connected store listings."}
          action={<Link href={`/products/${product.id}/edit`} className="dizito-button dizito-button-primary"><Pencil size={15} /> Edit product</Link>}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <DizitoBadge>{product.status}</DizitoBadge>
          {product.category && <DizitoBadge>{product.category}</DizitoBadge>}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Brand</p>
            <p className="mt-1 break-words text-sm font-bold text-slate-900">{product.brand || "Not set"}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p>
            <p className="mt-1 break-words text-sm font-bold text-slate-900">{product.category || "Not set"}</p>
          </div>
          <div className="col-span-2 rounded-xl bg-violet-50/70 p-3 sm:col-span-1 sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Variants</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-slate-900"><Package size={16} />{product.variants.length} {product.variants.length === 1 ? "variant" : "variants"}</p>
          </div>
        </div>
        {product.description && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{product.description}</p>
          </div>
        )}
      </div>

      <section aria-labelledby="channel-workflows-heading" className="mb-7">
        <div className="mb-3">
          <h2 id="channel-workflows-heading" className="text-lg font-extrabold tracking-tight text-slate-950">Store connections</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">Open a channel only when you need to publish or manage its listing.</p>
        </div>
        <div className="space-y-3">
          <WorkflowPanel title="Shopify" description="Prepare and publish this product to Shopify">
            <ProductShopifyPublish productId={String(product.id)} hasVariants={product.variants.length > 0} />
          </WorkflowPanel>
          <WorkflowPanel title="WooCommerce publishing" description="Prepare and publish the product to a connected WooCommerce store">
            <ProductWooCommercePublish product={product} />
          </WorkflowPanel>
          <WorkflowPanel title="WooCommerce catalog" description="View and match products from your connected store">
            <ProductWooCommerceCatalog productId={String(product.id)} />
          </WorkflowPanel>
          <WorkflowPanel title="Amazon listing" description="Manage Amazon product identity and listing content">
            <ProductAmazonListing productId={String(product.id)} />
          </WorkflowPanel>
          <WorkflowPanel title="Amazon offer" description="Manage offer details separately from product content">
            <AmazonOfferLayer productId={String(product.id)} />
          </WorkflowPanel>
        </div>
      </section>

      <section aria-labelledby="product-assets-heading" className="mb-7">
        <div className="mb-3">
          <h2 id="product-assets-heading" className="text-lg font-extrabold tracking-tight text-slate-950">Product assets</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">Keep the images and variants for this product organized below.</p>
        </div>
        <div className="space-y-3">
          <WorkflowPanel title="Product images" description="Add, remove and organize product imagery" defaultOpen>
            <div className="mb-3 flex items-center gap-2 text-sm text-slate-500"><ImageIcon size={16} /> Images attached to this product</div>
            <ProductMediaManager productId={Number(product.id)} initialMedia={product.media} />
          </WorkflowPanel>
          <WorkflowPanel title={`Variants (${product.variants.length})`} description="Manage variant-level identifiers and attributes">
            <div className="mb-3 flex items-center gap-2 text-sm text-slate-500"><Layers3 size={16} /> Variant details used by commerce workflows</div>
            <ProductVariants productId={Number(product.id)} initialVariants={product.variants} />
          </WorkflowPanel>
        </div>
      </section>
    </DizitoPage>
  );
}
