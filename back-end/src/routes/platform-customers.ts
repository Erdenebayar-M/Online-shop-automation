// ==================== routes/customers.ts ====================
import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireUser, requireShopOwner } from "../lib/auth";
import { asyncHandler } from "../utils/errors";
import {
  validate,
  addCustomerSchema,
  deleteCustomerSchema,
} from "../utils/validation";

export const platformCustomersRouter = Router();

/**
 * POST /platform_customers/add
 * Body: { user_id, shop_id, role }
 * ONLY shop owner can add members
 */
platformCustomersRouter.post(
  "/add",
  asyncHandler(async (req: Request, res: Response) => {
    const caller = await requireUser(req, res);
    if (!caller) return;

    const validated = validate(addCustomerSchema, req.body);

    // CRITICAL: Verify caller is the owner of the shop
    const ownerCheck = await requireShopOwner(req, res, validated.shop_id);
    if (!ownerCheck) return;

    // Prevent owner from changing their own role
    if (validated.user_id === caller.id && validated.role !== "owner") {
      return res.status(400).json({
        error: "Owner cannot change their own role",
      });
    }

    // Check if the user_id exists in auth.users (optional validation)
    const { data: targetUser, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(validated.user_id);

    if (userError || !targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Upsert membership
    const { data, error } = await supabaseAdmin
      .from("platform_customers")
      .upsert(
        [
          {
            id: validated.user_id,
            shop_id: validated.shop_id,
            role: validated.role,
          },
        ],
        { onConflict: "id,shop_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return res.json({ membership: data });
  })
);

/**
 * DELETE /platform_customers/delete
 * Body: { user_id, shop_id }
 * ONLY shop owner can remove members
 */
platformCustomersRouter.delete(
  "/delete",
  asyncHandler(async (req: Request, res: Response) => {
    const caller = await requireUser(req, res);
    if (!caller) return;

    const validated = validate(deleteCustomerSchema, req.body);

    // CRITICAL: Verify caller is the owner of the shop
    const ownerCheck = await requireShopOwner(req, res, validated.shop_id);
    if (!ownerCheck) return;

    // Prevent owner from removing themselves
    if (validated.user_id === caller.id) {
      return res.status(400).json({
        error:
          "Owner cannot remove themselves. Transfer ownership first or delete the shop.",
      });
    }

    const { error } = await supabaseAdmin
      .from("platform_customers")
      .delete()
      .eq("id", validated.user_id)
      .eq("shop_id", validated.shop_id);

    if (error) throw error;

    return res.json({ success: true });
  })
);

/**
 * GET /platform_customers/list
 * Query: ?shop_id=xxx
 * List all members of a shop (requires membership)
 */
platformCustomersRouter.get(
  "/list",
  asyncHandler(async (req: Request, res: Response) => {
    const caller = await requireUser(req, res);
    if (!caller) return;

    const { shop_id } = req.query;

    if (!shop_id || typeof shop_id !== "string") {
      return res.status(400).json({ error: "shop_id is required" });
    }

    // Verify caller is member of the shop
    const { data: membership } = await supabaseAdmin
      .from("platform_customers")
      .select("*")
      .eq("id", caller.id)
      .eq("shop_id", shop_id)
      .single();

    if (!membership) {
      return res.status(403).json({ error: "Not a member of this shop" });
    }

    // Get all members
    const { data, error } = await supabaseAdmin
      .from("platform_customers")
      .select("id, role, created_at")
      .eq("shop_id", shop_id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Fetch user emails from auth.users
    const membersWithEmails = await Promise.all(
      data.map(async (member) => {
        const { data: user } = await supabaseAdmin.auth.admin.getUserById(
          member.id
        );
        return {
          ...member,
          email: user?.user?.email || null,
        };
      })
    );

    return res.json({ members: membersWithEmails });
  })
);

/**
 * PUT /platform_customers/update-role
 * Body: { user_id, shop_id, role }
 * ONLY shop owner can update roles
 */
platformCustomersRouter.put(
  "/update-role",
  asyncHandler(async (req: Request, res: Response) => {
    const caller = await requireUser(req, res);
    if (!caller) return;

    const validated = validate(addCustomerSchema, req.body);

    // CRITICAL: Verify caller is the owner of the shop
    const ownerCheck = await requireShopOwner(req, res, validated.shop_id);
    if (!ownerCheck) return;

    // Prevent owner from changing their own role
    if (validated.user_id === caller.id && validated.role !== "owner") {
      return res.status(400).json({
        error: "Owner cannot change their own role",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("platform_customers")
      .update({ role: validated.role })
      .eq("id", validated.user_id)
      .eq("shop_id", validated.shop_id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ membership: data });
  })
);
