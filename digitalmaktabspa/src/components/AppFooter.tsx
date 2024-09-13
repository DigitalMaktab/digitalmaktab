import React from "react";
import { AiFillHeart } from "react-icons/ai";

const AppFooter = () => {
  return (
    <footer className="footer">
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-6 footer-copyright">
            <p className="mb-0">Copyright 2024 © Digital Maktab</p>
          </div>
          <div className="col-md-6">
            <p className="float-end mb-0">
              Hand crafted &amp; made with <AiFillHeart size={20} color="red" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
