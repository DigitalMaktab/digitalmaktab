import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AppSideBar from "../AppSideBar";
import { BrowserRouter } from "react-router-dom";

const renderComponent = () =>
  render(
    <BrowserRouter>
      <AppSideBar isOpen={true} />
    </BrowserRouter>
  );

describe("AppSideBar", () => {
  it("render all menu titles", () => {
    renderComponent();
    expect(screen.getByText("General")).toBeInTheDocument();
  });

  it("renders all menu items", () => {
    renderComponent();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
  it("expands and collapses submenus when clicked", async () => {
    renderComponent();

    // Use getByRole to find the link element with the label 'Project'
    const projectLink = await screen.findByRole("link", { name: /project/i });

    // Simulate a click on the Project link
    fireEvent.click(projectLink);

    // Use async findByText to wait for the submenu to appear
    const projectList = await screen.findByText(/project list/i);
    const createNew = await screen.findByText(/create new/i);

    // Check that both submenu items are visible
    expect(projectList).toBeVisible();
    expect(createNew).toBeVisible();

    // Simulate another click to collapse the submenu
    fireEvent.click(projectLink);
    // Use queryByText to check if the submenu is no longer visible
    expect(projectList).not.toBeVisible();
    expect(createNew).not.toBeVisible();
  });
});
