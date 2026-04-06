import { DirectionalPageTransition } from "@/components/transitions/directional-page-transition";

export default function Template({ children }: { children: React.ReactNode }) {
  return <DirectionalPageTransition>{children}</DirectionalPageTransition>;
}
