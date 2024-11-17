import React, { useState } from "react";
import { TabProps } from "./properties/TabProps";

const Tabs: React.FC<TabProps> = ({ tabs, defaultActiveTab }) => {
  const [activeTab, setActiveTab] = useState(defaultActiveTab || tabs[0].id);

  return (
    <div>
      <ul className="nav nav-tabs border-tab">
        {tabs.map((tab) => (
          <li key={tab.id} className="nav-item">
            <button
              className={`nav-link ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon && <span className="me-2">{tab.icon}</span>}
              {tab.title}
            </button>
          </li>
        ))}
      </ul>
      <div className="tab-content mt-3">
        {tabs.map(
          (tab) =>
            activeTab === tab.id && (
              <div key={tab.id} className="tab-pane fade show active">
                {tab.content}
              </div>
            )
        )}
      </div>
    </div>
  );
};

export default Tabs;
