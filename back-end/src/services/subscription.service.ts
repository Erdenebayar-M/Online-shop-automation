import { supabaseAdmin } from "../lib/supabase";
import { NotFoundError, ForbiddenError } from "../utils/errors";

export type SubscriptionChannel =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "messenger"
  | "website";

/**
 * Check if shop has active subscription for a channel
 */
export async function hasActiveSubscription(
  shopId: string,
  channel: SubscriptionChannel = "website"
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("shop_subscriptions")
    .select("*")
    .eq("shop_id", shopId)
    .eq("channel", channel)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .single();

  return !error && !!data;
}

/**
 * Get all active subscriptions for a shop
 */
export async function getActiveSubscriptions(shopId: string) {
  const { data, error } = await supabaseAdmin
    .from("shop_subscriptions")
    .select("*")
    .eq("shop_id", shopId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  if (error) throw error;
  return data || [];
}

/**
 * Require active subscription or throw error
 */
export async function requireActiveSubscription(
  shopId: string,
  channel: SubscriptionChannel = "website"
): Promise<void> {
  const isActive = await hasActiveSubscription(shopId, channel);

  if (!isActive) {
    throw new ForbiddenError(
      `Shop does not have an active ${channel} subscription`
    );
  }
}

/**
 * Create or renew subscription
 */
export async function createSubscription(
  shopId: string,
  channel: SubscriptionChannel,
  planType: "monthly" | "6months" | "yearly"
) {
  // Calculate expiry based on plan type
  const now = new Date();
  const expiresAt = new Date(now);

  switch (planType) {
    case "monthly":
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      break;
    case "6months":
      expiresAt.setMonth(expiresAt.getMonth() + 6);
      break;
    case "yearly":
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      break;
  }

  const { data, error } = await supabaseAdmin
    .from("shop_subscriptions")
    .insert([
      {
        shop_id: shopId,
        channel,
        plan_type: planType,
        status: "active",
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  shopId: string,
  channel: SubscriptionChannel
) {
  const { error } = await supabaseAdmin
    .from("shop_subscriptions")
    .update({ status: "cancelled" })
    .eq("shop_id", shopId)
    .eq("channel", channel)
    .eq("status", "active");

  if (error) throw error;
}

/**
 * Background job: Mark expired subscriptions
 */
export async function markExpiredSubscriptions() {
  const { error } = await supabaseAdmin
    .from("shop_subscriptions")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString());

  if (error) {
    console.error("Error marking expired subscriptions:", error);
  }
}
