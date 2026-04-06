import { addTransitionType, startTransition } from "react";

type TransitionType = "nav-forward" | "nav-back";

type RouterLike = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

export function pushWithTransition(
  router: RouterLike,
  href: string,
  transitionType: TransitionType = "nav-forward",
) {
  startTransition(() => {
    addTransitionType(transitionType);
    router.push(href);
  });
}

export function replaceWithTransition(
  router: RouterLike,
  href: string,
  transitionType: TransitionType = "nav-forward",
) {
  startTransition(() => {
    addTransitionType(transitionType);
    router.replace(href);
  });
}
