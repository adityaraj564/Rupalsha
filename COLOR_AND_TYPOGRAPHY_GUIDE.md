# Rupalsha — Color & Typography Reference

A complete map of every brand color and font used in the Rupalsha frontend, with the components / pages where each one shows up.

> Source of truth: [`tailwind.config.js`](frontend/tailwind.config.js), [`globals.css`](frontend/src/app/globals.css), [`layout.js`](frontend/src/app/layout.js)

---

## 1. Brand Color Palette

Defined in [`tailwind.config.js`](frontend/tailwind.config.js#L9-L17):

| Token | Hex | Usage in design |
|---|---|---|
| `brand-green` | `#1F3A2F` | Primary action color — buttons, links, footer, active tabs |
| `brand-gold` | `#C8A951` | Premium accent — ratings, badges, "Featured" pills, scrollbar hover |
| `brand-cream` | `#F9F7F3` | Page background (light mode) |
| `brand-beige` | `#E8DCCB` | Decorative borders, scrollbar track, swiper bullets |
| `brand-charcoal` | `#2B2B2B` | Primary text color (headings + body in light mode) |

### Where each brand color appears

#### `brand-green` — `#1F3A2F`
The signature deep forest green. Used as the primary CTA color across the site.

| Component / Page | Usage |
|---|---|
| [`Footer.js`](frontend/src/components/Footer.js#L30) | Footer background (`bg-brand-green text-white`) |
| [`btn-primary` class](frontend/src/app/globals.css#L170) | All primary buttons (Add to Cart, Buy Now, Save, Submit, etc.) |
| [`btn-secondary` class](frontend/src/app/globals.css#L176) | Outline border + text, fills on hover |
| [`Header.js`](frontend/src/components/Header.js) | Hover state on icons (search, wishlist, cart, profile, theme toggle) |
| [`ProductCard.js`](frontend/src/components/ProductCard.js#L111) | "Featured" badge background, "Sold Out" overlay (`bg-brand-green/90`), title hover |
| [`SizeGuideModal.js`](frontend/src/components/SizeGuideModal.js#L53) | Active tab in size guide modal |
| [`profile/page.js`](frontend/src/app/profile/page.js#L322) | Active sidebar tab (Personal Info / Addresses / Password) |
| [`orders/[id]/page.js`](frontend/src/app/orders/[id]/page.js) | "All Orders" back button border + hover fill |
| `Toaster` config in [`layout.js`](frontend/src/app/layout.js#L57) | Toast notification background |
| Swiper bullets, focus rings, link underlines | Throughout product / category pages |

#### `brand-gold` — `#C8A951`
Premium accent — signals quality, ratings, special offers.

| Component / Page | Usage |
|---|---|
| [`Footer.js`](frontend/src/components/Footer.js#L45) | Hover color for social icons, links, contact info |
| [`ProductCard.js`](frontend/src/components/ProductCard.js#L106) | "New" badge background, star ratings (`text-brand-gold`) |
| [`btn-gold` class](frontend/src/app/globals.css#L189) | Premium / promo CTA buttons |
| Scrollbar thumb hover ([`globals.css`](frontend/src/app/globals.css#L227)) | `::-webkit-scrollbar-thumb:hover` |
| Hexagonal background pattern ([`globals.css`](frontend/src/app/globals.css#L322-L329)) | Stroke color in `.hexagon-bg` SVG |
| Shopping-icons doodle background | Stroke color in `.shopping-icons-bg` SVG |
| `from-brand-gold/5` gradient washes | Address-form gradient backgrounds, profile cards |

#### `brand-cream` — `#F9F7F3`
Off-white page background.

| Component / Page | Usage |
|---|---|
| [`layout.js`](frontend/src/app/layout.js#L48) | `<body>` background in light mode |
| [`globals.css`](frontend/src/app/globals.css#L18) | Default `body` declaration |
| Scrollbar track ([`globals.css`](frontend/src/app/globals.css#L218)) | `::-webkit-scrollbar-track` |
| `SizeGuideModal.js` ([line 84](frontend/src/components/SizeGuideModal.js#L84)) | "How to measure" info card |
| Notifications page ([`notifications/page.js`](frontend/src/app/notifications/page.js)) | Sticky tab bar backdrop |
| Page-section backgrounds | Used for soft contrast against pure white cards |

#### `brand-beige` — `#E8DCCB`
Subtle warm neutral — used sparingly.

| Component / Page | Usage |
|---|---|
| Scrollbar thumb ([`globals.css`](frontend/src/app/globals.css#L223)) | Default scroll thumb color |
| Swiper pagination bullet ([`globals.css`](frontend/src/app/globals.css#L264)) | Inactive carousel dot |
| Decorative dividers / chips | Light-mode-only decorative trim |

#### `brand-charcoal` — `#2B2B2B`
The primary text color.

| Component / Page | Usage |
|---|---|
| [`layout.js`](frontend/src/app/layout.js#L48) | Body text color |
| `section-title` class ([`globals.css`](frontend/src/app/globals.css#L208)) | All section headings |
| All page titles, product names, prices | `text-brand-charcoal` everywhere |
| Notifications page title, profile headings, etc. | Default heading color |

---

## 2. Dark Mode Palette

Dark mode is `class`-based (`html.dark`) — toggled via [`Header.js`](frontend/src/components/Header.js) theme button. Auto-applied at boot from [`layout.js`](frontend/src/app/layout.js#L26-L29).

Defined in [`globals.css`](frontend/src/app/globals.css#L31-L130):

| Light token | Dark substitute | Hex |
|---|---|---|
| `bg-brand-cream` (body) | `gray-950` | `#030712` |
| `bg-white` (cards) | `gray-800` | `#1F2937` |
| `bg-gray-50/100` | `gray-700` | `#374151` |
| `text-brand-charcoal` | `gray-100` | `#F3F4F6` |
| `text-brand-green` | Cream | **`#F8F0E8`** |
| `text-gray-700` | `gray-300` | `#D1D5DB` |
| `text-gray-600` | `gray-400` | `#9CA3AF` |
| `border-gray-100/200` | `gray-700/600` | `#374151` / `#4B5563` |
| `bg-green-50` | `green-900/20` | `rgba(6, 78, 59, 0.2)` |

### Special dark-mode-only colors

- **`#F8F0E8`** (warm cream) — replaces `brand-green` for text, links, and accents in dark mode. Hard-coded (not tokenized) in:
  - [`ProductCard.js`](frontend/src/components/ProductCard.js#L139) — title hover
  - [`profile/page.js`](frontend/src/app/profile/page.js#L360) — Edit / link colors
  - [`btn-secondary`](frontend/src/app/globals.css#L181) — outline button
- **`#2D6A4F`** — dark-mode `btn-secondary` hover text color override ([`globals.css`](frontend/src/app/globals.css#L185))
- **`#1F2937`** (gray-800) — card / panel surface
- **`#030712`** (gray-950) — page background

---

## 3. Functional / Status Colors

These are stock Tailwind palettes used consistently for status states.

| Purpose | Light | Dark | Where |
|---|---|---|---|
| Success | `emerald-100` / `emerald-700` | `emerald-900/30` / `emerald-300` | Order confirmed, delivered, refund credited (`NotificationBell`, `notifications/page.js`) |
| Warning / Premium | `amber-300 → amber-400` gradient | `amber-300 → amber-500` | Wallet stat card in profile, wallet notifications |
| Danger | `red-500` | `red-400` | Cart/wishlist count badges, delete buttons, sign-out, `div.warning` border |
| Info | `blue-50 → indigo-50` gradient | `blue-900/20 → indigo-900/20` | Google-linked notice in password tab |
| Notification: Order | `emerald-100` / `emerald-700` | `emerald-900/30` / `emerald-300` | [`notifications/page.js`](frontend/src/app/notifications/page.js) `CATEGORY_META.order` |
| Notification: Wallet | `amber-100` / `amber-700` | `amber-900/30` / `amber-300` | `CATEGORY_META.wallet` |
| Notification: Offer | `pink-100` / `pink-700` | `pink-900/30` / `pink-300` | `CATEGORY_META.offer` |
| Notification: Security | `blue-100` / `blue-700` | `blue-900/30` / `blue-300` | `CATEGORY_META.security` |
| Notification: Alert | `violet-100` / `violet-700` | `violet-900/30` / `violet-300` | `CATEGORY_META.alert` |

### Profile avatar gradients
[`profile/page.js`](frontend/src/app/profile/page.js#L184-L195) uses a deterministic 10-gradient palette — pink-rose-orange, fuchsia-purple-indigo, blue-cyan-teal, emerald-teal-cyan, amber-orange-rose, violet-purple-pink, sky-blue-indigo, lime-green-emerald, red-pink-fuchsia, indigo-blue-cyan. Each user always sees the same gradient (hashed from their `_id`/email).

### Warning callout block (`.warning` in CMS pages)
[`globals.css`](frontend/src/app/globals.css#L132-L155): orange/red theme used for unboxing-video notice on returns page.
- Border `#EF4444`, background `rgba(254,242,242,0.6)` light / `rgba(127,29,29,0.2)` dark
- Heading `#C77D1A`, body `#D4A843`, strong `#E8A849`

---

## 4. Typography

Defined in [`tailwind.config.js`](frontend/tailwind.config.js#L18-L21) and loaded in [`layout.js`](frontend/src/app/layout.js#L34-L37).

### Font families

| Token | Family | Used by |
|---|---|---|
| `font-serif` | **Playfair Display** (italic 400, 400-700) | All headings (`h1–h6` automatic via [`globals.css`](frontend/src/app/globals.css#L22-L24)), section titles, product names, page titles. Conveys luxury / editorial feel. |
| `font-sans` (default) | **Inter** (300, 400, 500, 600, 700) | Body copy, buttons, labels, navigation, prices, all UI text. Default applied in [`layout.js`](frontend/src/app/layout.js#L48). |
| `font-open-sans` | **Open Sans** (400-700) | Imported in [`globals.css`](frontend/src/app/globals.css#L5-L9) — alternative sans, available via `.font-open-sans` utility class for specific marketing copy where requested. |

### Type scale (typical patterns)

| Element | Class pattern | Example file |
|---|---|---|
| Hero / page H1 | `font-serif text-3xl md:text-4xl font-semibold` | [`profile/page.js`](frontend/src/app/profile/page.js#L227), [`notifications/page.js`](frontend/src/app/notifications/page.js) |
| Section title | `font-serif text-2xl md:text-3xl font-semibold` (`section-title` class) | All landing sections |
| Card heading | `font-serif text-xl font-semibold` | Profile cards, address blocks |
| Subheading | `font-serif text-base font-semibold` | Modal sub-titles |
| Body | `text-sm` / `text-[15px]` | Descriptions, metadata |
| Caption / meta | `text-xs uppercase tracking-wider` | Labels, badges |
| Price | `text-lg font-semibold text-brand-charcoal` | ProductCard |
| Stat value | `text-2xl md:text-[26px] font-semibold tracking-tight` | Stat cards on profile |
| Toast | Inter, 12px radius pill, brand-green background | [`layout.js`](frontend/src/app/layout.js#L52-L62) |

### Headings auto-promoted to serif
[`globals.css`](frontend/src/app/globals.css#L22-L24):

```css
h1, h2, h3, h4, h5, h6 { @apply font-serif; }
```

So **any heading tag** automatically gets Playfair Display — no need to repeat `font-serif` on H tags.

---

## 5. Component class shortcuts

Defined in [`globals.css`](frontend/src/app/globals.css#L169-L213):

| Class | Purpose | Result |
|---|---|---|
| `.btn-primary` | Main CTAs | `bg-brand-green text-white` rounded pill, scales to 0.98 on press |
| `.btn-secondary` | Secondary CTAs | Outlined `brand-green`, fills on hover; cream + dark-green-text variant in dark mode |
| `.btn-gold` | Premium / promo | `bg-brand-gold text-white` |
| `.input-field` | Form inputs | White bg, focus ring `brand-green/30`; gray-800 in dark mode |
| `.card` | Surfaces | White rounded-2xl with hover shadow; gray-800 in dark mode |
| `.section-title` | Section headers | Serif, 3xl-4xl, charcoal (light) / gray-100 (dark) |
| `.section-subtitle` | Section subheaders | Centered gray-500 / gray-400 |
| `.scrollbar-hide` | Hide scrollbar | Cross-browser visual scrollbar hiding |
| `.skeleton` | Loading states | Gray gradient shimmer |
| `.hexagon-bg` | Decorative bg | SVG hexagonal pattern with brand-gold strokes |
| `.shopping-icons-bg` | Decorative bg | SVG doodle of shopping icons (handbag, heel, ring, etc.) |

---

## Quick reference card

```
Brand Green   #1F3A2F   Primary CTAs, footer, active states
Brand Gold    #C8A951   Ratings, premium badges, accents
Brand Cream   #F9F7F3   Light page background
Brand Beige   #E8DCCB   Scrollbar / decorative
Brand Charcoal#2B2B2B   Primary text

Dark Cream    #F8F0E8   Brand-green substitute in dark mode
Gray-950      #030712   Dark page background
Gray-800      #1F2937   Dark card surface
Gray-100      #F3F4F6   Dark mode primary text

Headings      Playfair Display (serif)
Body          Inter (sans)
Alt           Open Sans (.font-open-sans utility)
```
