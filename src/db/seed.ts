import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, poolConnection } from "./index.js";
import { users, categories, subcategories } from "./schema.js";

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

  // Seed default categories if none exist
  let allCats = await db.select().from(categories);
  if (allCats.length === 0) {
    const initialCategories = [
      { name: "AC Maintenance & Repair", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150" },
      { name: "Home Plumbing", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=150" },
      { name: "Electrical Wiring", image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=150" },
      { name: "House Cleaning", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=150" },
    ];

    for (const cat of initialCategories) {
      await db.insert(categories).values(cat);
      console.log(`[seed] Created category: ${cat.name}`);
    }
    allCats = await db.select().from(categories);
  }

  // Seed default subcategories if none exist
  const existingSubcategories = await db.select().from(subcategories).limit(1);
  if (existingSubcategories.length === 0 && allCats.length > 0) {
    const firstCat = allCats[0];
    const initialSubcategories = [
      {
        categoryId: firstCat.id,
        name: "AC Deep Cleaning Service",
        image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150",
      },
      {
        categoryId: firstCat.id,
        name: "AC Gas Refill & Leak Check",
        image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150",
      },
    ];

    if (allCats.length > 1) {
      initialSubcategories.push({
        categoryId: allCats[1].id,
        name: "Pipe Leakage & Tap Fitting",
        image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=150",
      });
    }

    for (const sub of initialSubcategories) {
      await db.insert(subcategories).values(sub);
      console.log(`[seed] Created subcategory: ${sub.name}`);
    }
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
