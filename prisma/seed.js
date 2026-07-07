/**
 * Seed script — fills the app with realistic demo content so the feed,
 * search, profiles, notifications and messages all look alive.
 * Safe to run multiple times (upserts). Run: npm run seed
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const avatar = (seed) => `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,ffd5dc`;
const photo = (seed) => `https://picsum.photos/seed/${seed}/800/600`;

const DEMO_USERS = [
  { username: 'maya.travels', displayName: 'Maya Fernando', bio: '✈️ 23 countries and counting · Colombo → the world' },
  { username: 'dev.kasun', displayName: 'Kasun Perera', bio: 'Full-stack dev 👨‍💻 · TypeScript everything · coffee-driven' },
  { username: 'chef.amara', displayName: 'Amara De Silva', bio: '🍜 Home cooking, island flavors · recipe drops every Friday' },
  { username: 'fit.ravindu', displayName: 'Ravindu Jay', bio: '🏋️ Calisthenics & sunrise runs · progress > perfection' },
  { username: 'art.by.nethmi', displayName: 'Nethmi Silva', bio: '🎨 Watercolor + digital art · commissions open' },
  { username: 'lens.tharindu', displayName: 'Tharindu W.', bio: '📷 Street & wildlife photography · Sony α7' },
  { username: 'beats.dilshan', displayName: 'Dilshan Music', bio: '🎧 Producer · lo-fi & baila fusion · new track soon' },
  { username: 'green.sanduni', displayName: 'Sanduni Green', bio: '🌱 Urban gardening & zero-waste living tips' },
];

const POSTS = [
  ['maya.travels', 'Sunrise at Sigiriya — worth every one of the 1,200 steps 🌄 #travel #srilanka', 'sigiriya'],
  ['maya.travels', 'Train ride from Kandy to Ella. Nine Arch Bridge hits different in person 🚂', 'ella-train'],
  ['dev.kasun', 'Shipped my first NestJS + Next.js app today. Modules + App Router = chef\'s kiss 🚀', 'code-setup'],
  ['dev.kasun', 'Hot take: TypeScript errors are just the compiler caring about you 💜', null],
  ['chef.amara', 'Sunday pol sambol + fresh hoppers. Some things never need upgrading 🥥', 'hoppers'],
  ['chef.amara', '15-minute garlic butter prawns — recipe in comments 🍤', 'prawns'],
  ['fit.ravindu', 'Day 90 of the handstand journey. Consistency is the only cheat code 🤸', 'handstand'],
  ['art.by.nethmi', 'New watercolor piece: "Monsoon over Galle Fort" 🖌️ Prints available soon', 'watercolor'],
  ['art.by.nethmi', 'Process video of yesterday\'s digital portrait — 6 hours condensed into 60 seconds', 'digital-art'],
  ['lens.tharindu', 'Leopard sighting at Yala this morning. Waited 4 hours for this frame 🐆', 'leopard'],
  ['lens.tharindu', 'Golden hour at Galle Face. The city never looks the same twice 🌇', 'galleface'],
  ['beats.dilshan', 'Late night studio session. This one blends baila drums with lo-fi keys 🎹', 'studio'],
  ['green.sanduni', 'My balcony garden hit 20 species today 🌿 Swipe for the tomato glow-up', 'garden'],
  ['green.sanduni', 'Zero-waste tip #7: banana peels make incredible plant fertilizer 🍌', null],
  ['fit.ravindu', 'Sunrise run along Marine Drive. 5km before the city wakes up 🏃', 'sunrise-run'],
];

const COMMENTS = [
  'This is incredible! 🔥', 'Okay this deserves way more likes', 'Saving this immediately',
  'How did you get this shot?!', 'Teach me your ways 🙏', 'Absolutely stunning',
  'This made my day 😄', 'Recipe please!!', 'Goals honestly', 'The colors here are unreal',
];

async function main() {
  console.log('🌱 Seeding demo data…');

  // 1. Demo users (upsert — safe to re-run)
  const users = [];
  for (const u of DEMO_USERS) {
    users.push(await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        ...u,
        email: `${u.username.replace(/\./g, '_')}@demo.pulse`,
        firebaseUid: `demo-${u.username}`,
        avatarUrl: avatar(u.username),
      },
    }));
  }

  // 2. Posts (skip if demo posts already exist)
  const existing = await prisma.post.count({ where: { author: { firebaseUid: { startsWith: 'demo-' } } } });
  if (existing === 0) {
    for (let i = 0; i < POSTS.length; i++) {
      const [username, caption, imgSeed] = POSTS[i];
      const author = users.find((u) => u.username === username);
      const post = await prisma.post.create({
        data: {
          authorId: author.id,
          caption,
          mediaUrl: imgSeed ? photo(imgSeed) : null,
          mediaType: imgSeed ? 'image' : null,
          shareCount: Math.floor(Math.random() * 12),
          createdAt: new Date(Date.now() - i * 5 * 60 * 60 * 1000), // spread over days
        },
      });

      // random likes + comments from other demo users
      const others = users.filter((u) => u.id !== author.id).sort(() => 0.5 - Math.random());
      for (const liker of others.slice(0, 2 + Math.floor(Math.random() * 5))) {
        await prisma.like.create({ data: { postId: post.id, userId: liker.id } });
      }
      for (const commenter of others.slice(0, 1 + Math.floor(Math.random() * 3))) {
        await prisma.comment.create({
          data: { postId: post.id, userId: commenter.id, text: COMMENTS[Math.floor(Math.random() * COMMENTS.length)] },
        });
      }
    }
    console.log(`   ✓ ${POSTS.length} posts with likes & comments`);
  } else {
    console.log('   ✓ demo posts already exist, skipping');
  }

  // 3. Welcome DM + notifications for every REAL user (so your account feels alive too)
  const realUsers = await prisma.user.findMany({ where: { NOT: { firebaseUid: { startsWith: 'demo-' } } } });
  const greeter = users[0];
  for (const real of realUsers) {
    const [a, b] = [real.id, greeter.id].sort();
    const convo = await prisma.conversation.upsert({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      update: {},
      create: { userAId: a, userBId: b },
    });
    const hasMsg = await prisma.message.count({ where: { conversationId: convo.id } });
    if (hasMsg === 0) {
      await prisma.message.create({
        data: { conversationId: convo.id, senderId: greeter.id, text: `Hey @${real.username}! Welcome to Pulse 🎉 Loved your profile — post something soon!` },
      });
      await prisma.notification.create({
        data: { userId: real.id, actorId: greeter.id, type: 'system', message: `@${greeter.username} sent you a message` },
      });
    }
  }
  if (realUsers.length) console.log(`   ✓ welcome messages for ${realUsers.length} real user(s)`);

  console.log('✅ Seed complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());