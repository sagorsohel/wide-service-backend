import { Request, Response } from "express";
import { count, eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { services, categories, subcategories, users, bookings } from "../db/schema.js";

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Overall Counts
    const [{ totalServices }] = await db.select({ totalServices: count() }).from(services);
    const [{ activeServices }] = await db
      .select({ activeServices: count() })
      .from(services)
      .where(eq(services.status, "active"));
    const [{ inactiveServices }] = await db
      .select({ inactiveServices: count() })
      .from(services)
      .where(eq(services.status, "inactive"));

    const [{ totalCategories }] = await db.select({ totalCategories: count() }).from(categories);
    const [{ totalSubcategories }] = await db.select({ totalSubcategories: count() }).from(subcategories);
    const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(users);
    const [{ totalBookings }] = await db.select({ totalBookings: count() }).from(bookings);
    const [{ pendingBookings }] = await db
      .select({ pendingBookings: count() })
      .from(bookings)
      .where(eq(bookings.status, "pending"));
    const [{ completedBookings }] = await db
      .select({ completedBookings: count() })
      .from(bookings)
      .where(eq(bookings.status, "completed"));

    // 2. Services by Category
    const servicesByCategoryRaw = await db
      .select({
        categoryId: services.categoryId,
        categoryName: categories.name,
        serviceCount: count(services.id),
      })
      .from(services)
      .leftJoin(categories, eq(services.categoryId, categories.id))
      .groupBy(services.categoryId, categories.name);

    // 3. Subcategories count per category
    const subcategoriesByCategoryRaw = await db
      .select({
        categoryId: subcategories.categoryId,
        subcategoryCount: count(subcategories.id),
      })
      .from(subcategories)
      .groupBy(subcategories.categoryId);

    // 4. Users by Role
    const usersByRoleRaw = await db
      .select({
        role: users.role,
        userCount: count(users.id),
      })
      .from(users)
      .groupBy(users.role);

    // 5. Recent Services (latest 5)
    const recentServices = await db
      .select({
        id: services.id,
        name: services.name,
        businessName: services.businessName,
        logo: services.logo,
        categoryId: services.categoryId,
        categoryName: categories.name,
        subcategoryId: services.subcategoryId,
        subcategoryName: subcategories.name,
        phone: services.phone,
        whatsapp: services.whatsapp,
        status: services.status,
        createdAt: services.createdAt,
      })
      .from(services)
      .leftJoin(categories, eq(services.categoryId, categories.id))
      .leftJoin(subcategories, eq(services.subcategoryId, subcategories.id))
      .orderBy(desc(services.createdAt))
      .limit(5);

    // 6. Recent Categories (latest 5)
    const recentCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        image: categories.image,
        createdAt: categories.createdAt,
      })
      .from(categories)
      .orderBy(desc(categories.createdAt))
      .limit(5);

    // 7. Recent Users (latest 5)
    const recentUsers = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5);

    // Calculate total gallery images uploaded
    const allServicesImages = await db.select({ images: services.images }).from(services);
    let totalImagesCount = 0;
    allServicesImages.forEach((srv) => {
      if (srv.images) {
        try {
          const parsed = JSON.parse(srv.images);
          if (Array.isArray(parsed)) totalImagesCount += parsed.length;
        } catch {
          totalImagesCount += 1;
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        counts: {
          services: totalServices,
          activeServices,
          inactiveServices,
          categories: totalCategories,
          subcategories: totalSubcategories,
          users: totalUsers,
          bookings: totalBookings,
          pendingBookings,
          completedBookings,
          images: totalImagesCount,
        },
        servicesByCategory: servicesByCategoryRaw,
        subcategoriesByCategory: subcategoriesByCategoryRaw,
        usersByRole: usersByRoleRaw,
        recentServices,
        recentCategories,
        recentUsers,
      },
    });
  } catch (error: any) {
    console.error("[dashboard] Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard statistics",
    });
  }
};
