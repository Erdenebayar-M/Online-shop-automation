// ==================== services/audit.service.ts ====================
import { supabaseAdmin } from "../lib/supabase";
import { Request } from "express";

export type AuditAction =
  | "shop.create"
  | "shop.update"
  | "shop.delete"
  | "member.add"
  | "member.remove"
  | "member.update"
  | "product.create"
  | "product.update"
  | "product.delete"
  | "order.create"
  | "order.update"
  | "reservation.create"
  | "reservation.cancel";

export interface AuditLogData {
  action: AuditAction;
  userId: string;
  resourceType: string;
  resourceId: string;
  shopId?: string | undefined;
  metadata?: Record<string, any> | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

/**
 * Create audit log entry
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    await supabaseAdmin.from("audit_logs").insert([
      {
        action: data.action,
        user_id: data.userId,
        resource_type: data.resourceType,
        resource_id: data.resourceId,
        shop_id: data.shopId,
        metadata: data.metadata,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
      },
    ]);
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging shouldn't break the app
  }
}

/**
 * Helper to create audit log from Express request
 */
export async function auditLog(
  req: Request,
  action: AuditAction,
  userId: string,
  resourceType: string,
  resourceId: string,
  shopId?: string,
  metadata?: Record<string, any>
) {
  await createAuditLog({
    action,
    userId,
    resourceType,
    resourceId,
    shopId,
    metadata,
    ipAddress: (req.ip ||
      req.headers["x-forwarded-for"] ||
      "unknown") as string,
    userAgent: req.headers["user-agent"] || "unknown",
  });
}

/**
 * Get audit logs for a resource
 */
export async function getAuditLogs(
  resourceType: string,
  resourceId: string,
  limit: number = 50
) {
  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("*")
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get audit logs for a shop
 */
export async function getShopAuditLogs(shopId: string, limit: number = 100) {
  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
