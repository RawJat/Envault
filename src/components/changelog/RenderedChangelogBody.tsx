import { MDXRemote } from "next-mdx-remote/rsc";
import type React from "react";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils/utils";
import {
  Command as CommandIcon,
  CornerDownLeft,
  ChevronRight,
} from "lucide-react";

const changelogMdxComponents = {
  Kbd: ({ className, ...props }: React.ComponentProps<typeof Kbd>) => (
    <Kbd className={cn("align-middle", className)} {...props} />
  ),
  Command: ({ className }: React.ComponentProps<"svg">) => (
    <CommandIcon className={cn("block w-4 h-4 shrink-0", className)} />
  ),
  CornerDownLeft: ({ className }: React.ComponentProps<"svg">) => (
    <CornerDownLeft className={cn("block w-4 h-4 shrink-0", className)} />
  ),
  ChevronRight: ({ className }: React.ComponentProps<"svg">) => (
    <ChevronRight className={cn("block w-4 h-4 shrink-0", className)} />
  ),
  p: ({ className, children, ...props }: React.ComponentProps<"p">) => (
    <p
      className={cn(
        "text-sm text-muted-foreground leading-relaxed my-1.5",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  ),
  h3: ({ className, children, ...props }: React.ComponentProps<"h3">) => (
    <h3
      className={cn(
        "text-sm font-semibold text-foreground/80 mt-4 mb-2 uppercase tracking-wider font-mono first:mt-0",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  ),
  ul: ({ className, children, ...props }: React.ComponentProps<"ul">) => (
    <ul className={cn("space-y-1.5 my-2", className)} {...props}>
      {children}
    </ul>
  ),
  li: ({ className, children, ...props }: React.ComponentProps<"li">) => (
    <li
      className={cn(
        "text-sm text-muted-foreground flex gap-2 leading-relaxed",
        className,
      )}
      {...props}
    >
      <ChevronRight className="h-4 w-4 text-primary/50 mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  ),
  a: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      {...props}
      className="text-primary hover:underline underline-offset-4"
      target={href?.startsWith("/") ? undefined : "_blank"}
      rel={href?.startsWith("/") ? undefined : "noreferrer noopener"}
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }: React.ComponentProps<"code">) => (
    <code
      className={cn(
        "text-xs font-mono bg-muted/60 text-primary px-1 py-0.5 rounded-sm",
        className,
      )}
      {...props}
    >
      {children}
    </code>
  ),
};

export function RenderedChangelogBody({ source }: { source: string }) {
  return <MDXRemote source={source} components={changelogMdxComponents} />;
}
