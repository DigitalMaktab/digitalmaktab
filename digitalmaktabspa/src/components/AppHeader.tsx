import React, { useEffect, useRef, useState } from "react";
import FeatherIcon from "feather-icons-react";
import AppImg from "./AppImg";
import { AppHeaderProps } from "./properties/ToggleSideBarProps";

interface DropdownState {
  [key: string]: boolean; // Dynamically handle multiple dropdowns
}

const AppHeader: React.FC<AppHeaderProps> = ({ onSidebarToggle }) => {
  // Set the type of dropdownRefs to be HTMLLIElement[]
  const dropdownRefs = useRef<HTMLLIElement[]>([]);
  const [dropdownState, setDropdownState] = useState<DropdownState>({});

  const toggleDropdown = (dropdownKey: string) => {
    setDropdownState((prevState) => ({
      ...prevState,
      [dropdownKey]: !prevState[dropdownKey],
    }));
  };

  const handleBodyClick = (event: MouseEvent) => {
    if (
      !dropdownRefs.current.some(
        (dropdown) => dropdown && dropdown.contains(event.target as Node)
      )
    ) {
      setDropdownState({});
    }
  };

  useEffect(() => {
    document.body.addEventListener("click", handleBodyClick);
    return () => {
      document.body.removeEventListener("click", handleBodyClick);
    };
  }, []);

  return (
    <header className="page-header row">
      <div className="logo-wrapper d-flex align-items-center col-auto">
        <a href="index.html">
          <AppImg
            className="for-light"
            src={`${process.env.PUBLIC_URL}/assets/images/logo/logo.png`}
          />
          <AppImg
            className="for-dark"
            src={`${process.env.PUBLIC_URL}/assets/images/logo/dark-logo.png`}
          />
        </a>
        <a
          className="close-btn"
          href="/admin-dashboard"
          onClick={(e) => {
            e.preventDefault();
            onSidebarToggle();
          }}
        >
          <div className="toggle-sidebar">
            <div className="line"></div>
            <div className="line"></div>
            <div className="line"></div>
          </div>
        </a>
      </div>
      <div className="page-main-header col">
        <div className="header-left d-lg-block d-none">
          <form className="search-form mb-0">
            <div className="input-group">
              <span className="input-group-text pe-0">
                <FeatherIcon icon="search" className="svg-color" />
              </span>
              <input
                className="form-control"
                type="text"
                placeholder="Search anything..."
              />
            </div>
          </form>
        </div>
        <div className="nav-right">
          <ul className="header-right">
            <li className="modes d-flex">
              <a className="dark-mode">
                <FeatherIcon icon="moon" />
              </a>
            </li>
            <li className="serchinput d-lg-none d-flex">
              <a className="search-mode">
                <FeatherIcon icon="search" className="svg-color" />
              </a>
              <div className="form-group search-form">
                <input type="text" placeholder="Search here..." />
              </div>
            </li>
            <li
              className="custom-dropdown"
              ref={(el) => (dropdownRefs.current[0] = el!)}
            >
              <div
                onClick={(e) => {
                  e.preventDefault();
                  toggleDropdown("notification");
                }}
              >
                <FeatherIcon icon="bell" className="svg-color" />
              </div>
              <span className="badge rounded-pill badge-secondary">3</span>
              <div
                className={`custom-menu notification-dropdown py-0 overflow-hidden ${
                  dropdownState.notification ? "show" : ""
                }`}
              >
                <h5 className="title bg-primary-light">
                  Notifications{" "}
                  <a href="private-chat.html">
                    <span className="font-primary">View</span>
                  </a>
                </h5>
                <ul className="activity-update">
                  <li className="d-flex align-items-center b-l-primary">
                    <div className="flex-grow-1">
                      {" "}
                      <span>Just Now</span>
                      <a href="private-chat.html">
                        <h5>What`s the project report update?</h5>
                      </a>
                      <h6>Rick Novak</h6>
                    </div>
                    <div className="flex-shrink-0">
                      {" "}
                      <img
                        className="b-r-15 img-40"
                        src="../assets/images/avatar/10.jpg"
                        alt=""
                      />
                    </div>
                  </li>
                  <li className="d-flex align-items-center b-l-secondary">
                    <div className="flex-grow-1">
                      {" "}
                      <span>12:47 am</span>
                      <a href="private-chat.html">
                        <h5>James created changelog page</h5>
                      </a>
                      <h6>Susan Connor</h6>
                    </div>
                    <div className="flex-shrink-0">
                      {" "}
                      <img
                        className="b-r-15 img-40"
                        src="../assets/images/avatar/4.jpg"
                        alt=""
                      />
                    </div>
                  </li>
                  <li className="d-flex align-items-center b-l-tertiary">
                    <div className="flex-grow-1">
                      {" "}
                      <span>06:10 pm</span>
                      <a href="private-chat.html">
                        <h5>Polly edited Contact page</h5>
                      </a>
                      <h6>Roger Lum</h6>
                    </div>
                    <div className="flex-shrink-0">
                      {" "}
                      <img
                        className="b-r-15 img-40"
                        src="../assets/images/avatar/1.jpg"
                        alt=""
                      />
                    </div>
                  </li>
                  <li className="mt-3 d-flex justify-content-center">
                    <div className="button-group">
                      <a className="btn btn-secondary" href="private-chat.html">
                        All Notification
                      </a>
                    </div>
                  </li>
                </ul>
              </div>
            </li>
            <li
              className="custom-dropdown"
              ref={(el) => (dropdownRefs.current[1] = el!)} // Assign ref to the second dropdown
            >
              <div
                onClick={(e) => {
                  e.preventDefault();
                  toggleDropdown("bookmark");
                }}
              >
                <FeatherIcon icon="star" className="svg-color" />
              </div>
              <div
                className={`custom-menu bookmark-dropdown py-0 overflow-hidden ${
                  dropdownState.bookmark ? "show" : ""
                }`}
              >
                <h5 className="title bg-primary-light">Bookmark</h5>
                <ul>
                  <li>
                    <form className="mb-3">
                      <div className="input-group">
                        <input
                          className="form-control"
                          type="text"
                          placeholder="Search Bookmark..."
                        />
                        <span className="input-group-text">
                          <FeatherIcon icon="search" className="svg-color" />
                        </span>
                      </div>
                    </form>
                  </li>
                  <li className="d-flex align-items-center bg-light-primary">
                    <div className="flex-shrink-0 me-2">
                      <a href="index.html">
                        <FeatherIcon icon="home" className="svg-color" />
                      </a>
                    </div>
                    <div className="d-flex justify-content-between align-items-center w-100">
                      <a href="index.html">Dashboard</a>
                      <FeatherIcon icon="star" className="svg-color" />
                    </div>
                  </li>
                  <li className="d-flex align-items-center bg-light-secondary">
                    <div className="flex-shrink-0 me-2">
                      <a href="to-do.html">
                        <FeatherIcon icon="pie-chart" className="svg-color" />
                      </a>
                    </div>
                    <div className="d-flex justify-content-between align-items-center w-100">
                      <a href="to-do.html">To-do</a>
                      <FeatherIcon icon="star" className="svg-color" />
                    </div>
                  </li>
                  <li className="d-flex align-items-center bg-light-tertiary">
                    <div className="flex-shrink-0 me-2">
                      <a href="apexchart.html">
                        <FeatherIcon icon="bar-chart" className="svg-color" />
                      </a>
                    </div>
                    <div className="d-flex justify-content-between align-items-center w-100">
                      <a href="apexchart.html">Chart</a>
                      <FeatherIcon icon="star" className="svg-color" />
                    </div>
                  </li>
                </ul>
              </div>
            </li>
            <li
              className="custom-dropdown"
              ref={(el) => (dropdownRefs.current[2] = el!)} // Assign ref to the second dropdown
            >
              <div
                onClick={(e) => {
                  e.preventDefault();
                  toggleDropdown("cart");
                }}
              >
                <FeatherIcon icon="shopping-bag" className="svg-color" />
              </div>
              <div
                className={`custom-menu cart-dropdown py-0 overflow-hidden ${
                  dropdownState.cart ? "show" : ""
                }`}
              >
                <h5 className="title bg-primary-light">
                  Cart
                  <span>
                    Total : <span className="font-primary">4350.9</span>
                  </span>
                </h5>
                <ul>
                  <li className="cartbox d-flex bg-light-secondary">
                    <div className="flex-shrink-0 border-secondary">
                      <img
                        src="../assets/images/dashboard2/product/2.png"
                        alt=""
                      />
                    </div>
                    <div className="touchpin-details">
                      <a href="cart.html">
                        <h5>Microwave</h5>
                      </a>
                      <span>$1450.45</span>
                      <div className="touchspin-wrapper">
                        <button className="decrement-touchspin btn-touchspin">
                          <FeatherIcon icon="minus" className="svg-color" />
                        </button>
                        <input
                          className="form-control input-touchspin bg-light-secondary"
                          type="number"
                          value="5"
                        />
                        <button className="increment-touchspin btn-touchspin">
                          <FeatherIcon icon="plus" className="svg-color" />
                        </button>
                      </div>
                      <button className="btn btn-close"></button>
                    </div>
                  </li>
                  <li className="cartbox d-flex bg-light-tertiary">
                    <div className="flex-shrink-0 border-tertiary">
                      <img
                        src="../assets/images/dashboard2/product/3.png"
                        alt=""
                      />
                    </div>
                    <div className="touchpin-details">
                      <a href="cart.html">
                        <h5>Mackup Kit</h5>
                      </a>
                      <span>$300.45</span>
                      <div className="touchspin-wrapper">
                        <button className="decrement-touchspin btn-touchspin">
                          <FeatherIcon icon="minus" className="svg-color" />
                        </button>
                        <input
                          className="form-control input-touchspin bg-light-tertiary"
                          type="number"
                          value="5"
                        />
                        <button className="increment-touchspin btn-touchspin">
                          <FeatherIcon icon="plus" className="svg-color" />
                        </button>
                      </div>
                      <button className="btn btn-close"></button>
                    </div>
                  </li>
                  <li className="mt-3 p-0 d-flex justify-content-center">
                    <div>
                      <a className="btn btn-secondary" href="checkout.html">
                        Checkout
                      </a>
                    </div>
                  </li>
                </ul>
              </div>
            </li>
            <li
              className="custom-dropdown"
              ref={(el) => (dropdownRefs.current[3] = el!)} // Assign ref to the second dropdown
            >
              <div
                onClick={(e) => {
                  e.preventDefault();
                  toggleDropdown("message");
                }}
              >
                <FeatherIcon icon="inbox" className="svg-color" />
              </div>
              <span className="badge rounded-pill badge-tertiary">3</span>
              <div
                className={`custom-menu message-dropdown py-0 overflow-hidden ${
                  dropdownState.message ? "show" : ""
                }`}
              >
                <h5 className="title bg-primary-light">Messages</h5>
                <ul>
                  <li className="d-flex b-t-primary">
                    <div className="d-block">
                      <a href="letter-box.html">
                        <h5>Design meeting</h5>
                      </a>
                      <h6>
                        <FeatherIcon icon="clock" />
                        <span>Just Now</span>
                      </h6>
                    </div>
                    <div className="badge badge-light-danger">
                      <FeatherIcon icon="clock" />
                      <span>Open</span>
                    </div>
                  </li>
                  <li className="d-flex b-t-secondary">
                    <div className="d-block">
                      <a href="letter-box.html">
                        <h5>Weekly scurm Meeting</h5>
                      </a>
                      <h6>
                        <FeatherIcon icon="clock" />
                        <span>1 Hour Ago</span>
                      </h6>
                    </div>
                    <div className="badge badge-light-danger">
                      <FeatherIcon icon="clock" />
                      <span>Open</span>
                    </div>
                  </li>
                  <li className="d-flex b-t-tertiary">
                    <div className="d-block">
                      <a href="letter-box.html">
                        <h5>Check your login page</h5>
                      </a>
                      <h6>
                        <FeatherIcon icon="clock" />
                        <span>2 Hour Ago</span>
                      </h6>
                    </div>
                    <div className="badge badge-light-success">
                      <FeatherIcon icon="clock" />
                      <span>Closed</span>
                    </div>
                  </li>
                </ul>
              </div>
            </li>
            <li
              className="profile-dropdown custom-dropdown "
              ref={(el) => (dropdownRefs.current[4] = el!)} // Assign ref to the second dropdown
            >
              <div
                className="d-flex align-items-center"
                onClick={(e) => {
                  e.preventDefault();
                  toggleDropdown("profile");
                }}
              >
                <img src="../assets/images/profile.png" alt="" />
                <div className="flex-grow-1">
                  <h5>Wade Warren</h5>
                  <span>UI Designer</span>
                </div>
              </div>
              <div
                className={`custom-menu overflow-hidden ${
                  dropdownState.profile ? "show" : ""
                }`}
              >
                <ul>
                  <li className="d-flex">
                    <FeatherIcon icon="home" />
                    <a className="ms-2" href="user-profile.html">
                      Account
                    </a>
                  </li>
                  <li className="d-flex">
                    <FeatherIcon icon="lock" />
                    <a className="ms-2" href="user-profile.html">
                      Logout
                    </a>
                  </li>
                </ul>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
