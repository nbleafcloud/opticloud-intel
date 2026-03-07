import { getDraftBySlug } from "@/lib/blobs";
import Header from "@/components/Header";
import BlogContent from "@/components/BlogContent";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getDraftBySlug(slug);
  if (!post) return { title: "Not Found" };

  return {
    title: `${post.title} | Opticloud Blog`,
    description: post.metaDescription,
    keywords: post.keywords.join(", "),
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      type: "article",
      publishedTime: post.publishedAt || undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getDraftBySlug(slug);
  if (!post) notFound();

  const readTime = Math.max(
    1,
    Math.ceil(post.content.split(/\s+/).length / 200)
  );
  const publishDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: "OptiCloud" },
    publisher: {
      "@type": "Organization",
      name: "OptiCloud",
      url: "https://www.opticloud.com",
    },
    keywords: post.keywords.join(", "),
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div
        className="fixed inset-0 opacity-100 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="relative mx-auto max-w-3xl px-6 py-10">
        {/* Post header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4 text-xs text-white/40">
            <span>{publishDate}</span>
            <span>&middot;</span>
            <span>{readTime} min read</span>
            <span>&middot;</span>
            <span className="text-orange-400">{post.track}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white/95 leading-tight mb-4">
            {post.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            {post.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] text-white/40"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Markdown content */}
        <BlogContent content={post.content} />

        {/* Source articles */}
        {post.sourceArticles.length > 0 && (
          <div className="mt-12 pt-8 border-t border-white/8">
            <h2 className="text-xs font-semibold tracking-wider text-white/40 uppercase mb-4">
              Sources
            </h2>
            <ul className="space-y-2">
              {post.sourceArticles.map((src) => (
                <li key={src.link}>
                  <a
                    href={src.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-orange-400 hover:text-orange-300 transition"
                  >
                    {src.title}
                  </a>
                  <span className="text-xs text-white/30 ml-2">
                    — {src.source}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Back link */}
        <div className="mt-12">
          <a
            href="/blog"
            className="text-sm text-white/40 hover:text-white/70 transition"
          >
            &larr; Back to blog
          </a>
        </div>
      </article>
    </div>
  );
}
