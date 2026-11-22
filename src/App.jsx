import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Leads from './pages/Leads'
import Services from './pages/Services'
import Documents from './pages/Documents'
import DocumentEditor from './pages/DocumentEditor'
import Suppliers from './pages/Suppliers'
import Expenses from './pages/Expenses'
import Payments from './pages/Payments'
import Contracts from './pages/Contracts'
import ItemReceipts from './pages/ItemReceipts'
import CompanyProfile from './pages/CompanyProfile'
import Portfolio from './pages/Portfolio'
import Proposal from './pages/Proposal'
import CoverLetter from './pages/CoverLetter'
import MeetingKit from './pages/MeetingKit'
import SocialMedia from './pages/SocialMedia'
import Reports from './pages/Reports'
import SettingsCompany from './pages/SettingsCompany'
import SettingsBackup from './pages/SettingsBackup'
import SettingsUsers from './pages/SettingsUsers'
import SettingsTerms from './pages/SettingsTerms'
import ProjectsOverview from './pages/ProjectsOverview'
import TemplatesOverview from './pages/TemplatesOverview'
import Email from './pages/Email'
import ComingSoon from './pages/ComingSoon'
import Layout from './components/Layout'
import { ConfirmProvider } from './components/ConfirmDialog'
import InstallPrompt from './components/InstallPrompt'
import DemoPanel from './demo/DemoPanel'

// Pages that are not built yet: they show a "coming soon" note for now.
const SOON = [
  ['settings', 'Settings'],
]

// DEMO: show the "Install app" pop-up only after the visitor presses "Enter Demo",
// so it does not cover the demo start screen.
function InstallAfterLogin() {
  const { session } = useAuth()
  return session ? <InstallPrompt /> : null
}

function Protected({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="center-screen">Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <Protected>
                  <Layout />
                </Protected>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="leads" element={<Leads />} />
              <Route path="services" element={<Services />} />
              <Route path="documents" element={<Documents />} />
              <Route path="documents/new/:type" element={<DocumentEditor />} />
              <Route path="documents/:id" element={<DocumentEditor />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="projects" element={<ProjectsOverview />} />
              <Route path="templates" element={<TemplatesOverview />} />
              <Route path="email" element={<Email />} />
              <Route path="projects/expenses" element={<Expenses />} />
              <Route path="projects/payments" element={<Payments />} />
              <Route path="projects/contracts" element={<Contracts />} />
              <Route path="operations/item-receipts" element={<ItemReceipts />} />
              <Route path="operations" element={<Navigate to="/documents?type=work_order" replace />} />
              <Route path="templates/company-profile" element={<CompanyProfile />} />
              <Route path="templates/portfolio" element={<Portfolio />} />
              <Route path="templates/proposal" element={<Proposal />} />
              <Route path="templates/cover-letter" element={<CoverLetter />} />
              <Route path="meeting-kit" element={<MeetingKit />} />
              <Route path="social-media" element={<SocialMedia />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings/company" element={<SettingsCompany />} />
              <Route path="settings/backup" element={<SettingsBackup />} />
              <Route path="settings/users" element={<SettingsUsers />} />
              <Route path="settings/terms" element={<SettingsTerms />} />
              {SOON.map(([path, title]) => (
                <Route key={path} path={path} element={<ComingSoon title={title} />} />
              ))}
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <InstallAfterLogin />
        <DemoPanel />
      </ConfirmProvider>
    </AuthProvider>
  )
}