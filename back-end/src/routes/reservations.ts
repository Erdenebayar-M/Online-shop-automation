import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
export const reservationsRouter = Router();

reservationsRouter.post("/check", async (req: Request, res: Response) => {
  try {
    const { shop_id, product_id, user_id, holdMinutes = 10 } = req.body;
    if (!shop_id || !product_id || !user_id)
      return res.status(400).json({ error: "Missing fields" });
    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", product_id)
      .eq("shop_id", shop_id)
      .single();
    if (pErr || !product)
      return res.status(404).json({ error: "Product not found" });
    const available =
      (product.quantity_total || 0) - (product.quantity_reserved || 0);
    if (available > 0) {
      const expires_at = new Date(
        Date.now() + holdMinutes * 60000
      ).toISOString();
      const { data: reservation, error: rErr } = await supabaseAdmin
        .from("reservations")
        .insert([
          {
            shop_id,
            product_id,
            user_id,
            status: "active",
            order_type: "normal",
            expires_at,
          },
        ])
        .select()
        .single();
      if (rErr) throw rErr;
      await supabaseAdmin.rpc("increment_reserved", {
        p: JSON.stringify({ product_id }),
      });
      return res.json({
        available: true,
        type: "normal",
        reservation_id: reservation.id,
        expires_at,
      });
    }
    if (product.preorder_enabled) {
      const expected = new Date();
      expected.setDate(
        expected.getDate() + (product.preorder_estimate_days || 14)
      );
      const { data: reservation } = await supabaseAdmin
        .from("reservations")
        .insert([
          {
            shop_id,
            product_id,
            user_id,
            status: "active",
            order_type: "preorder",
            expected_delivery_date: expected.toISOString(),
          },
        ])
        .select()
        .single();
      return res.json({
        available: false,
        type: "preorder",
        reservation_id: reservation.id,
        expected_delivery_date: expected.toISOString(),
      });
    }
    return res.json({ available: false, type: "unavailable" });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    res.status(500).json({ error: error.message });
  }
});
