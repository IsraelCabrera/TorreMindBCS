import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "./components/layout/Layout"
import { DashboardPage } from "./pages/home/DashboardPage"
import { ExitPage } from "./pages/exit/ExitPage"
import { HistoryPage } from "./pages/history/HistoryPage"
import { DeliveriesPage } from "./pages/deliveries/DeliveriesPage"
import { TenantsPage } from "./pages/tenants/TenantsPage"
import { ReportsPage } from "./pages/reports/ReportsPage"
import { AdminPage } from "./pages/admin/AdminPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/exit" element={<ExitPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/deliveries" element={<DeliveriesPage />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
