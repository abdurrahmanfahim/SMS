import { Button, ErrorState } from "@sms/ui";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { useT } from "../../shared/i18n";

function Fallback({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <ErrorState
      title={t("shell.error.title")}
      description={t("shell.error.description")}
      action={<Button onClick={onRetry}>{t("shell.error.retry")}</Button>}
    />
  );
}

interface Props {
  children: ReactNode;
  /** When this value changes (for example the current path) a shown error is cleared. */
  resetKey?: string;
}

/**
 * Catches render errors below it and shows the shared error pattern (what happened, what to do
 * next, no codes for users). Details go to the console for developers, never to the screen.
 */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  override componentDidUpdate(previous: Props) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  override render() {
    if (this.state.failed) return <Fallback onRetry={() => this.setState({ failed: false })} />;
    return this.props.children;
  }
}
