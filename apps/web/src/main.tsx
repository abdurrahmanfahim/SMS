import { ToastProvider } from "@sms/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { features } from "./app/features";
import { createShellRoutes } from "./app/routes";
import { registerMessages, t } from "./shared/i18n";
import { RoleProvider } from "./shared/role";

import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

registerMessages("bn", features.translations.bn);
registerMessages("en", features.translations.en);

const router = createBrowserRouter(createShellRoutes());

createRoot(container).render(
  <StrictMode>
    <RoleProvider>
      <ToastProvider
        closeLabel={t("common.action.close")}
        viewportLabel={t("common.label.notifications")}
      >
        <RouterProvider router={router} />
      </ToastProvider>
    </RoleProvider>
  </StrictMode>,
);
