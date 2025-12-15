import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireRoleForShop } from "../lib/auth";
import { asyncHandler } from "../utils/errors";
import {
  validate,
  createProductSchema,
  updateProductSchema,
  deleteProductSchema,
} from "../utils/validation";
import { requireActiveSubscription } from "../services/subscription.service";

export const productsRouter = Router();

/**
 * POST /products/add - Add product (owner/manager only)
 */
productsRouter.post(
  "/add",
  asyncHandler(async (req: Request, res: Response) => {
    const validated = validate(createProductSchema, req.body);

    const check = await requireRoleForShop(
      req,
      res,
      ["owner", "manager"],
      validated.shop_id
    );
    if (!check) return;

    // Check subscription (optional - uncomment if you want to enforce)
    // await requireActiveSubscription(validated.shop_id, "website");

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert([
        {
          shop_id: validated.shop_id,
          name: validated.name,
          description: validated.description,
          price: validated.price,
          quantity_total: validated.quantity_total,
          quantity_reserved: 0,
          quantity_sold: 0,
          preorder_enabled: validated.preorder_enabled,
          preorder_estimate_days: validated.preorder_estimate_days,
          sku: validated.sku,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.json({ product: data });
  })
);

/**
 * PUT /products/update - Update product (owner/manager only)
 */
productsRouter.put(
  "/update",
  asyncHandler(async (req: Request, res: Response) => {
    const validated = validate(updateProductSchema, req.body);

    const check = await requireRoleForShop(
      req,
      res,
      ["owner", "manager"],
      validated.shop_id
    );
    if (!check) return;

    const { shop_id, product_id, ...updates } = validated;

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(cleanUpdates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .update(cleanUpdates)
      .eq("id", product_id)
      .eq("shop_id", shop_id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ product: data });
  })
);

/**
 * DELETE /products/delete - Delete product (owner/manager only)
 */
productsRouter.delete(
  "/delete",
  asyncHandler(async (req: Request, res: Response) => {
    const validated = validate(deleteProductSchema, req.body);

    const check = await requireRoleForShop(
      req,
      res,
      ["owner", "manager"],
      validated.shop_id
    );
    if (!check) return;

    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", validated.product_id)
      .eq("shop_id", validated.shop_id);

    if (error) throw error;

    return res.json({ success: true });
  })
);

/**
 * GET /products/list - List products for a shop
 */
productsRouter.get(
  "/list",
  asyncHandler(async (req: Request, res: Response) => {
    const { shop_id } = req.query;

    if (!shop_id || typeof shop_id !== "string") {
      return res.status(400).json({ error: "shop_id is required" });
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("shop_id", shop_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Calculate available quantity for each product
    const productsWithAvailability = data.map((product) => ({
      ...product,
      quantity_available:
        (product.quantity_total || 0) - (product.quantity_reserved || 0),
    }));

    return res.json({ products: productsWithAvailability });
  })
);

/**
 * GET /products/:productId - Get single product details
 */
productsRouter.get(
  "/:productId",
  asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { shop_id } = req.query;

    if (!shop_id || typeof shop_id !== "string") {
      return res.status(400).json({ error: "shop_id is required" });
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("shop_id", shop_id)
      .single();

    if (error) throw error;

    // Add availability info
    const productWithAvailability = {
      ...data,
      quantity_available:
        (data.quantity_total || 0) - (data.quantity_reserved || 0),
    };

    return res.json({ product: productWithAvailability });
  })
);
