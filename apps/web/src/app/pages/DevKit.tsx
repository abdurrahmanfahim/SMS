import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Sheet,
  Skeleton,
  useToast,
} from "@sms/ui";
import { CalendarX, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";

import { useT } from "../../shared/i18n";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** Dev-only page (/dev/kit) that shows every @sms/ui component in its main states. */
export function DevKit() {
  const t = useT();
  const toast = useToast();
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="m-0 text-2xl font-semibold">{t("devkit.kit.title")}</h1>

      <Section title={t("devkit.kit.buttons")}>
        <div className="flex flex-wrap gap-2">
          <Button>{t("devkit.kit.primary")}</Button>
          <Button variant="secondary">{t("devkit.kit.secondary")}</Button>
          <Button variant="destructive">{t("devkit.kit.destructive")}</Button>
          <Button loading>{t("devkit.kit.loading")}</Button>
          <Button disabled>{t("devkit.kit.disabled")}</Button>
        </div>
      </Section>

      <Section title={t("devkit.kit.input")}>
        <Input
          label={t("devkit.kit.inputLabel")}
          helperText={t("devkit.kit.inputHelp")}
          inputMode="tel"
        />
        <Input
          label={t("devkit.kit.inputLabel")}
          error={t("devkit.kit.inputError")}
          errorPrefix={t("common.state.error")}
          inputMode="tel"
        />
      </Section>

      <Section title={t("devkit.kit.select")}>
        <Select
          label={t("devkit.kit.selectLabel")}
          placeholderOption={t("devkit.kit.selectPlaceholder")}
          options={[
            { value: "6", label: t("devkit.kit.class6") },
            { value: "7", label: t("devkit.kit.class7") },
          ]}
        />
      </Section>

      <Section title={t("devkit.kit.badges")}>
        <div className="flex flex-wrap gap-2">
          <Badge tone="success">{t("devkit.kit.present")}</Badge>
          <Badge tone="danger">{t("devkit.kit.absent")}</Badge>
          <Badge tone="info">{t("devkit.kit.leave")}</Badge>
          <Badge tone="warning">{t("devkit.kit.late")}</Badge>
        </div>
      </Section>

      <Section title={t("devkit.kit.card")}>
        <Card
          title={t("devkit.kit.cardTitle")}
          meta={[t("devkit.kit.cardMeta")]}
          trailing={<Badge tone="success">{t("devkit.kit.present")}</Badge>}
        />
      </Section>

      <Section title={t("devkit.kit.skeleton")}>
        <Skeleton label={t("common.state.loading")} lines={3} />
      </Section>

      <Section title={t("devkit.kit.empty")}>
        <EmptyState
          icon={<CalendarX className="h-8 w-8" />}
          title={t("devkit.kit.emptyTitle")}
          description={t("devkit.kit.emptyDesc")}
          action={
            <Button leadingIcon={<Plus aria-hidden className="h-4 w-4" />}>
              {t("devkit.kit.emptyAction")}
            </Button>
          }
        />
      </Section>

      <Section title={t("devkit.kit.error")}>
        <ErrorState
          title={t("devkit.kit.errorTitle")}
          description={t("devkit.kit.errorDesc")}
          action={<Button variant="secondary">{t("devkit.kit.errorAction")}</Button>}
        />
      </Section>

      <Section title={t("devkit.kit.overlays")}>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setDialog(true)}>
            {t("devkit.kit.openDialog")}
          </Button>
          <Button variant="secondary" onClick={() => setSheet(true)}>
            {t("devkit.kit.openSheet")}
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(true)}>
            {t("devkit.kit.openConfirm")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast({ message: t("common.state.saved"), tone: "success" })}
          >
            {t("devkit.kit.toast")}
          </Button>
        </div>
      </Section>

      <Dialog
        open={dialog}
        onOpenChange={setDialog}
        title={t("devkit.kit.openDialog")}
        closeLabel={t("common.action.close")}
      >
        <p className="m-0">{t("devkit.kit.dialogBody")}</p>
      </Dialog>
      <Sheet
        open={sheet}
        onOpenChange={setSheet}
        title={t("devkit.kit.openSheet")}
        closeLabel={t("common.action.close")}
      >
        <p className="m-0">{t("devkit.kit.dialogBody")}</p>
      </Sheet>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("devkit.kit.confirmTitle")}
        description={t("devkit.kit.confirmDesc")}
        confirmLabel={t("common.action.confirm")}
        cancelLabel={t("common.action.cancel")}
        onConfirm={() => setConfirm(false)}
        destructive
      />
    </div>
  );
}
