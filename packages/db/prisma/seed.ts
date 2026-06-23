// Minimal seed: one creator, one friend, a circle, a couple of closet items
// at different visibility tiers. Enough to see the two layers light up.
import { prisma, Visibility } from "../src/index.js";

async function main() {
  const maya = await prisma.user.upsert({
    where: { email: "maya@drobe.app" },
    update: {},
    create: {
      email: "maya@drobe.app",
      handle: "maya",
      displayName: "Maya",
      isCreator: true,
      bio: "closet tours + outfit details",
    },
  });

  const jess = await prisma.user.upsert({
    where: { email: "jess@drobe.app" },
    update: {},
    create: {
      email: "jess@drobe.app",
      handle: "jess",
      displayName: "Jess",
    },
  });

  // Mutual friendship (the free friend layer)
  await prisma.friendship.upsert({
    where: { requesterId_addresseeId: { requesterId: maya.id, addresseeId: jess.id } },
    update: { status: "ACCEPTED" },
    create: { requesterId: maya.id, addresseeId: jess.id, status: "ACCEPTED" },
  });

  // Jess follows Maya (the one-way creator layer)
  await prisma.follow.upsert({
    where: { followerId_followeeId: { followerId: jess.id, followeeId: maya.id } },
    update: {},
    create: { followerId: jess.id, followeeId: maya.id },
  });

  const circle = await prisma.circle.create({
    data: { name: "The Group Chat", ownerId: maya.id },
  });
  await prisma.circleMembership.createMany({
    data: [
      { circleId: circle.id, userId: maya.id, role: "OWNER" },
      { circleId: circle.id, userId: jess.id, role: "MEMBER" },
    ],
    skipDuplicates: true,
  });

  await prisma.closetItem.createMany({
    data: [
      {
        ownerId: maya.id,
        title: "Black slip dress",
        brand: "Reformation",
        category: "dress",
        size: "S",
        fit: "regular",
        color: "black",
        visibility: Visibility.FOLLOWER, // creator-layer, paid rental
        rentable: true,
        rentDailyCents: 1500,
        buyable: true,
        buyCents: 9000,
      },
      {
        ownerId: jess.id,
        title: "Vintage denim jacket",
        brand: "Levi's",
        category: "outerwear",
        size: "M",
        color: "indigo",
        visibility: Visibility.CIRCLE, // friend-layer, free borrow
        rentable: true,
        giveable: true,
      },
    ],
  });

  console.log("Seeded: 2 users, 1 circle, 1 friendship, 1 follow, 2 items");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
