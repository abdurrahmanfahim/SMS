import { Button } from "@sms/ui";

import { useT } from "../../shared/i18n";
import { useInstallPrompt } from "../../shared/install";

function Steps({ platform }: { platform: "android" | "iphone" }) {
  const t = useT();
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-line p-4">
      <h2 className="m-0 text-xl font-semibold">{t(`install.guide.${platform}.title`)}</h2>
      <ol className="m-0 flex list-decimal flex-col gap-2 pl-6">
        {(["step1", "step2", "step3", "step4"] as const).map((step) => (
          <li key={step}>{t(`install.guide.${platform}.${step}`)}</li>
        ))}
      </ol>
    </section>
  );
}

/** Bangla install guide for Android and iPhone, plus the native prompt where available. */
export function InstallGuide() {
  const t = useT();
  const { canInstall, install } = useInstallPrompt();
  return (
    <div className="flex max-w-2xl flex-col gap-4" data-testid="install-guide">
      <h1 className="m-0 text-2xl font-semibold">{t("install.guide.title")}</h1>
      <p className="m-0">{t("install.guide.intro")}</p>
      {canInstall ? (
        <Button onClick={() => void install()}>{t("install.guide.installNow")}</Button>
      ) : null}
      <Steps platform="android" />
      <Steps platform="iphone" />
    </div>
  );
}
