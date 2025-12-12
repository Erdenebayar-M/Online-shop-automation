import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireAuth, assertShopOwner } from "../lib/auth";

export const productsRouter = Router();

productsRouter.post("/add", async (req: Request, res: Response) => {
  try {
    const decoded = await requireAuth(req, res);
    if (!decoded) return;
    const { shop_id, name } = req.body;
    if (!shop_id || !name)
      return res.status(400).json({ error: "Missing fields" });
    const ok = await assertShopOwner(decoded, shop_id);
    if (!ok) return res.status(403).json({ error: "Permission denied" });
    const { data, error } = await supabaseAdmin
      .from("products")
      .insert([{ shop_id, name }])
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, product: data });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    res.status(500).json({ error: error.message });
  }
});

productsRouter.put("/update", async (req: Request, res: Response) => {
  try {
    const decoded = await requireAuth(req, res);
    if (!decoded) return;
    const { shop_id, product_id, ...updates } = req.body;
    if (!shop_id || !product_id)
      return res.status(400).json({ error: "Missing fields" });
    const ok = await assertShopOwner(decoded, shop_id);
    if (!ok) return res.status(403).json({ error: "Permission denied" });
    const { data, error } = await supabaseAdmin
      .from("products")
      .update(updates)
      .eq("id", product_id)
      .eq("shop_id", shop_id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, product: data });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    res.status(500).json({ error: error.message });
  }
});

productsRouter.delete("/delete", async (req: Request, res: Response) => {
  try {
    const decoded = await requireAuth(req, res);
    if (!decoded) return;
    const { shop_id, product_id } = req.body;
    if (!shop_id || !product_id)
      return res.status(400).json({ error: "Missing fields" });
    const ok = await assertShopOwner(decoded, shop_id);
    if (!ok) return res.status(403).json({ error: "Permission denied" });
    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", product_id)
      .eq("shop_id", shop_id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    res.status(500).json({ error: error.message });
  }
});
