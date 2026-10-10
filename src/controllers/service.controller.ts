import { Request, Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { services } from "../db/schema.js";

export const getAllServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const allServices = await db
      .select()
      .from(services)
      .where(eq(services.status, "active"))
      .orderBy(desc(services.createdAt));

    res.status(200).json({
      success: true,
      count: allServices.length,
      data: allServices,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch services" });
  }
};

export const getServiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid service ID" });
      return;
    }

    const found = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (found.length === 0) {
      res.status(404).json({ success: false, message: "Service not found" });
      return;
    }

    res.status(200).json({ success: true, data: found[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch service" });
  }
};

export const createService = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, category, price, imageUrl } = req.body;

    if (!title || !category || price === undefined) {
      res.status(400).json({ success: false, message: "Title, category and price are required" });
      return;
    }

    const insertResult = await db.insert(services).values({
      title,
      description: description || "",
      category,
      price: price.toString(),
      imageUrl: imageUrl || null,
      status: "active",
    });

    const newId = insertResult[0].insertId;

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: {
        id: newId,
        title,
        category,
        price,
        imageUrl,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to create service" });
  }
};
