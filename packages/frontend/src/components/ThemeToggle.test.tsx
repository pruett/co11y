import { describe, it, expect, beforeEach } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { ThemeToggle } from './ThemeToggle'
import { ThemeProvider } from './ThemeProvider'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('should render toggle button', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-toggle')).toBeDefined()
  })

  it('should display sun icon in light mode', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    )

    const button = screen.getByTestId('theme-toggle')
    expect(button).toBeDefined()
  })

  it('should display moon icon in dark mode', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeToggle />
      </ThemeProvider>
    )

    const button = screen.getByTestId('theme-toggle')
    expect(button).toBeDefined()
  })

  it('should open dropdown menu when clicked', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const button = screen.getByTestId('theme-toggle')
    button.click()

    // Check that menu items are present
    expect(screen.getByTestId('theme-light')).toBeDefined()
    expect(screen.getByTestId('theme-dark')).toBeDefined()
    expect(screen.getByTestId('theme-system')).toBeDefined()
  })

  it('should switch to light theme when light option is clicked', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeToggle />
      </ThemeProvider>
    )

    screen.getByTestId('theme-toggle').click()
    screen.getByTestId('theme-light').click()

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(localStorage.getItem('co11y-ui-theme')).toBe('light')
  })

  it('should switch to dark theme when dark option is clicked', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    )

    screen.getByTestId('theme-toggle').click()
    screen.getByTestId('theme-dark').click()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('co11y-ui-theme')).toBe('dark')
  })

  it('should switch to system theme when system option is clicked', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeToggle />
      </ThemeProvider>
    )

    screen.getByTestId('theme-toggle').click()
    screen.getByTestId('theme-system').click()

    expect(localStorage.getItem('co11y-ui-theme')).toBe('system')
  })

  it('should indicate current theme with data-active attribute', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeToggle />
      </ThemeProvider>
    )

    screen.getByTestId('theme-toggle').click()

    expect(screen.getByTestId('theme-dark').dataset.active).toBe('true')
    expect(screen.getByTestId('theme-light').dataset.active).toBe('false')
    expect(screen.getByTestId('theme-system').dataset.active).toBe('false')
  })

  it('should show all three theme options in menu', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    screen.getByTestId('theme-toggle').click()

    const lightOption = screen.getByTestId('theme-light')
    const darkOption = screen.getByTestId('theme-dark')
    const systemOption = screen.getByTestId('theme-system')

    expect(lightOption.textContent).toContain('Light')
    expect(darkOption.textContent).toContain('Dark')
    expect(systemOption.textContent).toContain('System')
  })

  it('should persist theme selection across re-renders', () => {
    const { rerender } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    screen.getByTestId('theme-toggle').click()
    screen.getByTestId('theme-light').click()

    rerender(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    screen.getByTestId('theme-toggle').click()
    expect(screen.getByTestId('theme-light').dataset.active).toBe('true')
  })
})
