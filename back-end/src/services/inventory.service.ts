import { supabaseAdmin } from "../lib/supabase";
import { NotFoundError, ConflictError } from "../utils/errors";

export type ReservationResult =
  | {
      success: true;
      type: "normal";
      reservation_id: string;
      expires_at: string;
    }
  | {
      success: true;
      type: "preorder";
      reservation_id: string;
      expected_delivery_date: string;
    }
  | { success: false; type: "unavailable"; reason: string };

/**
 * Atomic reservation creation using database function
 */
export async function tryReserveProduct(
  shopId: string,
  productId: string,
  userIdentifier: string,
  holdMinutes: number = 10
): Promise<ReservationResult> {
  // First check if product exists and get preorder settings
  const { data: product, error: productError } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("shop_id", shopId)
    .single();

  if (productError || !product) {
    throw new NotFoundError("Product not found");
  }

  // Try to create reservation atomically via RPC
  const { data: result, error } = await supabaseAdmin.rpc(
    "try_reserve_product",
    {
      p_product_id: productId,
      p_shop_id: shopId,
      p_user_identifier: userIdentifier,
      p_hold_minutes: holdMinutes,
    }
  );

  if (error) {
    console.error("Reserve product error:", error);
    throw error;
  }

  // If reservation succeeded
  if (result?.success) {
    return {
      success: true,
      type: "normal",
      reservation_id: result.reservation_id,
      expires_at: result.expires_at,
    };
  }

  // Out of stock - check preorder
  if (product.preorder_enabled) {
    const expectedDate = new Date();
    expectedDate.setDate(
      expectedDate.getDate() + (product.preorder_estimate_days || 14)
    );

    const { data: reservation, error: preorderError } = await supabaseAdmin
      .from("reservations")
      .insert([
        {
          shop_id: shopId,
          product_id: productId,
          user_identifier: userIdentifier,
          status: "active",
          order_type: "preorder",
          expected_delivery_date: expectedDate.toISOString(),
        },
      ])
      .select()
      .single();

    if (preorderError) throw preorderError;

    return {
      success: true,
      type: "preorder",
      reservation_id: reservation.id,
      expected_delivery_date: expectedDate.toISOString(),
    };
  }

  // Completely unavailable
  return {
    success: false,
    type: "unavailable",
    reason: "Product is out of stock and preorder is not available",
  };
}

/**
 * Release expired reservations and free up inventory
 */
export async function cleanupExpiredReservations() {
  try {
    // Get all expired active reservations
    const { data: expired, error: fetchError } = await supabaseAdmin
      .from("reservations")
      .select("id, product_id, order_type")
      .eq("status", "active")
      .not("expires_at", "is", null)
      .lt("expires_at", new Date().toISOString());

    if (fetchError) throw fetchError;
    if (!expired || expired.length === 0) return;

    console.log(`Cleaning up ${expired.length} expired reservations`);

    // Mark as expired
    const { error: updateError } = await supabaseAdmin
      .from("reservations")
      .update({ status: "expired" })
      .in(
        "id",
        expired.map((r) => r.id)
      );

    if (updateError) throw updateError;

    // Decrement reserved count for normal orders only
    const normalOrders = expired.filter((r) => r.order_type === "normal");
    for (const res of normalOrders) {
      await supabaseAdmin.rpc("decrement_reserved", {
        p: JSON.stringify({ product_id: res.product_id }),
      });
    }

    console.log(`Successfully cleaned up ${expired.length} reservations`);
  } catch (error) {
    console.error("Error cleaning up expired reservations:", error);
  }
}

/**
 * Get product availability info
 */
export async function getProductAvailability(
  productId: string,
  shopId: string
) {
  const { data: product, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("shop_id", shopId)
    .single();

  if (error || !product) {
    throw new NotFoundError("Product not found");
  }

  const available =
    (product.quantity_total || 0) - (product.quantity_reserved || 0);

  return {
    product_id: productId,
    total: product.quantity_total || 0,
    reserved: product.quantity_reserved || 0,
    available: Math.max(0, available),
    preorder_enabled: product.preorder_enabled || false,
    preorder_estimate_days: product.preorder_estimate_days || 14,
  };
}
