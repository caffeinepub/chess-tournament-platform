import { Toaster } from "@/components/ui/sonner";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import AdminPage from "./pages/AdminPage";
import RegisterPage from "./pages/RegisterPage";
import ViewPage from "./pages/ViewPage";

// Root route
const rootRoute = createRootRoute();

// Index route — redirect to /admin
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
  component: () => null,
});

// Admin route
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

// Register route
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register/$id",
  component: RegisterPage,
});

// View route
const viewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/view/$id",
  component: ViewPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  adminRoute,
  registerRoute,
  viewRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "oklch(0.22 0.025 255)",
            border: "1px solid oklch(0.28 0.03 258)",
            color: "oklch(0.94 0.012 260)",
            fontFamily: "Space Grotesk, sans-serif",
          },
        }}
      />
    </>
  );
}
