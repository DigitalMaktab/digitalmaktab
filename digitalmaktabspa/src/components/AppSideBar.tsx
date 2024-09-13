import React from "react";

const AppSideBar = () => {
  return (
    <>
      <div className="overlay"></div>
      <aside className="page-sidebar" data-sidebar-layout="stroke-svg">
        <div className="left-arrow" id="left-arrow">
          <svg className="feather">
            <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#arrow-left"></use>
          </svg>
        </div>
        <div id="sidebar-menu">
          <ul className="sidebar-menu" id="simple-bar">
            <li className="pin-title sidebar-list p-0">
              <h5 className="sidebar-main-title">Pinned</h5>
            </li>
            <li className="line pin-line"></li>
            <li className="sidebar-main-title">General</li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Home"></use>
                </svg>
                <span>Dashboard</span>
                <div className="badge badge-primary rounded-pill">3</div>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="index.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Default
                  </a>
                </li>
                <li>
                  <a href="dashboard-02.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Ecommerce
                  </a>
                </li>
                <li>
                  <a href="dashboard-03.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Project
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pie"></use>
                </svg>
                <span>Widgets</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="general-widget.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    General
                  </a>
                </li>
                <li>
                  <a href="chart-widget.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Chart
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Document"></use>
                </svg>
                <span>Page Layout</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="box-layout.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Box Layout
                  </a>
                  <a href="layout-rtl.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    RTL
                  </a>
                  <a href="layout-dark.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Dark
                  </a>
                </li>
              </ul>
            </li>
            <li className="line"> </li>
            <li className="sidebar-main-title">Applications</li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Info-circle"></use>
                </svg>
                <span>Project</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="project-list.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Project List
                  </a>
                </li>
                <li>
                  {" "}
                  <a href="projectcreate.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Create New
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="file-manager.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Paper"></use>
                </svg>
                <span>File Manager</span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="kanban-board.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Wallet"></use>
                </svg>
                <span>Kanban Board</span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Bag"></use>
                </svg>
                <span>Ecommerce</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="product.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Product
                  </a>
                </li>
                <li>
                  <a href="product-page.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Product Page{" "}
                  </a>
                </li>
                <li>
                  <a href="add-products.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Add Product{" "}
                  </a>
                </li>
                <li>
                  <a href="list-products.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Product List
                  </a>
                </li>
                <li>
                  <a href="payment-details.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Payment Details{" "}
                  </a>
                </li>
                <li>
                  <a href="order-history.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Order History{" "}
                  </a>
                </li>
                <li>
                  <a className="submenu-title" href="javascript:void(0)">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Invoice
                    <svg className="feather">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                    </svg>
                  </a>
                  <ul className="according-submenu">
                    <li>
                      <a href="invoice-1.html">Invoice-1</a>
                    </li>
                    <li>
                      <a href="invoice-2.html">Invoice-2</a>
                    </li>
                    <li>
                      <a href="invoice-3.html">Invoice-3</a>
                    </li>
                    <li>
                      <a href="invoice-4.html">Invoice-4</a>
                    </li>
                    <li>
                      <a href="invoice-5.html">Invoice-5</a>
                    </li>
                    <li>
                      <a href="invoice-template.html">Invoice-6</a>
                    </li>
                  </ul>
                </li>
                <li>
                  <a href="cart.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Cart{" "}
                  </a>
                </li>
                <li>
                  <a href="list-wish.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Wishlist{" "}
                  </a>
                </li>
                <li>
                  <a href="checkout.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Checkout{" "}
                  </a>
                </li>
                <li>
                  <a href="pricing.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Pricing
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="letter-box.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Message"></use>
                </svg>
                <span>Letter Box</span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Chat"></use>
                </svg>
                <span>Chat</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="private-chat.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Private Chat
                  </a>
                </li>
                <li>
                  <a href="group-chat.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Group Chat
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Profile"></use>
                </svg>
                <span>Users</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="user-profile.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    User Profile
                  </a>
                </li>
                <li>
                  <a href="edit-profile.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    User Edit
                  </a>
                </li>
                <li>
                  <a href="user-cards.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    User Cards
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="bookmark.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Bookmark"></use>
                </svg>
                <span>Bookmarks</span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="contacts.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Contacts"></use>
                </svg>
                <span>Contacts</span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="task.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Tick-square"></use>
                </svg>
                <span>Tasks </span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="calendar-basic.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Calendar"></use>
                </svg>
                <span>Calendar</span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="social-app.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Camera"></use>
                </svg>
                <span>Social App </span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="to-do.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Edit"></use>
                </svg>
                <span>To-Do </span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="search.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Search"></use>
                </svg>
                <span>Search Result</span>
              </a>
            </li>
            <li className="line"></li>
            <li className="sidebar-main-title">Components</li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="buttons.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#More-box"></use>
                </svg>
                <span>Buttons </span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Folder"></use>
                </svg>
                <span>Ui Kits</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="typography.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Typography
                  </a>
                </li>
                <li>
                  <a href="avatars.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Avatars
                  </a>
                </li>
                <li>
                  <a href="grid.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Grid
                  </a>
                </li>
                <li>
                  <a href="helper-classes.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Helper Classes
                  </a>
                </li>
                <li>
                  <a href="tag-pills.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Tag & Pills
                  </a>
                </li>
                <li>
                  <a href="progress.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Progress
                  </a>
                </li>
                <li>
                  <a href="popover.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Popover
                  </a>
                </li>
                <li>
                  <a href="tooltip.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Tooltip
                  </a>
                </li>
                <li>
                  <a href="alert.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Alert
                  </a>
                </li>
                <li>
                  <a href="modal.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Modal
                  </a>
                </li>
                <li>
                  <a href="dropdown.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Dropdown
                  </a>
                </li>
                <li>
                  <a href="according.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Accordion
                  </a>
                </li>
                <li>
                  <a href="bootstrap-tabs.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Tabs
                  </a>
                </li>
                <li>
                  <a href="list.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Lists
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Ticket-star"></use>
                </svg>
                <span>Bonus Ui</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="scrollable.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Scrollable{" "}
                  </a>
                </li>
                <li>
                  <a href="breadcrumbs.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Breadcrumb
                  </a>
                </li>
                <li>
                  <a href="pagination.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Pagination
                  </a>
                </li>
                <li>
                  <a href="ribbons.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Ribbons
                  </a>
                </li>
                <li>
                  <a href="tree.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Tree View
                  </a>
                </li>
                <li>
                  <a href="toasts.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Toast
                  </a>
                </li>
                <li>
                  <a href="rating.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Rating
                  </a>
                </li>
                <li>
                  <a href="dropzone.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Dropzone
                  </a>
                </li>
                <li>
                  <a href="tour.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Tour
                  </a>
                </li>
                <li>
                  <a href="sweetalert.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Sweetalert2
                  </a>
                </li>
                <li>
                  <a href="modal-animated.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Animated Modal
                  </a>
                </li>
                <li>
                  <a href="slider.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Slider
                  </a>
                </li>
                <li>
                  <a href="range-slider.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Range Slider
                  </a>
                </li>
                <li>
                  <a href="image-cropper.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Image Cropper
                  </a>
                </li>
                <li>
                  <a href="basic-card.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Basic Card
                  </a>
                </li>
                <li>
                  <a href="creative-card.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Creative Card
                  </a>
                </li>
                <li>
                  <a href="dragabble.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Draggable Card
                  </a>
                </li>
                <li>
                  <a href="timeline.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Timeline
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Category"></use>
                </svg>
                <span>Animation</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="wow.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Wow Animation
                  </a>
                </li>
                <li>
                  <a href="aos.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    AOS Animation
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Activity"></use>
                </svg>
                <span>Icons</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="flag-icon.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Flag Icon
                  </a>
                </li>
                <li>
                  <a href="font-awesome.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Fontawesome Icon
                  </a>
                </li>
                <li>
                  <a href="feather-icon.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Feather Icon
                  </a>
                </li>
                <li>
                  <a href="iconly-icon.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Iconly Icon
                  </a>
                </li>
                <li>
                  <a href="ico-icon.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Ico Icon
                  </a>
                </li>
                <li>
                  <a href="themify-icon.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Themify icon
                  </a>
                </li>
                <li>
                  <a href="whether-icon.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Whether Icon
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Chart"></use>
                </svg>
                <span>Charts</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="apexchart.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Apexchart
                  </a>
                </li>
                <li>
                  <a href="chartist.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Chartist
                  </a>
                </li>
                <li>
                  <a href="chartjs.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Chartjs
                  </a>
                </li>
              </ul>
            </li>
            <li className="line"></li>
            <li className="sidebar-main-title">Forms & table</li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Filter"></use>
                </svg>
                <span>Form Controls</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="base_input.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Base Input
                  </a>
                </li>
                <li>
                  <a href="radio-checkbox-control.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Check & Radio Box
                  </a>
                </li>
                <li>
                  <a href="input-group.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Input Groups
                  </a>
                </li>
                <li>
                  <a href="megaoptions.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Mega Options
                  </a>
                </li>
                <li>
                  <a href="form-validation.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Form validation
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Scan"></use>
                </svg>
                <span>Form Widgets</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="datepicker.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Date picker{" "}
                  </a>
                </li>
                <li>
                  <a href="touchspin.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Touchspin
                  </a>
                </li>
                <li>
                  <a href="select2.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    select 2
                  </a>
                </li>
                <li>
                  <a href="switch.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Switch
                  </a>
                </li>
                <li>
                  <a href="typeahead.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Typeahead
                  </a>
                </li>
                <li>
                  <a href="clipboard.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Clipboard
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Icon-plus"></use>
                </svg>
                <span>Form Layout</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="form-wizard.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Form wizard 1
                  </a>
                </li>
                <li>
                  <a href="form-wizard-two.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Form wizard 2
                  </a>
                </li>
                <li>
                  <a href="two-factor.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Two Factor
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Edit-line"></use>
                </svg>
                <span>Tables</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a className="submenu-title" href="javascript:void(0)">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Bootstrap Table
                    <svg className="feather">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                    </svg>
                  </a>
                  <ul className="according-submenu">
                    <li>
                      <a href="basic-table.html">Basic Tables</a>
                    </li>
                    <li>
                      <a href="table_components.html">Table Components</a>
                    </li>
                  </ul>
                </li>
                <li>
                  <a className="submenu-title" href="javascript:void(0)">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Data Tables
                    <svg className="feather">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                    </svg>
                  </a>
                  <ul className="according-submenu">
                    <li>
                      <a href="datatable-basic-init.html">Basic Init</a>
                    </li>
                    <li>
                      <a href="datatable-advance.html">Advance Init</a>
                    </li>
                    <li>
                      <a href="datatable-API.html">API</a>
                    </li>
                    <li>
                      <a href="datatable-data-source.html">Data Sources</a>
                    </li>
                  </ul>
                </li>
                <li>
                  <a href="datatable-ext-autofill.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Ex. Data Tables
                  </a>
                </li>
                <li>
                  <a href="jsgrid-table.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Js Grid Table
                  </a>
                </li>
              </ul>
            </li>
            <li className="line"> </li>
            <li className="sidebar-main-title">Pages</li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="landing-page.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Wallet"></use>
                </svg>
                <span>Landing Page</span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="sample-page.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Paper-plus"></use>
                </svg>
                <span>Sample Page</span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="translate.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Play"></use>
                </svg>
                <span>Translate</span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a
                className="sidebar-link"
                href="https://admin.pixelstrap.net/edmin/starter-kit/index.html"
                target="_blank"
              >
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Star"></use>
                </svg>
                <span>Starter kit</span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Password"></use>
                </svg>
                <span>Others</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a className="submenu-title" href="javascript:void(0)">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Error Page
                    <svg className="feather">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                    </svg>
                  </a>
                  <ul className="according-submenu">
                    <li>
                      <a href="error-page1.html">Error Page 1</a>
                    </li>
                    <li>
                      <a href="error-page2.html">Error Page 2</a>
                    </li>
                    <li>
                      <a href="error-page3.html">Error Page 3</a>
                    </li>
                    <li>
                      <a href="error-page4.html">Error Page 4</a>
                    </li>
                    <li>
                      <a href="error-page5.html">Error Page 5</a>
                    </li>
                    <li>
                      <a href="error-page6.html">Error Page 6</a>
                    </li>
                  </ul>
                </li>
                <li>
                  <a className="submenu-title" href="javascript:void(0)">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Authentication
                    <svg className="feather">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                    </svg>
                  </a>
                  <ul className="according-submenu">
                    <li>
                      <a href="login.html">Login simple</a>
                    </li>
                    <li>
                      <a href="login_one.html">Login With Bg Image</a>
                    </li>
                    <li>
                      <a href="login_two.html">Login With Image Two</a>
                    </li>
                    <li>
                      <a href="login-bs-validation.html">
                        Login With Validation
                      </a>
                    </li>
                    <li>
                      <a href="login-bs-tt-validation.html">
                        Login With Tooltip
                      </a>
                    </li>
                    <li>
                      <a href="login-sa-validation.html">
                        Login With Sweetalert
                      </a>
                    </li>
                    <li>
                      <a href="sign-up.html">Register Simple</a>
                    </li>
                    <li>
                      <a href="sign-up-one.html">Register With Bg Image</a>
                    </li>
                    <li>
                      <a href="sign-up-two.html">Register With Image Two</a>
                    </li>
                    <li>
                      <a href="sign-up-wizard.html">Register Wizard</a>
                    </li>
                    <li>
                      <a href="unlock.html">Unlock User</a>
                    </li>
                    <li>
                      <a href="forget-password.html">Forget Password</a>
                    </li>
                    <li>
                      <a href="reset-password.html">Reset Password</a>
                    </li>
                    <li>
                      <a href="maintenance.html">Maintenance</a>
                    </li>
                  </ul>
                </li>
                <li>
                  <a className="submenu-title" href="javascript:void(0)">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Coming Soon
                    <svg className="feather">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                    </svg>
                  </a>
                  <ul className="according-submenu">
                    <li>
                      <a href="comingsoon.html">Coming Simple</a>
                    </li>
                    <li>
                      <a href="comingsoon-bg-video.html">
                        Coming With Bg Video
                      </a>
                    </li>
                    <li>
                      <a href="comingsoon-bg-img.html">Coming With Bg Image</a>
                    </li>
                  </ul>
                </li>
                <li>
                  <a className="submenu-title" href="javascript:void(0)">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Email Template
                    <svg className="feather">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                    </svg>
                  </a>
                  <ul className="according-submenu">
                    <li>
                      <a href="basic-template.html">Basic Email</a>
                    </li>
                    <li>
                      <a href="email-header.html">Basic With Header</a>
                    </li>
                    <li>
                      <a href="template-email.html">Ecomerce Template</a>
                    </li>
                    <li>
                      <a href="template-email-2.html">Email Template 2</a>
                    </li>
                    <li>
                      <a href="ecommerce-templates.html">Ecommerce Email</a>
                    </li>
                    <li>
                      <a href="email-order-success.html">Order Success </a>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
            <li className="line"> </li>
            <li className="sidebar-main-title">MISCELLANEOUS</li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Gallery"></use>
                </svg>
                <span>Gallery</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="gallery.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Gallery Grid
                  </a>
                </li>
                <li>
                  <a href="gallery-with-description.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Gallery Grid Desc
                  </a>
                </li>
                <li>
                  <a href="gallery-masonry.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Masonry Gallery
                  </a>
                </li>
                <li>
                  <a href="masonry-gallery-with-disc.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Masonry With Desc
                  </a>
                </li>
                <li>
                  <a href="gallery-hover.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Hover Effects
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Game"></use>
                </svg>
                <span>Blog</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="blog.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Blog Details
                  </a>
                </li>
                <li>
                  <a href="blog-single.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Blog Single
                  </a>
                </li>
                <li>
                  <a href="add-post.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Add Post
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="faq.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Danger"></use>
                </svg>
                <span>FAQ</span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Filter-2"></use>
                </svg>
                <span>Job Search</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="job-cards-view.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Cards View
                  </a>
                </li>
                <li>
                  <a href="job-list-view.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    List View
                  </a>
                </li>
                <li>
                  <a href="job-details.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Job Details
                  </a>
                </li>
                <li>
                  <a href="job-apply.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Apply
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Work"></use>
                </svg>
                <span>Learning</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="learning-list-view.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Learning List
                  </a>
                </li>
                <li>
                  <a href="learning-detailed.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Detailed Course
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="pinned-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
                </svg>
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Discovery"></use>
                </svg>
                <span>Maps</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  <a href="data-map.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Data Maps
                  </a>
                </li>
                <li>
                  <a href="vector-map.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Vector Maps
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="javascript:void(0)">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Shield"></use>
                </svg>
                <span>Editors</span>
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-right"></use>
                </svg>
              </a>
              <ul className="sidebar-submenu">
                <li>
                  {" "}
                  <a href="quilleditor.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    Quilljs Editor
                  </a>
                </li>
                <li>
                  <a href="ace-code-editor.html">
                    <svg className="svg-menu">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                    </svg>
                    ACE Code Editor
                  </a>
                </li>
              </ul>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="knowledgebase.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Setting"></use>
                </svg>
                <span>Knowledgebase</span>
              </a>
            </li>
            <li className="sidebar-list">
              <svg className="pinned-icon">
                <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pin"></use>
              </svg>
              <a className="sidebar-link" href="support-ticket.html">
                <svg className="stroke-icon">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Ticket"></use>
                </svg>
                <span>Support Ticket</span>
              </a>
            </li>
          </ul>
        </div>
        <div className="right-arrow" id="right-arrow">
          <svg className="feather">
            <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#arrow-right"></use>
          </svg>
        </div>
      </aside>
    </>
  );
};

export default AppSideBar;
