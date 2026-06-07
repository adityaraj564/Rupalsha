// Server-rendered policy article shell — used by the standalone
// /privacy, /terms, /shipping and /returns pages so each policy has
// its own crawlable URL (a hard requirement for Google Merchant
// Center / Google Shopping in India).
//
// Content is pulled from the existing PageContent admin model
// (`/api/pages/:key`), so editors keep using the same single screen
// in /content-admin/pages — no duplicate copies of the policy text.

export default function PolicyArticle({ page, fallbackTitle }) {
  const title = page?.title || fallbackTitle;
  const html = page?.content || '<p>This content is being updated. Please check back shortly.</p>';
  const updated = page?.updatedAt ? new Date(page.updatedAt) : null;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 animate-fade-in">
      <header className="mb-8 text-center">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal dark:text-white">
          {title}
        </h1>
        {updated && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Last updated:{' '}
            {updated.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
      </header>

      <div
        className="card p-6 sm:p-8 text-sm sm:text-base text-gray-700 dark:text-gray-300 prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
