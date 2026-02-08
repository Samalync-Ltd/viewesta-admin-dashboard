import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { LoginPage } from "./components/auth/LoginPage";
import { OverviewPage } from "./pages/OverviewPage";
import { MoviesPage } from "./pages/content/MoviesPage";
import { MovieFormPage } from "./pages/content/MovieFormPage";
import { GenresPage } from "./pages/content/GenresPage";
import { CategoriesPage } from "./pages/content/CategoriesPage";
import { FilmmakersPage } from "./pages/FilmmakersPage";
import { FilmmakerFormPage } from "./pages/FilmmakerFormPage";
import { UsersPage } from "./pages/UsersPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { MonetizationPage } from "./pages/MonetizationPage";
import { DownloadsPage } from "./pages/DownloadsPage";
import { RatingsPage } from "./pages/RatingsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { SettingsPage } from "./pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute permission="overview">
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <OverviewPage /> },
      {
        path: "content/movies",
        element: (
          <ProtectedRoute permission="content:movies">
            <MoviesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "content/movies/new",
        element: (
          <ProtectedRoute permission="content:movies">
            <MovieFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "content/movies/:id",
        element: (
          <ProtectedRoute permission="content:movies">
            <MovieFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "content/genres",
        element: (
          <ProtectedRoute permission="content:genres">
            <GenresPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "content/categories",
        element: (
          <ProtectedRoute permission="content:categories">
            <CategoriesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "filmmakers",
        element: (
          <ProtectedRoute permission="filmmakers">
            <FilmmakersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "filmmakers/new",
        element: (
          <ProtectedRoute permission="filmmakers">
            <FilmmakerFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "filmmakers/:id",
        element: (
          <ProtectedRoute permission="filmmakers">
            <FilmmakerFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "users",
        element: (
          <ProtectedRoute permission="users">
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "users/:id",
        element: (
          <ProtectedRoute permission="users">
            <UserDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "monetization",
        element: (
          <ProtectedRoute permission="monetization:plans">
            <MonetizationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "downloads",
        element: (
          <ProtectedRoute permission="downloads">
            <DownloadsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "ratings",
        element: (
          <ProtectedRoute permission="ratings">
            <RatingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "notifications",
        element: (
          <ProtectedRoute permission="notifications">
            <NotificationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "settings",
        element: (
          <ProtectedRoute permission="settings">
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
