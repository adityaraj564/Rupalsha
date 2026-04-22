const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Blog = require('../models/Blog');

const defaultBlogs = [
  {
    title: 'What is Anti-Tarnish Jewellery? Complete Guide',
    shortDescription: 'Discover what makes anti-tarnish jewellery last longer, how it works, and why it\'s the smartest choice for everyday accessories that stay beautiful through years of wear.',
    content: `<h2>What is Anti-Tarnish Jewellery?</h2>
<p>Anti-tarnish jewellery is coated with a special protective layer that prevents oxidation and discolouration. Unlike regular plated jewellery that fades within weeks, anti-tarnish pieces maintain their shine for months or even years with proper care.</p>

<h2>How Does Anti-Tarnish Coating Work?</h2>
<p>The coating creates a barrier between the metal and environmental elements like moisture, air, and chemicals. Most anti-tarnish jewellery uses one of these methods:</p>
<ul>
<li><strong>PVD Coating</strong> — Physical Vapor Deposition creates a thin, durable layer that resists scratches and tarnishing</li>
<li><strong>E-coating</strong> — Electrophoretic coating provides a uniform protective layer</li>
<li><strong>Rhodium Plating</strong> — A precious metal coating that adds shine and protection</li>
<li><strong>Lacquer Finish</strong> — A clear protective sealant applied over the jewellery</li>
</ul>

<h2>Benefits of Anti-Tarnish Jewellery</h2>
<ul>
<li>Maintains shine and colour for much longer than regular plated jewellery</li>
<li>Safe for sensitive skin — no green marks or allergic reactions</li>
<li>Water-resistant (though not fully waterproof)</li>
<li>Cost-effective alternative to solid gold or silver</li>
<li>Low maintenance — no regular polishing needed</li>
</ul>

<h2>How to Care for Anti-Tarnish Jewellery</h2>
<p>Even though anti-tarnish jewellery is more durable, proper care extends its life:</p>
<ul>
<li>Remove before swimming, showering, or exercising</li>
<li>Apply perfume and lotions before putting on jewellery</li>
<li>Store in a cool, dry place — preferably in the pouch it came in</li>
<li>Clean gently with a soft cloth</li>
<li>Avoid exposure to harsh chemicals</li>
</ul>

<h2>Is Anti-Tarnish Jewellery Worth It?</h2>
<p>Absolutely! If you love wearing jewellery daily but don't want the hassle of constant cleaning or the expense of pure gold, anti-tarnish jewellery is your best bet. It looks premium, feels lightweight, and stays beautiful — making it perfect for everyday wear.</p>`,
    category: 'Jewellery Guide',
    tags: ['anti-tarnish', 'jewellery care', 'coating', 'guide'],
    isFeatured: true,
    sortOrder: 1,
    metaTitle: 'What is Anti-Tarnish Jewellery? Complete Guide | Rupalsha',
    metaDescription: 'Learn everything about anti-tarnish jewellery — how it works, benefits, care tips, and why it\'s the best choice for daily wear accessories.',
    metaKeywords: 'anti-tarnish jewellery, what is anti-tarnish, jewellery coating, PVD coating jewellery',
  },
  {
    title: 'How to Take Care of Artificial Jewellery',
    shortDescription: 'Learn the best tips and tricks to keep your artificial jewellery looking brand new. From storage hacks to cleaning methods, this guide covers everything you need.',
    content: `<h2>Why Does Artificial Jewellery Tarnish?</h2>
<p>Artificial jewellery tarnishes when the base metal reacts with moisture, sweat, perfumes, and chemicals in the air. Understanding the cause helps you prevent it effectively.</p>

<h2>Storage Tips</h2>
<ul>
<li><strong>Use zip-lock bags</strong> — Remove air and seal each piece separately to prevent oxidation</li>
<li><strong>Add silica gel packets</strong> — They absorb moisture and keep your jewellery dry</li>
<li><strong>Avoid bathroom storage</strong> — Humidity accelerates tarnishing</li>
<li><strong>Line your jewellery box</strong> — Use soft fabric or velvet lining</li>
<li><strong>Keep pieces separate</strong> — Prevent scratching by not piling jewellery together</li>
</ul>

<h2>Cleaning Methods</h2>
<h3>For Regular Cleaning:</h3>
<p>Wipe with a soft, dry microfibre cloth after every wear. This removes oils and sweat that cause tarnishing.</p>

<h3>For Deep Cleaning:</h3>
<ul>
<li>Mix mild soap with lukewarm water</li>
<li>Dip a soft toothbrush and gently scrub</li>
<li>Rinse quickly under running water</li>
<li>Pat dry immediately with a soft cloth</li>
<li>Let it air dry completely before storing</li>
</ul>

<h2>Do's and Don'ts</h2>
<h3>Do:</h3>
<ul>
<li>Put jewellery on last — after makeup, perfume, and hairspray</li>
<li>Remove before sleeping, bathing, or exercising</li>
<li>Apply clear nail polish on parts that touch skin for extra protection</li>
</ul>
<h3>Don't:</h3>
<ul>
<li>Never use chemical cleaners or silver polish on artificial jewellery</li>
<li>Don't wear while cooking — steam and spices damage the coating</li>
<li>Avoid contact with hand sanitiser</li>
</ul>`,
    category: 'Jewellery Care',
    tags: ['jewellery care', 'artificial jewellery', 'cleaning', 'maintenance'],
    isFeatured: true,
    sortOrder: 2,
    metaTitle: 'How to Take Care of Artificial Jewellery — Tips & Tricks | Rupalsha',
    metaDescription: 'Keep your artificial jewellery shining with these expert care tips. Learn proper storage, cleaning methods, and daily habits to extend jewellery life.',
    metaKeywords: 'artificial jewellery care, how to clean jewellery, jewellery storage, prevent tarnishing',
  },
  {
    title: 'How to Style Oxidised Silver Jewellery',
    shortDescription: 'Oxidised silver jewellery adds a bold, rustic charm to any outfit. Learn how to style these statement pieces with ethnic, fusion, and western outfits effortlessly.',
    content: `<h2>What is Oxidised Silver Jewellery?</h2>
<p>Oxidised silver jewellery is made by intentionally darkening silver to create an antique, vintage look. The blackened finish highlights intricate designs and gives a bold, earthy aesthetic that's perfect for Indian and boho styles.</p>

<h2>Styling with Ethnic Outfits</h2>
<ul>
<li><strong>Cotton Kurtis</strong> — Pair with oxidised jhumkas and a statement necklace for a relaxed ethnic look</li>
<li><strong>Sarees</strong> — Heavy oxidised chokers with plain cotton or linen sarees create stunning contrast</li>
<li><strong>Lehengas</strong> — Mix oxidised waist chains (kamarbandh) with your lehenga for a traditional touch</li>
<li><strong>Palazzo Sets</strong> — Stack oxidised bangles and add long oxidised earrings</li>
</ul>

<h2>Styling with Western Outfits</h2>
<ul>
<li><strong>White T-shirt + Jeans</strong> — Add a chunky oxidised pendant necklace for instant boho vibes</li>
<li><strong>Maxi Dresses</strong> — Oxidised anklets and layered rings complement flowy dresses</li>
<li><strong>Crop Tops</strong> — Pair with oxidised belly chains for festival-ready looks</li>
</ul>

<h2>Mixing Metals — Can You?</h2>
<p>Yes! Oxidised silver pairs beautifully with:</p>
<ul>
<li>Gold-toned jewellery for a modern fusion look</li>
<li>Kundan pieces for a rich, layered aesthetic</li>
<li>Thread and fabric jewellery for a bohemian style</li>
</ul>

<h2>Care Tips for Oxidised Jewellery</h2>
<p>Oxidised jewellery is relatively low maintenance, but keep these in mind:</p>
<ul>
<li>Avoid water contact — the dark coating can wear off</li>
<li>Store separately to prevent scratching</li>
<li>Don't use polish — it will remove the oxidised finish</li>
<li>Wipe gently with a dry cloth after wearing</li>
</ul>`,
    category: 'Style Guide',
    tags: ['oxidised silver', 'styling', 'ethnic jewellery', 'boho'],
    isFeatured: false,
    sortOrder: 3,
    metaTitle: 'How to Style Oxidised Silver Jewellery | Rupalsha',
    metaDescription: 'Master the art of styling oxidised silver jewellery with ethnic, western, and fusion outfits. Tips for mixing metals and accessorising like a pro.',
    metaKeywords: 'oxidised silver jewellery, style oxidised jewellery, boho jewellery, ethnic accessories',
  },
  {
    title: 'Top Jewellery Trends in 2026',
    shortDescription: 'From chunky chains to minimalist studs, discover the hottest jewellery trends dominating 2026. Stay ahead of the curve with these must-have accessories.',
    content: `<h2>2026's Biggest Jewellery Trends</h2>
<p>This year is all about bold self-expression through accessories. Whether you prefer minimalist elegance or statement pieces, there's a trend for everyone.</p>

<h2>1. Chunky Gold Chains</h2>
<p>Oversized chain necklaces continue to dominate. Wear them solo for impact or layer multiple chains for a maximalist look. Anti-tarnish gold chains are especially popular for daily wear.</p>

<h2>2. Ear Cuffs & Climbers</h2>
<p>No piercing needed! Ear cuffs and climbers wrap around the ear for a modern, edgy look. Stack them with studs for a curated ear party.</p>

<h2>3. Colourful Beaded Jewellery</h2>
<p>Think vibrant beads, gemstone chips, and playful colour combinations. Beaded necklaces and bracelets add a fun, youthful energy to any outfit.</p>

<h2>4. Minimalist Everyday Pieces</h2>
<p>Dainty chains, tiny studs, and thin stackable rings remain staples. The key is choosing anti-tarnish or waterproof pieces you never have to take off.</p>

<h2>5. Korean-Inspired Accessories</h2>
<p>K-drama inspired hair clips, claw clips with pearls, and delicate ribbon bows are trending hard. These accessories bridge fashion and function beautifully.</p>

<h2>6. Vintage & Oxidised Revival</h2>
<p>Antique-finish jewellery is making a massive comeback. Look for oxidised silver jhumkas, coin necklaces, and temple jewellery-inspired designs.</p>

<h2>7. Personalised Jewellery</h2>
<p>Name necklaces, initial rings, and birthstone pieces continue to be top sellers. Custom jewellery makes for perfect gifts too.</p>

<h2>How to Incorporate Trends</h2>
<p>Don't feel pressured to follow every trend. Pick 2–3 that match your personal style and invest in quality pieces that will last. Anti-tarnish options ensure your trendy pieces stay looking fresh all year.</p>`,
    category: 'Trends',
    tags: ['trends 2026', 'fashion jewellery', 'accessories', 'style'],
    isFeatured: true,
    sortOrder: 4,
    metaTitle: 'Top Jewellery Trends in 2026 — Must-Have Accessories | Rupalsha',
    metaDescription: 'Stay stylish with 2026\'s hottest jewellery trends — from chunky chains to Korean accessories. Discover what\'s trending and how to wear it.',
    metaKeywords: 'jewellery trends 2026, fashion accessories, trending jewellery, style trends',
  },
  {
    title: 'Why Korean Hair Accessories Are Trending',
    shortDescription: 'Korean hair accessories have taken the fashion world by storm. Discover what makes K-style clips, claw clips, and ribbons so irresistible and how to style them.',
    content: `<h2>The K-Beauty Influence on Accessories</h2>
<p>Korean beauty and fashion (K-beauty) has revolutionised how we think about accessories. From K-dramas to K-pop, Korean celebrities showcase effortlessly chic hair accessories that fans worldwide want to recreate.</p>

<h2>Popular Korean Hair Accessories</h2>

<h3>1. Claw Clips</h3>
<p>The quintessential K-beauty accessory. Available in acetate, pearl-embellished, and minimalist metal designs. Perfect for the effortless "just clipped it up" look that Korean actresses have made famous.</p>

<h3>2. Ribbon Bows</h3>
<p>Silk and satin ribbon bows add a feminine, youthful touch. Wear them as ponytail ties, headbands, or barrette clips.</p>

<h3>3. Pearl Hair Pins</h3>
<p>Delicate pearl-studded bobby pins and hair pins instantly elevate a simple hairstyle. Use 3–5 pins clustered together for a K-drama worthy look.</p>

<h3>4. Velvet Scrunchies</h3>
<p>Luxury velvet scrunchies in jewel tones are both functional and fashionable. They're gentle on hair and look polished enough for work or dates.</p>

<h3>5. Metal Barrettes</h3>
<p>Sleek gold and silver barrettes — sometimes shaped as geometric forms, stars, or moons — are a staple in Korean hair styling.</p>

<h2>How to Style Korean Hair Accessories</h2>
<ul>
<li><strong>Half-up half-down</strong> — Secure with a decorative claw clip at the crown</li>
<li><strong>Low bun</strong> — Wrap with a ribbon bow for elegance</li>
<li><strong>Side part</strong> — Pin pearl clips along the parting for a red carpet feel</li>
<li><strong>Ponytail</strong> — Use a velvet scrunchie and add a ribbon bow on top</li>
</ul>

<h2>Why They're Perfect for Indian Women</h2>
<p>Korean accessories complement Indian hair textures beautifully. They work with thick, long hair and add charm to both ethnic and western outfits. Plus, they're affordable and versatile — one piece can be styled multiple ways.</p>`,
    category: 'Trends',
    tags: ['korean accessories', 'hair accessories', 'K-beauty', 'claw clips', 'trending'],
    isFeatured: false,
    sortOrder: 5,
    metaTitle: 'Why Korean Hair Accessories Are Trending in India | Rupalsha',
    metaDescription: 'Explore the Korean hair accessory trend — claw clips, ribbon bows, pearl pins and more. Learn why K-beauty accessories are perfect for Indian women.',
    metaKeywords: 'korean hair accessories, claw clips, K-beauty, hair clips trending, ribbon bows',
  },
  {
    title: 'Best Jewellery for Sensitive Skin',
    shortDescription: 'If your skin turns green or itchy from jewellery, this guide is for you. Discover the best hypoallergenic materials and what to look for when shopping.',
    content: `<h2>Why Does Jewellery Irritate Sensitive Skin?</h2>
<p>Most allergic reactions to jewellery are caused by <strong>nickel</strong>, a metal commonly used in costume jewellery. When nickel comes in contact with sweat, it releases ions that penetrate the skin, causing redness, itching, and sometimes blisters.</p>

<h2>Safe Materials for Sensitive Skin</h2>

<h3>1. Surgical Stainless Steel (316L)</h3>
<p>Highly durable and nickel-free. Used in medical implants, so it's proven safe for sensitive skin. Look for "316L" grade specifically.</p>

<h3>2. Anti-Tarnish Coated Jewellery</h3>
<p>Quality anti-tarnish jewellery creates a barrier between the metal and your skin. PVD-coated pieces are especially good for sensitive skin as the coating is extremely durable.</p>

<h3>3. Pure Sterling Silver (925)</h3>
<p>Real sterling silver (marked 925) contains 92.5% pure silver and is generally safe. Avoid silver-plated items as the plating wears off quickly.</p>

<h3>4. Solid Gold (14K or higher)</h3>
<p>Higher karat gold contains less alloy metals. 14K and 18K gold are usually safe, though pricier.</p>

<h3>5. Titanium</h3>
<p>100% hypoallergenic and incredibly lightweight. Popular for earrings and rings.</p>

<h2>Tips for Shopping</h2>
<ul>
<li>Always check if the jewellery is labelled "nickel-free" or "hypoallergenic"</li>
<li>Look for anti-tarnish or PVD coating mentions</li>
<li>Read reviews from other sensitive-skin buyers</li>
<li>Start with earrings to test a new brand (ears are most sensitive)</li>
<li>Apply a thin layer of clear nail polish as extra protection</li>
</ul>

<h2>At Rupalsha</h2>
<p>Our anti-tarnish collection is designed with sensitive skin in mind. Each piece is coated to prevent direct metal-skin contact, so you can accessorise without worry.</p>`,
    category: 'Jewellery Guide',
    tags: ['sensitive skin', 'hypoallergenic', 'nickel-free', 'anti-tarnish', 'skin safe'],
    isFeatured: false,
    sortOrder: 6,
    metaTitle: 'Best Jewellery for Sensitive Skin — Safe Materials Guide | Rupalsha',
    metaDescription: 'Find jewellery that won\'t irritate sensitive skin. Learn about hypoallergenic materials, anti-tarnish coatings, and what to avoid.',
    metaKeywords: 'jewellery sensitive skin, hypoallergenic jewellery, nickel-free, anti-tarnish jewellery',
  },
  {
    title: 'Jewellery Guide Based on Face Shape',
    shortDescription: 'Not sure which earrings or necklace flatters your face? This guide helps you choose jewellery that complements your unique face shape perfectly.',
    content: `<h2>How to Determine Your Face Shape</h2>
<p>Stand in front of a mirror and trace the outline of your face. The basic shapes are: oval, round, square, heart, oblong, and diamond.</p>

<h2>Oval Face</h2>
<p><strong>Lucky you!</strong> Almost every jewellery style suits an oval face.</p>
<ul>
<li><strong>Earrings:</strong> Studs, hoops, chandbalis, drops — everything works</li>
<li><strong>Necklaces:</strong> Any length, from chokers to long pendants</li>
<li><strong>Tip:</strong> Experiment freely! Focus on what matches your outfit</li>
</ul>

<h2>Round Face</h2>
<p><strong>Goal:</strong> Add length and angles to create a slimming effect.</p>
<ul>
<li><strong>Earrings:</strong> Long drop earrings, angular designs, linear dangles</li>
<li><strong>Avoid:</strong> Round hoops and button studs (they emphasise roundness)</li>
<li><strong>Necklaces:</strong> V-shaped pendants, long chains, lariat necklaces</li>
</ul>

<h2>Square Face</h2>
<p><strong>Goal:</strong> Soften strong angular features.</p>
<ul>
<li><strong>Earrings:</strong> Round hoops, teardrop shapes, curved designs</li>
<li><strong>Avoid:</strong> Geometric, square, or angular earrings</li>
<li><strong>Necklaces:</strong> Curved pendants, pearl strings, rounded chokers</li>
</ul>

<h2>Heart Face</h2>
<p><strong>Goal:</strong> Balance a wider forehead with a narrow chin.</p>
<ul>
<li><strong>Earrings:</strong> Teardrop, chandelier, and wider-at-bottom designs</li>
<li><strong>Avoid:</strong> Top-heavy earrings or very narrow dangles</li>
<li><strong>Necklaces:</strong> Statement necklaces that add width below the neckline</li>
</ul>

<h2>Oblong/Rectangular Face</h2>
<p><strong>Goal:</strong> Add width and reduce the appearance of length.</p>
<ul>
<li><strong>Earrings:</strong> Wide hoops, studs, cluster earrings, chandbalis</li>
<li><strong>Avoid:</strong> Very long, narrow earrings</li>
<li><strong>Necklaces:</strong> Chokers, short multi-strand necklaces, collar necklaces</li>
</ul>

<h2>Diamond Face</h2>
<p><strong>Goal:</strong> Balance narrow forehead and chin with wider cheekbones.</p>
<ul>
<li><strong>Earrings:</strong> Linear drops, narrow chandeliers, studs</li>
<li><strong>Necklaces:</strong> V-shaped or pendant style to elongate</li>
</ul>`,
    category: 'Style Guide',
    tags: ['face shape', 'jewellery guide', 'styling tips', 'earrings', 'necklaces'],
    isFeatured: false,
    sortOrder: 7,
    metaTitle: 'Jewellery Guide Based on Face Shape — What Suits You Best | Rupalsha',
    metaDescription: 'Choose the perfect earrings and necklaces for your face shape. Expert guide for oval, round, square, heart, oblong, and diamond faces.',
    metaKeywords: 'jewellery face shape, earrings for round face, necklace guide, face shape accessories',
  },
  {
    title: 'Affordable Jewellery That Looks Premium',
    shortDescription: 'You don\'t need to spend a fortune to look luxurious. Discover how anti-tarnish and high-quality artificial jewellery can give you a premium look on a budget.',
    content: `<h2>The Secret to Looking Expensive</h2>
<p>The difference between cheap-looking and premium-looking jewellery isn't always the price — it's the <strong>quality of craftsmanship, finish, and how you style it</strong>. Here's how to nail the luxe look without breaking the bank.</p>

<h2>What to Look For</h2>

<h3>1. Anti-Tarnish Coating</h3>
<p>This is the single biggest factor. Anti-tarnish jewellery maintains its shine for months, unlike regular plated pieces that fade within weeks. At Rupalsha, all our pieces feature premium anti-tarnish coating.</p>

<h3>2. Weight & Feel</h3>
<p>Quality artificial jewellery has a satisfying weight to it. Pieces that feel too light often look cheap. Look for jewellery made with brass or copper base metals rather than thin aluminium.</p>

<h3>3. Clasp & Closure Quality</h3>
<p>Premium pieces have secure, well-made clasps. Lobster clasps and spring rings indicate better quality than basic hook closures.</p>

<h3>4. Stone Setting</h3>
<p>Check that stones (CZ, crystals, or pearls) are securely set with no visible glue. Prong settings and bezel settings look more premium than glued stones.</p>

<h2>Styling Tips for a Premium Look</h2>
<ul>
<li><strong>Less is more</strong> — One statement piece looks more expensive than multiple cheap pieces</li>
<li><strong>Match your metals</strong> — Stick to one metal tone per outfit for a cohesive look</li>
<li><strong>Layer intentionally</strong> — When layering necklaces, vary the lengths and keep designs complementary</li>
<li><strong>Keep it clean</strong> — Tarnished or dull jewellery instantly looks cheap. This is where anti-tarnish wins</li>
<li><strong>Invest in basics</strong> — A good pair of hoops, a dainty chain, and simple studs form a versatile foundation</li>
</ul>

<h2>Best Budget-Friendly Categories</h2>
<ul>
<li><strong>Anti-tarnish chains & pendants</strong> — ₹299–₹599 for pieces that look like gold</li>
<li><strong>Korean-style earrings</strong> — Minimalist designs that punch above their price</li>
<li><strong>Oxidised silver sets</strong> — Instant ethnic elegance at ₹199–₹499</li>
<li><strong>Hair accessories</strong> — Claw clips and barrettes that elevate every outfit</li>
</ul>

<p>Remember: expensive-looking jewellery is about smart choices, not big budgets. Choose quality finishes, timeless designs, and care for your pieces properly.</p>`,
    category: 'Shopping Guide',
    tags: ['affordable jewellery', 'budget friendly', 'premium look', 'anti-tarnish', 'styling'],
    isFeatured: true,
    sortOrder: 8,
    metaTitle: 'Affordable Jewellery That Looks Premium — Budget Styling Guide | Rupalsha',
    metaDescription: 'Look luxurious without overspending. Expert tips on choosing affordable jewellery that looks and feels premium. Anti-tarnish picks and styling advice.',
    metaKeywords: 'affordable jewellery, budget jewellery, premium look, cheap but good jewellery, anti-tarnish',
  },
];

async function seedBlogs() {
  try {
    await connectDB();
    
    const existingCount = await Blog.countDocuments();
    if (existingCount > 0) {
      console.log(`Already have ${existingCount} blogs. Skipping seed.`);
      process.exit(0);
    }

    const created = await Blog.create(defaultBlogs.map(b => ({
      ...b,
      publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
    })));

    console.log(`Successfully seeded ${created.length} blog posts:`);
    created.forEach(b => console.log(`  ✓ ${b.title} → /blog/${b.slug}`));
    process.exit(0);
  } catch (error) {
    console.error('Error seeding blogs:', error);
    process.exit(1);
  }
}

seedBlogs();
