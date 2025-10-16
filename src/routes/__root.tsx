import { useState, useEffect, type ReactNode } from 'react';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/sidebar';
import { ToastProvider } from '@/contexts/toast-context';
import { DeploymentProvider } from '@/contexts/deployment-context';
import { DeploymentNotificationBar } from '@/components/ui/deployment-notification-bar';
import { queryClient, setToastFunction } from '@/lib/query-client';
import { useToast } from '@/hooks/use-toast';
import {
  AppShellContentProvider,
  useAppShellContentPadding,
} from '@/components/layout/app-shell-content-context';
import { cn } from '@/lib/utils';

export const Route = createRootRoute({
  component: RootLayout,
});

function QuerySetup({ children }: { children: ReactNode }) {
  const { showError, showException } = useToast();

  useEffect(() => {
    setToastFunction((message, error) => {
      if (error !== undefined) {
        showException(message, error);
        return;
      }
      showError(message);
    });
  }, [showError, showException]);

  return <>{children}</>;
}

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <DeploymentProvider>
          <QuerySetup>
            <AppShellContentProvider>
              <AppShellFrame />
            </AppShellContentProvider>
          </QuerySetup>
        </DeploymentProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

function AppShellFrame() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { contentPaddingClass } = useAppShellContentPadding();

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const handleNavigation = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      data-testid="app-shell.root"
      data-mobile-menu-state={mobileMenuOpen ? 'open' : 'closed'}
    >
      <DeploymentNotificationBar />
      <div className="flex flex-1 overflow-hidden" data-testid="app-shell.layout">
        <div className="hidden lg:block" data-testid="app-shell.sidebar.desktop">
          <Sidebar
            isCollapsed={sidebarCollapsed}
            onToggle={toggleSidebar}
            onNavigate={handleNavigation}
            variant="desktop"
          />
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden" data-testid="app-shell.mobile-overlay">
            <div
              className="absolute inset-0 bg-black/50"
              data-testid="app-shell.mobile-overlay.dismiss"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              className="absolute left-0 top-0 h-full"
              id="app-shell-mobile-menu"
              data-testid="app-shell.sidebar.mobile"
            >
              <Sidebar onNavigate={handleNavigation} variant="mobile" />
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden">
          <div
            className="border-b border-border bg-background lg:hidden"
            data-testid="app-shell.mobile-toggle"
          >
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="flex w-full items-center justify-between p-4 hover:bg-accent"
              aria-expanded={mobileMenuOpen}
              aria-controls="app-shell-mobile-menu"
              aria-label="Toggle navigation menu"
              data-testid="app-shell.mobile-toggle.button"
            >
              <span className="text-sm font-medium text-foreground">Menu</span>
              <span aria-hidden className="text-xl">☰</span>
            </button>
          </div>

          <main
            className={cn('flex-1 overflow-auto bg-muted/30', contentPaddingClass)}
            data-testid="app-shell.content"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
