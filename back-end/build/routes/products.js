"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsRouter = void 0;
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../lib/auth");
exports.productsRouter = (0, express_1.Router)();
exports.productsRouter.post("/add", async (req, res) => {
    try {
        const decoded = await (0, auth_1.requireAuth)(req, res);
        if (!decoded)
            return;
        const { shop_id, name } = req.body;
        if (!shop_id || !name)
            return res.status(400).json({ error: "Missing fields" });
        const ok = await (0, auth_1.assertShopOwner)(decoded, shop_id);
        if (!ok)
            return res.status(403).json({ error: "Permission denied" });
        const { data, error } = await supabase_1.supabaseAdmin
            .from("products")
            .insert([{ shop_id, name }])
            .select()
            .single();
        if (error)
            return res.status(400).json({ error: error.message });
        res.json({ success: true, product: data });
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        res.status(500).json({ error: error.message });
    }
});
exports.productsRouter.put("/update", async (req, res) => {
    try {
        const decoded = await (0, auth_1.requireAuth)(req, res);
        if (!decoded)
            return;
        const { shop_id, product_id, ...updates } = req.body;
        if (!shop_id || !product_id)
            return res.status(400).json({ error: "Missing fields" });
        const ok = await (0, auth_1.assertShopOwner)(decoded, shop_id);
        if (!ok)
            return res.status(403).json({ error: "Permission denied" });
        const { data, error } = await supabase_1.supabaseAdmin
            .from("products")
            .update(updates)
            .eq("id", product_id)
            .eq("shop_id", shop_id)
            .select()
            .single();
        if (error)
            return res.status(400).json({ error: error.message });
        res.json({ success: true, product: data });
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        res.status(500).json({ error: error.message });
    }
});
exports.productsRouter.delete("/delete", async (req, res) => {
    try {
        const decoded = await (0, auth_1.requireAuth)(req, res);
        if (!decoded)
            return;
        const { shop_id, product_id } = req.body;
        if (!shop_id || !product_id)
            return res.status(400).json({ error: "Missing fields" });
        const ok = await (0, auth_1.assertShopOwner)(decoded, shop_id);
        if (!ok)
            return res.status(403).json({ error: "Permission denied" });
        const { error } = await supabase_1.supabaseAdmin
            .from("products")
            .delete()
            .eq("id", product_id)
            .eq("shop_id", shop_id);
        if (error)
            return res.status(400).json({ error: error.message });
        res.json({ success: true });
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        res.status(500).json({ error: error.message });
    }
});
//# sourceMappingURL=products.js.map