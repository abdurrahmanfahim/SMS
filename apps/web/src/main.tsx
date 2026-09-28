import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { createShellRoutes } from "./app/routes";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

const router = createBrowserRouter(createShellRoutes());

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
