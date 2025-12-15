// ==================== middleware/requestLogger.ts ====================
import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase";

export interface RequestLog {
  method: string;
  path: string;
  ip: string;
  user_agent: string;
  user_id?: string | undefined;
  status_code?: number | undefined;
  response_time?: number | undefined;
  error?: string | undefined;
}

/**
 * Log all requests to database
 */
export async function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

  // Get user if authenticated
  const authHeader = req.headers.authorization;
  let userId: string | undefined;

  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/, "");
    const { data } = await supabaseAdmin.auth.getUser(token);
    userId = data?.user?.id;
  }

  // Capture response
  const originalSend = res.send;
  let responseBody: any;

  res.send = function (data: any) {
    responseBody = data;
    return originalSend.call(this, data);
  };

  // Log after response
  res.on("finish", async () => {
    const responseTime = Date.now() - startTime;

    const logData: RequestLog = {
      method: req.method,
      path: req.path,
      ip: (req.ip || req.headers["x-forwarded-for"] || "unknown") as string,
      user_agent: req.headers["user-agent"] || "unknown",
      user_id: userId,
      status_code: res.statusCode,
      response_time: responseTime,
    };

    // Log errors separately
    if (res.statusCode >= 400) {
      logData.error = responseBody?.error || "Unknown error";
    }

    // Save to database (async, don't wait)
    saveRequestLog(logData).catch((err) =>
      console.error("Failed to save request log:", err)
    );
  });

  next();
}

async function saveRequestLog(log: RequestLog) {
  await supabaseAdmin.from("request_logs").insert([
    {
      method: log.method,
      path: log.path,
      ip_address: log.ip,
      user_agent: log.user_agent,
      user_id: log.user_id,
      status_code: log.status_code,
      response_time_ms: log.response_time,
      error_message: log.error,
    },
  ]);
}
