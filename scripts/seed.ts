/**
 * Seed script — populates the database with realistic dummy data.
 * Usage: cd backend && npx ts-node scripts/seed.ts
 */
import {
  PrismaClient,
  UserRole,
  UserStatus,
  OnboardingStage,
  OwnerType,
  AssetStatus,
  ListingStatus,
  SaleType,
  SellerType,
  Currency,
  DepositStatus,
  TransactionStatus,
} from '@prisma/client';

import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const PASSWORD = 'Password1!';

// ─── Game/Asset Type Catalog ────────────────────────────────────

const categories = [
  {
    name: 'FPS',
    slug: 'fps',
    description: 'First-person shooters',
    sortOrder: 1,
  },
  {
    name: 'MMORPG',
    slug: 'mmorpg',
    description: 'Massively multiplayer online RPGs',
    sortOrder: 2,
  },
  {
    name: 'Battle Royale',
    slug: 'battle-royale',
    description: 'Battle royale games',
    sortOrder: 3,
  },
  {
    name: 'MOBA',
    slug: 'moba',
    description: 'Multiplayer online battle arenas',
    sortOrder: 4,
  },
  { name: 'Sports', slug: 'sports', description: 'Sports games', sortOrder: 5 },
];

const games = [
  {
    name: 'Counter Strike 2',
    slug: 'cs2',
    developer: 'Valve',
    publisher: 'Valve',
    categoryIdx: 0,
  },
  {
    name: 'Valorant',
    slug: 'valorant',
    developer: 'Riot Games',
    publisher: 'Riot Games',
    categoryIdx: 0,
  },
  {
    name: 'World of Warcraft',
    slug: 'wow',
    developer: 'Blizzard',
    publisher: 'Blizzard',
    categoryIdx: 1,
  },
  {
    name: 'Final Fantasy XIV',
    slug: 'ffxiv',
    developer: 'Square Enix',
    publisher: 'Square Enix',
    categoryIdx: 1,
  },
  {
    name: 'Fortnite',
    slug: 'fortnite',
    developer: 'Epic Games',
    publisher: 'Epic Games',
    categoryIdx: 2,
  },
  {
    name: 'League of Legends',
    slug: 'lol',
    developer: 'Riot Games',
    publisher: 'Riot Games',
    categoryIdx: 3,
  },
  {
    name: 'FIFA 25',
    slug: 'fifa25',
    developer: 'EA Sports',
    publisher: 'EA',
    categoryIdx: 4,
  },
  {
    name: 'Call of Duty',
    slug: 'cod',
    developer: 'Activision',
    publisher: 'Activision',
    categoryIdx: 0,
  },
];

const assetTypes = [
  { name: 'Game Account', slug: 'game-account' },
  { name: 'In-Game Currency', slug: 'in-game-currency' },
  { name: 'Skin', slug: 'skin' },
  { name: 'Weapon', slug: 'weapon' },
  { name: 'Character', slug: 'character' },
  { name: 'Gift Card', slug: 'gift-card' },
  { name: 'Boosting Service', slug: 'boosting' },
];

// ─── User Data ──────────────────────────────────────────────────

const userNames = [
  { username: 'shadow_slayer', email: 'shadow@game.com' },
  { username: 'dragon_master', email: 'dragon@game.com' },
  { username: 'pixel_warrior', email: 'pixel@game.com' },
  { username: 'frost_queen', email: 'frost@game.com' },
  { username: 'thunder_god', email: 'thunder@game.com' },
  { username: 'night_blade', email: 'night@game.com' },
  { username: 'storm_chaser', email: 'storm@game.com' },
  { username: 'crypto_trader', email: 'crypto@game.com' },
  { username: 'gold_farmer', email: 'gold@game.com' },
  { username: 'loot_hunter', email: 'loot@game.com' },
  { username: 'epic_seller', email: 'epic@game.com' },
  { username: 'rare_collector', email: 'rare@game.com' },
  { username: 'speed_runner', email: 'speed@game.com' },
  { username: 'pro_sniper', email: 'sniper@game.com' },
  { username: 'arcane_wizard', email: 'arcane@game.com' },
];

const assetTitles = [
  'Max Level Account',
  'Rare Skin Collection',
  'Premium Weapon Set',
  'Legendary Character',
  'Gold Hoard (1M)',
  'Diamond Account',
  'Elite Battle Pass',
  'Limited Edition Bundle',
  'Vintage Items Pack',
  'Pro Gamer Account',
  'Collector Edition',
  'Ultimate Power Set',
  'Mythic Weapon',
  'Epic Mount',
  'Shadow Realm Access',
  'Crystal Pack (5000)',
  'Hero Bundle',
  'Season Pass Complete',
  'Platinum Account',
  'God Tier Items',
];

async function seed() {
  console.log('🌱 Seeding database...\n');

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // ─── Create Categories ──────────────────────────────────────
  console.log('Creating categories...');
  const catRecords: any[] = [];
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: {},
    });
    catRecords.push(cat);
  }

  // ─── Create Games ────────────────────────────────────────────
  console.log('Creating games...');
  const gameRecords: any[] = [];
  for (const g of games) {
    const game = await prisma.game.upsert({
      where: { slug: g.slug },
      create: {
        name: g.name,
        slug: g.slug,
        developer: g.developer,
        publisher: g.publisher,
        categoryId: catRecords[g.categoryIdx].id,
        isActive: true,
        sortOrder: gameRecords.length,
      },
      update: {},
    });
    gameRecords.push(game);
  }

  // ─── Create Asset Types ─────────────────────────────────────
  console.log('Creating asset types...');
  const typeRecords: any[] = [];
  for (const at of assetTypes) {
    const t = await prisma.assetType.upsert({
      where: { slug: at.slug },
      create: at,
      update: {},
    });
    typeRecords.push(t);
  }

  // ─── Create Users ───────────────────────────────────────────
  console.log('Creating users...');
  const userRecords: any[] = [];
  for (const u of userNames) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
    });
    if (existing) {
      userRecords.push(existing);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: u.email,
        username: u.username,
        passwordHash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        onboardingStage: OnboardingStage.TRADING_ENABLED,
        profile: {
          create: {
            firstName: u.username.split('_')[0],
            lastName: u.username.split('_')[1] || 'User',
            country: ['US', 'UK', 'DE', 'FR', 'BR', 'JP', 'KR'][
              Math.floor(Math.random() * 7)
            ],
            avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${u.username}`,
          },
        },
        permissions: {
          create: {
            canBuy: true,
            canSell: true,
            canBid: true,
            canDeposit: true,
            canWithdraw: false,
            canCreateListing: true,
            canReceivePayments: true,
          },
        },
      },
    });

    // Create wallets
    for (const currency of [Currency.USD, Currency.EUR, Currency.BTC]) {
      const balance =
        currency === Currency.USD
          ? Math.random() * 5000 + 500
          : currency === Currency.EUR
            ? Math.random() * 3000 + 200
            : Math.random() * 0.5;
      await prisma.wallet.create({
        data: {
          userId: user.id,
          currency,
          availableBalance: Math.round(balance * 100) / 100,
        },
      });
    }
    userRecords.push(user);
  }

  // ─── Create Assets ──────────────────────────────────────────
  console.log('Creating assets...');
  const assetRecords: any[] = [];

  for (let i = 0; i < 40; i++) {
    const owner = userRecords[Math.floor(Math.random() * userRecords.length)];
    const game = gameRecords[Math.floor(Math.random() * gameRecords.length)];
    const type = typeRecords[Math.floor(Math.random() * typeRecords.length)];
    const title =
      assetTitles[Math.floor(Math.random() * assetTitles.length)] +
      ` #${i + 1}`;
    const price = Math.round((Math.random() * 500 + 10) * 100) / 100;

    const asset = await prisma.asset.create({
      data: {
        ownerType: OwnerType.USER,
        ownerId: owner.id,
        gameId: game.id,
        assetTypeId: type.id,
        title,
        description: `${title} for ${game.name}. Fully verified account with all items included.`,
        status: AssetStatus.APPROVED,
        estimatedValue: price,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    // Add 1-3 images
    const imgCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < imgCount; j++) {
      const colors = [
        '3498db',
        'e74c3c',
        '2ecc71',
        'f39c12',
        '9b59b6',
        '1abc9c',
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      await prisma.assetImage.create({
        data: {
          assetId: asset.id,
          imageUrl: `https://placehold.co/600x400/${color}/white?text=${encodeURIComponent(game.name.substring(0, 15))}`,
          altText: `${title} image ${j + 1}`,
          isPrimary: j === 0,
          displayOrder: j,
        },
      });
    }

    // Add 2-5 attributes
    const attrCount = Math.floor(Math.random() * 4) + 2;
    const attrs = [
      { name: 'Username', value: `${owner.username}_acc${i}` },
      { name: 'Level', value: String(Math.floor(Math.random() * 100) + 1) },
      {
        name: 'Rank',
        value: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'][
          Math.floor(Math.random() * 5)
        ],
      },
      {
        name: 'Items Count',
        value: String(Math.floor(Math.random() * 500) + 10),
      },
      {
        name: 'Account Age',
        value: `${Math.floor(Math.random() * 5) + 1} years`,
      },
    ];
    for (let j = 0; j < attrCount; j++) {
      const attr = attrs[j % attrs.length];
      await prisma.assetAttribute.create({
        data: { assetId: asset.id, ...attr, type: 'STRING', displayOrder: j },
      });
    }

    assetRecords.push(asset);
  }

  // ─── Create Listings ────────────────────────────────────────
  console.log('Creating listings...');
  const listingRecords: any[] = [];
  const usedAssets = new Set<string>();

  for (let i = 0; i < 25; i++) {
    // Find an asset not already listed
    const availableAssets = assetRecords.filter((a) => !usedAssets.has(a.id));
    if (availableAssets.length === 0) break;
    const asset =
      availableAssets[Math.floor(Math.random() * availableAssets.length)];
    usedAssets.add(asset.id);

    const saleType =
      Math.random() > 0.4 ? SaleType.FIXED_PRICE : SaleType.AUCTION;
    const currency = [Currency.USD, Currency.EUR, Currency.BTC][
      Math.floor(Math.random() * 3)
    ];
    const askingPrice =
      saleType === SaleType.FIXED_PRICE
        ? Number(asset.estimatedValue) * (0.8 + Math.random() * 0.4)
        : null;
    const startingBid =
      saleType === SaleType.AUCTION
        ? Number(asset.estimatedValue) * (0.3 + Math.random() * 0.3)
        : null;

    const listing = await prisma.listing.create({
      data: {
        assetId: asset.id,
        sellerType: SellerType.USER,
        sellerId: asset.ownerId,
        saleType,
        listingStatus:
          Math.random() > 0.1 ? ListingStatus.ACTIVE : ListingStatus.DRAFT,
        title: `🔥 ${asset.title}`,
        description: `Selling this amazing ${asset.title.toLowerCase()}. Instant delivery. Trusted seller with 100% positive feedback.`,
        askingPrice: askingPrice ? Math.round(askingPrice * 100) / 100 : null,
        startingBid: startingBid ? Math.round(startingBid * 100) / 100 : null,
        currentBid: null,
        currency,
        publishedAt: new Date(),
        createdBy: asset.ownerId,
      },
    });
    listingRecords.push(listing);
  }

  // ─── Create Bids ────────────────────────────────────────────
  console.log('Creating bids...');
  let bidCount = 0;
  const auctionListings = listingRecords.filter(
    (l) =>
      l.saleType === SaleType.AUCTION &&
      l.listingStatus === ListingStatus.ACTIVE,
  );

  for (const listing of auctionListings) {
    const numBids = Math.floor(Math.random() * 5) + 1;
    let currentBid = Number(listing.startingBid || 10);
    for (let i = 0; i < numBids; i++) {
      const bidder =
        userRecords[Math.floor(Math.random() * userRecords.length)];
      if (bidder.id === listing.sellerId) continue;
      currentBid += Math.round((Math.random() * 20 + 5) * 100) / 100;

      await prisma.bid.create({
        data: {
          listingId: listing.id,
          bidderId: bidder.id,
          amount: currentBid,
          createdBy: bidder.id,
        },
      });
      bidCount++;
    }
    // Update listing's current bid
    if (numBids > 0) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: { currentBid },
      });
    }
  }

  // ─── Create Transactions ────────────────────────────────────
  console.log('Creating transactions...');
  const fixedListings = listingRecords.filter(
    (l) =>
      l.saleType === SaleType.FIXED_PRICE &&
      l.listingStatus === ListingStatus.ACTIVE,
  );
  let txCount = 0;

  for (let i = 0; i < Math.min(8, fixedListings.length); i++) {
    const listing = fixedListings[i];
    const buyer = userRecords[Math.floor(Math.random() * userRecords.length)];
    if (buyer.id === listing.sellerId) continue;

    const statuses = [
      TransactionStatus.COMPLETED,
      TransactionStatus.COMPLETED,
      TransactionStatus.PENDING,
      TransactionStatus.CANCELLED,
    ];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    await prisma.marketplaceTransaction.create({
      data: {
        listingId: listing.id,
        assetId: listing.assetId,
        buyerId: buyer.id,
        sellerType: listing.sellerType,
        sellerId: listing.sellerId,
        transactionSource: 'FIXED_PRICE',
        status,
        currency: listing.currency,
        agreedPrice: Number(listing.askingPrice),
        completedAt: status === TransactionStatus.COMPLETED ? new Date() : null,
        cancelledAt: status === TransactionStatus.CANCELLED ? new Date() : null,
        createdBy: buyer.id,
      },
    });

    // Update listing status for completed transactions
    if (status === TransactionStatus.COMPLETED) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: {
          listingStatus: ListingStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
      // Transfer asset ownership
      await prisma.asset.update({
        where: { id: listing.assetId },
        data: { ownerType: OwnerType.USER, ownerId: buyer.id },
      });
    }
    txCount++;
  }

  // ─── Create Deposits ────────────────────────────────────────
  console.log('Creating deposits...');
  for (const user of userRecords.slice(0, 8)) {
    const currency = [Currency.USD, Currency.EUR, Currency.BTC][
      Math.floor(Math.random() * 3)
    ];
    const amount = Math.round((Math.random() * 200 + 20) * 100) / 100;
    const status =
      Math.random() > 0.3 ? DepositStatus.APPROVED : DepositStatus.PENDING;

    const deposit = await prisma.deposit.create({
      data: {
        userId: user.id,
        currency,
        amount,
        status,
        approvedAt: status === DepositStatus.APPROVED ? new Date() : null,
        approvedBy:
          status === DepositStatus.APPROVED ? userRecords[0].id : null,
      },
    });

    // Add wallet transaction for approved deposits
    if (status === DepositStatus.APPROVED) {
      const wallet = await prisma.wallet.findUnique({
        where: { userId_currency: { userId: user.id, currency } },
      });
      if (wallet) {
        const newBalance = Number(wallet.availableBalance) + amount;
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { availableBalance: newBalance },
        });
        await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'DEPOSIT',
            amount,
            balanceBefore: Number(wallet.availableBalance),
            balanceAfter: newBalance,
            referenceType: 'DEPOSIT',
            referenceId: deposit.id,
            description: 'Deposit approved',
          },
        });
      }
    }
  }

  // ─── Create Withdrawals ─────────────────────────────────────
  console.log('Creating withdrawals...');
  for (let i = 0; i < 5; i++) {
    const user = userRecords[Math.floor(Math.random() * userRecords.length)];
    const currency = Currency.USD;
    await prisma.withdrawal.create({
      data: {
        userId: user.id,
        currency,
        amount: Math.round((Math.random() * 100 + 10) * 100) / 100,
        status: Math.random() > 0.5 ? 'PENDING' : 'APPROVED',
        destination: `bank_acct_${i}`,
      },
    });
  }

  // ─── Summary ────────────────────────────────────────────────
  const stats = {
    users: await prisma.user.count({ where: { deletedAt: null } }),
    games: await prisma.game.count(),
    assets: await prisma.asset.count({ where: { deletedAt: null } }),
    listings: await prisma.listing.count({ where: { deletedAt: null } }),
    bids: await prisma.bid.count(),
    transactions: await prisma.marketplaceTransaction.count(),
    deposits: await prisma.deposit.count(),
    withdrawals: await prisma.withdrawal.count(),
    walletTxs: await prisma.walletTransaction.count(),
  };

  console.log('\n✅ Seed complete!\n');
  console.log('📊 Database Stats:');
  console.log(`   Users:        ${stats.users}`);
  console.log(`   Games:        ${stats.games}`);
  console.log(`   Asset Types:  ${assetTypes.length}`);
  console.log(`   Assets:       ${stats.assets}`);
  console.log(`   Listings:     ${stats.listings}`);
  console.log(`   Bids:         ${bidCount}`);
  console.log(`   Transactions: ${txCount}`);
  console.log(`   Deposits:     ${stats.deposits}`);
  console.log(`   Withdrawals:  ${stats.withdrawals}`);
  console.log(`   Ledger:       ${stats.walletTxs}`);
  console.log('\n🔑 Login Credentials:');
  console.log('   Admin:  admin3@marketplace.com / Password1!');
  console.log('   Users:  All password: Password1!');
  for (const u of userNames.slice(0, 5)) {
    console.log(`   ${u.email} / Password1!`);
  }
  console.log(`   ... and ${userNames.length - 5} more`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
