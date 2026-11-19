import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { LandingPage } from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { TournamentCodePage } from "./pages/TournamentCodePage";
import { ProtectedRoute, SessionProvider } from "./components/auth/Session";
import {
  TournamentDashboard,
  TournamentOverview,
} from "./pages/TournamentDashboard";
import { ReportPage } from "./pages/Reports";
import { ScorecardsPage } from "./pages/ScorecardsPage";

const CalendarPage = lazy(() =>
  import("./pages/CalendarPage").then((module) => ({
    default: module.CalendarPage,
  })),
);
const AdminDashboard = lazy(() =>
  import("./pages/AdminDashboard").then((module) => ({
    default: module.AdminDashboard,
  })),
);
const CreateTournamentPage = lazy(() =>
  import("./pages/TournamentSettings").then((module) => ({
    default: module.CreateTournamentPage,
  })),
);
const TournamentSettings = lazy(() =>
  import("./pages/TournamentSettings").then((module) => ({
    default: module.TournamentSettings,
  })),
);
const TeamsPage = lazy(() =>
  import("./pages/Rosters").then((module) => ({ default: module.TeamsPage })),
);
const PlayersPage = lazy(() =>
  import("./pages/Rosters").then((module) => ({ default: module.PlayersPage })),
);
const CoursesPage = lazy(() =>
  import("./pages/CoursesPage").then((module) => ({
    default: module.CoursesPage,
  })),
);
const PublicTournamentPage = lazy(() =>
  import("./pages/PublicTournamentPage").then((module) => ({
    default: module.PublicTournamentPage,
  })),
);
const ScorecardScannerPage = lazy(() =>
  import("./pages/ScorecardScannerPage").then((module) => ({
    default: module.ScorecardScannerPage,
  })),
);
const ManualScorePage = lazy(() =>
  import("./pages/ManualScorePage").then((module) => ({
    default: module.ManualScorePage,
  })),
);
const ScoreVerificationPage = lazy(() =>
  import("./pages/ScoreVerificationPage").then((module) => ({
    default: module.ScoreVerificationPage,
  })),
);

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Suspense
          fallback={
            <main className="panel" role="status">
              Loading page…
            </main>
          }
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/signin"
              element={<AuthPage key="signin" mode="signin" />}
            />
            <Route
              path="/signup"
              element={<AuthPage key="signup" mode="signup" />}
            />
            <Route
              path="/forgot-password"
              element={<AuthPage key="forgot" mode="forgot" />}
            />
            <Route
              path="/reset-password"
              element={<AuthPage key="reset" mode="reset" />}
            />
            <Route path="/tournament-access" element={<TournamentCodePage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route
                path="/dashboard/tournaments/new"
                element={<CreateTournamentPage />}
              />
              <Route
                path="/dashboard/tournaments/:id"
                element={<TournamentDashboard />}
              >
                <Route index element={<TournamentOverview />} />
                <Route path="scorecards" element={<ScorecardsPage />} />
                <Route path="manual" element={<ManualScorePage />} />
                <Route path="scan" element={<ScorecardScannerPage />} />
                <Route
                  path="verify/:uploadId"
                  element={<ScoreVerificationPage />}
                />
                <Route path="teams" element={<TeamsPage />} />
                <Route path="players" element={<PlayersPage />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="leaderboard" element={<ReportPage />} />
                <Route path="analytics" element={<ReportPage analytics />} />
                <Route path="settings" element={<TournamentSettings />} />
              </Route>
            </Route>
            <Route
              path="/t/:code/:section?"
              element={<PublicTournamentPage />}
            />
            <Route
              path="*"
              element={
                <main className="panel narrow">
                  <h1>Page unavailable</h1>
                  <Link to="/">Back to Fairway</Link>
                </main>
              }
            />
          </Routes>
        </Suspense>
      </SessionProvider>
    </BrowserRouter>
  );
}
