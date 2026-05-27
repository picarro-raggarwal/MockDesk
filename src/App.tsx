import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { ShareQueryRedirect } from "@/components/ShareQueryRedirect";
import { LiveMockSync } from "@/components/LiveMockSync";
import { AppShell } from "@/layouts/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { ApisPage } from "@/pages/ApisPage";
import { ApiEditorPage } from "@/pages/ApiEditorPage";
import { CollectionsPage } from "@/pages/CollectionsPage";
import { CollectionEditorPage } from "@/pages/CollectionEditorPage";
import { EnvironmentsPage } from "@/pages/EnvironmentsPage";
import { ImportExportPage } from "@/pages/ImportExportPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { PlaygroundPage } from "@/pages/PlaygroundPage";
import { WsLabPage } from "@/pages/WsLabPage";
import { GuidePage } from "@/pages/GuidePage";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: (
        <>
          <LiveMockSync />
          <ShareQueryRedirect />
          <AppShell />
        </>
      ),
      children: [
        { index: true, element: <DashboardPage /> },
        { path: "apis", element: <ApisPage /> },
        { path: "apis/:id", element: <ApiEditorPage /> },
        { path: "collections", element: <CollectionsPage /> },
        { path: "collections/:id", element: <CollectionEditorPage /> },
        { path: "environments", element: <EnvironmentsPage /> },
        { path: "ws-lab", element: <WsLabPage /> },
        { path: "import-export", element: <ImportExportPage /> },
        { path: "settings", element: <SettingsPage /> },
        { path: "playground", element: <PlaygroundPage /> },
        { path: "guide", element: <GuidePage /> },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);

export default function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
