import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Landing from "./pages/Landing";
import DocsPortal from "./pages/DocsPortal";
import PlatformOverview from "./pages/PlatformOverview";
import StateEvolution from "./pages/StateEvolution";
import Rollouts from "./pages/Rollouts";
import Operations from "./pages/Operations";
import Evidence from "./pages/Evidence";
import MigrationTimeline from "./pages/MigrationTimeline";
import ReplayExplorer from "./pages/ReplayExplorer";
import VersionLab from "./pages/VersionLab";
import Integrations from "./pages/Integrations";
import InvestigationCase from "./pages/InvestigationCase";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Landing} />
      <Route path={"/app/docs"}><DashboardLayout><DocsPortal /></DashboardLayout></Route>
      <Route path={"/app"}><DashboardLayout><PlatformOverview /></DashboardLayout></Route>
      <Route path={"/app/state"}><DashboardLayout><StateEvolution /></DashboardLayout></Route>
      <Route path={"/app/rollouts"}><DashboardLayout><Rollouts /></DashboardLayout></Route>
      <Route path={"/app/operations"}><DashboardLayout><Operations /></DashboardLayout></Route>
      <Route path={"/app/migration"}><DashboardLayout><MigrationTimeline /></DashboardLayout></Route>
      <Route path={"/app/replay"}><DashboardLayout><ReplayExplorer /></DashboardLayout></Route>
      <Route path={"/app/investigations"}><DashboardLayout><InvestigationCase /></DashboardLayout></Route>
      <Route path={"/app/versions"}><DashboardLayout><VersionLab /></DashboardLayout></Route>
      <Route path={"/app/evidence"}><DashboardLayout><Evidence /></DashboardLayout></Route>
      <Route path={"/app/integrations"}><DashboardLayout><Integrations /></DashboardLayout></Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
