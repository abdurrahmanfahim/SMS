import { bnToAscii } from "@sms/domain/src/digits";
import { Button, Input, Select, StickyActionBar, useToast } from "@sms/ui";
import { useState, type FormEvent } from "react";

import { useT } from "../../shared/i18n";

interface Errors {
  name?: string;
  phone?: string;
  className?: string;
}

/**
 * Sample form layout for feature tasks to copy: visible labels, inline validation that keeps what
 * was typed, numeric keypad, Bangla digits accepted, one clear primary action, toast on success.
 */
export function SampleForm() {
  const t = useT();
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [className, setClassName] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (name.trim() === "") next.name = t("shell.form.nameRequired");
    if (!/^01\d{9}$/.test(bnToAscii(phone).replace(/\s/g, "")))
      next.phone = t("shell.form.phoneInvalid");
    if (className === "") next.className = t("shell.form.classRequired");
    setErrors(next);
    if (Object.keys(next).length === 0)
      toast({ message: t("common.state.saved"), tone: "success" });
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-xl flex-col gap-4">
      <h1 className="m-0 text-2xl font-semibold">{t("shell.form.title")}</h1>
      <Input
        label={t("shell.form.name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        error={errors.name}
        errorPrefix={t("common.state.error")}
      />
      <Input
        label={t("shell.form.phone")}
        helperText={t("shell.form.phoneHelp")}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="tel"
        autoComplete="tel"
        error={errors.phone}
        errorPrefix={t("common.state.error")}
      />
      <Select
        label={t("shell.form.class")}
        placeholderOption={t("devkit.kit.selectPlaceholder")}
        value={className}
        onChange={(e) => setClassName(e.target.value)}
        options={[
          { value: "6", label: t("devkit.kit.class6") },
          { value: "7", label: t("devkit.kit.class7") },
        ]}
        error={errors.className}
        errorPrefix={t("common.state.error")}
      />
      <StickyActionBar ariaLabel={t("shell.form.actions")}>
        <Button type="submit">{t("common.action.save")}</Button>
      </StickyActionBar>
    </form>
  );
}
