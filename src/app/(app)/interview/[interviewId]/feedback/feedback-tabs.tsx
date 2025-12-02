"use client";

import { useState } from "react";
import FeedbackCard from "./_components/FeedbackCard";

interface FeedbackTabsProps {
  contentAndStructure: string;
  communicationAndDelivery: string;
  presentation: string;
}

const tabs = [
  { id: "content", label: "Content & Structure" },
  { id: "communication", label: "Communication & Delivery" },
  { id: "presentation", label: "Presentation" },
] as const;

export default function FeedbackTabs({
  contentAndStructure,
  communicationAndDelivery,
  presentation,
}: FeedbackTabsProps) {
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]["id"]>("content");

  const getTabContent = (tabId: typeof activeTab) => {
    switch (tabId) {
      case "content":
        return contentAndStructure;
      case "communication":
        return communicationAndDelivery;
      case "presentation":
        return presentation;
      default:
        return "";
    }
  };

  return (
    <FeedbackCard title="Detailed Analysis">
      {/* Tab Navigation */}
      <div className="mb-6 flex space-x-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-accent text-primary border-accent font-semibold"
                : "text-secondary-text hover:text-primary-text hover:bg-accent/10 hover:border-accent/20 border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        <div className="text-secondary-text whitespace-pre-wrap">
          {getTabContent(activeTab)}
        </div>
      </div>
    </FeedbackCard>
  );
}
