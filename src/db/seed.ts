import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, poolConnection } from "./index.js";
import { users } from "./schema.js";

export async function seedDatabase() {
  console.log("[seed] Checking initial users in database...");

  const defaultUsers = [
    {
      name: "Super Admin",
      phone: "01865625788",
      email: "superadmin@wide-service.com",
      password: "password123", // fallback
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
      // Ensure password is up to date with 12345678
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
