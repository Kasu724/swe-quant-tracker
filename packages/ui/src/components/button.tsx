import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type PropsWithChildren,
  type ReactElement
} from "react";
import { cn } from "../cn";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    variant?: "primary" | "secondary" | "ghost";
  }
>;

export function Button({ children, className, variant = "primary", asChild = false, ...props }: ButtonProps) {
  const buttonClassName = cn(
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60 motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0",
    variant === "primary" &&
      "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
    variant === "secondary" &&
      "border border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:text-brand-700",
    variant === "ghost" && "bg-transparent text-slate-600 hover:bg-slate-100",
    className
  );

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;

    return cloneElement(child, {
      className: cn(buttonClassName, child.props.className)
    });
  }

  return (
    <button
      className={buttonClassName}
      {...props}
    >
      {children}
    </button>
  );
}
