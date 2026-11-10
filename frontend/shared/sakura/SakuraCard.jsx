/**
 * Themed card with staggered appear animation and soft hover glow.
 * `as` lets the card be a button/article/li; `index` staggers the appearance.
 */
export default function SakuraCard({
  as: Tag = "div",
  index = 0,
  active = false,
  className = "",
  style,
  children,
  ...props
}) {
  const classes = ["sakura-card", active ? "is-active" : "", className].filter(Boolean).join(" ");
  return (
    <Tag className={classes} style={{ "--i": Math.min(index, 12), ...style }} {...props}>
      {children}
    </Tag>
  );
}
