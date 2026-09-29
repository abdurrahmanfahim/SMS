import { Button, Dialog } from "@sms/ui";
import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useT } from "../../shared/i18n";

/**
 * Help entry. It sits at the end of the header on every page (WCAG 3.2.6, consistent help) and
 * opens a dialog with help text and the way to the install guide.
 */
export function HelpButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        aria-haspopup="dialog"
        leadingIcon={<CircleHelp aria-hidden className="hidden h-5 w-5 sm:block" />}
        className="shrink-0 whitespace-nowrap px-3"
        onClick={() => setOpen(true)}
        data-testid="help-button"
      >
        {t("shell.help.button")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t("shell.help.title")}
        closeLabel={t("common.action.close")}
      >
        <p className="m-0">{t("shell.help.body")}</p>
        <Link
          to="/install"
          onClick={() => setOpen(false)}
          className="min-h-tap py-2 text-link underline"
        >
          {t("shell.help.install")}
        </Link>
      </Dialog>
    </>
  );
}
