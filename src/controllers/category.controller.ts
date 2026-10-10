import { Request, Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { categories } from "../db/schema.js";

// GET /api/categories - Read all categories
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(desc(categories.createdAt));

    res.status(200).json({
      success: true,
      count: allCategories.length,
      data: allCategories,
    });
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

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: { id },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to delete category" });
  }
};
