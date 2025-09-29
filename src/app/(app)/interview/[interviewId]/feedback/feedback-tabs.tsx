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
  const [activeTab, setActiveTab] = useState<typeof tabs[number]["id"]>("content");

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
      <div className="flex space-x-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors border ${
              activeTab === tab.id
                ? "bg-accent text-white border-accent"
                : "text-secondary-text hover:text-primary-text hover:bg-secondary/50 border-secondary-text/20 hover:border-secondary-text/40"
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