"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MemberRegistrationQrActions({
  registrationUrl,
  qrDataUrl,
}: {
  registrationUrl: string;
  qrDataUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function downloadQr() {
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "gym-member-registration-qr.png";
    a.rel = "noopener";
    a.click();
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-2 sm:flex-row sm:justify-center">
      <Button
        type="button"
        variant="outline"
        className={cn("h-11 flex-1")}
        onClick={copyLink}
      >
        {copied ? "Copied" : "Copy link"}
      </Button>
      <Button type="button" variant="secondary" className={cn("h-11 flex-1")} onClick={downloadQr}>
        Download QR
      </Button>
    </div>
  );
}
