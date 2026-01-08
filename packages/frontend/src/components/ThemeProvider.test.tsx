import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeProvider'

// Test component to access theme context
function TestComponent() {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={() => setTheme('light')} data-testid="set-light">
        Light
      </button>
      <button onClick={() => setTheme('dark')} data-testid="set-dark">
        Dark
      </button>
      <button onClick={() => setTheme('system')} data-testid="set-system">
        System
      </button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('should provide default theme as system', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme').textContent).toBe('system')
  })

  it('should apply custom default theme', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme').textContent).toBe('dark')
  })

  it('should read theme from localStorage', () => {
    localStorage.setItem('co11y-ui-theme', 'light')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme').textContent).toBe('light')
  })

  it('should apply dark class to document when theme is dark', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>
    )

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should apply light class to document when theme is light', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    )

    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('should update theme when setTheme is called', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    screen.getByTestId('set-dark').click()

    expect(screen.getByTestId('current-theme').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should persist theme to localStorage when changed', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    screen.getByTestId('set-light').click()

    expect(localStorage.getItem('co11y-ui-theme')).toBe('light')
  })

  it('should use custom storage key', () => {
    render(
      <ThemeProvider storageKey="custom-theme-key" defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>
    )

    screen.getByTestId('set-light').click()

    expect(localStorage.getItem('custom-theme-key')).toBe('light')
  })

  it('should throw error when useTheme is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = () => {}

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useTheme must be used within a ThemeProvider')

    console.error = originalError
  })

  it('should remove previous theme class when changing themes', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>
    )

    expect(document.documentElement.classList.contains('dark')).toBe(true)

    screen.getByTestId('set-light').click()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })
})
