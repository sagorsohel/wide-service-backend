import { Request, Response } from "express";
import { eq, desc, and, like, or, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { services, categories, subcategories, users } from "../db/schema.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

const parseImages = (imagesVal: string | null | undefined): string[] => {
  if (!imagesVal) return [];
  try {
    const parsed = JSON.parse(imagesVal);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return imagesVal.includes(",") ? imagesVal.split(",").map((s) => s.trim()) : [imagesVal];
  }
};

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// GET /api/services - Get all services with optional filters, distance sorting and pagination
export const getAllServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, subcategoryId, status, search, page, limit, lat, lng, radiusKm, maxDistanceKm } = req.query;

    const conditions = [];

    if (categoryId) {
      conditions.push(eq(services.categoryId, Number(categoryId)));
    }
    if (subcategoryId) {
      conditions.push(eq(services.subcategoryId, Number(subcategoryId)));
    }
    if (status && (status === "active" || status === "inactive")) {
      conditions.push(eq(services.status, status as "active" | "inactive"));
    }
    if (search && typeof search === "string" && search.trim() !== "") {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          like(services.name, term),
          like(services.businessName, term),
          like(services.phone, term),
          like(services.address, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total matching items
    const countQuery = whereClause
      ? db.select({ total: count() }).from(services).where(whereClause)
      : db.select({ total: count() }).from(services);
    const [{ total }] = await countQuery;

    // If page is provided, apply pagination
    if (page !== undefined) {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 10);
      const offsetNum = (pageNum - 1) * limitNum;
      const totalPages = Math.ceil(total / limitNum) || 1;

      const baseQuery = db
        .select({
          id: services.id,
          name: services.name,
          businessName: services.businessName,
          logo: services.logo,
          address: services.address,
          latitude: services.latitude,
          longitude: services.longitude,
          phone: services.phone,
          whatsapp: services.whatsapp,
          images: services.images,
          categoryId: services.categoryId,
          categoryName: categories.name,
          subcategoryId: services.subcategoryId,
          subcategoryName: subcategories.name,
          description: services.description,
          status: services.status,
          userId: services.userId,
          creatorName: users.name,
          createdAt: services.createdAt,
          updatedAt: services.updatedAt,
        })
        .from(services)
        .leftJoin(categories, eq(services.categoryId, categories.id))
        .leftJoin(subcategories, eq(services.subcategoryId, subcategories.id))
        .leftJoin(users, eq(services.userId, users.id))
        .orderBy(desc(services.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      const rawServices = whereClause ? await baseQuery.where(whereClause) : await baseQuery;

      let formatted = rawServices.map((srv) => {
        let distanceKm: number | undefined = undefined;
        if (lat && lng && srv.latitude != null && srv.longitude != null) {
          distanceKm = calculateDistanceKm(
            Number(lat),
            Number(lng),
            Number(srv.latitude),
            Number(srv.longitude)
          );
        }
        return {
          ...srv,
          images: parseImages(srv.images),
          distanceKm,
        };
      });

      if (lat && lng) {
        formatted.sort((a, b) => {
          if (a.distanceKm == null) return 1;
          if (b.distanceKm == null) return -1;
          return a.distanceKm - b.distanceKm;
        });
      }

      const effectiveRadius = Number(radiusKm || maxDistanceKm);
      if (!isNaN(effectiveRadius) && effectiveRadius > 0) {
        formatted = formatted.filter((s) => s.distanceKm != null && s.distanceKm <= effectiveRadius);
      }

      res.status(200).json({
        success: true,
        count: formatted.length,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        data: formatted,
      });
      return;
    }

    // Default / unpaginated call
    const baseQuery = db
      .select({
        id: services.id,
        name: services.name,
        businessName: services.businessName,
        logo: services.logo,
        address: services.address,
        latitude: services.latitude,
        longitude: services.longitude,
        phone: services.phone,
        whatsapp: services.whatsapp,
        images: services.images,
        categoryId: services.categoryId,
        categoryName: categories.name,
        subcategoryId: services.subcategoryId,
        subcategoryName: subcategories.name,
        description: services.description,
        status: services.status,
        userId: services.userId,
        creatorName: users.name,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
      })
      .from(services)
      .leftJoin(categories, eq(services.categoryId, categories.id))
      .leftJoin(subcategories, eq(services.subcategoryId, subcategories.id))
      .leftJoin(users, eq(services.userId, users.id))
      .orderBy(desc(services.createdAt));

    const rawServices = whereClause ? await baseQuery.where(whereClause) : await baseQuery;

    let formatted = rawServices.map((srv) => {
      let distanceKm: number | undefined = undefined;
      if (lat && lng && srv.latitude != null && srv.longitude != null) {
        distanceKm = calculateDistanceKm(
          Number(lat),
          Number(lng),
          Number(srv.latitude),
          Number(srv.longitude)
        );
      }
      return {
        ...srv,
        images: parseImages(srv.images),
        distanceKm,
      };
    });

    if (lat && lng) {
      formatted.sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    const effectiveRadius = Number(radiusKm || maxDistanceKm);
    if (!isNaN(effectiveRadius) && effectiveRadius > 0) {
      formatted = formatted.filter((s) => s.distanceKm != null && s.distanceKm <= effectiveRadius);
    }

    res.status(200).json({
      success: true,
      count: formatted.length,
      total,
      page: 1,
      limit: total || 1,
      totalPages: 1,
      data: formatted,
    });
  } catch (error: any) {
    console.error("[services] Error fetching services:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch services",
    });
  }
};

// GET /api/services/:id - Get single service
export const getServiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid service ID" });
      return;
    }

    const found = await db
      .select({
        id: services.id,
        name: services.name,
        businessName: services.businessName,
        logo: services.logo,
        address: services.address,
        phone: services.phone,
        whatsapp: services.whatsapp,
        images: services.images,
        categoryId: services.categoryId,
        categoryName: categories.name,
        subcategoryId: services.subcategoryId,
        subcategoryName: subcategories.name,
        description: services.description,
        status: services.status,
        userId: services.userId,
        creatorName: users.name,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
      })
      .from(services)
      .leftJoin(categories, eq(services.categoryId, categories.id))
      .leftJoin(subcategories, eq(services.subcategoryId, subcategories.id))
      .leftJoin(users, eq(services.userId, users.id))
      .where(eq(services.id, id))
      .limit(1);

    if (found.length === 0) {
      res.status(404).json({ success: false, message: "Service not found" });
      return;
    }

    const srv = found[0];
    res.status(200).json({
      success: true,
      data: {
        ...srv,
        images: parseImages(srv.images),
      },
    });
  } catch (error: any) {
    console.error("[services] Error fetching service:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch service",
    });
  }
};

// POST /api/services - Create service (Super Admin or Creator)
export const createService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      businessName,
      logo,
      address,
      phone,
      whatsapp,
      images,
      categoryId,
      subcategoryId,
      description,
      status,
    } = req.body;

    // Validate required fields
    if (!name || !businessName || !address || !phone || !categoryId) {
      res.status(400).json({
        success: false,
        message: "Name, Business Name, Address, Phone Number, and Category are required",
      });
      return;
    }

    const numCategoryId = Number(categoryId);
    if (isNaN(numCategoryId)) {
      res.status(400).json({ success: false, message: "Invalid category ID" });
      return;
    }

    // Verify category exists
    const categoryExists = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.id, numCategoryId))
      .limit(1);

    if (categoryExists.length === 0) {
      res.status(400).json({ success: false, message: "Selected category does not exist" });
      return;
    }

    // Optional subcategory validation
    let numSubcategoryId: number | null = null;
    if (subcategoryId !== undefined && subcategoryId !== null && subcategoryId !== "") {
      numSubcategoryId = Number(subcategoryId);
      if (isNaN(numSubcategoryId)) {
        res.status(400).json({ success: false, message: "Invalid subcategory ID" });
        return;
      }
      const subExists = await db
        .select({ id: subcategories.id })
        .from(subcategories)
        .where(
          and(
            eq(subcategories.id, numSubcategoryId),
            eq(subcategories.categoryId, numCategoryId)
          )
        )
        .limit(1);

      if (subExists.length === 0) {
        res.status(400).json({
          success: false,
          message: "Selected subcategory does not belong to the chosen category",
        });
        return;
      }
    }

    // Format images as JSON string
    let serializedImages: string | null = null;
    if (Array.isArray(images)) {
      serializedImages = JSON.stringify(images);
    } else if (typeof images === "string" && images.trim()) {
      serializedImages = JSON.stringify([images.trim()]);
    }

    const userId = req.user?.id || null;

    const [insertResult] = await db.insert(services).values({
      name: String(name).trim(),
      businessName: String(businessName).trim(),
      logo: logo || null,
      address: String(address).trim(),
      phone: String(phone).trim(),
      whatsapp: whatsapp ? String(whatsapp).trim() : null,
      images: serializedImages,
      categoryId: numCategoryId,
      subcategoryId: numSubcategoryId,
      description: description ? String(description).trim() : null,
      status: status === "inactive" ? "inactive" : "active",
      userId,
    });

    const newId = insertResult.insertId;

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: {
        id: newId,
        name: String(name).trim(),
        businessName: String(businessName).trim(),
        logo: logo || null,
        address: String(address).trim(),
        phone: String(phone).trim(),
        whatsapp: whatsapp ? String(whatsapp).trim() : null,
        images: parseImages(serializedImages),
        categoryId: numCategoryId,
        categoryName: categoryExists[0].name,
        subcategoryId: numSubcategoryId,
        description: description ? String(description).trim() : null,
        status: status === "inactive" ? "inactive" : "active",
        userId,
      },
    });
  } catch (error: any) {
    console.error("[services] Error creating service:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create service",
    });
  }
};

// PUT /api/services/:id - Update service (Super Admin or Creator)
export const updateService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid service ID" });
      return;
    }

    const existing = await db
      .select()
      .from(services)
      .where(eq(services.id, id))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ success: false, message: "Service not found" });
      return;
    }

    const currentService = existing[0];
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // Permissions: Superadmin can edit any service. Creator can edit their own service
    if (userRole === "creator" && currentService.userId && currentService.userId !== userId) {
      res.status(403).json({
        success: false,
        message: "Forbidden: Creators can only modify their own services",
      });
      return;
    }

    const {
      name,
      businessName,
      logo,
      address,
      phone,
      whatsapp,
      images,
      categoryId,
      subcategoryId,
      description,
      status,
    } = req.body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = String(name).trim();
    if (businessName !== undefined) updateData.businessName = String(businessName).trim();
    if (logo !== undefined) updateData.logo = logo || null;
    if (address !== undefined) updateData.address = String(address).trim();
    if (phone !== undefined) updateData.phone = String(phone).trim();
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp ? String(whatsapp).trim() : null;
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (status !== undefined) updateData.status = status === "inactive" ? "inactive" : "active";

    // Category update
    let finalCategoryId = currentService.categoryId;
    if (categoryId !== undefined) {
      finalCategoryId = Number(categoryId);
      if (isNaN(finalCategoryId)) {
        res.status(400).json({ success: false, message: "Invalid category ID" });
        return;
      }
      const catExists = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, finalCategoryId))
        .limit(1);
      if (catExists.length === 0) {
        res.status(400).json({ success: false, message: "Category does not exist" });
        return;
      }
      updateData.categoryId = finalCategoryId;
    }

    // Subcategory update
    if (subcategoryId !== undefined) {
      if (subcategoryId === null || subcategoryId === "" || subcategoryId === 0) {
        updateData.subcategoryId = null;
      } else {
        const numSubId = Number(subcategoryId);
        if (isNaN(numSubId)) {
          res.status(400).json({ success: false, message: "Invalid subcategory ID" });
          return;
        }
        const subExists = await db
          .select({ id: subcategories.id })
          .from(subcategories)
          .where(
            and(
              eq(subcategories.id, numSubId),
              eq(subcategories.categoryId, finalCategoryId)
            )
          )
          .limit(1);
        if (subExists.length === 0) {
          res.status(400).json({
            success: false,
            message: "Selected subcategory does not belong to the category",
          });
          return;
        }
        updateData.subcategoryId = numSubId;
      }
    }

    // Images update
    if (images !== undefined) {
      if (Array.isArray(images)) {
        updateData.images = JSON.stringify(images);
      } else if (typeof images === "string") {
        updateData.images = JSON.stringify([images.trim()]);
      } else if (images === null) {
        updateData.images = null;
      }
    }

    await db.update(services).set(updateData).where(eq(services.id, id));

    const updated = await db
      .select({
        id: services.id,
        name: services.name,
        businessName: services.businessName,
        logo: services.logo,
        address: services.address,
        phone: services.phone,
        whatsapp: services.whatsapp,
        images: services.images,
        categoryId: services.categoryId,
        categoryName: categories.name,
        subcategoryId: services.subcategoryId,
        subcategoryName: subcategories.name,
        description: services.description,
        status: services.status,
        userId: services.userId,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
      })
      .from(services)
      .leftJoin(categories, eq(services.categoryId, categories.id))
      .leftJoin(subcategories, eq(services.subcategoryId, subcategories.id))
      .where(eq(services.id, id))
      .limit(1);

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: {
        ...updated[0],
        images: parseImages(updated[0].images),
      },
    });
  } catch (error: any) {
    console.error("[services] Error updating service:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update service",
    });
  }
};

// DELETE /api/services/:id - Delete service (Super Admin or Creator)
export const deleteService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid service ID" });
      return;
    }

    const existing = await db
      .select()
      .from(services)
      .where(eq(services.id, id))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ success: false, message: "Service not found" });
      return;
    }

    const currentService = existing[0];
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (userRole === "creator" && currentService.userId && currentService.userId !== userId) {
      res.status(403).json({
        success: false,
        message: "Forbidden: Creators can only delete their own services",
      });
      return;
    }

    await db.delete(services).where(eq(services.id, id));

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
      data: { id },
    });
  } catch (error: any) {
    console.error("[services] Error deleting service:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete service",
    });
  }
};
