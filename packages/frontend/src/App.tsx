import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import Layout from '@/components/Layout'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { SessionDetailSkeleton } from '@/components/skeletons/SessionDetailSkeleton'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const SessionDetail = lazy(() => import('@/pages/SessionDetail'))

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="co11y-ui-theme">
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route
                  index
                  element={
                    <Suspense fallback={<DashboardSkeleton />}>
                      <Dashboard />
                    </Suspense>
                  }
                />
                <Route
                  path="session/:id"
                  element={
                    <Suspense fallback={<SessionDetailSkeleton />}>
                      <SessionDetail />
                    </Suspense>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
