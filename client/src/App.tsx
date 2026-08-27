import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

const Landing = lazy(() => import("./pages/Landing"));
const DocsPortal = lazy(() => import("./pages/DocsPortal"));
const PlatformOverview = lazy(() => import("./pages/PlatformOverview"));
const StateEvolution = lazy(() => import("./pages/StateEvolution"));
const Rollouts = lazy(() => import("./pages/Rollouts"));
const Operations = lazy(() => import("./pages/Operations"));
const Evidence = lazy(() => import("./pages/Evidence"));
const MigrationTimeline = lazy(() => import("./pages/MigrationTimeline"));
const ReplayExplorer = lazy(() => import("./pages/ReplayExplorer"));
const VersionLab = lazy(() => import("./pages/VersionLab"));
const Integrations = lazy(() => import("./pages/Integrations"));
const InvestigationCase = lazy(() => import("./pages/InvestigationCase"));
const GettingStarted = lazy(() => import("./pages/GettingStarted"));
const PolicyStudio = lazy(() => import("./pages/PolicyStudio"));
const EvidenceGraph = lazy(() => import("./pages/EvidenceGraph"));

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Landing} />
      <Route path={"/app/docs"}><DashboardLayout><DocsPortal /></DashboardLayout></Route>
      <Route path={"/app/getting-started"}><DashboardLayout><GettingStarted /></DashboardLayout></Route>
      <Route path={"/app/policy-studio"}><DashboardLayout><PolicyStudio /></DashboardLayout></Route>
      <Route path={"/app/evidence-graph"}><DashboardLayout><EvidenceGraph /></DashboardLayout></Route>
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
          <Suspense fallback={<div className="min-h-screen bg-background" aria-label="Loading workspace" />}><Router /></Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
