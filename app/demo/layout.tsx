export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No navbar, no footer, no container - just the raw demo content
  return <>{children}</>;
}
