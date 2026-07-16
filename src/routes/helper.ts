import jwt from "jsonwebtoken";

// This will be passed as middleware when accessing private content
export function getData(schema: any, req: any) {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!, (err: any, user: any) => {
    if (err) return res.sendStatus(403);

    req.user = user;
    next();
  });
}
