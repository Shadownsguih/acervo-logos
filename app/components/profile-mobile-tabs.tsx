"use client";

import { useState } from "react";

type ProfileMobileTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type ProfileMobileTabsProps = {
  tabs: ProfileMobileTab[];
};

export default function ProfileMobileTabs({
  tabs,
}: ProfileMobileTabsProps) {
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;

  if (!activeTab) {
    return null;
  }

  return (
    <div className="xl:hidden">
      <div className="rounded-[22px] border border-[#dfe3ef] bg-white p-2 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)]">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "border-[#15233f] bg-[#15233f] text-white shadow-[0_12px_24px_-20px_rgba(21,35,63,0.9)]"
                  : "border-[#e3e7f0] bg-[#f5f7fb] text-[#4e5568] hover:bg-[#edf1f7] hover:text-[#1f2430]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        </div>
      </div>

      <div className="mt-4">{activeTab.content}</div>
    </div>
  );
}
