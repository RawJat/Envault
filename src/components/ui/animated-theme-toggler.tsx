"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"
import { Kbd } from "./kbd"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) => {
  const [isDark, setIsDark] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"))
    }

    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current) return

    await document.startViewTransition(() => {
      flushSync(() => {
        const newTheme = !isDark
        setIsDark(newTheme)
        document.documentElement.classList.toggle("dark")
        localStorage.setItem("theme", newTheme ? "dark" : "light")
      })
    }).ready

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top)
    )

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    )
  }, [isDark, duration])

  if (!mounted) {
    return (
      <button
        ref={buttonRef}
        onClick={toggleTheme}
        className={cn(className)}
        data-theme-toggle
        {...props}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        <span className="sr-only">Toggle theme (t)</span>
      </button>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={buttonRef}
          onClick={toggleTheme}
          className={cn(className)}
          data-theme-toggle
          {...props}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span className="sr-only">Toggle theme (t)</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="flex items-center gap-2">
          Toggle theme <Kbd>T</Kbd>
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
