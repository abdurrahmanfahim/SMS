import { Button, useToast } from "@sms/ui";
import { Copy, MessageCircle, MessageSquare, Share2 } from "lucide-react";

import { useT } from "../../../shared/i18n";
import { copyToClipboard, shareFile, smsLink, whatsappLink } from "../../../shared/share";

export function ShareDemo() {
  const t = useT();
  const toast = useToast();
  const message = t("devkit.kit.shareMessage");
  const linkClass =
    "inline-flex min-h-tap items-center justify-center gap-2 rounded-md border border-line-strong bg-surface px-4 font-semibold text-content";
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        leadingIcon={<Share2 aria-hidden className="h-5 w-5" />}
        onClick={async () => {
          const blob = new Blob([message], { type: "text/plain" });
          const outcome = await shareFile(blob, {
            title: t("devkit.kit.shareTitle"),
            text: message,
          });
          if (outcome === "shared")
            toast({ message: t("devkit.kit.shareShared"), tone: "success" });
          if (outcome === "downloaded")
            toast({ message: t("devkit.kit.shareDownloaded"), tone: "info" });
        }}
      >
        {t("devkit.kit.shareFile")}
      </Button>
      <a
        className={linkClass}
        href={whatsappLink(message)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle aria-hidden className="h-5 w-5" />
        {t("devkit.kit.shareWhatsapp")}
      </a>
      <a className={linkClass} href={smsLink(message)}>
        <MessageSquare aria-hidden className="h-5 w-5" />
        {t("devkit.kit.shareSms")}
      </a>
      <Button
        variant="secondary"
        leadingIcon={<Copy aria-hidden className="h-5 w-5" />}
        onClick={async () =>
          toast(
            (await copyToClipboard(message))
              ? { message: t("devkit.kit.shareCopied"), tone: "success" }
              : { message: t("devkit.kit.shareCopyFailed"), tone: "danger" },
          )
        }
      >
        {t("devkit.kit.shareCopy")}
      </Button>
    </div>
  );
}
