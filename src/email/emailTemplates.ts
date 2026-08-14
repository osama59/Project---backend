/**
 * Fluenzy transactional email templates.
 *
 * The images must be available through a public HTTPS URL. For example:
 * https://api.example.com/public/email-assets
 */

export type EmailAssetOptions = {
  assetBaseUrl: string;
  supportEmail?: string;
  year?: number;
};

export type VerificationEmailOptions = EmailAssetOptions & {
  code: string | number;
};

export type TeacherApprovalEmailOptions = EmailAssetOptions & {
  firstName: string;
};

const escapeHtml = (value: string | number) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const normalizeAssetBase = (assetBaseUrl: string) => assetBaseUrl.replace(/\/$/, "");

const emailShell = (content: string) => `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Fluenzy</title>
    <style>
      body { margin: 0 !important; padding: 0 !important; }
      table { border-spacing: 0; border-collapse: collapse; }
      img { border: 0; display: block; outline: none; text-decoration: none; }
      @media only screen and (max-width: 520px) {
        .email-shell { width: 100% !important; }
        .email-card { border-radius: 28px !important; }
        .mobile-pad { padding-left: 24px !important; padding-right: 24px !important; }
        .code-cell { width: 42px !important; height: 48px !important; font-size: 23px !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#eef6ff;">
    ${content}
  </body>
</html>`;

const brandHeader = () => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 38px 0 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <div style="font-family: Georgia, 'Times New Roman', serif; font-size:64px; line-height:52px; font-style:italic; font-weight:700; color:#8a59df; letter-spacing:-12px; padding-left:12px;">F</div>
              <div style="font-family: Arial, Helvetica, sans-serif; font-size:32px; line-height:34px; font-weight:500; color:#5f43c9; letter-spacing:-1px; direction:ltr;">fluenzy</div>
              <div style="font-family: Arial, Helvetica, sans-serif; font-size:8px; line-height:12px; color:#6d637d; letter-spacing:0; direction:ltr;">Speak. Connect. Fluently.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

const footer = (supportEmail: string, year: number) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 26px 24px 34px; color:#66616f; font-family:Arial, Helvetica, sans-serif; text-align:center;">
        <div style="font-size:17px; line-height:25px;">إذا واجهت أي مشكلة،</div>
        <div style="font-size:16px; line-height:25px;">تواصل معنا على <a href="mailto:${escapeHtml(supportEmail)}" style="color:#9d79df; text-decoration:none; direction:ltr; unicode-bidi:embed;">${escapeHtml(supportEmail)}</a></div>
        <div style="font-size:14px; line-height:22px; margin-top:10px; color:#696374;">جميع الحقوق محفوظة لـ fluenzy ${escapeHtml(year)}</div>
      </td>
    </tr>
  </table>`;

const confirmationBadge = () => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
    <tr>
      <td align="center" valign="middle" width="68" height="68" style="width:68px; height:68px; border-radius:34px; background-color:#319954; border:5px solid #eaf4ed; color:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:43px; font-weight:700; line-height:58px; text-align:center;">✓</td>
    </tr>
  </table>`;

/**
 * Renders the Arabic email-verification message.
 * It automatically renders each digit of the current code. The backend currently
 * generates six digits, while the Figma mockup used a four-digit example.
 */
export function verificationEmailHtml({
  code,
  assetBaseUrl,
  supportEmail = "support@fluenzy.com",
  year = new Date().getFullYear(),
}: VerificationEmailOptions): string {
  const codeCells = escapeHtml(code)
    .split("")
    .map(
      (digit) => `<td class="code-cell" width="52" height="54" align="center" valign="middle" style="width:52px; height:54px; border-radius:10px; background-color:#efdfff; color:#5732bd; font-family:Arial, Helvetica, sans-serif; font-size:24px; font-weight:700; line-height:54px; text-align:center;">${digit}</td>`,
    )
    .join('<td width="10" style="width:10px; font-size:0; line-height:0;">&nbsp;</td>');

  const assets = normalizeAssetBase(assetBaseUrl);

  return emailShell(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background-color:#edf7ff; background-image:linear-gradient(145deg,#f7faff 0%,#f8efff 52%,#e6f5ff 100%);">
      <tr>
        <td align="center" style="padding: 0 16px;">
          <table class="email-shell" role="presentation" width="440" cellpadding="0" cellspacing="0" border="0" style="width:440px; max-width:440px;">
            <tr><td>${brandHeader()}</td></tr>
            <tr>
              <td class="email-card" style="background-color:#ffffff; border:1px solid #d4d3d9; border-radius:30px; box-shadow:0 12px 20px rgba(63,49,78,0.19); overflow:hidden;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td class="mobile-pad" align="center" style="padding: 34px 30px 28px;">
                      <img src="${assets}/verification-illustration.png" width="176" alt="تأكيد البريد الإلكتروني" style="width:176px; max-width:100%; height:auto; margin:0 auto 22px;" />
                      <div dir="rtl" style="font-family:Arial, Helvetica, sans-serif; font-size:27px; line-height:38px; color:#8d62de; font-weight:700; text-align:center;">مرحباً بك في <span dir="ltr">Fluenzy</span> 👋</div>
                      <div dir="rtl" style="margin-top:18px; font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:29px; color:#76717a; text-align:center;">شكراً لتسجيلك في تطبيقنا، يرجى استخدام رمز التحقق أدناه لتأكيد بريدك الإلكتروني</div>
                      <div dir="rtl" style="margin-top:23px; font-family:Arial, Helvetica, sans-serif; font-size:19px; line-height:28px; color:#8d62de; text-align:center;">رمز التحقق الخاص بك</div>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:16px auto 30px; direction:ltr;"><tr>${codeCells}</tr></table>
                      <div style="height:1px; line-height:1px; font-size:1px; background-color:#dfdde1;">&nbsp;</div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
                        <tr>
                          <td valign="middle" style="font-family:Arial, Helvetica, sans-serif; color:#56545a; text-align:right; padding-right:8px;">
                            <div dir="rtl" style="font-size:17px; font-weight:700; line-height:27px;">لم تطلب هذا الرمز؟</div>
                            <div dir="rtl" style="font-size:15px; line-height:24px; color:#76717a; margin-top:4px;">إذا لم تقم بإنشاء حساب في Fluenzy،<br />يمكنك تجاهل هذا البريد الإلكتروني بأمان</div>
                          </td>
                          <td width="78" valign="middle" style="width:78px;">${confirmationBadge()}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td>${footer(supportEmail, year)}</td></tr>
          </table>
        </td>
      </tr>
    </table>`);
}

/** Renders the Arabic teacher-application approval message. */
export function teacherApprovalEmailHtml({
  firstName,
  assetBaseUrl,
  supportEmail = "support@fluenzy.com",
  year = new Date().getFullYear(),
}: TeacherApprovalEmailOptions): string {
  const assets = normalizeAssetBase(assetBaseUrl);
  const safeName = escapeHtml(firstName);

  return emailShell(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background-color:#edf7ff; background-image:linear-gradient(145deg,#f7faff 0%,#f8efff 52%,#e6f5ff 100%);">
      <tr>
        <td align="center" style="padding: 0 16px;">
          <table class="email-shell" role="presentation" width="440" cellpadding="0" cellspacing="0" border="0" style="width:440px; max-width:440px;">
            <tr><td>${brandHeader()}</td></tr>
            <tr>
              <td class="email-card" style="background-color:#ffffff; border:1px solid #d4d3d9; border-radius:30px; box-shadow:0 12px 20px rgba(63,49,78,0.19); overflow:hidden;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td class="mobile-pad" align="center" style="padding: 0 30px 24px; position:relative;">
                      <img src="${assets}/celebration-confetti.png" width="330" alt="" style="width:330px; max-width:100%; height:auto; margin:16px auto -10px;" />
                      <img src="${assets}/approval-illustration.png" width="158" alt="تم قبول طلبك" style="width:158px; max-width:100%; height:auto; margin:0 auto 18px;" />
                      <div dir="rtl" style="font-family:Arial, Helvetica, sans-serif; font-size:30px; line-height:40px; color:#8d62de; font-weight:700; text-align:center;">تم قبول طلبك! 🎉</div>
                      <div dir="rtl" style="margin-top:18px; font-family:Arial, Helvetica, sans-serif; font-size:18px; line-height:28px; color:#6d6971; text-align:center;">مرحباً، ${safeName}.</div>
                      <div dir="rtl" style="margin-top:16px; font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:29px; color:#76717a; text-align:center;">يسعدنا إبلاغك بأنه تم قبول طلبك للانضمام كمدرس في Fluenzy<br />أهلاً بك في مجتمعنا التعليمي!</div>
                      <div style="height:1px; line-height:1px; font-size:1px; background-color:#dfdde1; margin-top:28px;">&nbsp;</div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
                        <tr>
                          <td valign="middle" style="font-family:Arial, Helvetica, sans-serif; color:#8d62de; text-align:right; padding-right:8px;">
                            <div dir="rtl" style="font-size:18px; line-height:29px; font-weight:700;">يمكنك الآن إنشاء ملفك التعريفي الكامل وبدء استقبال الطلاب وحجز الدروس</div>
                          </td>
                          <td width="78" valign="middle" style="width:78px;">${confirmationBadge()}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td>${footer(supportEmail, year)}</td></tr>
          </table>
        </td>
      </tr>
    </table>`);
}
