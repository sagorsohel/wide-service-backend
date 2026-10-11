import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, poolConnection } from "./index.js";
import { users, categories, subcategories, services } from "./schema.js";

export async function seedDatabase() {
  console.log("[seed] Checking initial users in database...");

  const defaultUsers = [
    {
      name: "Super Admin",
      phone: "01865625788",
      email: "superadmin@wide-service.com",
      password: "password123",
      plainPassword: "12345678",
      role: "superadmin" as const,
    },
    {
      name: "Creator User",
      phone: "01865625789",
      email: "creator@wide-service.com",
      password: "password123",
      plainPassword: "12345678",
      role: "creator" as const,
    },
  ];

  for (const item of defaultUsers) {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.phone, item.phone))
      .limit(1);

    const hashedPassword = await bcrypt.hash(item.plainPassword, 10);

    if (existing.length === 0) {
      await db.insert(users).values({
        name: item.name,
        phone: item.phone,
        email: item.email,
        password: hashedPassword,
        role: item.role,
      });
      console.log(`[seed] Created user: ${item.name} (${item.phone}) with role: ${item.role}`);
    } else {
      await db
        .update(users)
        .set({
          password: hashedPassword,
          role: item.role,
        })
        .where(eq(users.phone, item.phone));
      console.log(`[seed] Updated existing user: ${item.name} (${item.phone})`);
    }
  }

  // Seed default 30 categories and subcategories if none exist
  let allCats = await db.select().from(categories);
  if (allCats.length === 0) {
    const { SEED_DATA } = await import("./seedCategoriesAndSubcategories.js");
    for (const cat of SEED_DATA) {
      const [catResult] = await db.insert(categories).values({
        name: cat.name,
        image: cat.image,
      });
      const catId = Number(catResult.insertId);

      for (const sub of cat.subcategories) {
        await db.insert(subcategories).values({
          categoryId: catId,
          name: sub.name,
          image: sub.image,
        });
      }
    }
    console.log(`[seed] Created 30 categories and all subcategories successfully!`);
  }

  // Seed services if none exist
  const existingServices = await db.select().from(services).limit(1);
  if (existingServices.length === 0) {
    const { seedServices } = await import("./seedServices.js");
    await seedServices();
  }

  console.log("[seed] Database seed completed successfully!");
}

// If run directly via tsx
if (process.argv[1]?.includes("seed.ts")) {
  seedDatabase()
    .then(async () => {
      await poolConnection.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[seed] Error seeding database:", err);
      await poolConnection.end();
      process.exit(1);
    });
}
