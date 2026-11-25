import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Menu,
  LogOut,
  MoreHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { MollyLogo } from "@/shared/ui/molly-logo";
import { useDemoMode } from "@/app/demo-mode";
import { authClient } from "@/app/dependencies";

export type NavLeaf = { to: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; icon: LucideIcon; items: NavLeaf[] };
export type NavItem = NavLeaf | NavGroup;

const isGroup = (item: NavItem): item is NavGroup => (item as NavGroup).items !== undefined;

const flattenLeaves = (nav: NavItem[]): NavLeaf[] =>
  nav.flatMap((i) => (isGroup(i) ? i.items : [i]));

export function PortalShell({
  nav,
  title,
  userName,
  userEmail,
  children,
}: {
  nav: NavItem[];
  title: string;
  userName?: string;
  userEmail?: string;
  children: ReactNode;
}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { setRole } = useDemoMode();
  const navigate = useNavigate();

  const leaves = useMemo(() => flattenLeaves(nav), [nav]);
  const mainNav = leaves.slice(0, 4);
  const more = leaves.slice(4);

  // Cierra la sesion de Supabase (la cache de datos se vacia en lib/session-cache).
  const onLogout = async () => {
    try {
      await authClient.signOut();
    } catch {
      /* sin red: igual se sale; el token local ya no se usa */
    }
    setRole(null);
    navigate({ to: "/login", search: { register: undefined } });
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/40 dark:bg-background">
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <MollyLogo size={28} />
          <span className="hidden md:inline text-sm text-muted-foreground border-l border-border pl-3 ml-1">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-xs text-muted-foreground">{userEmail ?? "Sesión activa"}</span>
            <span className="text-sm font-medium text-foreground">{userName ?? "Usuario"}</span>
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium bg-muted text-foreground ring-1 ring-inset ring-border">
            {userName
              ? userName
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "U"}
          </div>
          <button
            onClick={onLogout}
            className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside
          className={`hidden lg:flex flex-col border-r border-navy-600 bg-[#1c2e4a] shrink-0 transition-[width] duration-200 ${
            collapsed ? "w-16 min-w-16" : "w-60"
          }`}
        >
          <div
            className={`flex items-center shrink-0 border-b border-navy-600 ${
              collapsed ? "justify-center py-2" : "justify-between px-3 h-11"
            }`}
          >
            {!collapsed && (
              <span className="text-xs font-medium text-white/50 truncate">Navegación</span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="p-2 rounded-md text-white/50 hover:text-white hover:bg-white/6 transition-colors"
              title={collapsed ? "Expandir menú" : "Minimizar menú"}
              aria-label={collapsed ? "Expandir menú" : "Minimizar menú"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
          <nav className="p-3 flex-1 overflow-y-auto">
            <SidebarNav nav={nav} path={path} collapsed={collapsed} />
          </nav>
        </aside>

        {open && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#1c2e4a] border-r border-navy-600 flex flex-col">
              <div className="p-4 border-b border-navy-600">
                <MollyLogo size={28} />
              </div>
              <nav className="p-3 flex-1 overflow-y-auto">
                <SidebarNav nav={nav} path={path} onNavigate={() => setOpen(false)} />
              </nav>
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto pb-20 lg:pb-6">
          <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:px-10 lg:py-8">{children}</div>
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-card border-t border-border flex items-stretch z-30">
        {mainNav.map((item) => {
          const active = path === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] ${
                active ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              <Icon size={20} strokeWidth={1.75} />
              <span className="truncate px-1">{item.label}</span>
            </Link>
          );
        })}
        {more.length > 0 && (
          <button
            onClick={() => setOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground"
          >
            <MoreHorizontal size={20} strokeWidth={1.75} />
            <span>Más</span>
          </button>
        )}
      </nav>
    </div>
  );
}

function SidebarNav({
  nav,
  path,
  collapsed,
  onNavigate,
}: {
  nav: NavItem[];
  path: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  if (collapsed) {
    return (
      <>
        {nav.map((item) =>
          isGroup(item) ? (
            item.items.map((leaf) => (
              <SidebarLink
                key={leaf.to}
                item={leaf}
                active={path === leaf.to}
                onNavigate={onNavigate}
                collapsed
              />
            ))
          ) : (
            <SidebarLink
              key={item.to}
              item={item}
              active={path === item.to}
              onNavigate={onNavigate}
              collapsed
            />
          ),
        )}
      </>
    );
  }

  return (
    <>
      {nav.map((item, idx) =>
        isGroup(item) ? (
          <SidebarGroup
            key={`g-${idx}-${item.label}`}
            group={item}
            path={path}
            onNavigate={onNavigate}
          />
        ) : (
          <SidebarLink
            key={item.to}
            item={item}
            active={path === item.to}
            onNavigate={onNavigate}
          />
        ),
      )}
    </>
  );
}

function SidebarLink({
  item,
  active,
  onNavigate,
  nested = false,
  collapsed = false,
}: {
  item: NavLeaf;
  active: boolean;
  onNavigate?: () => void;
  nested?: boolean;
  collapsed?: boolean;
}) {
  const Icon = item.icon;

  if (collapsed) {
    return (
      <Link
        to={item.to}
        onClick={onNavigate}
        title={item.label}
        aria-label={item.label}
        className={`flex items-center justify-center w-11 h-11 mx-auto mb-1 rounded-lg transition-colors ${
          active
            ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
            : "text-white/70 hover:text-white hover:bg-white/6"
        }`}
      >
        <Icon size={20} strokeWidth={1.75} />
      </Link>
    );
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`relative flex items-center gap-3 h-9 px-3 rounded-md text-sm mb-0.5 transition-colors ${
        nested ? "pl-9" : ""
      } ${
        nested
          ? active
            ? "bg-white/10 text-white font-medium before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-primary"
            : "text-white/60 hover:text-white hover:bg-white/6"
          : active
            ? "bg-white/12 text-white font-medium shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
            : "text-white/70 hover:text-white hover:bg-white/6"
      }`}
    >
      {!nested && <Icon size={18} strokeWidth={1.75} />}
      {nested && <Icon size={15} strokeWidth={1.75} className="opacity-70" />}
      {item.label}
    </Link>
  );
}

function SidebarGroup({
  group,
  path,
  onNavigate,
}: {
  group: NavGroup;
  path: string;
  onNavigate?: () => void;
}) {
  const containsActive = group.items.some((i) => i.to === path);
  const [open, setOpen] = useState(containsActive);
  const Icon = group.icon;
  const expanded = open || containsActive;
  return (
    <div className="mb-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 h-9 px-3 rounded-md text-sm transition-colors ${
          containsActive
            ? "text-white font-medium"
            : "text-white/70 hover:text-white hover:bg-white/6"
        }`}
        aria-expanded={expanded}
      >
        <Icon size={18} strokeWidth={1.75} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="mt-0.5">
          {group.items.map((it) => (
            <SidebarLink
              key={it.to}
              item={it}
              active={path === it.to}
              onNavigate={onNavigate}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* Utility primitives used by pages */
