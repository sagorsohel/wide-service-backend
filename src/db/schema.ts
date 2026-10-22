import { mysqlTable, serial, int, varchar, text, decimal, double, timestamp, mysqlEnum, index } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  phone: varchar("phone", { length: 20 }).unique(),
  email: varchar("email", { length: 191 }).unique(),
  password: varchar("password", { length: 255 }),
  role: mysqlEnum("role", ["superadmin", "creator", "admin", "staff", "customer"]).default("customer").notNull(),
  avatar: varchar("avatar", { length: 500 }),
  servicesViewed: int("services_viewed").default(0).notNull(),
  detailsViewed: int("details_viewed").default(0).notNull(),
  callsClicked: int("calls_clicked").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const userFavorites = mysqlTable("user_favorites", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  serviceId: int("service_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_fav_user_id").on(table.userId),
]);

export const userRecentServices = mysqlTable("user_recent_services", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  serviceId: int("service_id").notNull(),
  viewedAt: timestamp("viewed_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_user_recent_user_id").on(table.userId),
]);

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
}, (table) => [
  index("idx_subcategories_cat_id").on(table.categoryId),
]);

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
}, (table) => [
  index("idx_services_subcat_status").on(table.subcategoryId, table.status),
  index("idx_services_cat_status").on(table.categoryId, table.status),
  index("idx_services_status").on(table.status),
  index("idx_services_created_at").on(table.createdAt),
]);

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

export const deviceTokens = mysqlTable("device_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 240 }).notNull().unique(),
  userId: int("user_id"),
  platform: varchar("platform", { length: 50 }).default("unknown"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  scheduledAt: timestamp("scheduled_at"),
  status: mysqlEnum("status", ["pending", "sent", "failed", "cancelled"]).default("pending").notNull(),
  target: mysqlEnum("target", ["all", "users_only", "guests_only"]).default("all").notNull(),
  successCount: int("success_count").default(0),
  failureCount: int("failure_count").default(0),
  sentAt: timestamp("sent_at"),
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
export type DeviceToken = typeof deviceTokens.$inferSelect;
export type NewDeviceToken = typeof deviceTokens.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

