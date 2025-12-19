"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import FeedbackCard from "./_components/FeedbackCard";

interface FeedbackTabsProps {
  contentAndStructure: string;
  communicationAndDelivery: string;
  presentation: string;
}

type TabId = "content" | "communication" | "presentation";

export default function FeedbackTabs({
  contentAndStructure,
  communicationAndDelivery,
  presentation,
}: FeedbackTabsProps) {
  const t = useTranslations("interview.feedback");
  const [activeTab, setActiveTab] = useState<TabId>("content");

  const tabs: { id: TabId; labelKey: string }[] = [
    { id: "content", labelKey: "contentAndStructure" },
    { id: "communication", labelKey: "communicationAndDelivery" },
    { id: "presentation", labelKey: "presentation" },
  ];

  const getTabContent = (tabId: TabId) => {
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
    <FeedbackCard title={t("detailedAnalysis")}>
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
            {t(tab.labelKey)}
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
