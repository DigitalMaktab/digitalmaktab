import React from "react";
interface SidebarMainTitleProps {
  title: string;
}

const AppMenuMainTitle: React.FC<SidebarMainTitleProps> = React.memo(
  ({ title }) => (
    <li className="sidebar-main-title" aria-label={title}>
      {title}
    </li>
  )
);

export default AppMenuMainTitle;
