import FeatherIcon from "feather-icons-react";
import React from "react";
import { ReactSVG } from "react-svg";

const AppBreadCrumb = () => {
  return (
    <div className="container-fluid">
      <div className="row page-title">
        <div className="col-sm-6">
          <h3>Default dashboard</h3>
        </div>
        <div className="col-sm-6">
          <nav>
            <ol className="breadcrumb justify-content-sm-end align-items-center">
              <li className="breadcrumb-item">
                <FeatherIcon icon="home" className="svg-color" />
              </li>
              <li className="breadcrumb-item">Dashboard</li>
              <li className="breadcrumb-item active">Default</li>
            </ol>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default AppBreadCrumb;
