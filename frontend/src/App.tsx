import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Layout } from "./components/layout/Layout"
import { SelfRegistrationLayout } from "./components/layout/SelfRegistrationLayout"
import { DashboardPage } from "./pages/home/DashboardPage"
import { ExitPage } from "./pages/exit/ExitPage"
import { HistoryPage } from "./pages/history/HistoryPage"
import { DeliveriesPage } from "./pages/deliveries/DeliveriesPage"
import { TenantsPage } from "./pages/tenants/TenantsPage"
import { ReportsPage } from "./pages/reports/ReportsPage"
import { AdminPage } from "./pages/admin/AdminPage"
import { SelfRegistrationPage } from "./pages/self-register/SelfRegistrationPage"
import { KioskPage } from "./pages/kiosk/KioskPage"
import { WhatsAppTestPage } from "./pages/WhatsAppTest/WhatsAppTestPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/exit" element={<ExitPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/deliveries" element={<DeliveriesPage />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/admin-page-mind" element={<AdminPage />} />
          {import.meta.env.DEV && <Route path="/dev/whatsapp-test" element={<WhatsAppTestPage />} />}
        </Route>
        <Route element={<SelfRegistrationLayout />}>
          <Route path="/register" element={<SelfRegistrationPage />} />
          <Route path="/kiosk" element={<KioskPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
