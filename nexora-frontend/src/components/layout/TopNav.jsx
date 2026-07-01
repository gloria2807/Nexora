import { NavLink, Link } from "react-router-dom";
import { useState } from "react";
import { Menu, X, Bell, Search, UserCircle } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';


const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/customers", label: "Customers" },
  { to: "/accounts", label: "Accounts" },
  { to: "/unmatched", label: "Reconciliation" },
  { to: "/invoices", label: "Invoices" },
  { to: "/transactions", label: "Transactions" },
  { to: "/merchant", label: "Merchant" },
  { to: "/statements", label: "Statements" },
  { to: "/developers", label: "API" },
];

export default function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: api.me });

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-zinc-200">
        <div className="max-w-[1600px] mx-auto h-16 px-4 flex items-center justify-between">

          {/* Logo */}

          <div className="flex items-center gap-3 shrink-0">

            <div className="w-10 h-10 rounded-xl bg-[#D4A017] flex items-center justify-center text-white font-bold shadow">

              N

            </div>

            <span className="font-bold text-xl tracking-tight"><Link to="/">NEXORA</Link></span>

          </div>

          {/* Desktop Navigation */}

          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">

            {NAV_ITEMS.map((item) => (

              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-yellow-50 text-[#D4A017]"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`
                }
              >

                {item.label}

              </NavLink>

            ))}

          </nav>

          {/* Right Side */}

          <div className="flex items-center gap-3">

            {/* Search */}

            <div className="hidden xl:block w-56">

              <div className="relative">

                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full h-10 rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none focus:border-[#D4A017] transition"
                />

              </div>

            </div>

            {/* Notification */}

            <button className="relative p-2 rounded-lg hover:bg-zinc-100 transition cursor-pointer">

              <Bell size={20} />

              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#D4A017]" />

            </button>

            {/* Avatar */}

             <NavLink to="/settings" className={({ isActive }) => cn(
              "hidden md:flex items-center gap-3 p-1.5 pr-3 rounded-full border transition-all", 
              isActive ? "border-gold bg-border/50" : "border-border bg-matte hover:border-gold/50"
            )}>
              <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center">
                <UserCircle className="w-4 h-4 text-muted" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[10px] font-bold text-black uppercase tracking-widest leading-none">{me?.name || 'Merchant'}</p>
              </div>
            </NavLink>

            {/* Mobile Menu */}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-zinc-100"
            >

              {mobileOpen ? <X size={22} /> : <Menu size={22} />}

            </button>

          </div>

        </div>
      </header>

      {/* Mobile Menu */}

      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 bg-white border-b border-zinc-200 ${
          mobileOpen ? "max-h-175" : "max-h-0"
        }`}
      >

        <div className="p-4">

          {/* Search */}

          <div className="relative mb-5">

            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />

            <input
              placeholder="Search..."
              className="w-full h-11 rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4"
            />

          </div>

          {/* Navigation */}

          <div className="flex flex-col">

            {NAV_ITEMS.map((item) => (

              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl text-sm font-medium transition mb-1 ${
                    isActive
                      ? "bg-yellow-50 text-[#D4A017]"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`
                }
              >

                {item.label}

              </NavLink>

            ))}

          </div>

        </div>

      </div>
    </>
  );
}