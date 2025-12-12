import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireRoleForShop } from "../lib/auth";

export const productsRouter = Router();

// Add product: owner/manager
productsRouter.post("/add", async (req: Request, res: Response) => {
  try {
    const check = await requireRoleForShop(req, res, ["owner", "manager"]);
    if (!check) return;
    const shop_id = req.body.shop_id;
    const {
      name,
      description = "",
      price = 0,
      quantity_total = 0,
      preorder_enabled = false,
      preorder_estimate_days = 14,
      sku = null,
    } = req.body;
    if (!shop_id || !name)
      return res.status(400).json({ error: "Missing fields" });

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert([
        {
          shop_id,
          name,
          description,
          price,
          quantity_total,
          quantity_reserved: 0,
          preorder_enabled,
          preorder_estimate_days,
          sku,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return res.json({ product: data });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error("Unknown error");
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

// Update product
productsRouter.put("/update", async (req: Request, res: Response) => {
  try {
    const check = await requireRoleForShop(req, res, ["owner", "manager"]);
    if (!check) return;
    const { shop_id, product_id, ...updates } = req.body;
    if (!shop_id || !product_id)
      return res.status(400).json({ error: "Missing fields" });

    const { data, error } = await supabaseAdmin
      .from("products")
      .update(updates)
      .eq("id", product_id)
      .eq("shop_id", shop_id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ product: data });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error("Unknown error");
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

// Delete product
productsRouter.delete("/delete", async (req: Request, res: Response) => {
  try {
    const check = await requireRoleForShop(req, res, ["owner", "manager"]);
    if (!check) return;
    const { shop_id, product_id } = req.body;
    if (!shop_id || !product_id)
      return res.status(400).json({ error: "Missing fields" });

    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", product_id)
      .eq("shop_id", shop_id);

    if (error) throw error;
    return res.json({ success: true });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error("Unknown error");
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});
