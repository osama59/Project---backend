# Fluenzy Email Templates

This package contains the two Arabic HTML emails reconstructed from the supplied designs: the email-verification message and the teacher-application approval message. The production-ready Bun/TypeScript functions are in `emailTemplates.ts`; the two `.html` files are simple copy-friendly static equivalents.

The template functions need a public HTTPS asset directory. Upload the three files in `assets/` to your backend's public storage and pass that URL through `assetBaseUrl`. For example, if the final URLs start with `https://api.example.com/email-assets`, use that address as `assetBaseUrl`.

```ts
import { verificationEmailHtml, teacherApprovalEmailHtml } from "./emailTemplates";

const assetBaseUrl = process.env.EMAIL_ASSET_BASE_URL!;

await sendEmail(
  "Fluenzy <noreply@your-domain.com>",
  user.email,
  "رمز التحقق الخاص بك في Fluenzy",
  verificationEmailHtml({ code: verifyCode, assetBaseUrl }),
);

await sendEmail(
  "Fluenzy <noreply@your-domain.com>",
  user.email,
  "تم قبول طلبك في Fluenzy!",
  teacherApprovalEmailHtml({ firstName: user.firstName, assetBaseUrl }),
);
```

The existing backend produces a six-digit verification code. The function therefore displays every digit supplied to it. The Figma mockup uses a four-digit sample, so a four-digit code will visually match that row exactly; a real six-digit code remains valid and visible instead of being truncated.
