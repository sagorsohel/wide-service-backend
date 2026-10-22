import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, poolConnection } from "./index.js";
import { users, categories, subcategories, services } from "./schema.js";

export async function ensureUserTablesAndColumns() {
  try {
    const [cols]: any = await poolConnection.query("SHOW COLUMNS FROM users");
    const colNames = cols.map((c: any) => c.Field);

    if (!colNames.includes("avatar")) {
      await poolConnection.query("ALTER TABLE users ADD COLUMN avatar VARCHAR(500) NULL AFTER role");
      console.log("[db] Added 'avatar' column to users table");
    }
    if (!colNames.includes("services_viewed")) {
      await poolConnection.query("ALTER TABLE users ADD COLUMN services_viewed INT DEFAULT 0 NOT NULL AFTER role");
      console.log("[db] Added 'services_viewed' column to users table");
    }
    if (!colNames.includes("details_viewed")) {
      await poolConnection.query("ALTER TABLE users ADD COLUMN details_viewed INT DEFAULT 0 NOT NULL AFTER services_viewed");
      console.log("[db] Added 'details_viewed' column to users table");
    }
    if (!colNames.includes("calls_clicked")) {
      await poolConnection.query("ALTER TABLE users ADD COLUMN calls_clicked INT DEFAULT 0 NOT NULL AFTER details_viewed");
      console.log("[db] Added 'calls_clicked' column to users table");
    }

    // Ensure phone and password columns are nullable for Google Sign-In
    await poolConnection.query("ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NULL");
    await poolConnection.query("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL");

    // Create user_favorites table if not exists
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        service_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE KEY unique_user_service (user_id, service_id)
      )
    `);

    // Create user_recent_services table if not exists
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS user_recent_services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        service_id INT NOT NULL,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        UNIQUE KEY unique_user_recent_service (user_id, service_id)
      )
    `);
    console.log("[db] User tables and columns verified/migrated successfully.");
  } catch (err: any) {
    console.warn("[db] User schema migration note:", err.message);
  }
}

export async function seedDatabase() {
  await ensureUserTablesAndColumns();
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
