import { PrismaClient, UserRole, VerificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ─── Service Categories ────────────────────────────────────────────────────
  const categories = [
    { slug: 'plumbing', nameEn: 'Plumbing', nameUr: 'پلمبنگ', icon: 'droplets' },
    { slug: 'electrical', nameEn: 'Electrical Work', nameUr: 'بجلی کا کام', icon: 'zap' },
    { slug: 'painting', nameEn: 'Painting', nameUr: 'پینٹنگ', icon: 'paintbrush' },
    { slug: 'carpentry', nameEn: 'Carpentry', nameUr: 'بڑھئی کا کام', icon: 'hammer' },
    { slug: 'tiling', nameEn: 'Tiling & Flooring', nameUr: 'ٹائلنگ اور فرش', icon: 'grid-3x3' },
    { slug: 'renovation', nameEn: 'General Construction / Renovation', nameUr: 'عام تعمیر / تزئین', icon: 'building-2' },
    { slug: 'ac', nameEn: 'AC Installation & Repair', nameUr: 'اے سی تنصیب اور مرمت', icon: 'wind' },
  ];

  for (const cat of categories) {
    await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: { nameEn: cat.nameEn, nameUr: cat.nameUr, icon: cat.icon },
      create: cat,
    });
  }

  // ─── Cities ───────────────────────────────────────────────────────────────
  const cities = [
    { slug: 'karachi', nameEn: 'Karachi', nameUr: 'کراچی' },
    { slug: 'lahore', nameEn: 'Lahore', nameUr: 'لاہور' },
    { slug: 'islamabad', nameEn: 'Islamabad / Rawalpindi', nameUr: 'اسلام آباد / راولپنڈی' },
    { slug: 'peshawar', nameEn: 'Peshawar', nameUr: 'پشاور' },
  ];

  for (const city of cities) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: { nameEn: city.nameEn, nameUr: city.nameUr },
      create: city,
    });
  }

  // ─── Admin User ───────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { phone: '+923000000000' },
    update: {},
    create: {
      phone: '+923000000000',
      name: 'Admin',
      role: UserRole.ADMIN,
    },
  });

  // ─── Dev Sample Data ──────────────────────────────────────────────────────
  if (process.env.NODE_ENV === 'development') {
    const lahore = await prisma.city.findUnique({ where: { slug: 'lahore' } });
    const karachi = await prisma.city.findUnique({ where: { slug: 'karachi' } });
    const plumbing = await prisma.serviceCategory.findUnique({ where: { slug: 'plumbing' } });
    const electrical = await prisma.serviceCategory.findUnique({ where: { slug: 'electrical' } });
    const painting = await prisma.serviceCategory.findUnique({ where: { slug: 'painting' } });

    const thekedaar1 = await prisma.user.upsert({
      where: { phone: '+923001111111' },
      update: {},
      create: {
        phone: '+923001111111',
        name: 'Ahmed Khan',
        role: UserRole.THEKEDAAR,
      },
    });

    await prisma.thekedaarProfile.upsert({
      where: { userId: thekedaar1.id },
      update: {},
      create: {
        userId: thekedaar1.id,
        bio: 'Experienced plumber with 10+ years in Lahore. Specializes in pipe installation and leak repairs.',
        cnicNumber: '35202-1234567-1',
        verificationStatus: VerificationStatus.APPROVED,
        pricingRangeMin: 2000,
        pricingRangeMax: 15000,
        avgRating: 4.7,
        totalJobs: 45,
        totalReviews: 38,
        serviceCategories: { connect: [{ slug: 'plumbing' }] },
        cities: { connect: [{ slug: 'lahore' }] },
      },
    });

    const thekedaar2 = await prisma.user.upsert({
      where: { phone: '+923002222222' },
      update: {},
      create: {
        phone: '+923002222222',
        name: 'Bilal Electrician',
        role: UserRole.THEKEDAAR,
      },
    });

    await prisma.thekedaarProfile.upsert({
      where: { userId: thekedaar2.id },
      update: {},
      create: {
        userId: thekedaar2.id,
        bio: 'Certified electrician. Available in Karachi for all electrical work.',
        verificationStatus: VerificationStatus.APPROVED,
        pricingRangeMin: 1500,
        pricingRangeMax: 20000,
        avgRating: 4.5,
        totalJobs: 30,
        totalReviews: 25,
        serviceCategories: { connect: [{ slug: 'electrical' }] },
        cities: { connect: [{ slug: 'karachi' }] },
      },
    });

    const homeowner = await prisma.user.upsert({
      where: { phone: '+923009999999' },
      update: {},
      create: {
        phone: '+923009999999',
        name: 'Sana Siddiqui',
        role: UserRole.HOMEOWNER,
      },
    });

    await prisma.jobPost.upsert({
      where: { id: 'seed-job-001' },
      update: {},
      create: {
        id: 'seed-job-001',
        homeownerId: homeowner.id,
        title: 'Fix leaking bathroom pipe',
        description: 'Water is leaking under the bathroom sink. Need a plumber to fix it urgently.',
        categoryId: plumbing!.id,
        cityId: lahore!.id,
        area: 'DHA Phase 5',
        budgetMin: 2000,
        budgetMax: 5000,
      },
    });
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
