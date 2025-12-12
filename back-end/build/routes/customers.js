"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customersRouter = void 0;
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../lib/auth");
exports.customersRouter = (0, express_1.Router)();
exports.customersRouter.post("/add", async (req, res) => {
    try {
        const decoded = await (0, auth_1.requireAuth)(req, res);
        if (!decoded)
            return;
        if (decoded.role !== "admin")
            return res.status(403).json({ error: "Admin only" });
        const { name, email, role = "owner", shop_id = null, subscription_type = "monthly", subscription_expires_at = null, } = req.body;
        if (!name || !email)
            return res.status(400).json({ error: "Missing fields" });
        const { data, error } = await supabase_1.supabaseAdmin
            .from("platform_customers")
            .insert([
            {
                name,
                email,
                role,
                shop_id,
                subscription_type,
                subscription_expire_at: subscription_expires_at,
            },
        ])
            .select()
            .single();
        if (error)
            return res.status(400).json({ error: error.message });
        res.json({ success: true, customer: data });
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        res.status(500).json({ error: error.message });
    }
});
exports.customersRouter.delete("/delete", async (req, res) => {
    try {
        const decoded = await (0, auth_1.requireAuth)(req, res);
        if (!decoded)
            return;
        if (decoded.role !== "admin")
            return res.status(403).json({ error: "Admin only" });
        const { customer_id } = req.body;
        if (!customer_id)
            return res.status(400).json({ error: "Missing fields" });
        const { error } = await supabase_1.supabaseAdmin
            .from("platform_customers")
            .delete()
            .eq("id", customer_id);
        if (error)
            return res.status(400).json({ error: error.message });
        res.json({ success: true });
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        res.status(500).json({ error: error.message });
    }
});
//# sourceMappingURL=customers.js.map