import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";

export const ordersRouter = Router();

/**
 * POST /orders/confirm
 * Body: { reservation_id, items: [{ product_id, quantity, price }], user_identifier }
 * This marks reservation purchased, decrements stock (if not preorder), and creates order + items.
 */
ordersRouter.post("/confirm", async (req: Request, res: Response) => {
  try {
    const { reservation_id, items, user_identifier } = req.body;
    if (!reservation_id || !items || !Array.isArray(items))
      return res.status(400).json({ error: "Missing fields" });

    // fetch reservation
    const { data: reservation } = await supabaseAdmin
      .from("reservations")
      .select("*")
      .eq("id", reservation_id)
      .single();
    if (!reservation)
      return res.status(404).json({ error: "Reservation not found" });

    // mark purchased
    const { error: uErr } = await supabaseAdmin
      .from("reservations")
      .update({ status: "purchased" })
      .eq("id", reservation_id);
    if (uErr) throw uErr;

    // decrement totals for each non-preorder item:
    if (reservation.order_type !== "preorder") {
      for (const it of items) {
        await supabaseAdmin.rpc("decrement_total", {
          p: JSON.stringify({ product_id: it.product_id }),
        });
      }
    }

    // create order
    const total_amount = items.reduce(
      (s: number, it: any) => s + Number(it.price) * Number(it.quantity),
      0
    );
    const { data: order } = await supabaseAdmin
      .from("orders")
      .insert([
        {
          shop_id: reservation.shop_id,
          reservation_id,
          user_identifier,
          total_amount,
          status: "paid",
        },
      ])
      .select()
      .single();

    // insert items
    const rows = items.map((it: any) => ({
      order_id: order.id,
      product_id: it.product_id,
      quantity: it.quantity,
      price: it.price,
    }));
    const { error: oiErr } = await supabaseAdmin
      .from("order_items")
      .insert(rows);
    if (oiErr) throw oiErr;

    return res.json({ success: true, order_id: order.id });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error("Unknown error");
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});
