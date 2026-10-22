import { Request, Response } from "express";
import { eq, desc, like, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { categories } from "../db/schema.js";

// In-memory cache for ultra-fast category responses (< 2ms)
let cachedAllCategoriesResponse: any = null;
let categoryCacheTimestamp = 0;
const CATEGORY_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const invalidateCategoriesCache = () => {
  cachedAllCategoriesResponse = null;
  categoryCacheTimestamp = 0;
};

// GET /api/categories - Read all categories with optional search and pagination
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, search } = req.query;

    const condition =
      search && typeof search === "string" && search.trim() !== ""
        ? like(categories.name, `%${search.trim()}%`)
        : undefined;

    // Instant return from in-memory cache for default public queries (used by App and Web)
    if (!condition && page === undefined && limit === undefined) {
      if (
        cachedAllCategoriesResponse &&
        Date.now() - categoryCacheTimestamp < CATEGORY_CACHE_TTL_MS
      ) {
        res.setHeader("X-Cache", "HIT");
        res.status(200).json(cachedAllCategoriesResponse);
        return;
      }
    }

    // Total count matching query
    const countQuery = condition
      ? db.select({ total: count() }).from(categories).where(condition)
      : db.select({ total: count() }).from(categories);
    const [{ total }] = await countQuery;

    // If page parameter is supplied, apply pagination
    if (page !== undefined) {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 10);
      const offsetNum = (pageNum - 1) * limitNum;
      const totalPages = Math.ceil(total / limitNum) || 1;

      const baseQuery = db
        .select()
        .from(categories)
        .orderBy(desc(categories.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      const data = condition ? await baseQuery.where(condition) : await baseQuery;

      res.status(200).json({
        success: true,
        count: data.length,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        data,
      });
      return;
    }

    // Default / unpaginated call (for dropdowns, app home screen, etc.)
    const baseQuery = db
      .select()
      .from(categories)
      .orderBy(desc(categories.createdAt));

    const allCategories = condition ? await baseQuery.where(condition) : await baseQuery;

    const responsePayload = {
      success: true,
      count: allCategories.length,
      total,
      page: 1,
      limit: total || 1,
      totalPages: 1,
      data: allCategories,
    };

    if (!condition) {
      cachedAllCategoriesResponse = responsePayload;
      categoryCacheTimestamp = Date.now();
    }

    res.setHeader("X-Cache", "MISS");
    res.status(200).json(responsePayload);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch categories" });
  }
};

// GET /api/categories/:id - Read single category
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID" });
      return;
    }

    const found = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (found.length === 0) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    res.status(200).json({ success: true, data: found[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch category" });
  }
};

// POST /api/categories - Create category (Super Admin Only)
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, image } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ success: false, message: "Category name is required" });
      return;
    }

    const trimmedName = name.trim();

    // Check if category name already exists
    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.name, trimmedName))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ success: false, message: "A category with this name already exists" });
      return;
    }

    const insertResult = await db.insert(categories).values({
      name: trimmedName,
      image: image || null,
    });

    const newId = insertResult[0].insertId;
    invalidateCategoriesCache();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: {
        id: newId,
        name: trimmedName,
        image: image || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to create category" });
  }
};

// PUT /api/categories/:id - Update category (Super Admin Only)
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID" });
      return;
    }

    const { name, image } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ success: false, message: "Category name is required" });
      return;
    }

    const trimmedName = name.trim();

    // Check if category exists
    const existing = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    // Check duplicate name
    const duplicate = await db
      .select()
      .from(categories)
      .where(eq(categories.name, trimmedName))
      .limit(1);

    if (duplicate.length > 0 && duplicate[0].id !== id) {
      res.status(409).json({ success: false, message: "Another category with this name already exists" });
      return;
    }

    await db
      .update(categories)
      .set({
        name: trimmedName,
        image: image !== undefined ? image : existing[0].image,
      })
      .where(eq(categories.id, id));

    invalidateCategoriesCache();

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: {
        id,
        name: trimmedName,
        image: image !== undefined ? image : existing[0].image,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to update category" });
  }
};

// DELETE /api/categories/:id - Delete category (Super Admin Only)
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID" });
      return;
    }

    const existing = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    await db.delete(categories).where(eq(categories.id, id));
    invalidateCategoriesCache();

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: { id },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to delete category" });
  }
};
