import { createBrowserRouter } from "react-router";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";
import QuestPage from "./pages/QuestPage";
import SystemFlowPage from "./pages/SystemFlowPage";

export const router = createBrowserRouter([
  { path: "/", Component: LoginPage },
  { path: "/dashboard", Component: DashboardPage },
  { path: "/flow", Component: SystemFlowPage },
  { path: "/history/:date", Component: HistoryPage },
  { path: "/quest", Component: QuestPage },
]);
