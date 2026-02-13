"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HamburgerMenuProps {
  strokeWidth?: number;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  className?: string;
}

const HamburgerMenu = (props: HamburgerMenuProps) => {
  const { strokeWidth = 2, open = false, onToggle, className } = props;

  // We use the `open` prop directly to control the state.
  // If `onToggle` is provided, we call it with the new state when clicking.
  const handleChange = () => {
    if (onToggle) {
      onToggle(!open);
    }
  };

  return (
    <Button
      className={cn("size-8 p-0 text-foreground", className)}
      size="icon"
      onClick={handleChange}
      variant="ghost"
      aria-label={open ? "Close menu" : "Open menu"}
    >
      <svg
        viewBox="0 0 32 32"
        style={{
          transform: open ? "rotate(-45deg)" : "rotate(0deg)",
          transition: "transform 600ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className="!size-full"
        stroke="currentColor"
      >
        <path
          d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={open ? "20 300" : "12 63"}
          strokeDashoffset={open ? -32.42 : 0}
          style={{
            transition:
              "stroke-dasharray 600ms cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />

        <path
          d="M7 16 27 16"
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: "opacity 300ms ease",
          }}
        />
      </svg>
    </Button>
  );
};

export default HamburgerMenu;
