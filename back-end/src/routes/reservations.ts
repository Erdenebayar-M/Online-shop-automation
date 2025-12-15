// ==================== routes/reservations.ts ====================
import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { asyncHandler } from "../utils/errors";
import { validate, checkReservationSchema } from "../utils/validation";
import { tryReserveProduct } from "../services/inventory.service";

export const reservationsRouter = Router();

/**
 * POST /reservations/check
 * Body: { shop_id, product_id, user_identifier, holdMinutes }
 * Returns reservation info. Uses atomic database operation.
 */
reservationsRouter.post(
  "/check",
  asyncHandler(async (req: Request, res: Response) => {
    const validated = validate(checkReservationSchema, req.body);

    const result = await tryReserveProduct(
      validated.shop_id,
      validated.product_id,
      validated.user_identifier,
      validated.holdMinutes
    );

    if (!result.success) {
      return res.json(result);
    }

    if (result.type === "normal") {
      return res.json({
        available: true,
        type: "normal",
        reservation_id: result.reservation_id,
        expires_at: result.expires_at,
      });
    }

    if (result.type === "preorder") {
      return res.json({
        available: false,
        type: "preorder",
        reservation_id: result.reservation_id,
        expected_delivery_date: result.expected_delivery_date,
      });
    }

    return res.json(result);
  })
);

/**
 * POST /reservations/cancel
 * Body: { reservation_id }
 * Cancel an active reservation and free up inventory
 */
reservationsRouter.post(
  "/cancel",
  asyncHandler(async (req: Request, res: Response) => {
    const { reservation_id } = req.body;

    if (!reservation_id) {
      return res.status(400).json({ error: "reservation_id is required" });
    }

    // Get reservation details
    const { data: reservation, error: fetchError } = await supabaseAdmin
      .from("reservations")
      .select("*")
      .eq("id", reservation_id)
      .single();

    if (fetchError || !reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    if (reservation.status !== "active") {
      return res.status(400).json({ error: "Reservation is not active" });
    }

    // Mark as cancelled
    const { error: updateError } = await supabaseAdmin
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", reservation_id);

    if (updateError) throw updateError;

    // Free up inventory for normal orders
    if (reservation.order_type === "normal") {
      await supabaseAdmin.rpc("decrement_reserved", {
        p: JSON.stringify({ product_id: reservation.product_id }),
      });
    }

    return res.json({ success: true });
  })
);

/**
 * GET /reservations/list
 * Query: ?shop_id=xxx&status=active
 * List reservations for a shop
 */
reservationsRouter.get(
  "/list",
  asyncHandler(async (req: Request, res: Response) => {
    const { shop_id, status, user_identifier } = req.query;

    if (!shop_id || typeof shop_id !== "string") {
      return res.status(400).json({ error: "shop_id is required" });
    }

    let query = supabaseAdmin
      .from("reservations")
      .select(
        `
        *,
        products(name, sku, price)
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

    return res.json({ reservations: data });
  })
);

/**
 * GET /reservations/:reservationId
 * Get reservation details
 */
reservationsRouter.get(
  "/:reservationId",
  asyncHandler(async (req: Request, res: Response) => {
    const { reservationId } = req.params;

    const { data, error } = await supabaseAdmin
      .from("reservations")
      .select(
        `
        *,
        products(name, sku, price, description)
      `
      )
      .eq("id", reservationId)
      .single();

    if (error) throw error;

    return res.json({ reservation: data });
  })
);
