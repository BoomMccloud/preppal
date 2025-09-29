import type { ReactNode } from "react";

interface FeedbackCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function FeedbackCard({
  title,
  children,
  className,
}: FeedbackCardProps) {
  return (
    <div
      className={`bg-secondary/50 backdrop-blur-sm rounded-lg p-6 border border-secondary-text/10 ${
        className ?? ""
      }`}
    >
      {title && (
        <h2 className="text-2xl font-semibold text-primary-text mb-4">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}