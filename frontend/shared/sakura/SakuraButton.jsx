/** Themed button. variant: "primary" | "secondary" | "ghost". Passes all other props through. */
export default function SakuraButton({ variant = "primary", className = "", type = "button", children, ...props }) {
  return (
    <button type={type} className={`sakura-btn sakura-btn--${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
