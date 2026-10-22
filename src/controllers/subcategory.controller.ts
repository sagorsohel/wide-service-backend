import { Request, Response } from "express";
import { eq, desc, and, like, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { subcategories, categories } from "../db/schema.js";

// In-memory cache for ultra-fast subcategory responses (< 2ms)
const cachedSubcategoriesMap = new Map<string, { response: any; timestamp: number }>();
const SUBCAT_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const invalidateSubcategoriesCache = () => {
  cachedSubcategoriesMap.clear();
};

// GET /api/subcategories - Get all subcategories with optional categoryId, search, and pagination
export const getAllSubcategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, search, page, limit } = req.query;

    const hasSearch = search && typeof search === "string" && search.trim() !== "";
    const cacheKey = !hasSearch && page === undefined && limit === undefined
      ? (categoryId ? `cat_${categoryId}` : "all")
      : null;

    if (cacheKey && cachedSubcategoriesMap.has(cacheKey)) {
      const entry = cachedSubcategoriesMap.get(cacheKey)!;
      if (Date.now() - entry.timestamp < SUBCAT_CACHE_TTL_MS) {
        res.setHeader("X-Cache", "HIT");
        res.status(200).json(entry.response);
        return;
      }
    }

    const conditions = [];

    if (categoryId) {
      conditions.push(eq(subcategories.categoryId, Number(categoryId)));
    }

    if (hasSearch) {
      conditions.push(like(subcategories.name, `%${(search as string).trim()}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total matching items
    const countQuery = whereClause
      ? db.select({ total: count() }).from(subcategories).where(whereClause)
      : db.select({ total: count() }).from(subcategories);
    const [{ total }] = await countQuery;

    // If page is provided, apply pagination
    if (page !== undefined) {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 10);
      const offsetNum = (pageNum - 1) * limitNum;
      const totalPages = Math.ceil(total / limitNum) || 1;

      const baseQuery = db
        .select({
          id: subcategories.id,
          name: subcategories.name,
          image: subcategories.image,
          categoryId: subcategories.categoryId,
          categoryName: categories.name,
          createdAt: subcategories.createdAt,
          updatedAt: subcategories.updatedAt,
        })
        .from(subcategories)
        .leftJoin(categories, eq(subcategories.categoryId, categories.id))
        .orderBy(desc(subcategories.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      const results = whereClause ? await baseQuery.where(whereClause) : await baseQuery;

      res.status(200).json({
        success: true,
        count: results.length,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        data: results,
      });
      return;
    }

    // Default / unpaginated call
    const baseQuery = db
      .select({
        id: subcategories.id,
        name: subcategories.name,
        image: subcategories.image,
        categoryId: subcategories.categoryId,
        categoryName: categories.name,
        createdAt: subcategories.createdAt,
        updatedAt: subcategories.updatedAt,
      })
      .from(subcategories)
      .leftJoin(categories, eq(subcategories.categoryId, categories.id))
      .orderBy(desc(subcategories.createdAt));

    const results = whereClause ? await baseQuery.where(whereClause) : await baseQuery;

    const responsePayload = {
      success: true,
      count: results.length,
      total,
      page: 1,
      limit: total || 1,
      totalPages: 1,
      data: results,
    };

    if (cacheKey) {
      cachedSubcategoriesMap.set(cacheKey, {
        response: responsePayload,
        timestamp: Date.now(),
      });
    }

    res.setHeader("X-Cache", "MISS");
    res.status(200).json(responsePayload);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch subcategories" });
  }
};

// GET /api/subcategories/:id - Get single subcategory
export const getSubcategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid subcategory ID" });
      return;
    }

    const found = await db
      .select({
        id: subcategories.id,
        name: subcategories.name,
        image: subcategories.image,
        categoryId: subcategories.categoryId,
        categoryName: categories.name,
        createdAt: subcategories.createdAt,
        updatedAt: subcategories.updatedAt,
      })
      .from(subcategories)
      .leftJoin(categories, eq(subcategories.categoryId, categories.id))
      .where(eq(subcategories.id, id))
      .limit(1);

    if (found.length === 0) {
      res.status(404).json({ success: false, message: "Subcategory not found" });
      return;
    }

    res.status(200).json({ success: true, data: found[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch subcategory" });
  }
};

// POST /api/subcategories - Create subcategory (Super Admin Only)
export const createSubcategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, name, image } = req.body;

    if (!categoryId || isNaN(Number(categoryId))) {
      res.status(400).json({ success: false, message: "Valid categoryId is required" });
      return;
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ success: false, message: "Subcategory name is required" });
      return;
    }

    const numCategoryId = Number(categoryId);
    const trimmedName = name.trim();

    // Verify parent category exists
    const categoryExists = await db
      .select()
      .from(categories)
      .where(eq(categories.id, numCategoryId))
      .limit(1);

    if (categoryExists.length === 0) {
      res.status(404).json({ success: false, message: "Selected parent category does not exist" });
      return;
    }

    // Check duplicate in same category
    const duplicate = await db
      .select()
      .from(subcategories)
      .where(
        and(
          eq(subcategories.categoryId, numCategoryId),
          eq(subcategories.name, trimmedName)
        )
      )
      .limit(1);

    if (duplicate.length > 0) {
      res.status(409).json({
        success: false,
        message: "A subcategory with this name already exists in the selected category",
      });
      return;
    }

    const insertResult = await db.insert(subcategories).values({
      categoryId: numCategoryId,
      name: trimmedName,
      image: image || null,
    });

    const newId = insertResult[0].insertId;
    invalidateSubcategoriesCache();

    res.status(201).json({
      success: true,
      message: "Subcategory created successfully",
      data: {
        id: newId,
        categoryId: numCategoryId,
        categoryName: categoryExists[0].name,
        name: trimmedName,
        image: image || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to create subcategory" });
  }
};

// PUT /api/subcategories/:id - Update subcategory (Super Admin Only)
export const updateSubcategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid subcategory ID" });
      return;
    }

    const { categoryId, name, image } = req.body;

    if (!categoryId || isNaN(Number(categoryId))) {
      res.status(400).json({ success: false, message: "Valid categoryId is required" });
      return;
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ success: false, message: "Subcategory name is required" });
      return;
    }

    const numCategoryId = Number(categoryId);
    const trimmedName = name.trim();

    // Check existing
    const existing = await db.select().from(subcategories).where(eq(subcategories.id, id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: "Subcategory not found" });
      return;
    }

    // Verify parent category exists
    const categoryExists = await db
      .select()
      .from(categories)
      .where(eq(categories.id, numCategoryId))
      .limit(1);

    if (categoryExists.length === 0) {
      res.status(404).json({ success: false, message: "Selected parent category does not exist" });
      return;
    }

    // Check duplicate in same category
    const duplicate = await db
      .select()
      .from(subcategories)
      .where(
        and(
          eq(subcategories.categoryId, numCategoryId),
          eq(subcategories.name, trimmedName)
        )
      )
      .limit(1);

    if (duplicate.length > 0 && duplicate[0].id !== id) {
      res.status(409).json({
        success: false,
        message: "Another subcategory with this name already exists in this category",
      });
      return;
    }

    await db
      .update(subcategories)
      .set({
        categoryId: numCategoryId,
        name: trimmedName,
        image: image !== undefined ? image : existing[0].image,
      })
      .where(eq(subcategories.id, id));

    invalidateSubcategoriesCache();

    res.status(200).json({
      success: true,
      message: "Subcategory updated successfully",
      data: {
        id,
        categoryId: numCategoryId,
        categoryName: categoryExists[0].name,
        name: trimmedName,
        image: image !== undefined ? image : existing[0].image,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to update subcategory" });
  }
};

// DELETE /api/subcategories/:id - Delete subcategory (Super Admin Only)
export const deleteSubcategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid subcategory ID" });
      return;
    }

    const existing = await db.select().from(subcategories).where(eq(subcategories.id, id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: "Subcategory not found" });
      return;
    }

    await db.delete(subcategories).where(eq(subcategories.id, id));
    invalidateSubcategoriesCache();

    res.status(200).json({
      success: true,
      message: "Subcategory deleted successfully",
      data: { id },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to delete subcategory" });
  }
};
