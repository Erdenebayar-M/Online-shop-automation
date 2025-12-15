// ==================== routes/orders.ts ====================
import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { asyncHandler } from "../utils/errors";
import { validate, confirmOrderSchema } from "../utils/validation";

export const ordersRouter = Router();

/**
 * POST /orders/confirm
 * Body: { reservation_id, items: [{ product_id, quantity, price }], user_identifier }
 * Marks reservation as purchased, decrements stock (if not preorder), creates order + items.
 */
ordersRouter.post(
  "/confirm",
  asyncHandler(async (req: Request, res: Response) => {
    const validated = validate(confirmOrderSchema, req.body);

    // Fetch reservation
    const { data: reservation, error: resErr } = await supabaseAdmin
      .from("reservations")
      .select("*")
      .eq("id", validated.reservation_id)
      .single();

    if (resErr || !reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    if (reservation.status !== "active") {
      return res.status(400).json({ error: "Reservation is not active" });
    }

    // Check if reservation has expired
    if (
      reservation.expires_at &&
      new Date(reservation.expires_at) < new Date()
    ) {
      return res.status(400).json({ error: "Reservation has expired" });
    }

    // Start transaction-like operations
    // Mark reservation as purchased
    const { error: updateErr } = await supabaseAdmin
      .from("reservations")
      .update({ status: "purchased" })
      .eq("id", validated.reservation_id);

    if (updateErr) throw updateErr;

    // Decrement totals for each non-preorder item
    if (reservation.order_type !== "preorder") {
      for (const item of validated.items) {
        await supabaseAdmin.rpc("decrement_total", {
          p: JSON.stringify({ product_id: item.product_id }),
        });
      }
    } else {
      // For preorders, just decrement reserved count
      for (const item of validated.items) {
        await supabaseAdmin.rpc("decrement_reserved", {
          p: JSON.stringify({ product_id: item.product_id }),
        });
      }
    }

    // Calculate total amount
    const total_amount = validated.items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    // Create order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert([
        {
          shop_id: reservation.shop_id,
          reservation_id: validated.reservation_id,
          user_identifier: validated.user_identifier,
          total_amount,
          status: "paid",
        },
      ])
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Insert order items
    const orderItems = validated.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsErr) throw itemsErr;

    return res.json({ success: true, order_id: order.id, order });
  })
);

/**
 * GET /orders/list
 * Query: ?shop_id=xxx&status=paid
 * List orders for a shop
 */
ordersRouter.get(
  "/list",
  asyncHandler(async (req: Request, res: Response) => {
    const { shop_id, status, user_identifier } = req.query;

    if (!shop_id || typeof shop_id !== "string") {
      return res.status(400).json({ error: "shop_id is required" });
    }

    let query = supabaseAdmin
      .from("orders")
      .select(
        `
        *,
        order_items(
          *,
          products(name, sku)
        )
      `
      )
      .eq("shop_id", shop_id)
      .order("created_at", { ascending: false });

    if (status && typeof status === "string") {
      query = query.eq("status", status);
    }

    if (user_identifier && typeof user_identifier === "string") {
      query = query.eq("user_identifier", user_identifier);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.json({ orders: data });
  })
);

/**
 * GET /orders/:orderId
 * Get order details
 */
ordersRouter.get(
  "/:orderId",
  asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { shop_id } = req.query;

    if (!shop_id || typeof shop_id !== "string") {
      return res.status(400).json({ error: "shop_id is required" });
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
        *,
        order_items(
          *,
          products(name, sku, description)
        ),
        reservations(*)
      `
      )
      .eq("id", orderId)
      .eq("shop_id", shop_id)
      .single();

    if (error) throw error;

    return res.json({ order: data });
  })
);

/**
 * PUT /orders/:orderId/status
 * Update order status
 * Body: { shop_id, status }
 */
ordersRouter.put(
  "/:orderId/status",
  asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { shop_id, status } = req.body;

    if (!shop_id || !status) {
      return res.status(400).json({ error: "shop_id and status are required" });
    }

    const validStatuses = [
      "created",
      "paid",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .eq("shop_id", shop_id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ order: data });
  })
);
