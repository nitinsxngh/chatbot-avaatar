import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-8">
      <h1 className="apple-title">{title}</h1>
      {description && <p className="apple-subtitle mt-1 max-w-2xl">{description}</p>}
    </header>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`apple-card p-6 ${className}`}>{children}</section>
  );
}
