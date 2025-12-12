import { Request, Response } from "express";
import { supabaseAdmin } from "./supabase";

export type AuthUser = {
  id: string;
  email?: string | null;
};

export async function getUserFromHeader(
  req: Request
): Promise<AuthUser | null> {
  const header = (req.headers.authorization || "") as string;
  const token = header.replace(/^Bearer\s+/, "");
  if (!token) return null;

  // supabaseAdmin.auth.getUser expects a valid access token
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export async function requireUser(
  req: Request,
  res: Response
): Promise<AuthUser | null> {
  const u = await getUserFromHeader(req);
  if (!u) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return u;
}

/**
 * Check whether authUser is member (has a role) for the shop.
 * Returns the membership row or null.
 */
export async function getMembership(authUserId: string, shopId: string | null) {
  if (!shopId) return null;
  const { data, error } = await supabaseAdmin
    .from("platform_customers")
    .select("*")
    .eq("id", authUserId)
    .eq("shop_id", shopId)
    .limit(1)
    .single();

  if (error || !data) return null;
  return data; // contains role, shop_id, id
}

/**
 * Enforce role(s) for shop-scoped action. Returns membership row or responds 403.
 */
export async function requireRoleForShop(
  req: Request,
  res: Response,
  roles: string[] = [],
  shopId?: string
) {
  const user = await requireUser(req, res);
  if (!user) return null;
  const membership = await getMembership(
    user.id,
    shopId ?? (req.body.shop_id || req.query.shop_id)
  );
  if (!membership) {
    res.status(403).json({ error: "Not a member of this shop" });
    return null;
  }
  if (roles.length && !roles.includes(membership.role)) {
    res.status(403).json({ error: "Insufficient role" });
    return null;
  }
  return { user, membership };
}
