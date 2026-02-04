import { cn } from "@/lib/utils"

interface KbdProps extends React.ComponentProps<"kbd"> {
  variant?: 'default' | 'outline' | 'primary' | 'ghost'
  size?: 'xs' | 'sm' | 'md'
  showOnMobile?: boolean
}

function Kbd({ className, variant = 'default', size = 'sm', showOnMobile = false, ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      suppressHydrationWarning
      className={cn(
        "pointer-events-none select-none items-center justify-center gap-1 font-sans font-medium transition-colors",
        showOnMobile ? "inline-flex" : "hidden md:inline-flex",

        // Squircle-like rounding
        size === 'xs' ? "rounded-[3px]" : "rounded-[5px]",

        // Variants with more depth/contrast - Matching the premium 'squircle' look
        variant === 'default' && "bg-muted text-foreground border border-muted-foreground/20 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]",
        variant === 'outline' && "bg-transparent border border-muted-foreground/40 text-muted-foreground",
        variant === 'primary' && "bg-primary-foreground/30 text-primary-foreground border-0 shadow-[0_1px_0_0_rgba(255,255,255,0.1)]",
        variant === 'ghost' && "bg-muted/80 text-muted-foreground border-0",

        // Sizes - making them slightly more square
        size === 'xs' && "h-4 min-w-[16px] px-1 text-[9px]",
        size === 'sm' && "h-5 min-w-[20px] px-1.5 text-[10px]",
        size === 'md' && "h-6 min-w-[24px] px-2 text-xs",

        "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        "[&_svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    />
  )
}

interface KbdGroupProps extends React.ComponentProps<"div"> {
  showOnMobile?: boolean
}

function KbdGroup({ className, showOnMobile = false, ...props }: KbdGroupProps) {
  return (
    <div
      data-slot="kbd-group"
      className={cn(
        showOnMobile ? "inline-flex" : "hidden md:inline-flex",
        "items-center gap-1",
        className
      )}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
