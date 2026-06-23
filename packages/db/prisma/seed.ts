// Seed full, varied closets so feeds, discover, and profiles feel real.
// Photos are actual PRODUCT shots (flat/on-white), each item with its own
// distinct image matched to what it is — not stock photos of models. Sourced
// from DummyJSON's stable CDN.
import { prisma, Visibility } from "../src/index.js";

const img = (cat: string, slug: string) =>
  `https://cdn.dummyjson.com/product-images/${cat}/${slug}/thumbnail.webp`;

type Spec = {
  title: string;
  brand: string;
  category: string;
  size?: string;
  fit?: string;
  color?: string;
  material?: string;
  photo: string;
  vis: "CIRCLE" | "FOLLOWER" | "PUBLIC";
  // friend layer: freeBorrow = rentable, no price. creator layer: rent (daily cents) + deposit.
  freeBorrow?: boolean;
  rent?: number;
  deposit?: number;
  buy?: number;
  give?: boolean;
};

// Jess — a friend. CIRCLE, free to borrow; a few give-aways + cheap buys.
const JESS: Spec[] = [
  { title: "Summer dress", brand: "Ganni", category: "dress", size: "S", color: "blue", photo: img("tops", "girl-summer-dress"), vis: "CIRCLE", freeBorrow: true },
  { title: "Gray mini dress", brand: "Zara", category: "dress", size: "S", color: "grey", photo: img("tops", "gray-dress"), vis: "CIRCLE", freeBorrow: true, give: true },
  { title: "Short ruffle frock", brand: "Mango", category: "dress", size: "S", color: "white", photo: img("tops", "short-frock"), vis: "CIRCLE", freeBorrow: true },
  { title: "Blue frock", brand: "Sézane", category: "dress", size: "M", color: "blue", photo: img("tops", "blue-frock"), vis: "CIRCLE", freeBorrow: true },
  { title: "Red strappy heels", brand: "Zara", category: "shoes", size: "8", color: "red", photo: img("womens-shoes", "red-shoes"), vis: "CIRCLE", freeBorrow: true },
  { title: "Black handbag", brand: "Mango", category: "bag", color: "black", photo: img("womens-bags", "women-handbag-black"), vis: "CIRCLE", freeBorrow: true, buy: 3500 },
  { title: "Oval drop earrings", brand: "Mejuri", category: "accessory", color: "green", photo: img("womens-jewellery", "green-oval-earring"), vis: "CIRCLE", freeBorrow: true, give: true },
  { title: "Classic sunglasses", brand: "Ray-Ban", category: "accessory", color: "black", photo: img("sunglasses", "classic-sun-glasses"), vis: "CIRCLE", freeBorrow: true },
  { title: "Plaid shirt", brand: "Vintage", category: "shirt", size: "M", color: "red plaid", photo: img("mens-shirts", "man-plaid-shirt"), vis: "CIRCLE", freeBorrow: true },
  { title: "Future Rider trainers", brand: "Puma", category: "sneakers", size: "8", color: "cream", photo: img("mens-shoes", "puma-future-rider-trainers"), vis: "CIRCLE", freeBorrow: true },
  { title: "Faux-leather backpack", brand: "Arket", category: "bag", color: "white", photo: img("womens-bags", "white-faux-leather-backpack"), vis: "CIRCLE", freeBorrow: true, give: true },
  { title: "Check shirt", brand: "Uniqlo", category: "shirt", size: "M", color: "blue check", photo: img("mens-shirts", "men-check-shirt"), vis: "CIRCLE", freeBorrow: true },
];

// Maya — a creator AND Jess's friend. Friend-facing CIRCLE pieces + paid
// FOLLOWER/PUBLIC pieces with deposits.
const MAYA: Spec[] = [
  { title: "Corset midi dress", brand: "House of CB", category: "dress", size: "S", color: "black", photo: img("womens-dresses", "corset-with-black-skirt"), vis: "FOLLOWER", rent: 1800, deposit: 4000 },
  { title: "Pea-coat dress", brand: "Reformation", category: "dress", size: "S", color: "navy", photo: img("womens-dresses", "dress-pea"), vis: "PUBLIC", rent: 1200, deposit: 2500, buy: 6000 },
  { title: "Calvin Klein heels", brand: "Calvin Klein", category: "shoes", size: "7", color: "nude", photo: img("womens-shoes", "calvin-klein-heel-shoes"), vis: "FOLLOWER", rent: 1000, deposit: 2000 },
  { title: "Prada top-handle bag", brand: "Prada", category: "bag", color: "black", photo: img("womens-bags", "prada-women-bag"), vis: "PUBLIC", rent: 2500, deposit: 8000, buy: 45000 },
  { title: "Tartan mini dress", brand: "Vivienne Westwood", category: "dress", size: "S", color: "tartan", photo: img("tops", "tartan-dress"), vis: "CIRCLE", freeBorrow: true },
  { title: "Datejust watch", brand: "Rolex", category: "accessory", color: "gold/steel", photo: img("womens-watches", "rolex-datejust-women"), vis: "FOLLOWER", rent: 3000, deposit: 20000 },
  { title: "Crystal drop earrings", brand: "Swarovski", category: "accessory", color: "green", photo: img("womens-jewellery", "green-crystal-earring"), vis: "CIRCLE", freeBorrow: true },
  { title: "Black sunglasses", brand: "Celine", category: "accessory", color: "black", photo: img("sunglasses", "black-sun-glasses"), vis: "PUBLIC", rent: 600, deposit: 2000, buy: 4500 },
  { title: "Golden party heels", brand: "Schutz", category: "shoes", size: "7", color: "gold", photo: img("womens-shoes", "golden-shoes-woman"), vis: "FOLLOWER", rent: 1100, deposit: 2500 },
  { title: "Gold dress watch", brand: "Michael Kors", category: "accessory", color: "gold", photo: img("womens-watches", "watch-gold-for-women"), vis: "FOLLOWER", rent: 1200, deposit: 5000 },
  { title: "Graphic tee", brand: "Vintage", category: "top", size: "M", color: "black", photo: img("mens-shirts", "gigabyte-aorus-men-tshirt"), vis: "CIRCLE", freeBorrow: true, give: true },
  { title: "Party glasses", brand: "Poppy Lissiman", category: "accessory", color: "tinted", photo: img("sunglasses", "party-glasses"), vis: "CIRCLE", freeBorrow: true },
];

// Ana — a creator (vintage + going-out). Paid FOLLOWER/PUBLIC, deposits.
const ANA: Spec[] = [
  { title: "Leather corset dress", brand: "Mugler", category: "dress", size: "M", color: "black", photo: img("womens-dresses", "corset-leather-with-skirt"), vis: "FOLLOWER", rent: 2500, deposit: 6000 },
  { title: "Strappy sandals", brand: "Steve Madden", category: "shoes", size: "8", color: "tan", photo: img("womens-shoes", "pampi-shoes"), vis: "FOLLOWER", rent: 900, deposit: 2000 },
  { title: "Cellini moonphase watch", brand: "Rolex", category: "accessory", color: "rose gold", photo: img("womens-watches", "rolex-cellini-moonphase"), vis: "PUBLIC", rent: 3500, deposit: 25000 },
  { title: "Ingenieur steel watch", brand: "IWC", category: "accessory", color: "steel", photo: img("womens-watches", "iwc-ingenieur-automatic-steel"), vis: "FOLLOWER", rent: 2800, deposit: 20000 },
  { title: "Tropical statement earrings", brand: "Vintage", category: "accessory", color: "multicolor", photo: img("womens-jewellery", "tropical-earring"), vis: "PUBLIC", rent: 500, deposit: 2000, buy: 4000 },
  { title: "Green-and-black sunglasses", brand: "Gentle Monster", category: "accessory", color: "green/black", photo: img("sunglasses", "green-and-black-glasses"), vis: "PUBLIC", rent: 700, deposit: 3000 },
  { title: "Round sunglasses", brand: "Vintage", category: "accessory", color: "tortoise", photo: img("sunglasses", "sunglasses"), vis: "FOLLOWER", rent: 600, deposit: 2000 },
  { title: "Air Jordan 1", brand: "Nike", category: "sneakers", size: "8", color: "red/black", photo: img("mens-shoes", "nike-air-jordan-1-red-and-black"), vis: "PUBLIC", rent: 1500, deposit: 5000, buy: 18000 },
  { title: "Baseball cleats", brand: "Nike", category: "sneakers", size: "8", color: "white", photo: img("mens-shoes", "nike-baseball-cleats"), vis: "FOLLOWER", rent: 800, deposit: 2000 },
  { title: "Off-white sneakers", brand: "Vintage", category: "sneakers", size: "8", color: "off-white/red", photo: img("mens-shoes", "sports-sneakers-off-white-red"), vis: "PUBLIC", rent: 900, deposit: 2500 },
  { title: "Short-sleeve shirt", brand: "COS", category: "shirt", size: "M", color: "white", photo: img("mens-shirts", "man-short-sleeve-shirt"), vis: "FOLLOWER", rent: 700, deposit: 1500 },
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

  await prisma.savedItem.deleteMany({});
  await prisma.closetItem.deleteMany({});

  const build = (ownerId: string, specs: Spec[]) =>
    specs.map((s) => ({
      ownerId,
      title: s.title,
      brand: s.brand,
      category: s.category,
      size: s.size ?? null,
      fit: s.fit ?? null,
      color: s.color ?? null,
      material: s.material ?? null,
      photos: [s.photo],
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

  console.log(`Seeded: 3 users, 1 circle, 1 friendship, 3 follows, ${data.length} product-photo items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
