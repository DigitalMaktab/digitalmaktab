import React, { useContext, useEffect, useState } from "react";
import { TabProps } from "./properties/TabProps";
import { AuthContext } from "../../helper/auth/AuthProvider";

const Tabs: React.FC<TabProps> = ({ tabs, defaultActiveTab }) => {
  const { userRole } = useContext(AuthContext);

  // Filter tabs based on roles
  const visibleTabs = tabs.filter(
    (tab) => !tab.roles || tab.roles.includes(userRole!)
  );

  const [activeTab, setActiveTab] = useState(
    defaultActiveTab && visibleTabs.find((tab) => tab.id === defaultActiveTab)
      ? defaultActiveTab
      : visibleTabs[0]?.id // Default to the first visible tab if the defaultActiveTab is not visible
  );

  // Adjust active tab if the current active tab becomes invalid
  useEffect(() => {
    if (!visibleTabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || ""); // Set to the first available visible tab or an empty string if none are available
    }
  }, [activeTab, visibleTabs]);

  return (
    <div>
      <ul className="nav nav-tabs border-tab">
        {visibleTabs.map((tab) => (
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
        {visibleTabs.map(
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
