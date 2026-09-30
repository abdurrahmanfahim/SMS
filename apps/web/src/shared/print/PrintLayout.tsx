import { Button } from "@sms/ui";
import { Printer } from "lucide-react";
import type { ReactNode } from "react";

import { useT } from "../i18n";

import { pageNumberCss } from "./pageNumberCss";
import "./print.css";

export interface SignatureSlot {
  /** Text under the line, e.g. "Class teacher" (translated). */
  label: string;
}

export interface PrintLayoutProps {
  /** Top of every page (institution name, logo, title). */
  header?: ReactNode;
  /** Bottom of every page. */
  footer?: ReactNode;
  /** Repeat the header and footer on every printed page. Default true. When false they print once. */
  repeatHeaderFooter?: boolean;
  /** Signature lines at the end of the content; they never split across pages. */
  signatures?: SignatureSlot[];
  /** Print "Page n / total" in the bottom margin (Chromium 131 and later). Default true. */
  pageNumbers?: boolean;
  /** Accessible name of the preview region. Default: "Print preview (A4)". */
  label?: string;
  children: ReactNode;
}

/**
 * A4 sheet for anything that gets printed or saved as PDF from the browser: marksheets, receipts,
 * lists. On screen it shows a real A4-wide preview that scrolls inside itself on phones; in print
 * it becomes plain pages. Use `PageBreak` and `AvoidBreak` inside the content.
 *
 * Phone browsers print poorly, so official documents are also produced as server PDFs (M0-S1).
 * This layout is for on-screen preview, desktop printing and simple lists.
 */
export function PrintLayout({
  header,
  footer,
  repeatHeaderFooter = true,
  signatures,
  pageNumbers = true,
  label,
  children,
}: PrintLayoutProps) {
  const t = useT();
  const body = (
    <>
      {children}
      {signatures && signatures.length > 0 ? <SignatureBlock slots={signatures} /> : null}
    </>
  );
  return (
    <div className="sms-print-preview" role="region" aria-label={label ?? t("print.preview.label")}>
      {pageNumbers ? <style>{pageNumberCss(t("print.page.number"))}</style> : null}
      <div className="sms-print-sheet" data-testid="print-sheet">
        <table className="sms-print-frame" role="presentation">
          {header && repeatHeaderFooter ? (
            <thead role="presentation">
              <tr role="presentation">
                <td role="presentation">{header}</td>
              </tr>
            </thead>
          ) : null}
          {footer && repeatHeaderFooter ? (
            <tfoot role="presentation">
              <tr role="presentation">
                <td role="presentation">{footer}</td>
              </tr>
            </tfoot>
          ) : null}
          <tbody role="presentation">
            <tr role="presentation">
              <td role="presentation">
                {header && !repeatHeaderFooter ? header : null}
                {body}
                {footer && !repeatHeaderFooter ? footer : null}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Row of signature lines with labels under them. */
export function SignatureBlock({ slots }: { slots: SignatureSlot[] }) {
  return (
    <div className="sms-signatures" data-testid="signatures">
      {slots.map((slot) => (
        <div key={slot.label} className="sms-signature">
          <div className="sms-signature-line">{slot.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Starts a new printed page here. Invisible on screen. */
export function PageBreak() {
  return <div className="sms-page-break" aria-hidden="true" data-testid="page-break" />;
}

/** Keeps its content together on one page (a student's block, a total row). */
export function AvoidBreak({ children }: { children: ReactNode }) {
  return <div className="sms-avoid-break">{children}</div>;
}

/** Shown only when printing. */
export function PrintOnly({ children }: { children: ReactNode }) {
  return <div className="sms-print-only">{children}</div>;
}

/** Hidden when printing (buttons, filters). */
export function NoPrint({ children }: { children: ReactNode }) {
  return <div className="sms-no-print">{children}</div>;
}

/** Opens the browser print dialog. Not shown on paper. */
export function PrintButton() {
  const t = useT();
  return (
    <span className="sms-no-print">
      <Button
        variant="secondary"
        leadingIcon={<Printer aria-hidden className="h-5 w-5" />}
        onClick={() => window.print()}
      >
        {t("print.action.print")}
      </Button>
    </span>
  );
}
