import { lazy, Suspense, type ComponentType } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Loading } from "@/shared/ui/Loading";
import { RequireRole } from "./RequireRole";

function page<T extends Record<string, ComponentType>>(load: () => Promise<T>, name: keyof T) {
  return lazy(async () => ({ default: (await load())[name] }));
}

const LoginPage = page(() => import("@/pages/LoginPage/LoginPage"), "LoginPage");
const ForgotPasswordPage = page(() => import("@/pages/ForgotPasswordPage/ForgotPasswordPage"), "ForgotPasswordPage");
const ResetPasswordPage = page(() => import("@/pages/ResetPasswordPage/ResetPasswordPage"), "ResetPasswordPage");
const VerifyEmailPage = page(() => import("@/pages/VerifyEmailPage/VerifyEmailPage"), "VerifyEmailPage");
const RegisterPage = page(() => import("@/pages/RegisterPage/RegisterPage"), "RegisterPage");
const ForbiddenPage = page(() => import("@/pages/ForbiddenPage/ForbiddenPage"), "ForbiddenPage");
const NotFoundPage = page(() => import("@/pages/NotFoundPage/NotFoundPage"), "NotFoundPage");
const TestsPage = page(() => import("@/pages/TestsPage/TestsPage"), "TestsPage");
const TestBuilderPage = page(() => import("@/pages/TestBuilderPage/TestBuilderPage"), "TestBuilderPage");
const TestSettingsPage = page(() => import("@/pages/TestSettingsPage/TestSettingsPage"), "TestSettingsPage");
const PreviewPage = page(() => import("@/pages/PreviewPage/PreviewPage"), "PreviewPage");
const MediaPage = page(() => import("@/pages/MediaPage/MediaPage"), "MediaPage");
const ResultsPage = page(() => import("@/pages/ResultsPage/ResultsPage"), "ResultsPage");
const ProfilePage = page(() => import("@/pages/ProfilePage/ProfilePage"), "ProfilePage");
const AdminUsersPage = page(() => import("@/pages/AdminUsersPage/AdminUsersPage"), "AdminUsersPage");
const AdminTestsPage = page(() => import("@/pages/AdminTestsPage/AdminTestsPage"), "AdminTestsPage");
const AdminAuditPage = page(() => import("@/pages/AdminAuditPage/AdminAuditPage"), "AdminAuditPage");
const AdminSettingsPage = page(() => import("@/pages/AdminSettingsPage/AdminSettingsPage"), "AdminSettingsPage");const TakeTestPage = page(() => import("@/pages/TakeTestPage/TakeTestPage"), "TakeTestPage");
const AttemptResultPage = page(() => import("@/pages/AttemptResultPage/AttemptResultPage"), "AttemptResultPage");

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading fullPage />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/:secret" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="/t/:publicToken" element={<TakeTestPage />} />
          <Route path="/attempt/:attemptToken/result" element={<AttemptResultPage />} />
          <Route element={<RequireRole role="TEACHER" />}>
            <Route path="/teacher" element={<Navigate to="/teacher/tests" replace />} />
            <Route path="/teacher/tests" element={<TestsPage />} />
            <Route path="/teacher/media" element={<MediaPage />} />
            <Route path="/teacher/results/:attemptId?" element={<ResultsPage />} />
            <Route path="/teacher/settings" element={<ProfilePage />} />
            <Route path="/teacher/templates/:templateId" element={<TemplateRedirect />} />
          </Route>
          <Route element={<RequireRole role="TEACHER" bare />}>
            <Route path="/teacher/tests/:testId" element={<TestBuilderPage />} />
            <Route path="/teacher/tests/:testId/settings" element={<TestSettingsPage />} />
            <Route path="/teacher/tests/:testId/preview" element={<PreviewPage />} />
          </Route>
          <Route element={<RequireRole role="ADMIN" />}>
            <Route path="/admin" element={<Navigate to="/admin/teachers" replace />} />
            <Route path="/admin/teachers" element={<AdminUsersPage />} />
            <Route path="/admin/tests" element={<AdminTestsPage />} />
            <Route path="/admin/audit" element={<AdminAuditPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />            <Route path="/admin/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function TemplateRedirect() {
  const { templateId = "" } = useParams();
  return <Navigate to={`/teacher/settings?section=template&id=${templateId}`} replace />;
}
