"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
exports.requireAuth = requireAuth;
exports.assertShopOwner = assertShopOwner;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("./supabase");
const JWT_SECRET = process.env.JWT_SECRET || "secret";
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
async function requireAuth(req, res) {
    const header = (req.headers.authorization || "");
    const token = header.replace(/^Bearer\s+/, "");
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return null;
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        res.status(401).json({ error: "Invalid token" });
        return null;
    }
    return decoded;
}
async function assertShopOwner(decoded, shop_id) {
    if (decoded.role === "admin")
        return true;
    if (decoded.role === "owner" && decoded.shop_id === shop_id)
        return true;
    const { data, error } = await supabase_1.supabaseAdmin
        .from("shops")
        .select("owner_user_id")
        .eq("id", shop_id)
        .single();
    if (error || !data)
        return false;
    return data.owner_user_id === decoded.user_id;
}
//# sourceMappingURL=auth.js.map