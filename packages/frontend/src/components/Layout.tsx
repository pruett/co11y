import { Link, Outlet } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'
import { ActivityIndicator } from './ActivityIndicator'
import { ThemeToggle } from './ThemeToggle'

export default function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Co11y</h1>
              <span className="text-sm text-muted-foreground">Claude Code Observability</span>
            </Link>
            <nav className="flex items-center gap-4">
              <ActivityIndicator />
              <Link
                to="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
