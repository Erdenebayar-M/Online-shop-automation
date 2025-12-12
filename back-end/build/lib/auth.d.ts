import { Request, Response } from "express";
export interface AuthPayload {
    user_id: string;
    role: string;
    shop_id?: string;
}
export declare function signToken(payload: AuthPayload): string;
export declare function verifyToken(token: string): AuthPayload | null;
export declare function requireAuth(req: Request, res: Response): Promise<AuthPayload | null>;
export declare function assertShopOwner(decoded: AuthPayload, shop_id: string): Promise<boolean>;
