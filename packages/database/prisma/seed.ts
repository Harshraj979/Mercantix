import { PrismaClient, RoleName, UserStatus, VendorStatus, DocumentStatus, ProductStatus, DiscountType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Main Seed ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding Mercantix database...\n');

  // ── 1. Roles ────────────────────────────────────────────────────────────────

  console.log('  → Roles...');
  const [buyerRole, vendorRole, adminRole] = await Promise.all(
    [RoleName.BUYER, RoleName.VENDOR, RoleName.ADMIN].map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  // ── 2. Users ────────────────────────────────────────────────────────────────

  console.log('  → Users & credentials...');
  const defaultPassword = await hashPassword('Password@123');

  // Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mercantix.com' },
    update: {},
    create: {
      email: 'admin@mercantix.com',
      passwordHash: defaultPassword,
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
      roles: { create: { roleId: adminRole.id } },
    },
  });

  // Vendor 1: Apex Electronics
  const vendorUser1 = await prisma.user.upsert({
    where: { email: 'vendor.apex@mercantix.com' },
    update: {},
    create: {
      email: 'vendor.apex@mercantix.com',
      passwordHash: defaultPassword,
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
      roles: { create: { roleId: vendorRole.id } },
    },
  });

  // Vendor 2: StyleStudio Fashion
  const vendorUser2 = await prisma.user.upsert({
    where: { email: 'vendor.style@mercantix.com' },
    update: {},
    create: {
      email: 'vendor.style@mercantix.com',
      passwordHash: defaultPassword,
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
      roles: { create: { roleId: vendorRole.id } },
    },
  });

  // Buyer
  const buyerUser = await prisma.user.upsert({
    where: { email: 'buyer@mercantix.com' },
    update: {},
    create: {
      email: 'buyer@mercantix.com',
      passwordHash: defaultPassword,
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
      roles: { create: { roleId: buyerRole.id } },
    },
  });

  // ── 3. Buyer Address ────────────────────────────────────────────────────────

  console.log('  → Buyer shipping address...');
  const existingAddress = await prisma.address.findFirst({
    where: { userId: buyerUser.id, isDefault: true },
  });
  if (!existingAddress) {
    await prisma.address.create({
      data: {
        userId: buyerUser.id,
        fullName: 'Rahul Sharma',
        phone: '+919876543210',
        line1: '42, Sunrise Apartments, Andheri West',
        line2: 'Near Metro Station',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400058',
        country: 'IN',
        isDefault: true,
      },
    });
  }

  // ── 4. Vendors & KYC ───────────────────────────────────────────────────────

  console.log('  → Vendor stores, bank accounts & KYC documents...');

  // Apex Electronics
  const vendor1 = await prisma.vendor.upsert({
    where: { ownerUserId: vendorUser1.id },
    update: {},
    create: {
      ownerUserId: vendorUser1.id,
      storeName: 'Apex Electronics',
      slug: 'apex-electronics',
      description: 'Premium consumer electronics, smartphones, laptops, and audio equipment at competitive prices.',
      status: VendorStatus.APPROVED,
      commissionRate: 8.50,
    },
  });

  const existingBank1 = await prisma.vendorBankAccount.findUnique({
    where: { vendorId: vendor1.id },
  });
  if (!existingBank1) {
    await prisma.vendorBankAccount.create({
      data: {
        vendorId: vendor1.id,
        accountHolder: 'Apex Electronics Pvt Ltd',
        bankName: 'HDFC Bank',
        accountNumber: 'XXXX-XXXX-4521',
        ifscCode: 'HDFC0001234',
        isVerified: true,
      },
    });
  }

  const existingDoc1 = await prisma.vendorDocument.findFirst({
    where: { vendorId: vendor1.id },
  });
  if (!existingDoc1) {
    await prisma.vendorDocument.createMany({
      data: [
        {
          vendorId: vendor1.id,
          documentType: 'GST_CERTIFICATE',
          storageKey: 'vendor-docs/apex/gst-cert.pdf',
          verificationStatus: DocumentStatus.VERIFIED,
        },
        {
          vendorId: vendor1.id,
          documentType: 'PAN_CARD',
          storageKey: 'vendor-docs/apex/pan-card.pdf',
          verificationStatus: DocumentStatus.VERIFIED,
        },
      ],
    });
  }

  // StyleStudio Fashion
  const vendor2 = await prisma.vendor.upsert({
    where: { ownerUserId: vendorUser2.id },
    update: {},
    create: {
      ownerUserId: vendorUser2.id,
      storeName: 'StyleStudio Fashion',
      slug: 'stylestudio-fashion',
      description: 'Curated fashion collection for men and women — streetwear, ethnic, and contemporary designs.',
      status: VendorStatus.APPROVED,
      commissionRate: 12.00,
    },
  });

  const existingBank2 = await prisma.vendorBankAccount.findUnique({
    where: { vendorId: vendor2.id },
  });
  if (!existingBank2) {
    await prisma.vendorBankAccount.create({
      data: {
        vendorId: vendor2.id,
        accountHolder: 'StyleStudio LLP',
        bankName: 'ICICI Bank',
        accountNumber: 'XXXX-XXXX-7832',
        ifscCode: 'ICIC0005678',
        isVerified: true,
      },
    });
  }

  const existingDoc2 = await prisma.vendorDocument.findFirst({
    where: { vendorId: vendor2.id },
  });
  if (!existingDoc2) {
    await prisma.vendorDocument.createMany({
      data: [
        {
          vendorId: vendor2.id,
          documentType: 'GST_CERTIFICATE',
          storageKey: 'vendor-docs/stylestudio/gst-cert.pdf',
          verificationStatus: DocumentStatus.VERIFIED,
        },
        {
          vendorId: vendor2.id,
          documentType: 'PAN_CARD',
          storageKey: 'vendor-docs/stylestudio/pan-card.pdf',
          verificationStatus: DocumentStatus.VERIFIED,
        },
      ],
    });
  }

  // ── 5. Categories (Hierarchical) ───────────────────────────────────────────

  console.log('  → Categories (hierarchical)...');

  const categoryData = [
    {
      name: 'Electronics',
      slug: 'electronics',
      children: [
        { name: 'Smartphones & Accessories', slug: 'smartphones-accessories' },
        { name: 'Laptops & Computers', slug: 'laptops-computers' },
        { name: 'Audio & Headphones', slug: 'audio-headphones' },
      ],
    },
    {
      name: 'Fashion & Apparel',
      slug: 'fashion-apparel',
      children: [
        { name: 'Men\'s Wear', slug: 'mens-wear' },
        { name: 'Women\'s Wear', slug: 'womens-wear' },
        { name: 'Footwear', slug: 'footwear' },
      ],
    },
    {
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      children: [
        { name: 'Appliances', slug: 'appliances' },
        { name: 'Cookware', slug: 'cookware' },
      ],
    },
  ];

  const categoryMap: Record<string, string> = {};

  for (const parent of categoryData) {
    const parentCat = await prisma.category.upsert({
      where: { slug: parent.slug },
      update: {},
      create: { name: parent.name, slug: parent.slug },
    });
    categoryMap[parent.slug] = parentCat.id;

    for (const child of parent.children) {
      const childCat = await prisma.category.upsert({
        where: { slug: child.slug },
        update: {},
        create: {
          name: child.name,
          slug: child.slug,
          parentId: parentCat.id,
        },
      });
      categoryMap[child.slug] = childCat.id;
    }
  }

  // ── 6. Products, Images, Variants & Inventory ─────────────────────────────

  console.log('  → Products, images, variants & inventory...');

  const products = [
    // ── Apex Electronics Products ──
    {
      vendorId: vendor1.id,
      categorySlug: 'smartphones-accessories',
      name: 'Galaxy Pro Max 256GB',
      slug: 'galaxy-pro-max-256gb',
      description: 'Flagship smartphone with 6.8" AMOLED display, 108MP quad camera, 5000mAh battery, and 12GB RAM.',
      tags: ['smartphone', 'flagship', '5g', 'samsung'],
      price: 89999.00,
      status: ProductStatus.ACTIVE,
      images: [
        { storageKey: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600', altText: 'Galaxy Pro Max front view', position: 0 },
        { storageKey: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600', altText: 'Galaxy Pro Max back view', position: 1 },
      ],
      variants: [
        { sku: 'GPM-256-BLK', attributes: { color: 'Phantom Black', storage: '256GB' }, price: 89999.00, stock: 45 },
        { sku: 'GPM-256-WHT', attributes: { color: 'Cloud White', storage: '256GB' }, price: 89999.00, stock: 30 },
        { sku: 'GPM-512-BLK', attributes: { color: 'Phantom Black', storage: '512GB' }, price: 104999.00, stock: 20 },
      ],
      baseStock: 95,
    },
    {
      vendorId: vendor1.id,
      categorySlug: 'laptops-computers',
      name: 'ProBook Ultra 14" Laptop',
      slug: 'probook-ultra-14-laptop',
      description: 'Ultra-thin laptop with 14" 2.8K OLED, Intel Core i7-13700H, 16GB DDR5, 512GB NVMe SSD.',
      tags: ['laptop', 'ultrabook', 'intel', 'productivity'],
      price: 74999.00,
      status: ProductStatus.ACTIVE,
      images: [
        { storageKey: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600', altText: 'ProBook Ultra front', position: 0 },
      ],
      variants: [
        { sku: 'PBU-16-512', attributes: { ram: '16GB', storage: '512GB SSD' }, price: 74999.00, stock: 35 },
        { sku: 'PBU-32-1TB', attributes: { ram: '32GB', storage: '1TB SSD' }, price: 94999.00, stock: 15 },
      ],
      baseStock: 50,
    },
    {
      vendorId: vendor1.id,
      categorySlug: 'audio-headphones',
      name: 'SoundElite ANC Headphones',
      slug: 'soundelite-anc-headphones',
      description: 'Premium over-ear wireless headphones with hybrid ANC, 40mm drivers, 60-hour battery, and multipoint connectivity.',
      tags: ['headphones', 'wireless', 'anc', 'bluetooth'],
      price: 12999.00,
      status: ProductStatus.ACTIVE,
      images: [
        { storageKey: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', altText: 'SoundElite headphones', position: 0 },
      ],
      variants: [
        { sku: 'SE-ANC-BLK', attributes: { color: 'Matte Black' }, price: 12999.00, stock: 80 },
        { sku: 'SE-ANC-SLV', attributes: { color: 'Silver Frost' }, price: 12999.00, stock: 60 },
      ],
      baseStock: 140,
    },
    {
      vendorId: vendor1.id,
      categorySlug: 'audio-headphones',
      name: 'BassBoom Portable Speaker',
      slug: 'bassboom-portable-speaker',
      description: 'Waterproof IPX7 Bluetooth 5.3 portable speaker with 360° sound, 24-hour playtime, and RGB lighting.',
      tags: ['speaker', 'bluetooth', 'portable', 'waterproof'],
      price: 4999.00,
      status: ProductStatus.ACTIVE,
      images: [
        { storageKey: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600', altText: 'BassBoom speaker', position: 0 },
      ],
      variants: [
        { sku: 'BB-SPK-BLU', attributes: { color: 'Ocean Blue' }, price: 4999.00, stock: 100 },
        { sku: 'BB-SPK-RED', attributes: { color: 'Crimson Red' }, price: 4999.00, stock: 75 },
      ],
      baseStock: 175,
    },
    {
      vendorId: vendor1.id,
      categorySlug: 'smartphones-accessories',
      name: 'MagCharge 15W Wireless Charger',
      slug: 'magcharge-15w-wireless-charger',
      description: 'Qi2-certified magnetic wireless charger with LED indicator, foreign object detection, and foldable design.',
      tags: ['charger', 'wireless', 'qi', 'magsafe'],
      price: 2499.00,
      status: ProductStatus.ACTIVE,
      images: [
        { storageKey: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600', altText: 'MagCharge wireless charger', position: 0 },
      ],
      variants: [
        { sku: 'MC-15W-WHT', attributes: { color: 'White' }, price: 2499.00, stock: 150 },
        { sku: 'MC-15W-BLK', attributes: { color: 'Black' }, price: 2499.00, stock: 120 },
      ],
      baseStock: 270,
    },
    {
      vendorId: vendor1.id,
      categorySlug: 'appliances',
      name: 'SmartBrew Coffee Maker',
      slug: 'smartbrew-coffee-maker',
      description: 'WiFi-enabled drip coffee maker with programmable brewing, 12-cup capacity, and built-in grinder.',
      tags: ['coffee', 'appliance', 'smart-home', 'kitchen'],
      price: 8999.00,
      status: ProductStatus.ACTIVE,
      images: [
        { storageKey: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600', altText: 'SmartBrew coffee maker', position: 0 },
      ],
      variants: [
        { sku: 'SB-CM-BLK', attributes: { color: 'Onyx Black' }, price: 8999.00, stock: 40 },
        { sku: 'SB-CM-SS', attributes: { color: 'Stainless Steel' }, price: 9999.00, stock: 25 },
      ],
      baseStock: 65,
    },

    // ── StyleStudio Fashion Products ──
    {
      vendorId: vendor2.id,
      categorySlug: 'mens-wear',
      name: 'Classic Fit Oxford Shirt',
      slug: 'classic-fit-oxford-shirt',
      description: 'Premium 100% cotton Oxford button-down shirt in a relaxed classic fit. Washed for softness.',
      tags: ['shirt', 'oxford', 'cotton', 'formal'],
      price: 2499.00,
      status: ProductStatus.ACTIVE,
      images: [
        { storageKey: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600', altText: 'Oxford shirt', position: 0 },
      ],
      variants: [
        { sku: 'OXF-S-WHT', attributes: { size: 'S', color: 'White' }, price: 2499.00, stock: 50 },
        { sku: 'OXF-M-WHT', attributes: { size: 'M', color: 'White' }, price: 2499.00, stock: 70 },
        { sku: 'OXF-L-WHT', attributes: { size: 'L', color: 'White' }, price: 2499.00, stock: 60 },
        { sku: 'OXF-M-BLU', attributes: { size: 'M', color: 'Sky Blue' }, price: 2499.00, stock: 55 },
        { sku: 'OXF-L-BLU', attributes: { size: 'L', color: 'Sky Blue' }, price: 2499.00, stock: 45 },
      ],
      baseStock: 280,
    },
    {
      vendorId: vendor2.id,
      categorySlug: 'womens-wear',
      name: 'Floral Summer Maxi Dress',
      slug: 'floral-summer-maxi-dress',
      description: 'Lightweight floral-print maxi dress with adjustable tie-waist and flowy A-line silhouette.',
      tags: ['dress', 'maxi', 'floral', 'summer'],
      price: 3299.00,
      status: ProductStatus.ACTIVE,
      images: [
        { storageKey: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600', altText: 'Floral maxi dress', position: 0 },
      ],
      variants: [
        { sku: 'FMD-S-FLR', attributes: { size: 'S', pattern: 'Pink Floral' }, price: 3299.00, stock: 40 },
        { sku: 'FMD-M-FLR', attributes: { size: 'M', pattern: 'Pink Floral' }, price: 3299.00, stock: 55 },
        { sku: 'FMD-L-FLR', attributes: { size: 'L', pattern: 'Pink Floral' }, price: 3299.00, stock: 35 },
      ],
      baseStock: 130,
    },
    {
      vendorId: vendor2.id,
      categorySlug: 'footwear',
      name: 'Urban Runner Sneakers',
      slug: 'urban-runner-sneakers',
      description: 'Lightweight mesh-upper running sneakers with memory foam insole and anti-slip rubber outsole.',
      tags: ['sneakers', 'running', 'sports', 'casual'],
      price: 3999.00,
      status: ProductStatus.ACTIVE,
      images: [
        { storageKey: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', altText: 'Urban Runner sneakers', position: 0 },
      ],
      variants: [
        { sku: 'UR-8-BLK', attributes: { size: 'UK 8', color: 'Black/White' }, price: 3999.00, stock: 60 },
        { sku: 'UR-9-BLK', attributes: { size: 'UK 9', color: 'Black/White' }, price: 3999.00, stock: 50 },
        { sku: 'UR-10-BLK', attributes: { size: 'UK 10', color: 'Black/White' }, price: 3999.00, stock: 40 },
        { sku: 'UR-9-RED', attributes: { size: 'UK 9', color: 'Red/Grey' }, price: 4299.00, stock: 35 },
      ],
      baseStock: 185,
    },
    {
      vendorId: vendor2.id,
      categorySlug: 'mens-wear',
      name: 'Slim Stretch Chino Trousers',
      slug: 'slim-stretch-chino-trousers',
      description: 'Modern slim-fit chinos with 2% elastane stretch blend for all-day comfort. Flat-front design.',
      tags: ['trousers', 'chino', 'slim-fit', 'casual'],
      price: 1999.00,
      status: ProductStatus.ACTIVE,
      images: [
        { storageKey: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600', altText: 'Slim chino trousers', position: 0 },
      ],
      variants: [
        { sku: 'SCH-30-KHK', attributes: { waist: '30', color: 'Khaki' }, price: 1999.00, stock: 65 },
        { sku: 'SCH-32-KHK', attributes: { waist: '32', color: 'Khaki' }, price: 1999.00, stock: 80 },
        { sku: 'SCH-34-NVY', attributes: { waist: '34', color: 'Navy' }, price: 1999.00, stock: 55 },
        { sku: 'SCH-32-NVY', attributes: { waist: '32', color: 'Navy' }, price: 1999.00, stock: 70 },
      ],
      baseStock: 270,
    },
    {
      vendorId: vendor2.id,
      categorySlug: 'cookware',
      name: 'Cast Iron Skillet 10"',
      slug: 'cast-iron-skillet-10-inch',
      description: 'Pre-seasoned cast iron skillet, 10-inch, oven-safe to 500°F. Perfect for searing, baking, and frying.',
      tags: ['skillet', 'cast-iron', 'cookware', 'kitchen'],
      price: 2799.00,
      status: ProductStatus.ACTIVE,
      images: [
        { storageKey: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600', altText: 'Cast iron skillet', position: 0 },
      ],
      variants: [
        { sku: 'CIS-10', attributes: { size: '10 inch' }, price: 2799.00, stock: 90 },
        { sku: 'CIS-12', attributes: { size: '12 inch' }, price: 3499.00, stock: 50 },
      ],
      baseStock: 140,
    },
  ];

  for (const p of products) {
    const categoryId = categoryMap[p.categorySlug];
    if (!categoryId) {
      console.warn(`  ⚠ Category "${p.categorySlug}" not found, skipping "${p.name}"`);
      continue;
    }

    // Upsert product
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        vendorId: p.vendorId,
        categoryId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        tags: p.tags,
        price: p.price,
        status: p.status,
      },
    });

    // Images (skip if already exist)
    const existingImages = await prisma.productImage.count({
      where: { productId: product.id },
    });
    if (existingImages === 0) {
      await prisma.productImage.createMany({
        data: p.images.map((img) => ({
          productId: product.id,
          storageKey: img.storageKey,
          altText: img.altText,
          position: img.position,
        })),
      });
    }

    // Base inventory
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        availableQuantity: p.baseStock,
        reservedQuantity: 0,
      },
    });

    // Variants + VariantInventory
    for (const v of p.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {},
        create: {
          productId: product.id,
          sku: v.sku,
          attributes: v.attributes,
          price: v.price,
        },
      });

      await prisma.variantInventory.upsert({
        where: { variantId: variant.id },
        update: {},
        create: {
          variantId: variant.id,
          availableQuantity: v.stock,
          reservedQuantity: 0,
        },
      });
    }

    console.log(`    ✓ ${p.name} (${p.variants.length} variants, stock: ${p.baseStock})`);
  }

  // ── 7. Coupons ──────────────────────────────────────────────────────────────

  console.log('  → Promotional coupons...');

  const coupons = [
    {
      code: 'WELCOME10',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10.00,
      minOrderValue: 500.00,
      maxUses: 1000,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },
    {
      code: 'FLAT500',
      discountType: DiscountType.FLAT,
      discountValue: 500.00,
      minOrderValue: 2500.00,
      maxUses: 500,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    },
    {
      code: 'FESTIVE25',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 25.00,
      minOrderValue: 1000.00,
      maxUses: 200,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: {
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrderValue: c.minOrderValue,
        maxUses: c.maxUses,
        expiresAt: c.expiresAt,
        isActive: true,
      },
    });
    console.log(`    ✓ ${c.code} (${c.discountType === DiscountType.PERCENTAGE ? c.discountValue + '%' : '₹' + c.discountValue})`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  const counts = {
    roles: await prisma.role.count(),
    users: await prisma.user.count(),
    vendors: await prisma.vendor.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    coupons: await prisma.coupon.count(),
  };

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   🎉 Mercantix Database Seeded!      ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Roles:      ${String(counts.roles).padStart(4)}                   ║`);
  console.log(`║  Users:      ${String(counts.users).padStart(4)}                   ║`);
  console.log(`║  Vendors:    ${String(counts.vendors).padStart(4)}                   ║`);
  console.log(`║  Categories: ${String(counts.categories).padStart(4)}                   ║`);
  console.log(`║  Products:   ${String(counts.products).padStart(4)}                   ║`);
  console.log(`║  Variants:   ${String(counts.variants).padStart(4)}                   ║`);
  console.log(`║  Coupons:    ${String(counts.coupons).padStart(4)}                   ║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('\n  Credentials (all accounts):');
  console.log('    Email: admin@mercantix.com        Role: ADMIN');
  console.log('    Email: vendor.apex@mercantix.com   Role: VENDOR');
  console.log('    Email: vendor.style@mercantix.com  Role: VENDOR');
  console.log('    Email: buyer@mercantix.com         Role: BUYER');
  console.log('    Password: Password@123\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
