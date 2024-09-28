import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AppMenuItem from "../menu/AppMenuItem";
import { BrowserRouter } from "react-router-dom";

describe("AppMenuItem", () => {
  const mockPropsWithSubMenu = {
    label: "MockProject",
    icon: <svg>icon</svg>,
    subMenu: [
      { label: "Mock Project List", link: "/projects" },
      { label: "Mock Create New", link: "/projects/new" },
    ],
    isActive: true,
    onMenuClick: jest.fn(),
    onSubMenuClick: jest.fn(),
    activeSubMenu: null,
  };

  const mockPropsWithoutSubMenu = {
    label: "Dashboard",
    icon: <svg>icon</svg>,
    link: "/dashboard",
    isActive: false,
    onMenuClick: jest.fn(),
    onSubMenuClick: jest.fn(),
    activeSubMenu: null,
  };

  it("renders the menu item with a link if no submenu is provided", () => {
    render(
      <BrowserRouter>
        <AppMenuItem {...mockPropsWithoutSubMenu} />
      </BrowserRouter>
    );

    // Use getByRole to target the link
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });

  it("expands and collapses submenu when clicked", async () => {
    render(
      <BrowserRouter>
        <AppMenuItem {...mockPropsWithSubMenu} />
      </BrowserRouter>
    );

    // Get the link element for the main menu item "Project"
    const projectLink = screen.getByRole("link", { name: /mockproject/i });

    // Simulate a click on the Project link
    fireEvent.click(projectLink);
    const projectList = await screen.findByText(/mock project list/i);
    const createNew = await screen.findByText(/mock create new/i);
    // Check that the submenu items become visible
    expect(projectList).toBeVisible();
    expect(createNew).toBeVisible();
  });

  it("renders a badge if provided", () => {
    render(
      <BrowserRouter>
        <AppMenuItem {...mockPropsWithoutSubMenu} badge="3" />
      </BrowserRouter>
    );

    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
