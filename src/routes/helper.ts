import jwt from "jsonwebtoken";
import { Resend } from "resend";

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

export function getSecureSixDigit(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return 100000 + ((array[0] ?? 0) % 900000);
}

export function generateToken(user: any) {
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: "7d" },
  );
  return token;
}

export async function sendEmail(
  sender: string,
  reciever: string,
  subject: string,
  html_code: string,
) {
  const resend = new Resend(process.env.RESENED_API_KEY);
  await resend.emails.send({
    from: sender,
    to: reciever,
    subject: subject,
    html: html_code,
  });
}

/*

import * as Brevo from '@brevo/api';

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!);

export async function sendEmail(to: string, subject: string, html: string) {
  await apiInstance.sendTransacEmail({
    sender: { email: "noreply@fluenzy.com", name: "Fluenzy" },
    to: [{ email: to }],
    subject: subject,
    htmlContent: html,
  });
}



*/
