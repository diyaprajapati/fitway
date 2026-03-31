import QRCode from "qrcode";

import { MemberRegistrationQrActions } from "@/components/dashboard/member-registration-qr-actions";
import { getPublicSiteUrl } from "@/lib/site-url";

export async function MemberRegistrationQrSection({ gymId }: { gymId: string }) {
  const base = await getPublicSiteUrl();
  const registrationUrl = `${base}/gym/${gymId}/register`;
  const qrDataUrl = await QRCode.toDataURL(registrationUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 240,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">Member registration QR</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Scan to open the public join form. The link stays the same; we do not store the image in the database.
      </p>
      <div className="mt-4 flex flex-col items-center gap-4">
        <img src={qrDataUrl} alt="" width={240} height={240} className="rounded-xl bg-white p-2 shadow-sm" />
        <MemberRegistrationQrActions registrationUrl={registrationUrl} qrDataUrl={qrDataUrl} />
      </div>
    </section>
  );
}
