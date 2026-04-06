import { ViewTransition } from "react";
import type { ReactNode } from "react";

interface DirectionalPageTransitionProps {
  children: ReactNode;
}

export function DirectionalPageTransition({
  children,
}: DirectionalPageTransitionProps) {
  return (
    <ViewTransition
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "auto",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "auto",
      }}
      default="auto"
    >
      {children}
    </ViewTransition>
  );
}
