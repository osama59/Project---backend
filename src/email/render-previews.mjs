import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { verificationEmailHtml, teacherApprovalEmailHtml } = require(
  "/home/ubuntu/fluenzy_email_templates/build/emailTemplates.js",
);

const previewDir = "/home/ubuntu/fluenzy_email_templates/previews";
const assetBaseUrl = "file:///home/ubuntu/fluenzy_email_templates/assets";

await mkdir(previewDir, { recursive: true });

await writeFile(
  `${previewDir}/verification-preview.html`,
  verificationEmailHtml({ code: 578123, assetBaseUrl, year: 2026 }),
);

await writeFile(
  `${previewDir}/teacher-approved-preview.html`,
  teacherApprovalEmailHtml({ firstName: "سليم", assetBaseUrl, year: 2026 }),
);
