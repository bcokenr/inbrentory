import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Clear existing data (optional)
    await prisma.item.deleteMany();

    // Seed sample items
    await prisma.item.createMany({
        data: [
            {
                id: 1,
                quantity: 1,
                name: "Gunne Sax Womens Black and Brown Skirt",
                cost_basis: 2000,
                transaction_price: 11000,
                transaction_id: 1,
                list_price: 11000,
                description: "gunne sax maxi skirt - beautiful moody witchy gunne sax maxi prairie skirt!! black with floral and micro polka dot prints, lace trim, and velvet lace up faux corset waist detail. zips up the back. 100% cotton. true vintage collectors piece 🖤 best fit xxs-xs",
                keywords: "60s 70s prairie cottage the love witch practical magic stevie nicks dark academia boho bohemian goth gothic southern gothic Ethel Cain country Americana dark romantic edwardian victorian #gunnesax  #truevintage  #cottagecore  #witchy  #boho",
                categories: "dresses",
                measurements: "23”-24” waist, open hip, 44” length",
                // image_urls: ["/items/dress1.jpg", "/items/dress2.jpg", "/items/dress3.jpg", "/items/dress4.jpg", "/items/dress5.jpg", "/items/dress6.jpg"],
                has_printed_tag: false,
            },
            {
                id: 2,
                quantity: 1,
                name: "Mens multi Jumper",
                cost_basis: 700,
                transaction_price: 4000,
                transaction_id: 1,
                list_price: 4000,
                description: "90s preppy golf pullover - super fun 80s/90s golf knit pullover. white with navy and teal striping/graphic. soft, textured, really cool for a looser summer transitioning to fall piece. brand is “QUANTUM! sportswear ltd” material is acrylic. small hole notes in photos, only visible if pulled tight. ",
                keywords: "80s 90s vintage golf sporty retro collegiate midweight athletic athleticwear sportswear coastal grandpa dadcore us open heritage preppy normcore ivy league country club golfcore #90s  #heritage  #preppy  #athleticwear  #normcore ",
                categories: "tops",
                measurements: "8”-52” bust, 40”-52” waist, 27” length, 21” sleeve",
                // image_urls: ["/items/golf1.jpg", "/items/golf2.jpg"],
                has_printed_tag: true,
            },
            {
                id: 3,
                quantity: 1,
                name: "City Triangles Womens Burgundy and Red Dress",
                cost_basis: 700,
                list_price: 3800,
                description: "90s goth asymmetrical dress - super hot little 90s glitter goth dress! asymmetrical one shoulder strap, bodycon fit with a side scrunch, high low hem cut. black with red glitter sparkle micro wavey dot print. city triangles brand, tag size small, made in USA, 77% nylon 17% metallic 6% spandex. a lot of stretch.",
                keywords: "90s y2k 2000s mall goth gothic vampy vampire jessica rabbit romantic dark fairy rave raver club cocktail homecoming prom formal party date night #90s  #y2k  #citytriangles  #goth  #vampy",
                categories: "tops",
                measurements: "30”-36” bust, 24”-29” waist, 30”-38” hip, 54” length",
                // image_urls: ["/items/burgundy1.jpg", "/items/burgundy2.jpg"],
                has_printed_tag: false,
            }
        ],
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
