import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppErrorBoundary, AuthLoadingScreen } from './components/AppStatusScreens';
import { ProtectedRoute } from './components/ProtectedRoute';
import { EmployeeOnboardingRoute } from './components/EmployeeOnboardingRoute';
import LoginPage from './pages/LoginPage';
import GoogleAuthCallbackPage from './pages/GoogleAuthCallbackPage';

const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage'));
const AdminAccountingPage = lazy(() => import('./pages/AdminAccountingPage'));
const AdminPerformancePage = lazy(() => import('./pages/AdminPerformancePage'));
const AdminStaffPage = lazy(() => import('./pages/AdminStaffPage'));
const AdminSchedulesPage = lazy(() => import('./pages/AdminSchedulesPage'));
const AdminRegionalSchedulingPage = lazy(() => import('./pages/AdminRegionalSchedulingPage'));
const AdminLeaveCalendarPage = lazy(() => import('./pages/AdminLeaveCalendarPage'));
const AdminScheduleDayPage = lazy(() => import('./pages/AdminScheduleDayPage'));
const AdminProjectsPage = lazy(() => import('./pages/AdminProjectsPage'));
const EmergencyMaintenancePage = lazy(() => import('./pages/EmergencyMaintenancePage'));
const PhoneLookupPage = lazy(() => import('./pages/PhoneLookupPage'));
const MaintenanceRecordsPage = lazy(() => import('./pages/MaintenanceRecordsPage'));
const MailTrackingPage = lazy(() => import('./pages/MailTrackingPage'));
const RemittanceTrackingPage = lazy(() => import('./pages/RemittanceTrackingPage'));
const EmployeeTodayTasksPage = lazy(() => import('./pages/EmployeeTodayTasksPage'));
const EmployeeCalendarPage = lazy(() => import('./pages/EmployeeCalendarPage'));
const EmployeeDailyReportPage = lazy(() => import('./pages/EmployeeDailyReportPage'));
const EmployeeReportHistoryPage = lazy(() => import('./pages/EmployeeReportHistoryPage'));
const EmployeeMonthlySummaryPage = lazy(() => import('./pages/EmployeeMonthlySummaryPage'));
const EmployeeMaintenanceReportPage = lazy(() => import('./pages/EmployeeMaintenanceReportPage'));
const EmployeeLeavePage = lazy(() => import('./pages/EmployeeLeavePage'));
const EmployeeSettingsPage = lazy(() => import('./pages/EmployeeSettingsPage'));
const EmployeeOnboardingPage = lazy(() => import('./pages/EmployeeOnboardingPage'));
const EmployeeRulesPage = lazy(() => import('./pages/EmployeeRulesPage'));

function RouteLoadingScreen() {
  return <AuthLoadingScreen message="載入頁面中..." />;
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/spa'}>
          <Suspense fallback={<RouteLoadingScreen />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login/google-callback" element={<GoogleAuthCallbackPage />} />

              <Route element={<ProtectedRoute permission="reports.view" />}>
                <Route path="/admin" element={<AdminReportsPage />} />
                <Route path="/finance" element={<AdminReportsPage />} />
              </Route>

              <Route element={<ProtectedRoute permission="accounting.manage" />}>
                <Route path="/admin/accounting" element={<AdminAccountingPage />} />
                <Route path="/admin/performance" element={<AdminPerformancePage />} />
              </Route>

              <Route element={<ProtectedRoute permission="staff.manage" />}>
                <Route path="/admin/staff" element={<AdminStaffPage />} />
                <Route path="/admin/employees" element={<Navigate to="/admin/staff" replace />} />
              </Route>

              <Route element={<ProtectedRoute permission="schedules.manage" />}>
                <Route path="/admin/schedules" element={<AdminSchedulesPage />} />
                <Route path="/admin/regional-scheduling" element={<AdminRegionalSchedulingPage />} />
                <Route path="/admin/schedules/day/:date" element={<AdminScheduleDayPage />} />
                <Route path="/admin/leaves" element={<AdminLeaveCalendarPage />} />
                <Route path="/admin/projects" element={<AdminProjectsPage />} />
              </Route>

              <Route element={<ProtectedRoute permission="phone.lookup" />}>
                <Route path="/admin/phone-lookup" element={<PhoneLookupPage />} />
              </Route>

              <Route element={<ProtectedRoute permission="maintenance.manage" />}>
                <Route path="/admin/emergency-maintenance" element={<EmergencyMaintenancePage />} />
                <Route path="/admin/maintenance" element={<MaintenanceRecordsPage />} />
              </Route>

              <Route element={<ProtectedRoute permission="mail.tracking" />}>
                <Route path="/admin/mail-tracking" element={<MailTrackingPage />} />
              </Route>

              <Route element={<ProtectedRoute permission="remittance.track" />}>
                <Route path="/admin/remittance-tracking" element={<RemittanceTrackingPage />} />
              </Route>

              <Route element={<ProtectedRoute permission="employee.schedules" />}>
                <Route path="/employee/onboarding" element={<EmployeeOnboardingPage />} />
              </Route>

              <Route element={<EmployeeOnboardingRoute />}>
                <Route element={<ProtectedRoute permission="employee.schedules" />}>
                  <Route path="/employee" element={<EmployeeTodayTasksPage />} />
                  <Route path="/employee/calendar" element={<EmployeeCalendarPage />} />
                  <Route path="/employee/leaves" element={<EmployeeLeavePage />} />
                  <Route path="/employee/reports" element={<EmployeeDailyReportPage />} />
                  <Route path="/employee/reports/history" element={<EmployeeReportHistoryPage />} />
                  <Route path="/employee/summary" element={<EmployeeMonthlySummaryPage />} />
                  <Route path="/employee/settings" element={<EmployeeSettingsPage />} />
                  <Route path="/employee/rules" element={<EmployeeRulesPage />} />
                </Route>
              </Route>

              <Route element={<EmployeeOnboardingRoute />}>
                <Route element={<ProtectedRoute permission="employee.maintenance" />}>
                  <Route path="/employee/maintenance" element={<EmployeeMaintenanceReportPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
