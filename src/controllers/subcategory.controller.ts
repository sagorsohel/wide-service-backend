import { Request, Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { subcategories, categories } from "../db/schema.js";

// GET /api/subcategories - Get all subcategories (optional ?categoryId=)
export const getAllSubcategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.query;

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

    const results = categoryId
      ? await baseQuery.where(eq(subcategories.categoryId, Number(categoryId)))
      : await baseQuery;

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
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

    res.status(200).json({
      success: true,
      message: "Subcategory deleted successfully",
      data: { id },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to delete subcategory" });
  }
};
