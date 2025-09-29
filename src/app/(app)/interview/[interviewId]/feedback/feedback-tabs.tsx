"use client";

import { useState } from "react";

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
    <div className="bg-secondary/50 backdrop-blur-sm rounded-lg p-6 border border-secondary-text/10">
      <h2 className="text-2xl font-semibold text-primary-text mb-6">Detailed Analysis</h2>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? "bg-accent text-primary"
                : "text-secondary-text hover:text-primary-text hover:bg-secondary/50"
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
    </div>
  );
}