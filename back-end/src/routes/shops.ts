import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireUser, getMembership } from "../lib/auth";

export const shopsRouter = Router();

/**
 * POST /shops/create
 * Body: { name, facebook_page_id?, instagram_page_id? }
 * Auth required (client must pass access token). The calling user becomes owner of the shop.
 */
shopsRouter.post("/create", async (req: Request, res: Response) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const {
      name,
      facebook_page_id = null,
      instagram_page_id = null,
      subscription_type = null,
      subscription_expire_at = null,
    } = req.body;
    if (!name) return res.status(400).json({ error: "Missing name" });

    // create shop (owner_user_id set to auth user)
    const { data: shop, error: shopErr } = await supabaseAdmin
      .from("shops")
      .insert([
        {
          name,
          owner_user_id: user.id,
          facebook_page_id,
          instagram_page_id,
          subscription_type,
          subscription_expire_at,
        },
      ])
      .select()
      .single();

    if (shopErr) throw shopErr;

    // create membership row: user -> shop as owner
    const { error: memErr } = await supabaseAdmin
      .from("platform_customers")
      .insert([{ id: user.id, shop_id: shop.id, role: "owner" }]);

    if (memErr) {
      // cleanup: delete created shop if membership fails
      await supabaseAdmin.from("shops").delete().eq("id", shop.id);
      throw memErr;
    }

    return res.json({ success: true, shop });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error("Unknown error");
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

/**
 * GET /shops/my-shops - list shops for the current user
 */
shopsRouter.get("/my-shops", async (req: Request, res: Response) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const { data, error } = await supabaseAdmin
      .from("platform_customers")
      .select(
        "shop_id, role, shops(name,facebook_page_id,instagram_page_id,subscription_type,subscription_expire_at)"
      )
      .eq("id", user.id);

    if (error) throw error;
    return res.json({ shops: data });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error("Unknown error");
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});
