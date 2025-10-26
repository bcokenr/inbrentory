import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Clear old data
    await prisma.transaction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.category.deleteMany();

    // --- Create Categories ---
  const categoryNames = [
    'Jewelry',
    'Lingerie',
    'Outerwear',
    'Tops',
    'Dresses',
    'Purses',
    'Bottoms',
    'Accessories',
  ];

  const categories = await Promise.all(
    categoryNames.map((name) =>
      prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

    console.log(`✅ Created or found ${categories.length} categories.`);

    // Helper to find category by name
    const getCategory = (name: string) =>
    categories.find((c) => c.name === name)!;

    // Seed sample items with relations
    const dressesCategory = await getCategory("Dresses");
    const topsCategory = await getCategory("Tops");
    const outerwearCategory = await getCategory("Outerwear");
    const accessoriesCategory = await getCategory("Accessories");

    await prisma.item.create({
        data: {
            quantity: 1,
            name: "Gunne Sax Womens Black and Brown Skirt",
            costBasis: new Prisma.Decimal(20),
            listPrice: new Prisma.Decimal(110),
            description:
                "Gunne Sax maxi skirt - beautiful moody witchy vintage piece with floral and lace trim.",
            keywords:
                "60s 70s prairie cottage witchy goth vintage #gunnesax #boho",
            categories: {
                connect: { id: dressesCategory?.id },
            },
            measurements: "23”-24” waist, open hip, 44” length",
            hasPrintedTag: false,
        },
    });

        await prisma.item.create({
        data: {
            quantity: 1,
            name: "City Triangles Womens Burgundy and Red Dress",
            costBasis: new Prisma.Decimal(7),
            listPrice: new Prisma.Decimal(38),
            description:
                "90s goth asymmetrical dress - super hot little 90s glitter goth dress! asymmetrical one shoulder strap, bodycon fit with a side scrunch, high low hem cut. black with red glitter sparkle micro wavey dot print. city triangles brand, tag size small, made in USA, 77% nylon 17% metallic 6% spandex. a lot of stretch.",
            keywords:
                "90s y2k 2000s mall goth gothic vampy vampire jessica rabbit romantic dark fairy rave raver club cocktail homecoming prom formal party date night #90s  #y2k  #citytriangles  #goth  #vampy",
            categories: {
                connect: { id: dressesCategory?.id },
            },
            measurements: "30”-36” bust, 24”-29” waist, 30”-38” hip, 54” length",
            hasPrintedTag: false,
        },
    });

    await prisma.item.create({
        data: {
            quantity: 1,
            name: "Mens Multi Jumper",
            costBasis: new Prisma.Decimal(7),
            listPrice: new Prisma.Decimal(40),
            description:
                "90s preppy golf pullover - white with navy and teal striping.",
            keywords: "90s vintage golf sporty retro preppy #normcore",
            categories: {
                connect: { id: topsCategory?.id },
            },
            measurements: "48” bust, 40”-52” waist, 27” length, 21” sleeve",
            hasPrintedTag: true,
        },
    });

    // Create a transaction with related items
    await prisma.transaction.create({
        data: {
            total: new Prisma.Decimal(150),
            items: {
                create: [
                    {
                        name: "Vintage Leather Jacket",
                        description: "Classic brown leather with soft lining.",
                        listPrice: new Prisma.Decimal(120),
                        costBasis: new Prisma.Decimal(60),
                        categories: {
                            connect: { id: outerwearCategory?.id },
                        },
                    },
                    {
                        name: "Retro Sunglasses",
                        description: "1960s style sunglasses, great condition.",
                        listPrice: new Prisma.Decimal(30),
                        costBasis: new Prisma.Decimal(10),
                        categories: {
                            connect: { id: accessoriesCategory?.id },
                        },
                    },
                ],
            },
        },
    });

    console.log('✅ Database seeded successfully');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
