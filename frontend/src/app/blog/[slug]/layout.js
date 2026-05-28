// Server layout for /blog/[slug] — provides per-post SEO metadata
// (title, description, canonical, OG) and Article + BreadcrumbList
// JSON-LD so individual posts can show up as rich results in Google.
//
// The article body itself is rendered by the client component at
// `./page.js`; this layout only handles the server-side SEO surface.

import { serverFetchSafe } from '@/lib/serverApi';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rupalsha.com';

async function getBlog(slug) {
  return serverFetchSafe(`/blogs/${encodeURIComponent(slug)}`, {
    revalidate: 300,
    tags: ['blogs', `blog:${slug}`],
  });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getBlog(slug);
  const blog = data?.blog;
  if (!blog) {
    return { title: 'Article — Rupalsha Blog' };
  }
  const title = `${blog.metaTitle || blog.title} | Rupalsha Blog`;
  const description = blog.metaDescription
    || (blog.excerpt || '').slice(0, 160)
    || (blog.content || '').replace(/<[^>]+>/g, '').slice(0, 160);
  const url = `${SITE_URL}/blog/${blog.slug}`;
  const image = blog.coverImage?.url || blog.image?.url;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: image ? [{ url: image }] : undefined,
      publishedTime: blog.publishedAt || blog.createdAt,
      modifiedTime: blog.updatedAt,
      authors: blog.author?.name ? [blog.author.name] : undefined,
    },
  };
}

export default async function BlogPostLayout({ children, params }) {
  const { slug } = await params;
  const data = await getBlog(slug);
  const blog = data?.blog;

  if (!blog) return children;

  const url = `${SITE_URL}/blog/${blog.slug}`;
  const image = blog.coverImage?.url || blog.image?.url;

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: blog.metaDescription
      || (blog.excerpt || '').slice(0, 5000)
      || undefined,
    image: image || undefined,
    datePublished: blog.publishedAt || blog.createdAt,
    dateModified: blog.updatedAt || blog.publishedAt || blog.createdAt,
    author: {
      '@type': 'Person',
      name: blog.author?.name || 'Rupalsha',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Rupalsha',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/Rupalsha.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: blog.title, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {children}
    </>
  );
}
