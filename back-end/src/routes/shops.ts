import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireUser, getMembership } from "../lib/auth";
import { asyncHandler } from "../utils/errors";
import { validate, createShopSchema } from "../utils/validation";

export const shopsRouter = Router();

/**
 * POST /shops/create
 * Body: { name, facebook_page_id?, instagram_page_id? }
 * Auth required. The calling user becomes owner of the shop.
 */
shopsRouter.post(
  "/create",
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const validated = validate(createShopSchema, req.body);

    // Create shop (owner_user_id set to auth user)
    const { data: shop, error: shopErr } = await supabaseAdmin
      .from("shops")
      .insert([
        {
          name: validated.name,
          owner_user_id: user.id,
          facebook_page_id: validated.facebook_page_id || null,
          instagram_page_id: validated.instagram_page_id || null,
        },
      ])
      .select()
      .single();

    if (shopErr) throw shopErr;

    // Create membership row: user -> shop as owner
    const { error: memErr } = await supabaseAdmin
      .from("platform_customers")
      .insert([{ id: user.id, shop_id: shop.id, role: "owner" }]);

    if (memErr) {
      // Cleanup: delete created shop if membership fails
      await supabaseAdmin.from("shops").delete().eq("id", shop.id);
      throw memErr;
    }

    return res.json({ success: true, shop });
  })
);

/**
 * GET /shops/my-shops - list shops for the current user
 */
shopsRouter.get(
  "/my-shops",
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const { data, error } = await supabaseAdmin
      .from("platform_customers")
      .select(
        `
        shop_id, 
        role, 
        shops(
          id,
          name,
          facebook_page_id,
          instagram_page_id,
          created_at
        )
      `
      )
      .eq("id", user.id);

    if (error) throw error;

    return res.json({ shops: data });
  })
);

/**
 * GET /shops/:shopId - Get shop details
 */
shopsRouter.get(
  "/:shopId",
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const { shopId } = req.params;

    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    // Verify user is member of shop
    const membership = await getMembership(user.id, shopId);
    if (!membership) {
      return res.status(403).json({ error: "Not a member of this shop" });
    }

    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .single();

    if (error) throw error;

    return res.json({ shop });
  })
);

/**
 * PUT /shops/:shopId - Update shop details
 */
shopsRouter.put(
  "/:shopId",
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const { shopId } = req.params;

    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    // Only owner can update shop
    const membership = await getMembership(user.id, shopId);
    if (!membership || membership.role !== "owner") {
      return res
        .status(403)
        .json({ error: "Only shop owner can update shop details" });
    }

    const { name, facebook_page_id, instagram_page_id } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (facebook_page_id !== undefined)
      updates.facebook_page_id = facebook_page_id;
    if (instagram_page_id !== undefined)
      updates.instagram_page_id = instagram_page_id;

    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .update(updates)
      .eq("id", shopId)
      .select()
      .single();

    if (error) throw error;

    return res.json({ shop });
  })
);

/**
 * DELETE /shops/:shopId - Delete shop (owner only)
 */
shopsRouter.delete(
  "/:shopId",
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const { shopId } = req.params;

    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    // Only owner can delete shop
    const membership = await getMembership(user.id, shopId);
    if (!membership || membership.role !== "owner") {
      return res.status(403).json({ error: "Only shop owner can delete shop" });
    }

    // Delete shop (cascades to related tables)
    const { error } = await supabaseAdmin
      .from("shops")
      .delete()
      .eq("id", shopId);

    if (error) throw error;

    return res.json({ success: true });
  })
);
