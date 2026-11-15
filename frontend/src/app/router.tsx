import { createBrowserRouter, Navigate } from "react-router-dom";

import { RequireAuth } from "@/features/auth/RequireAuth";
import { RequireSurgeon } from "@/features/auth/RequireSurgeon";
import { NotFoundPage } from "@/features/shared/NotFoundPage";
import { FullPageLoader } from "@/features/shared/FullPageLoader";
import { RouteErrorPage } from "@/features/shared/RouteErrorPage";
import { AppLayout } from "@/features/shell/AppLayout";
import { DEMO_MODE } from "@/lib/demo";

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
  {
    path: "/welcome",
    HydrateFallback: FullPageLoader,
    lazy: async () => ({
      Component: (await import("@/features/auth/LandingPage")).LandingPage,
    }),
  },
  { path: "/login", element: <Navigate to="/welcome" replace /> },
  { path: "/register", element: <Navigate to="/welcome" replace /> },
  {
    path: "/styleguide",
    HydrateFallback: FullPageLoader,
    lazy: async () =>
      DEMO_MODE
        ? { Component: () => <Navigate to="/" replace /> }
        : {
            Component: (await import("@/features/styleguide/StyleguidePage")).StyleguidePage,
          },
  },
  {
    element: <RequireAuth />,
    HydrateFallback: FullPageLoader,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import("@/features/flight-deck/FlightDeckPage")).FlightDeckPage,
            }),
          },
          {
            path: "triage",
            lazy: async () => ({
              Component: (await import("@/features/triage/TriagePage")).TriagePage,
            }),
          },
          {
            path: "check-in",
            lazy: async () => ({
              Component: (await import("@/features/checkin/SystemsCheckPage")).SystemsCheckPage,
            }),
          },
          {
            path: "check-in/report/:checkinId",
            lazy: async () => ({
              Component: (await import("@/features/checkin/CheckinReportPage")).CheckinReportPage,
            }),
          },
          {
            path: "telemetry",
            lazy: async () => ({
              Component: (await import("@/features/telemetry/TelemetryPage")).TelemetryPage,
            }),
          },
          {
            path: "telemetry/domain/:domain",
            lazy: async () => ({
              Component: (await import("@/features/telemetry/DomainSummaryPage")).DomainSummaryPage,
            }),
          },
          {
            path: "telemetry/metric/:code",
            lazy: async () => ({
              Component: (await import("@/features/telemetry/MetricDetailPage")).MetricDetailPage,
            }),
          },
          {
            path: "training",
            lazy: async () => ({
              Component: (await import("@/features/training/TrainingPage")).TrainingPage,
            }),
          },
          {
            path: "quizzes",
            lazy: async () => ({
              Component: (await import("@/features/quizzes/QuizzesPage")).QuizzesPage,
            }),
          },
          {
            path: "quizzes/:slug",
            lazy: async () => ({
              Component: (await import("@/features/quizzes/QuizRunnerPage")).QuizRunnerPage,
            }),
          },
          {
            path: "log",
            lazy: async () => ({
              Component: (await import("@/features/log/MissionLogPage")).MissionLogPage,
            }),
          },
          {
            path: "library",
            lazy: async () => ({
              Component: (await import("@/features/library/LibraryPage")).LibraryPage,
            }),
          },
          {
            path: "library/:slug",
            lazy: async () => ({
              Component: (await import("@/features/library/ArticlePage")).ArticlePage,
            }),
          },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireSurgeon />,
        children: [
          {
            path: "surgeon",
            HydrateFallback: FullPageLoader,
            lazy: async () => ({
              Component: (await import("@/features/surgeon/SurgeonPage")).SurgeonPage,
            }),
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
