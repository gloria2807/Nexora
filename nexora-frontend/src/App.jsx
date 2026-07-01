import { BrowserRouter, Routes, Route } from "react-router-dom";
import TopNav from "./components/layout/TopNav";
import PageContainer from "./components/layout/PageContainer";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import UnmatchedPayments from "./pages/UnmatchedPayments";
import Accounts from "./pages/Accounts";
import Invoices from "./pages/Invoices";
import Transactions from "./pages/Transactions";
import Merchant from "./pages/Merchant";
import Statements from "./pages/Statements";
import Developers from "./pages/Developers";
import SettingsPage from './pages/Settings';
import Landing from "./pages/Landing";

const pages = [
  {
    path: "/",
    title: "",
    subtitle: "",
    element: <Landing />,
  },
  {
    path: "/dashboard",
    title: "Dashboard",
    subtitle: "Overview of your Dedicated Virtual Account infrastructure",
    element: <Dashboard />,
  },

  {
    path: "/customers",
    title: "Customers",
    subtitle: "Provision and manage customers",
    element: <Customers />,
  },
  {
    path: "/unmatched",
    title: "Exceptions",
    subtitle: "Match incoming payments and resolve exceptions",
    element: <UnmatchedPayments />,
  },
  {
    path: "/accounts",
    title: "Virtual Accounts",
    subtitle: "Manage dedicated receiving accounts.",
    element: <Accounts />,
  },
  {
    path: "/invoices",
    title: "Invoices",
    subtitle: "Manage billing and collections.",
    element: <Invoices />,
  },
  {
    path: "/transactions",
    title: "Transactions",
    subtitle: "Incoming transfers from Nomba",
    element: <Transactions />,
  },
  {
    path: "/merchant",
    title: "Merchant Hub",
    subtitle: "Manage your platform balance, bill payments, transfers, and settlements.",
    element: <Merchant />,
  },
  {
    path: "/statements",
    title: "Statements",
    subtitle: "Customer statements and reports",
    element: <Statements />,
  },
  {
    path: "/developers",
    title: "Developer API",
    subtitle: "REST API and webhook configurations",
    element: <Developers />,
  },
  {
    path: "/settings",
    title: "Settings",
    subtitle: "Merchant profile & security configuration",
    element: <SettingsPage />,
  },
];

export default function App() {
  return (
      <div className="min-h-screen bg-[#FAFAF8]">

        {/* Top Navigation */}

        <TopNav />

        {/* Page */}

        <main className="max-w-7xl mx-auto">

          <Routes>

            {pages.map((page) => (

              <Route
                key={page.path}
                path={page.path}
                element={
                  <PageContainer
                    title={page.title}
                    subtitle={page.subtitle}
                  >
                    {page.element}
                  </PageContainer>
                }
              />

            ))}

          </Routes>

        </main>

      </div>
  );
}