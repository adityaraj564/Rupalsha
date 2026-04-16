const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const Category = require('../models/Category');

async function seedProducts() {
  await connectDB();

  // Fetch all categories and build a lookup by name
  const allCats = await Category.find().lean();
  const byName = {};
  for (const c of allCats) {
    byName[c.name] = c;
  }

  // Helper to resolve category path
  function resolve(mainName, subName, childName) {
    const main = byName[mainName];
    const sub = subName ? byName[subName] : null;
    const child = childName ? byName[childName] : null;
    return {
      category: mainName,
      subcategory: subName || undefined,
      childCategory: childName || undefined,
      categoryRef: (child || sub || main)?._id,
    };
  }

  const products = [
    // ===== ACCESSORIES =====
    // Jewellery > Earrings
    { name: 'Gold Plated Jhumka Earrings', price: 599, comparePrice: 899, description: 'Beautiful gold plated jhumka earrings with intricate meenakari work. Perfect for festive occasions.', fabric: 'Metal Alloy', tags: ['earrings', 'jhumka', 'festive', 'gold'], ...resolve('Accessories', 'Jewellery', 'Earrings') },
    { name: 'Pearl Drop Stud Earrings', price: 349, description: 'Elegant pearl drop studs for everyday wear. Lightweight and comfortable.', tags: ['earrings', 'pearl', 'daily wear'], ...resolve('Accessories', 'Jewellery', 'Earrings') },
    // Jewellery > Necklaces
    { name: 'Kundan Choker Necklace Set', price: 1299, comparePrice: 1799, description: 'Stunning kundan choker necklace set with matching earrings. Ideal for weddings and parties.', tags: ['necklace', 'kundan', 'wedding', 'bridal'], ...resolve('Accessories', 'Jewellery', 'Necklaces') },
    { name: 'Layered Chain Necklace', price: 499, description: 'Trendy layered chain necklace in gold finish. Goes with any outfit.', tags: ['necklace', 'chain', 'trendy', 'layered'], ...resolve('Accessories', 'Jewellery', 'Necklaces') },
    // Jewellery > Rings
    { name: 'Adjustable Floral Ring', price: 199, description: 'Delicate adjustable floral ring in rose gold finish. One size fits all.', tags: ['ring', 'floral', 'adjustable'], ...resolve('Accessories', 'Jewellery', 'Rings') },
    { name: 'Statement Cocktail Ring', price: 399, comparePrice: 599, description: 'Bold statement cocktail ring with emerald green stone. Perfect party accessory.', tags: ['ring', 'statement', 'cocktail', 'party'], ...resolve('Accessories', 'Jewellery', 'Rings') },
    // Jewellery > Bracelets
    { name: 'Silk Thread Bangle Set', price: 299, description: 'Set of 6 colorful silk thread bangles. Handcrafted with precision.', tags: ['bangles', 'silk thread', 'handmade'], ...resolve('Accessories', 'Jewellery', 'Bracelets') },
    // Bags > Handbags
    { name: 'Embroidered Clutch Bag', price: 899, comparePrice: 1299, description: 'Hand-embroidered clutch bag with zardozi work. Perfect for evening events.', tags: ['clutch', 'embroidered', 'evening'], ...resolve('Accessories', 'Bags', 'Handbags') },
    { name: 'Leather Tote Handbag', price: 1599, description: 'Premium faux leather tote handbag in tan color. Spacious and stylish.', fabric: 'Faux Leather', tags: ['handbag', 'tote', 'leather', 'premium'], ...resolve('Accessories', 'Bags', 'Handbags') },
    // Bags > Sling Bags
    { name: 'Boho Sling Bag', price: 649, description: 'Bohemian-style sling bag with mirror work and tassels. Casual chic look.', tags: ['sling bag', 'boho', 'casual', 'mirror work'], ...resolve('Accessories', 'Bags', 'Sling Bags') },
    // Bags > Totes
    { name: 'Canvas Printed Tote', price: 499, description: 'Eco-friendly canvas tote with ethnic print. Great for shopping and daily use.', fabric: 'Canvas', tags: ['tote', 'canvas', 'eco-friendly', 'ethnic'], ...resolve('Accessories', 'Bags', 'Totes') },
    // Footwear > Flats
    { name: 'Mojari Embroidered Flats', price: 799, comparePrice: 1099, description: 'Traditional mojari style flats with embroidery. Comfortable and elegant.', tags: ['flats', 'mojari', 'embroidered', 'traditional'], ...resolve('Accessories', 'Footwear', 'Flats') },
    // Footwear > Heels
    { name: 'Block Heel Sandals - Gold', price: 999, description: 'Gold-toned block heel sandals with cushioned insole. Perfect for parties.', tags: ['heels', 'block heel', 'sandals', 'gold', 'party'], ...resolve('Accessories', 'Footwear', 'Heels') },
    // Other > Scarves
    { name: 'Pashmina Wool Scarf', price: 1199, comparePrice: 1599, description: 'Luxurious pashmina wool scarf in gradient colors. Warm and lightweight.', fabric: 'Pashmina Wool', tags: ['scarf', 'pashmina', 'wool', 'winter', 'luxury'], ...resolve('Accessories', 'Other', 'Scarves') },
    // Other > Hair Accessories
    { name: 'Floral Hair Clip Set', price: 249, description: 'Set of 3 floral hair clips in pastel colors. Lightweight and secure grip.', tags: ['hair clip', 'floral', 'pastel', 'hair accessories'], ...resolve('Accessories', 'Other', 'Hair Accessories') },

    // ===== FASHION =====
    // Ethnic Wear > Sarees
    { name: 'Banarasi Silk Saree - Royal Blue', price: 3499, comparePrice: 4999, description: 'Handwoven Banarasi silk saree in royal blue with gold zari work. Traditional elegance for weddings.', fabric: 'Silk', tags: ['saree', 'banarasi', 'silk', 'wedding', 'handwoven'], ...resolve('Fashion', 'Ethnic Wear', 'Sarees') },
    { name: 'Cotton Printed Saree - Floral', price: 1299, description: 'Lightweight cotton saree with floral block print. Perfect for summer and daily wear.', fabric: 'Cotton', tags: ['saree', 'cotton', 'floral', 'daily wear', 'summer'], ...resolve('Fashion', 'Ethnic Wear', 'Sarees') },
    { name: 'Chiffon Saree - Pink Ombre', price: 1899, comparePrice: 2499, description: 'Elegant chiffon saree in pink ombre design with sequin border. Party-perfect drape.', fabric: 'Chiffon', tags: ['saree', 'chiffon', 'pink', 'ombre', 'party'], ...resolve('Fashion', 'Ethnic Wear', 'Sarees') },
    // Ethnic Wear > Kurtis
    { name: 'Anarkali Embroidered Kurti - Maroon', price: 1099, comparePrice: 1499, description: 'Flared anarkali kurti in maroon with white thread embroidery. Festive and comfortable.', fabric: 'Rayon', tags: ['kurti', 'anarkali', 'embroidered', 'festive'], ...resolve('Fashion', 'Ethnic Wear', 'Kurtis') },
    { name: 'Straight Fit Cotton Kurti - Teal', price: 799, description: 'Comfortable straight fit cotton kurti in teal color. Ideal for office and casual wear.', fabric: 'Cotton', tags: ['kurti', 'cotton', 'office wear', 'casual', 'straight fit'], ...resolve('Fashion', 'Ethnic Wear', 'Kurtis') },
    // Ethnic Wear > Lehengas
    { name: 'Bridal Lehenga Set - Red & Gold', price: 8999, comparePrice: 12999, description: 'Stunning bridal lehenga set in red with heavy gold embroidery. Includes choli and dupatta.', fabric: 'Velvet', tags: ['lehenga', 'bridal', 'red', 'gold', 'wedding', 'premium'], ...resolve('Fashion', 'Ethnic Wear', 'Lehengas') },
    { name: 'Pastel Lehenga Set - Lavender', price: 4999, comparePrice: 6499, description: 'Elegant pastel lavender lehenga set with mirror work. Perfect for engagement or sangeet.', fabric: 'Georgette', tags: ['lehenga', 'pastel', 'lavender', 'engagement', 'mirror work'], ...resolve('Fashion', 'Ethnic Wear', 'Lehengas') },
    // Western Wear > Dresses
    { name: 'Floral Midi Dress - Yellow', price: 1499, comparePrice: 1999, description: 'Bright yellow midi dress with floral print. Flowy and perfect for brunch dates.', fabric: 'Crepe', tags: ['dress', 'midi', 'floral', 'yellow', 'casual', 'brunch'], ...resolve('Fashion', 'Western Wear', 'Dresses') },
    { name: 'Little Black Dress - Bodycon', price: 1699, description: 'Classic little black dress in bodycon fit. Timeless party staple.', fabric: 'Lycra', tags: ['dress', 'black', 'bodycon', 'party', 'classic'], ...resolve('Fashion', 'Western Wear', 'Dresses') },
    // Western Wear > Tops
    { name: 'Peplum Top - White', price: 699, description: 'Elegant peplum top in white with ruffled hem. Pairs great with jeans or skirts.', fabric: 'Polyester', tags: ['top', 'peplum', 'white', 'western', 'casual'], ...resolve('Fashion', 'Western Wear', 'Tops') },
    // Western Wear > Jeans
    { name: 'High Waist Straight Jeans - Dark Blue', price: 1299, description: 'Classic high-waist straight fit jeans in dark blue wash. Comfortable stretch denim.', fabric: 'Denim', tags: ['jeans', 'high waist', 'straight fit', 'dark blue', 'denim'], ...resolve('Fashion', 'Western Wear', 'Jeans') },

    // ===== GENZ =====
    // Trendy Dresses
    { name: 'Corset Midi Dress - Sage Green', price: 1799, comparePrice: 2299, description: 'Trendy corset-style midi dress in sage green. Instagram-worthy aesthetic.', fabric: 'Cotton Blend', tags: ['dress', 'corset', 'sage green', 'trendy', 'aesthetic', 'genz'], ...resolve('GenZ', 'Trendy Dresses') },
    { name: 'Ruched Bodycon Mini - Lilac', price: 1199, description: 'Ruched bodycon mini dress in lilac. Y2K-inspired party look.', fabric: 'Lycra', tags: ['dress', 'bodycon', 'mini', 'lilac', 'y2k', 'party'], ...resolve('GenZ', 'Trendy Dresses') },
    // Streetwear
    { name: 'Oversized Graphic Tee - Vintage', price: 699, description: 'Oversized graphic tee with vintage pop art print. Unisex fit.', fabric: 'Cotton', tags: ['tee', 'graphic', 'oversized', 'vintage', 'streetwear', 'unisex'], ...resolve('GenZ', 'Streetwear') },
    { name: 'Cargo Joggers - Olive', price: 999, description: 'Relaxed fit cargo joggers in olive green. Multiple pockets for utility and style.', fabric: 'Cotton Twill', tags: ['joggers', 'cargo', 'olive', 'streetwear', 'utility'], ...resolve('GenZ', 'Streetwear') },
    // Minimal Jewellery
    { name: 'Dainty Gold Chain Necklace', price: 349, description: 'Minimal dainty gold chain necklace. Everyday layering essential.', tags: ['necklace', 'dainty', 'gold', 'minimal', 'layering', 'genz'], ...resolve('GenZ', 'Minimal Jewellery') },
    { name: 'Huggie Hoop Earrings - Silver', price: 279, description: 'Tiny huggie hoop earrings in silver. Subtle and chic.', tags: ['earrings', 'huggie', 'hoop', 'silver', 'minimal'], ...resolve('GenZ', 'Minimal Jewellery') },

    // ===== KIDS =====
    // Clothing
    { name: 'Kids Lehenga Set - Pink', price: 1299, comparePrice: 1699, description: 'Adorable kids lehenga set in pink with golden accents. Perfect for weddings and festive occasions.', fabric: 'Net & Satin', tags: ['kids', 'lehenga', 'pink', 'festive', 'wedding'], ...resolve('Kids', 'Clothing') },
    { name: 'Boys Kurta Pyjama Set - White', price: 899, description: 'Classic white kurta pyjama set for boys. Comfortable cotton fabric for all-day wear.', fabric: 'Cotton', tags: ['kids', 'boys', 'kurta', 'white', 'festive', 'cotton'], ...resolve('Kids', 'Clothing') },
    { name: 'Kids Cotton Frock - Multicolor', price: 599, description: 'Colorful cotton frock for girls with floral print. Breathable and playful.', fabric: 'Cotton', tags: ['kids', 'girls', 'frock', 'cotton', 'casual'], ...resolve('Kids', 'Clothing') },
    // Kids Accessories
    { name: 'Kids Beaded Bracelet Set', price: 199, description: 'Fun beaded bracelet set in rainbow colors. Set of 4 bracelets.', tags: ['kids', 'bracelet', 'beaded', 'colorful'], ...resolve('Kids', 'Kids Accessories') },
    { name: 'Kids Hair Band - Bow', price: 149, description: 'Cute bow-style hair band for kids. Soft elastic, comfortable for all-day wear.', tags: ['kids', 'hair band', 'bow', 'hair accessories'], ...resolve('Kids', 'Kids Accessories') },

    // ===== HOME & LIVING =====
    // Decor > Wall Decor
    { name: 'Macrame Wall Hanging - Bohemian', price: 1499, comparePrice: 1999, description: 'Handmade macrame wall hanging in natural cotton. Bohemian charm for your living room.', fabric: 'Cotton Rope', tags: ['wall decor', 'macrame', 'bohemian', 'handmade', 'home'], ...resolve('Home & Living', 'Decor', 'Wall Decor') },
    { name: 'Wooden Mandala Wall Art', price: 2499, description: 'Intricately carved wooden mandala wall art. Statement piece for any room.', tags: ['wall decor', 'mandala', 'wooden', 'art', 'statement'], ...resolve('Home & Living', 'Decor', 'Wall Decor') },
    // Decor > Table Decor
    { name: 'Ceramic Vase Set - Minimalist', price: 899, description: 'Set of 3 minimalist ceramic vases in earthy tones. Perfect for dried flowers.', tags: ['table decor', 'vase', 'ceramic', 'minimalist', 'home'], ...resolve('Home & Living', 'Decor', 'Table Decor') },
    { name: 'Brass Diya Set - Traditional', price: 599, comparePrice: 799, description: 'Set of 5 brass diyas for traditional decor. Perfect for Diwali and puja.', tags: ['table decor', 'diya', 'brass', 'traditional', 'diwali', 'puja'], ...resolve('Home & Living', 'Decor', 'Table Decor') },
    // Utility
    { name: 'Block Print Cushion Covers - Set of 4', price: 799, description: 'Rajasthani block print cushion covers in indigo. 100% cotton, 16x16 inches.', fabric: 'Cotton', tags: ['cushion cover', 'block print', 'indigo', 'rajasthani', 'home'], ...resolve('Home & Living', 'Utility') },

    // ===== HANDCRAFTED =====
    // Handmade Jewellery
    { name: 'Terracotta Jewellery Set', price: 499, comparePrice: 699, description: 'Handpainted terracotta necklace and earring set. Earthy and artistic.', tags: ['handmade', 'terracotta', 'jewellery', 'handpainted', 'artisan'], ...resolve('Handcrafted', 'Handmade Jewellery') },
    { name: 'Wire Wrapped Crystal Pendant', price: 399, description: 'Handmade wire-wrapped amethyst crystal pendant on chain. Unique and spiritual.', tags: ['handmade', 'crystal', 'pendant', 'wire wrapped', 'spiritual'], ...resolve('Handcrafted', 'Handmade Jewellery') },
    // Crochet Products
    { name: 'Crochet Tote Bag - Pastel', price: 899, comparePrice: 1199, description: 'Hand-crocheted tote bag in pastel pink. Sustainable and stylish summer bag.', fabric: 'Cotton Yarn', tags: ['crochet', 'tote', 'handmade', 'pastel', 'sustainable'], ...resolve('Handcrafted', 'Crochet Products') },
    { name: 'Crochet Coaster Set', price: 349, description: 'Set of 6 hand-crocheted coasters in multicolor. Adds warmth to any table.', fabric: 'Cotton Yarn', tags: ['crochet', 'coasters', 'handmade', 'multicolor', 'home'], ...resolve('Handcrafted', 'Crochet Products') },
    // Artisan Products
    { name: 'Hand-painted Wooden Jewelry Box', price: 1299, description: 'Hand-painted wooden jewelry box with traditional Rajasthani motifs. Each piece is unique.', tags: ['handmade', 'wooden', 'jewelry box', 'hand-painted', 'rajasthani', 'artisan'], ...resolve('Handcrafted', 'Artisan Products') },
    { name: 'Handwoven Jute Basket', price: 699, description: 'Handwoven jute storage basket with cotton handles. Eco-friendly home organization.', fabric: 'Jute', tags: ['handwoven', 'jute', 'basket', 'eco-friendly', 'storage', 'artisan'], ...resolve('Handcrafted', 'Artisan Products') },
  ];

  // Clear existing products
  await Product.deleteMany({});
  console.log('Cleared existing products');

  let count = 0;
  for (const p of products) {
    // Add default sizes/stock
    const sizes = p.sizes || [{ size: 'Free Size', stock: 10 }];
    await Product.create({
      ...p,
      sizes,
      images: [{
        url: `https://placehold.co/400x500.png/E8DCCB/1F3A2F?text=${encodeURIComponent(p.name.split(' ').slice(0, 2).join('\n'))}`,
        alt: p.name,
      }],
      isActive: true,
      isFeatured: count % 5 === 0,
      isTrending: count % 7 === 0,
    });
    count++;
    console.log(`[${count}/${products.length}] Created: ${p.name} → ${[p.category, p.subcategory, p.childCategory].filter(Boolean).join(' > ')}`);
  }

  console.log(`\nDone! Created ${count} products across all categories.`);
  process.exit(0);
}

seedProducts().catch(err => {
  console.error(err);
  process.exit(1);
});
