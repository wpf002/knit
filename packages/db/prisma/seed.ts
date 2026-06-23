// Seed full, varied closets so the feeds, discover, and profiles feel real:
//   - a mutual friendship (free friend layer) + a shared circle
//   - one-way follows onto two creators (paid creator layer)
//   - dozens of items across every category and all three visibility tiers
import { prisma, Visibility } from "../src/index.js";

// A pool of fashion photos (Unsplash). Cycled across items; any that fail to
// load fall back to the card's neutral placeholder.
const PHOTOS = [
  "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80",
  "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600&q=80",
  "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80",
  "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80",
  "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600&q=80",
  "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&q=80",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80",
  "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600&q=80",
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80",
  "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80",
  "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80",
  "https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=600&q=80",
  "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&q=80",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
  "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&q=80",
];

type Spec = {
  title: string;
  brand: string;
  category: string;
  size?: string;
  fit?: string;
  color?: string;
  material?: string;
  vis: "CIRCLE" | "FOLLOWER" | "PUBLIC";
  // friend layer: freeBorrow = rentable with no price. creator layer: rent (daily cents) + deposit.
  freeBorrow?: boolean;
  rent?: number;
  deposit?: number;
  buy?: number;
  give?: boolean;
};

// Jess — a friend. Mostly CIRCLE, free to borrow; a few give-aways + cheap buys.
const JESS: Spec[] = [
  { title: "Vintage denim jacket", brand: "Levi's", category: "outerwear", size: "M", color: "indigo", vis: "CIRCLE", freeBorrow: true, give: true },
  { title: "Cropped wool blazer", brand: "Aritzia", category: "blazer", size: "M", color: "camel", vis: "CIRCLE", freeBorrow: true },
  { title: "Ribbed knit tank", brand: "COS", category: "top", size: "S", color: "cream", vis: "CIRCLE", freeBorrow: true },
  { title: "High-rise straight jeans", brand: "Madewell", category: "jeans", size: "28", fit: "straight", color: "mid-wash", vis: "CIRCLE", freeBorrow: true },
  { title: "Oversized cardigan", brand: "Free People", category: "knitwear", size: "M", color: "oatmeal", vis: "CIRCLE", freeBorrow: true, give: true },
  { title: "Pleated mini skirt", brand: "Zara", category: "skirt", size: "S", color: "black", vis: "CIRCLE", freeBorrow: true },
  { title: "Linen shirt dress", brand: "Mango", category: "dress", size: "M", color: "white", vis: "CIRCLE", freeBorrow: true },
  { title: "Graphic tee", brand: "Vintage", category: "t-shirt", size: "M", color: "washed black", vis: "CIRCLE", freeBorrow: true, give: true },
  { title: "Faux-leather leggings", brand: "Aritzia", category: "trousers", size: "S", color: "black", vis: "CIRCLE", freeBorrow: true },
  { title: "Quilted crossbody", brand: "Mango", category: "bag", color: "black", vis: "CIRCLE", freeBorrow: true, buy: 3500 },
  { title: "White low-top sneakers", brand: "Veja", category: "shoes", size: "8", color: "white", vis: "CIRCLE", freeBorrow: true },
  { title: "Silk slip skirt", brand: "Sézane", category: "skirt", size: "S", color: "champagne", vis: "CIRCLE", freeBorrow: true },
  { title: "Striped boatneck top", brand: "Saint James", category: "top", size: "M", color: "navy/white", vis: "CIRCLE", freeBorrow: true },
  { title: "Corduroy mini dress", brand: "Urban Outfitters", category: "dress", size: "S", color: "rust", vis: "CIRCLE", give: true },
];

// Maya — a creator AND Jess's friend. Friend-facing CIRCLE pieces + paid
// FOLLOWER/PUBLIC pieces with deposits.
const MAYA: Spec[] = [
  { title: "Black slip dress", brand: "Reformation", category: "dress", size: "S", fit: "regular", color: "black", vis: "FOLLOWER", rent: 1500, deposit: 4000, buy: 9000 },
  { title: "Floral midi dress", brand: "Ganni", category: "dress", size: "S", color: "pink", vis: "CIRCLE", freeBorrow: true },
  { title: "Sequin slip dress", brand: "Realisation Par", category: "dress", size: "S", color: "silver", vis: "FOLLOWER", rent: 2200, deposit: 6000 },
  { title: "Tailored wide-leg trousers", brand: "Toteme", category: "trousers", size: "S", color: "ecru", vis: "FOLLOWER", rent: 1400, deposit: 3000 },
  { title: "Puff-sleeve blouse", brand: "Sézane", category: "blouse", size: "S", color: "ivory", vis: "PUBLIC", rent: 1000, deposit: 2000, buy: 4500 },
  { title: "Cropped trench coat", brand: "Mango", category: "coat", size: "S", color: "stone", vis: "FOLLOWER", rent: 1600, deposit: 4000 },
  { title: "Cashmere crewneck", brand: "Aritzia", category: "knitwear", size: "S", color: "grey", vis: "CIRCLE", freeBorrow: true },
  { title: "Satin maxi skirt", brand: "Staud", category: "skirt", size: "S", color: "emerald", vis: "FOLLOWER", rent: 1300, deposit: 3000 },
  { title: "Halter jumpsuit", brand: "With Jéan", category: "jumpsuit", size: "S", color: "black", vis: "PUBLIC", rent: 1800, deposit: 4000 },
  { title: "Strappy heeled sandals", brand: "Schutz", category: "shoes", size: "7", color: "nude", vis: "FOLLOWER", rent: 900, deposit: 2000 },
  { title: "Mini structured bag", brand: "Polène", category: "bag", color: "tan", vis: "PUBLIC", rent: 1200, deposit: 5000, buy: 18000 },
  { title: "Knit co-ord set", brand: "Dôen", category: "knitwear", size: "S", color: "butter", vis: "CIRCLE", freeBorrow: true },
  { title: "Vintage band tee", brand: "Vintage", category: "t-shirt", size: "M", color: "black", vis: "CIRCLE", freeBorrow: true, give: true },
  { title: "Bias-cut slip skirt", brand: "Reformation", category: "skirt", size: "S", color: "navy", vis: "FOLLOWER", rent: 1100, deposit: 2500 },
];

// Ana — a creator (vintage + going-out). Paid FOLLOWER/PUBLIC, deposits.
const ANA: Spec[] = [
  { title: "Quilted leather tote", brand: "Polène", category: "bag", color: "tan", vis: "PUBLIC", rent: 2000, deposit: 5000, buy: 12000 },
  { title: "Satin maxi skirt", brand: "Vintage", category: "skirt", size: "M", color: "champagne", vis: "FOLLOWER", rent: 1200, deposit: 3000 },
  { title: "Sequined mini dress", brand: "Rixo", category: "dress", size: "M", color: "gold", vis: "FOLLOWER", rent: 2500, deposit: 6000 },
  { title: "Leather moto jacket", brand: "AllSaints", category: "outerwear", size: "M", color: "black", vis: "PUBLIC", rent: 1800, deposit: 7000, buy: 22000 },
  { title: "Vintage Levi's 501s", brand: "Levi's", category: "jeans", size: "29", fit: "straight", color: "vintage blue", vis: "PUBLIC", rent: 800, deposit: 1500, buy: 6500 },
  { title: "Maxi wrap dress", brand: "Faithfull the Brand", category: "dress", size: "M", color: "floral", vis: "FOLLOWER", rent: 1600, deposit: 3500 },
  { title: "Knee-high leather boots", brand: "Vagabond", category: "shoes", size: "8", color: "black", vis: "FOLLOWER", rent: 1400, deposit: 4000 },
  { title: "Oversized blazer", brand: "Veronica Beard", category: "blazer", size: "M", color: "pinstripe", vis: "PUBLIC", rent: 1700, deposit: 4000 },
  { title: "Silk scarf", brand: "Vintage Hermès", category: "accessory", color: "multicolor", vis: "PUBLIC", rent: 600, deposit: 3000 },
  { title: "Corset top", brand: "Miaou", category: "top", size: "M", color: "ivory", vis: "FOLLOWER", rent: 1100, deposit: 2500 },
  { title: "Faux-fur coat", brand: "Apparis", category: "coat", size: "M", color: "cream", vis: "FOLLOWER", rent: 2000, deposit: 5000 },
  { title: "Statement gold hoops", brand: "Mejuri", category: "accessory", color: "gold", vis: "PUBLIC", rent: 500, deposit: 2000, buy: 4000 },
  { title: "Going-out mini skirt", brand: "House of CB", category: "skirt", size: "M", color: "black", vis: "FOLLOWER", rent: 1000, deposit: 2000 },
  { title: "Platform heels", brand: "Steve Madden", category: "shoes", size: "8", color: "black", vis: "PUBLIC", rent: 900, deposit: 2500 },
];

async function main() {
  const maya = await prisma.user.upsert({
    where: { email: "maya@knit.app" },
    update: { isCreator: true, heightCm: 170, usualSize: "S" },
    create: { email: "maya@knit.app", handle: "maya", displayName: "Maya", isCreator: true, bio: "closet tours + outfit details", heightCm: 170, usualSize: "S" },
  });
  const jess = await prisma.user.upsert({
    where: { email: "jess@knit.app" },
    update: { heightCm: 165, usualSize: "M" },
    create: { email: "jess@knit.app", handle: "jess", displayName: "Jess", heightCm: 165, usualSize: "M" },
  });
  const ana = await prisma.user.upsert({
    where: { email: "ana@knit.app" },
    update: { isCreator: true, heightCm: 175, usualSize: "M" },
    create: { email: "ana@knit.app", handle: "ana", displayName: "Ana", isCreator: true, bio: "vintage finds + going-out fits", heightCm: 175, usualSize: "M" },
  });

  await prisma.friendship.upsert({
    where: { requesterId_addresseeId: { requesterId: maya.id, addresseeId: jess.id } },
    update: { status: "ACCEPTED" },
    create: { requesterId: maya.id, addresseeId: jess.id, status: "ACCEPTED" },
  });

  const follows: Array<[string, string]> = [
    [jess.id, maya.id],
    [jess.id, ana.id],
    [maya.id, ana.id],
  ];
  for (const [followerId, followeeId] of follows) {
    await prisma.follow.upsert({
      where: { followerId_followeeId: { followerId, followeeId } },
      update: {},
      create: { followerId, followeeId },
    });
  }

  const circle = await prisma.circle.upsert({
    where: { id: "seed-circle" },
    update: {},
    create: { id: "seed-circle", name: "The Group Chat", ownerId: maya.id },
  });
  await prisma.circleMembership.createMany({
    data: [
      { circleId: circle.id, userId: maya.id, role: "OWNER" },
      { circleId: circle.id, userId: jess.id, role: "MEMBER" },
    ],
    skipDuplicates: true,
  });

  // Reset items (and dependent saves) so re-seeding stays clean.
  await prisma.savedItem.deleteMany({});
  await prisma.closetItem.deleteMany({});

  let photoIdx = 0;
  const nextPhoto = () => PHOTOS[photoIdx++ % PHOTOS.length]!;

  const build = (ownerId: string, specs: Spec[]) =>
    specs
      .filter((s) => s.vis === "CIRCLE" || s.vis === "FOLLOWER" || s.vis === "PUBLIC")
      .map((s) => ({
        ownerId,
        title: s.title,
        brand: s.brand,
        category: s.category,
        size: s.size ?? null,
        fit: s.fit ?? null,
        color: s.color ?? null,
        material: s.material ?? null,
        photos: [nextPhoto()],
        visibility: s.vis as Visibility,
        rentable: Boolean(s.freeBorrow || s.rent != null),
        rentDailyCents: s.rent ?? null,
        depositCents: s.deposit ?? null,
        buyable: s.buy != null,
        buyCents: s.buy ?? null,
        giveable: Boolean(s.give),
      }));

  const data = [...build(jess.id, JESS), ...build(maya.id, MAYA), ...build(ana.id, ANA)];
  await prisma.closetItem.createMany({ data });

  console.log(`Seeded: 3 users, 1 circle, 1 friendship, 3 follows, ${data.length} items across all tiers`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
