import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AuthLayout } from '../components/layout/AuthLayout';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { RoleGuard } from '../components/layout/RoleGuard';
import { useAuth } from '../hooks/useAuth';
import { ADMIN_ROLES, APPROVER_ROLES, FINANCE_ROLES, REQUESTER_ROLES } from '../utils/constants';
import { LoginPage } from '../pages/auth/LoginPage';
import { RoleSelectionPage } from '../pages/auth/RoleSelectionPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { RequestAccountPage } from '../pages/auth/RequestAccountPage';
import { RequesterDashboardPage } from '../pages/requester/RequesterDashboardPage';
import { NewRequestPage } from '../pages/requester/NewRequestPage';
import { MyRequestsPage } from '../pages/requester/MyRequestsPage';
import { RequestDetailsPage } from '../pages/requester/RequestDetailsPage';
import { RespondToClarificationPage } from '../pages/requester/RespondToClarificationPage';
import { ApproverDashboardPage } from '../pages/approver/ApproverDashboardPage';
import { PendingRequestsPage } from '../pages/approver/PendingRequestsPage';
import { ReviewRequestPage } from '../pages/approver/ReviewRequestPage';
import { ApprovalHistoryPage } from '../pages/approver/ApprovalHistoryPage';
import { FinanceDashboardPage } from '../pages/finance/FinanceDashboardPage';
import { PendingPaymentsPage } from '../pages/finance/PendingPaymentsPage';
import { PaymentReviewPage } from '../pages/finance/PaymentReviewPage';
import { PaymentHistoryPage } from '../pages/finance/PaymentHistoryPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { UserManagementPage } from '../pages/admin/UserManagementPage';
import { RoleManagementPage } from '../pages/admin/RoleManagementPage';
import { CreateUserPage } from '../pages/admin/CreateUserPage';
import { EditUserPage } from '../pages/admin/EditUserPage';
import { RoleAssignmentPage } from '../pages/admin/RoleAssignmentPage';
import { ApprovalRulesPage } from '../pages/admin/ApprovalRulesPage';
import { CreateApprovalRulePage } from '../pages/admin/CreateApprovalRulePage';
import { EditApprovalRulePage } from '../pages/admin/EditApprovalRulePage';
import { ReportsPage } from '../pages/admin/ReportsPage';
import { ProfilePage } from '../pages/shared/ProfilePage';
import { NotificationsPage } from '../pages/shared/NotificationsPage';
import { NotificationDetailsPage } from '../pages/shared/NotificationDetailsPage';
import { UnauthorizedPage } from '../pages/shared/UnauthorizedPage';
import { NotFoundPage } from '../pages/shared/NotFoundPage';

function DashboardRouter() {
  const { user } = useAuth();
  const role = user?.activeRole;
  if (!role) return <Navigate to="/auth/select-role" replace />;
  if (ADMIN_ROLES.includes(role)) return <AdminDashboardPage />;
  if (FINANCE_ROLES.includes(role)) return <FinanceDashboardPage />;
  if (APPROVER_ROLES.includes(role)) return <ApproverDashboardPage />;
  if (REQUESTER_ROLES.includes(role)) return <RequesterDashboardPage />;
  return <UnauthorizedPage />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthLayout />}>
        <Route index element={<Navigate to="/auth/login" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="select-role" element={<RoleSelectionPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="request-account" element={<RequestAccountPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardRouter />} />
          <Route path="requests/:id" element={<RequestDetailsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="notifications/:id" element={<NotificationDetailsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="unauthorized" element={<UnauthorizedPage />} />

          <Route element={<RoleGuard roles={REQUESTER_ROLES} />}>
            <Route path="requests/new" element={<NewRequestPage />} />
            <Route path="requests/my" element={<MyRequestsPage />} />
            <Route path="requests/:id/respond-clarification" element={<RespondToClarificationPage />} />
          </Route>

          <Route element={<RoleGuard roles={APPROVER_ROLES} />}>
            <Route path="approvals/pending" element={<PendingRequestsPage />} />
            <Route path="approvals/review/:id" element={<ReviewRequestPage />} />
            <Route path="approvals/history" element={<ApprovalHistoryPage />} />
          </Route>

          <Route element={<RoleGuard roles={FINANCE_ROLES} />}>
            <Route path="finance/pending-payments" element={<PendingPaymentsPage />} />
            <Route path="finance/review/:id" element={<PaymentReviewPage />} />
            <Route path="finance/payment-history" element={<PaymentHistoryPage />} />
          </Route>

          <Route element={<RoleGuard roles={ADMIN_ROLES} />}>
            <Route path="admin/users" element={<UserManagementPage />} />
            <Route path="admin/roles" element={<RoleManagementPage />} />
            <Route path="admin/users/create" element={<CreateUserPage />} />
            <Route path="admin/users/:id/edit" element={<EditUserPage />} />
            <Route path="admin/role-assignment" element={<RoleAssignmentPage />} />
            <Route path="admin/approval-rules" element={<ApprovalRulesPage />} />
            <Route path="admin/approval-rules/create" element={<CreateApprovalRulePage />} />
            <Route path="admin/approval-rules/:id/edit" element={<EditApprovalRulePage />} />
            <Route path="admin/reports" element={<ReportsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
