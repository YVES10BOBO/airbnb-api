import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // 1. Clean existing data — children before parents
  await prisma.booking.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  console.log("🗑️  Cleared existing data");

  // 2. Hash shared password once
  const hashedPassword = await bcrypt.hash("password123", 10);

  // 3. Create users
  const alice = await prisma.user.create({
    data: {
      name: "Alice Moreau",
      email: "alice@example.com",
      username: "alicemoreau",
      phone: "+1-555-0101",
      role: "HOST",
      password: hashedPassword,
      avatar: "https://i.pravatar.cc/150?u=alice",
      bio: "Passionate host who loves sharing beautiful spaces.",
    },
  });

  const clara = await prisma.user.create({
    data: {
      name: "Clara Singh",
      email: "clara@example.com",
      username: "clarasingh",
      phone: "+1-555-0103",
      role: "HOST",
      password: hashedPassword,
      bio: "Interior designer turned Airbnb superhost.",
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: "Bob Tanaka",
      email: "bob@example.com",
      username: "bobtanaka",
      phone: "+1-555-0102",
      role: "GUEST",
      password: hashedPassword,
      avatar: "https://i.pravatar.cc/150?u=bob",
    },
  });

  const diana = await prisma.user.create({
    data: {
      name: "Diana Osei",
      email: "diana@example.com",
      username: "dianaosei",
      phone: "+1-555-0104",
      role: "GUEST",
      password: hashedPassword,
    },
  });

  const evan = await prisma.user.create({
    data: {
      name: "Evan Carter",
      email: "evan@example.com",
      username: "evancarter",
      phone: "+1-555-0105",
      role: "GUEST",
      password: hashedPassword,
    },
  });

  console.log("👥 Created 2 hosts, 3 guests");

  // 4. Create listings
  const apartment = await prisma.listing.create({
    data: {
      title: "Cozy Downtown Apartment",
      description: "A bright studio in the heart of the city, steps from cafés and transit.",
      location: "New York, NY",
      pricePerNight: 120,
      guests: 2,
      type: "APARTMENT",
      amenities: ["WiFi", "Air conditioning", "Kitchen", "Washer"],
      rating: 4.8,
      hostId: alice.id,
    },
  });

  const cabin = await prisma.listing.create({
    data: {
      title: "Lakeside Cabin Retreat",
      description: "Peaceful log cabin with a private dock and stunning mountain views.",
      location: "Lake Tahoe, CA",
      pricePerNight: 275,
      guests: 6,
      type: "CABIN",
      amenities: ["WiFi", "Fireplace", "BBQ grill", "Hot tub", "Kayaks"],
      rating: 4.9,
      hostId: clara.id,
    },
  });

  const villa = await prisma.listing.create({
    data: {
      title: "Modern Beach Villa",
      description: "Spacious villa with direct beach access and a private infinity pool.",
      location: "Miami Beach, FL",
      pricePerNight: 550,
      guests: 10,
      type: "VILLA",
      amenities: ["WiFi", "Pool", "Beach access", "Air conditioning", "Chef's kitchen"],
      rating: 4.7,
      hostId: alice.id,
    },
  });

  const house = await prisma.listing.create({
    data: {
      title: "Charming Victorian House",
      description: "A beautifully restored Victorian house with a large garden and modern amenities.",
      location: "San Francisco, CA",
      pricePerNight: 320,
      guests: 8,
      type: "HOUSE",
      amenities: ["WiFi", "Garden", "Parking", "Kitchen", "Fireplace"],
      rating: 4.6,
      hostId: clara.id,
    },
  });

  console.log("🏠 Created 4 listings (APARTMENT, CABIN, VILLA, HOUSE)");

  // 5. Create bookings — future dates, calculate totalPrice correctly
  const booking1CheckIn = new Date("2026-08-01");
  const booking1CheckOut = new Date("2026-08-05"); // 4 nights
  await prisma.booking.create({
    data: {
      guestId: bob.id,
      listingId: apartment.id,
      checkIn: booking1CheckIn,
      checkOut: booking1CheckOut,
      guests: 2,
      totalPrice: 4 * apartment.pricePerNight, // 4 × 120 = 480
      status: "CONFIRMED",
    },
  });

  const booking2CheckIn = new Date("2026-09-10");
  const booking2CheckOut = new Date("2026-09-17"); // 7 nights
  await prisma.booking.create({
    data: {
      guestId: diana.id,
      listingId: cabin.id,
      checkIn: booking2CheckIn,
      checkOut: booking2CheckOut,
      guests: 4,
      totalPrice: 7 * cabin.pricePerNight, // 7 × 275 = 1925
      status: "CONFIRMED",
    },
  });

  const booking3CheckIn = new Date("2026-10-20");
  const booking3CheckOut = new Date("2026-10-23"); // 3 nights
  await prisma.booking.create({
    data: {
      guestId: evan.id,
      listingId: house.id,
      checkIn: booking3CheckIn,
      checkOut: booking3CheckOut,
      guests: 3,
      totalPrice: 3 * house.pricePerNight, // 3 × 320 = 960
      status: "PENDING",
    },
  });

  console.log("📅 Created 3 bookings (2 CONFIRMED, 1 PENDING)");
  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
