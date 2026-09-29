import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { features } from "./app/features";
import { UiProviders } from "./app/Providers";
import { createShellRoutes } from "./app/routes";
import { registerMessages } from "./shared/i18n";
import { RoleProvider } from "./shared/role";

import "./app/index.css";

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
      <UiProviders>
        <RouterProvider router={router} />
      </UiProviders>
    </RoleProvider>
  </StrictMode>,
);
