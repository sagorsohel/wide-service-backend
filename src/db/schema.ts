import { mysqlTable, serial, int, varchar, text, decimal, double, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 191 }).unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["superadmin", "creator", "admin", "staff", "customer"]).default("customer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const categories = mysqlTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 191 }).notNull().unique(),
  image: varchar("image", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const subcategories = mysqlTable("subcategories", {
  id: serial("id").primaryKey(),
  categoryId: int("category_id").notNull(),
  name: varchar("name", { length: 191 }).notNull(),
  image: varchar("image", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const services = mysqlTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  businessName: varchar("business_name", { length: 191 }),
  schedule: varchar("schedule", { length: 255 }),
  logo: varchar("logo", { length: 500 }),
  address: text("address").notNull(),
  latitude: double("latitude"),
  longitude: double("longitude"),
  phone: varchar("phone", { length: 50 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 50 }),
  images: text("images"),
  categoryId: int("category_id").notNull(),
  subcategoryId: int("subcategory_id"),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "active", "inactive", "rejected"]).default("pending").notNull(),
  userId: int("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const bookings = mysqlTable("bookings", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  serviceId: int("service_id").notNull(),
  bookingDate: timestamp("booking_date").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "completed", "cancelled"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Subcategory = typeof subcategories.$inferSelect;
export type NewSubcategory = typeof subcategories.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
