import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "neutral" | "ghost";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  // Page/section-level commit actions.
  primary: "bg-brand text-on-brand hover:bg-brand-dark focus-visible:ring-brand/40",
  // In-row "do it" actions that aren't destructive (Restake, Claim, Update…).
  secondary:
    "border border-brand text-brand hover:bg-brand-light focus-visible:ring-brand/40",
  // Destructive: removes/unstakes funds. Distinct from the amber warning hue.
  danger: "bg-danger text-white hover:bg-danger-dark focus-visible:ring-danger/40",
  // Quiet bordered action (Disconnect).
  neutral:
    "border border-line text-ink-soft hover:border-brand hover:text-brand focus-visible:ring-brand/30",
  // Text-only (Cancel, Collapse).
  ghost: "text-ink-soft hover:text-ink focus-visible:ring-brand/30",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-9 px-4 py-1.5 text-sm",
  md: "min-h-11 px-5 py-2.5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  /** Marks this button as a Modal's preferred initial focus target. */
  "data-autofocus"?: boolean | string;
}

export function Button({
  variant = "primary",
  size = "sm",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-1.5 rounded-full font-medium",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        "disabled:opacity-40 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
