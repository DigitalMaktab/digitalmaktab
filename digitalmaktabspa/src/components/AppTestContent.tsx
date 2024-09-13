import React from "react";

const AppTestContent = () => {
  return (
    <div className="container-fluid default-dashboard">
      <div className="row">
        <div className="col-sm-6 col-xl-4">
          <div className="card profile-greeting card-hover">
            <div className="card-body">
              <div className="img-overlay">
                <h1>Good day, Lena Miller</h1>
                <p>
                  Welcome to the Edmin family! We are delighted that you have
                  visited our dashboard.
                </p>
                <a className="btn btn-primary" href="pricing.html">
                  Go Premium
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="card project-card">
            <div className="card-header">
              <h4>Project Overview</h4>
              <div className="dropdown icon-dropdown">
                <button
                  className="btn dropdown-toggle"
                  id="userdropdown7"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="icon-more-alt"></i>
                </button>
                <div
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="userdropdown7"
                >
                  <a className="dropdown-item" href="#">
                    Weekly
                  </a>
                  <a className="dropdown-item" href="#">
                    Monthly
                  </a>
                  <a className="dropdown-item" href="#">
                    Yearly
                  </a>
                </div>
              </div>
            </div>
            <div className="card-body pt-0">
              <h4>
                56<span className="ms-1">Project</span>
              </h4>
              <div className="row align-items-center">
                <div className="col-5 custom-width">
                  <div className="progress progress-striped-primary">
                    <div
                      className="progress-bar"
                      style={{ width: "55%" }}
                      role="progressbar"
                      aria-valuenow={10}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                  <div className="progress progress-striped-secondary">
                    <div
                      className="progress-bar"
                      style={{ width: "60%" }}
                      role="progressbar"
                      aria-valuenow={10}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                  <div className="progress progress-striped-tertiary">
                    <div
                      className="progress-bar"
                      style={{ width: "45%" }}
                      role="progressbar"
                      aria-valuenow={10}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
                <div className="col-7 d-sm-none d-md-block">
                  <ul className="overview-details">
                    <li className="d-flex align-items-center">
                      <div className="circle-dot-primary">
                        <span></span>
                      </div>
                      <h5>
                        15
                        <span className="font-light ms-1">Signed</span>
                      </h5>
                    </li>
                    <li className="d-flex align-items-center">
                      <div className="circle-dot-secondary">
                        <span></span>
                      </div>
                      <h5>
                        62
                        <span className="font-light ms-1">Manager Review</span>
                      </h5>
                    </li>
                    <li className="d-flex align-items-center">
                      <div className="circle-dot-tertiary">
                        <span></span>
                      </div>
                      <h5>
                        20
                        <span className="font-light ms-1">Client Review</span>
                      </h5>
                    </li>
                  </ul>
                </div>
              </div>
              <button
                className="view-btn btn bg-light d-block w-100 position-relative"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                View project
                <svg className="feather">
                  <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#chevron-down"></use>
                </svg>
                <ul className="dropdown-menu dropdown-block">
                  <li>
                    <a className="dropdown-item" href="#">
                      Project
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="#">
                      Ecommerce
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="#">
                      Crypto
                    </a>
                  </li>
                </ul>
              </button>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-2">
          <div className="row">
            <div className="col-6 col-sm-12">
              <div className="card client-card card-hover">
                <div className="card-body">
                  <div className="row">
                    <div className="col-6 custom-width-1">
                      <h3 className="font-primary">457</h3>
                      <h5 className="f-w-600">Total Clients</h5>
                    </div>
                    <div className="col-6 custom-width-2">
                      <div className="client" id="client"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-sm-12">
              <div className="card client-card card-hover">
                <div className="card-body">
                  <div className="row">
                    <div className="col-6 custom-width-1">
                      <h3 className="font-secondary">541</h3>
                      <h5 className="f-w-600">New Project</h5>
                    </div>
                    <div className="col-6 custom-width-2">
                      <div className="project" id="project"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="card investing-card">
            <div className="card-header pb-0">
              <h4>Investing</h4>
              <div className="dropdown icon-dropdown">
                <button
                  className="btn dropdown-toggle"
                  id="userdropdown3"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="icon-more-alt"></i>
                </button>
                <div
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="userdropdown3"
                >
                  <a className="dropdown-item" href="#">
                    Weekly
                  </a>
                  <a className="dropdown-item" href="#">
                    Monthly
                  </a>
                  <a className="dropdown-item" href="#">
                    Yearly
                  </a>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="investing" id="investing"></div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-6">
          <div className="card invoice-card">
            <div className="card-header pb-0">
              <h4>All Invoices</h4>
              <div className="dropdown icon-dropdown">
                <button
                  className="btn dropdown-toggle"
                  id="userdropdown4"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="icon-more-alt"></i>
                </button>
                <div
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="userdropdown4"
                >
                  <a className="dropdown-item" href="#">
                    Weekly
                  </a>
                  <a className="dropdown-item" href="#">
                    Monthly
                  </a>
                  <a className="dropdown-item" href="#">
                    Yearly
                  </a>
                </div>
              </div>
            </div>
            <div className="card-body invoice-table checkbox-checked">
              <div className="table-responsive">
                <table className="table" id="all-invoice">
                  <thead>
                    <tr>
                      <th className="form-check">
                        <input className="form-check-input" type="checkbox" />
                      </th>
                      <th>Invoice Id</th>
                      <th>Client Name</th>
                      <th>Project</th>
                      <th>Created Date</th>
                      <th>Amount </th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <input className="form-check-input" type="checkbox" />
                      </td>
                      <td>#IH63390</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="flex-shrink-0">
                            <img
                              className="b-r-10"
                              src="../assets/images/avatar/10.jpg"
                              alt=""
                            />
                          </div>
                          <div className="flex-grow-1">
                            <a href="user-profile.html">
                              <h6 className="f-w-500">Elle Amberson</h6>
                            </a>
                            <span className="font-light f-w-400 f-13">
                              Elle34@gmail.com
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>Website</td>
                      <td>10-10-2024</td>
                      <td>$5411.55</td>
                      <td>
                        <button className="btn edge-btn f-13 w-100 btn-light-primary">
                          Done
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <input className="form-check-input" type="checkbox" />
                      </td>
                      <td>#F749U8</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="flex-shrink-0">
                            <img
                              className="b-r-10"
                              src="../assets/images/avatar/11.jpg"
                              alt=""
                            />
                          </div>
                          <div className="flex-grow-1">
                            <a href="user-profile.html">
                              <h6 className="f-w-500">Anna Catmire</h6>
                            </a>
                            <span className="font-light f-w-400 f-13">
                              Anna12@gmail.com
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>Mobile App</td>
                      <td>15-09-2024</td>
                      <td>$6589.36</td>
                      <td>
                        <button className="btn edge-btn f-13 w-100 btn-light-tertiary">
                          Pending
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <input className="form-check-input" type="checkbox" />
                      </td>
                      <td>#RT5094</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="flex-shrink-0">
                            <img
                              className="b-r-10"
                              src="../assets/images/avatar/1.jpg"
                              alt=""
                            />
                          </div>
                          <div className="flex-grow-1">
                            <a href="user-profile.html">
                              <h6 className="f-w-500">Laura Dagson</h6>
                            </a>
                            <span className="font-light f-w-400 f-13">
                              Laura@gmail.com
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>Wordpress</td>
                      <td>23-05-2024</td>
                      <td>$9655.16</td>
                      <td>
                        <button className="btn edge-btn f-13 w-100 btn-light-primary">
                          Done
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <input className="form-check-input" type="checkbox" />
                      </td>
                      <td>#PZ7384</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="flex-shrink-0">
                            <img
                              className="b-r-10"
                              src="../assets/images/avatar/3.jpg"
                              alt=""
                            />
                          </div>
                          <div className="flex-grow-1">
                            <a href="user-profile.html">
                              <h6 className="f-w-500">Rachel Green</h6>
                            </a>
                            <span className="font-light f-w-400 f-13">
                              Rache87@gmail.com
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>Service</td>
                      <td>15-02-2024</td>
                      <td>$5984.62</td>
                      <td>
                        <button className="btn edge-btn f-13 w-100 btn-light-danger">
                          Overdue
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card invest-card">
            <div className="card-header">
              <h4>Total Investment</h4>
              <div className="dropdown icon-dropdown">
                <button
                  className="btn dropdown-toggle"
                  id="userdropdown2"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="icon-more-alt"></i>
                </button>
                <div
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="userdropdown2"
                >
                  <a className="dropdown-item" href="#">
                    Weekly
                  </a>
                  <a className="dropdown-item" href="#">
                    Monthly
                  </a>
                  <a className="dropdown-item" href="#">
                    Yearly
                  </a>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="chart-invest" id="investment"></div>
              <ul>
                <li>
                  <h5>Total</h5>
                  <h6>$ 34,4562</h6>
                </li>
                <li>
                  <h5>Monthly</h5>
                  <h6>$ 12,463</h6>
                </li>
                <li>
                  <h5>Daily</h5>
                  <h6>$ 5000</h6>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card task-card">
            <div className="card-header pb-0">
              <h4>Task list</h4>
              <div className="dropdown icon-dropdown">
                <button
                  className="btn dropdown-toggle"
                  id="userdropdown"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="icon-more-alt"></i>
                </button>
                <div
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="userdropdown"
                >
                  <a className="dropdown-item" href="#">
                    Weekly
                  </a>
                  <a className="dropdown-item" href="#">
                    Monthly
                  </a>
                  <a className="dropdown-item" href="#">
                    Yearly
                  </a>
                </div>
              </div>
            </div>
            <div className="card-body filled-checkbox">
              <ul>
                <li className="d-flex line-primary">
                  <div className="flex-shrink-0">
                    <div className="form-check checkbox checkbox-solid-primary">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="solid5"
                      />
                      <label
                        className="form-check-label"
                        htmlFor="solid5"
                      ></label>
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    {" "}
                    <a href="task.html">
                      <h5 className="f-w-500">Task With dropdown menu</h5>
                    </a>
                    <h6>By Johnny</h6>
                  </div>
                  <div className="dropdown task-dropdown">
                    <button
                      className="btn dropdown-toggle"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      id="dorpdown44"
                    >
                      <svg className="feather">
                        <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#more-horizontal"></use>
                      </svg>
                    </button>
                    <div
                      className="dropdown-menu dropdown-menu-end"
                      aria-labelledby="dorpdown44"
                    >
                      <a className="dropdown-item" href="#">
                        Weekly
                      </a>
                      <a className="dropdown-item" href="#">
                        Monthly
                      </a>
                      <a className="dropdown-item" href="#">
                        Yearly
                      </a>
                    </div>
                  </div>
                </li>
                <li className="d-flex line-secondary">
                  <div className="flex-shrink-0">
                    <div className="form-check checkbox checkbox-solid-primary">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="solid4"
                      />
                      <label
                        className="form-check-label"
                        htmlFor="solid4"
                      ></label>
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    {" "}
                    <a href="task.html">
                      <h5 className="f-w-500">Badge on the right task</h5>
                    </a>
                    <h6>This task has show on hover actions!</h6>
                  </div>
                  <div className="dropdown task-dropdown">
                    <button
                      className="btn dropdown-toggle"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      id="dorpdown55"
                    >
                      <svg className="feather">
                        <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#more-horizontal"></use>
                      </svg>
                    </button>
                    <div
                      className="dropdown-menu dropdown-menu-end"
                      aria-labelledby="dorpdown55"
                    >
                      <a className="dropdown-item" href="#">
                        Weekly
                      </a>
                      <a className="dropdown-item" href="#">
                        Monthly
                      </a>
                      <a className="dropdown-item" href="#">
                        Yearly
                      </a>
                    </div>
                  </div>
                </li>
                <li className="d-flex line-tertiary">
                  <div className="flex-shrink-0">
                    <div className="form-check checkbox checkbox-solid-primary">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked
                        id="solid3"
                      />
                      <label
                        className="form-check-label"
                        htmlFor="solid3"
                      ></label>
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    {" "}
                    <a href="task.html">
                      <h5 className="f-w-500">Wash the car</h5>
                    </a>
                    <h6>Written by bob</h6>
                  </div>
                  <div className="dropdown task-dropdown">
                    <button
                      className="btn dropdown-toggle"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      id="dorpdown66"
                    >
                      <svg className="feather">
                        <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#more-horizontal"></use>
                      </svg>
                    </button>
                    <div
                      className="dropdown-menu dropdown-menu-end"
                      aria-labelledby="dorpdown66"
                    >
                      <a className="dropdown-item" href="#">
                        Weekly
                      </a>
                      <a className="dropdown-item" href="#">
                        Monthly
                      </a>
                      <a className="dropdown-item" href="#">
                        Yearly
                      </a>
                    </div>
                  </div>
                </li>
                <li className="d-flex line-primary">
                  <div className="flex-shrink-0">
                    <div className="form-check checkbox checkbox-solid-primary">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="solid2"
                      />
                      <label
                        className="form-check-label"
                        htmlFor="solid2"
                      ></label>
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    {" "}
                    <a href="task.html">
                      <h5 className="f-w-500">Go grocery shopping</h5>
                    </a>
                    <h6>A short description for this todo item</h6>
                  </div>
                  <div className="dropdown task-dropdown">
                    <button
                      className="btn dropdown-toggle"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      id="dorpdown77"
                    >
                      <svg className="feather">
                        <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#more-horizontal"></use>
                      </svg>
                    </button>
                    <div
                      className="dropdown-menu dropdown-menu-end"
                      aria-labelledby="dorpdown77"
                    >
                      <a className="dropdown-item" href="#">
                        Weekly
                      </a>
                      <a className="dropdown-item" href="#">
                        Monthly
                      </a>
                      <a className="dropdown-item" href="#">
                        Yearly
                      </a>
                    </div>
                  </div>
                </li>
                <li className="d-flex line-secondary">
                  <div className="flex-shrink-0">
                    <div className="form-check checkbox checkbox-solid-primary">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="solid1"
                      />
                      <label
                        className="form-check-label"
                        htmlFor="solid1"
                      ></label>
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    {" "}
                    <a href="task.html">
                      <h5 className="f-w-500">Development Task</h5>
                    </a>
                    <h6>Finish react todo list app</h6>
                  </div>
                  <div className="dropdown task-dropdown">
                    <button
                      className="btn dropdown-toggle"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      id="dropdown88"
                    >
                      <svg className="feather">
                        <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#more-horizontal"></use>
                      </svg>
                    </button>
                    <div
                      className="dropdown-menu dropdown-menu-end"
                      aria-labelledby="dropdown88"
                    >
                      <a className="dropdown-item" href="#">
                        Weekly
                      </a>
                      <a className="dropdown-item" href="#">
                        Monthly
                      </a>
                      <a className="dropdown-item" href="#">
                        Yearly
                      </a>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-6 col-xl-7">
          <div className="card">
            <div className="card-header pb-0">
              <h4>Monthly Overview</h4>
              <div className="dropdown icon-dropdown">
                <button
                  className="btn dropdown-toggle"
                  id="userdropdown6"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="icon-more-alt"></i>
                </button>
                <div
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="userdropdown6"
                >
                  <a className="dropdown-item" href="#">
                    Weekly
                  </a>
                  <a className="dropdown-item" href="#">
                    Monthly
                  </a>
                  <a className="dropdown-item" href="#">
                    Yearly
                  </a>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="monthly-overview" id="monthly-overview"></div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-5">
          <div className="card summary-card">
            <div className="card-header pb-0">
              <h4>Task summary</h4>
              <div className="dropdown icon-dropdown">
                <button
                  className="btn dropdown-toggle"
                  id="userdropdown01"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="icon-more-alt"></i>
                </button>
                <div
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="userdropdown01"
                >
                  <a className="dropdown-item" href="#">
                    Weekly
                  </a>
                  <a className="dropdown-item" href="#">
                    Monthly
                  </a>
                  <a className="dropdown-item" href="#">
                    Yearly
                  </a>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-sm-8 custom-width-1">
                  <div className="project-cost">
                    <h5 className="font-light">
                      <svg className="svg-w-20 stroke-light me-2">
                        <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Chart"></use>
                      </svg>
                      Estimated project cost
                    </h5>
                    <ul className="d-flex">
                      <li className="card-hover">
                        <div className="d-flex bg-light-primary flex-column">
                          <div className="flex-shrink-0 border-primary">
                            <svg className="svg-w-24 stroke-primary">
                              <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Pie"></use>
                            </svg>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="f-w-500">Project</h6>
                            <h4 className="f-w-700">32</h4>
                          </div>
                        </div>
                      </li>
                      <li className="card-hover">
                        <div className="d-flex bg-light-secondary flex-column">
                          <div className="flex-shrink-0 border-secondary">
                            <svg className="svg-w-24 stroke-secondary">
                              <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Category"></use>
                            </svg>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="f-w-500">Assigned</h6>
                            <h4 className="f-w-700">78</h4>
                          </div>
                        </div>
                      </li>
                      <li className="card-hover">
                        <div className="d-flex bg-light-tertiary flex-column">
                          <div className="flex-shrink-0 border-tertiary">
                            <svg className="svg-w-24 stroke-tertiary">
                              <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#Document"></use>
                            </svg>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="f-w-500">Completed</h6>
                            <h4 className="f-w-700">54</h4>
                          </div>
                        </div>
                      </li>
                    </ul>
                    <div className="task-bottom d-flex align-items-center gap-2">
                      <h5 className="font-light">
                        Completion rate in terms of time:
                      </h5>
                      <h2 className="font-primary">83%</h2>
                      <span className="badge bg-light f-14">
                        <svg className="svg-w-20 stroke-dark me-1">
                          <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#right-3"></use>
                        </svg>
                        3.4%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-sm-4 custom-width-2">
                  <h5 className="font-light">
                    <svg className="svg-w-20 stroke-light me-2">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#User"></use>
                    </svg>
                    Our crew
                  </h5>
                  <div className="team-member">
                    <h5 className="font-light mb-2">Team Members</h5>
                    <div className="customers d-inline-block avatar-group">
                      <ul>
                        <li className="d-inline-block">
                          <img
                            className="img-40 b-r-8"
                            src="../assets/images/user/13.jpg"
                            alt="#"
                          />
                        </li>
                        <li className="d-inline-block">
                          <img
                            className="img-40 b-r-8"
                            src="../assets/images/user/6.jpg"
                            alt="#"
                          />
                        </li>
                        <li className="d-inline-block">
                          <img
                            className="img-40 b-r-8"
                            src="../assets/images/user/3.jpg"
                            alt="#"
                          />
                        </li>
                        <li className="d-inline-block">
                          <span className="b-r-10">+4</span>
                        </li>
                      </ul>
                    </div>
                    <div className="d-flex bg-light">
                      <div className="flex-grow-1">
                        <h6 className="f-16 font-light">Hours</h6>
                        <h4>67</h4>
                      </div>
                      <div className="team-chart" id="team-chart"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-4">
          <div className="card">
            <div className="card-header pb-0">
              <h4>Courses Highlighted</h4>
              <div className="dropdown icon-dropdown">
                <button
                  className="btn dropdown-toggle"
                  id="userdropdown1"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="icon-more-alt"></i>
                </button>
                <div
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="userdropdown1"
                >
                  <a className="dropdown-item" href="#">
                    Weekly
                  </a>
                  <a className="dropdown-item" href="#">
                    Monthly
                  </a>
                  <a className="dropdown-item" href="#">
                    Yearly
                  </a>
                </div>
              </div>
            </div>
            <div className="card-body pt-0 course-table">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Course name</th>
                      <th>Price</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="flex-shrink-0">
                            <img
                              src="../assets/images/dashboard1/invest/01.jpg"
                              alt=""
                            />
                          </div>
                          <div className="flex-grow-1">
                            {" "}
                            <a href="user-profile.html">
                              <h6 className="f-w-500">Civil engineering</h6>
                            </a>
                            <span className="font-light f-w-400 f-13">
                              20h 10m
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>$150</td>
                      <td>UX/UI Design</td>
                      <td>
                        <button className="btn edge-btn f-13 w-100 btn-light-primary">
                          Done
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="flex-shrink-0">
                            <img
                              src="../assets/images/dashboard1/invest/02.jpg"
                              alt=""
                            />
                          </div>
                          <div className="flex-grow-1">
                            {" "}
                            <a href="user-profile.html">
                              <h6 className="f-w-500">Web development</h6>
                            </a>
                            <span className="font-light f-w-400 f-13">
                              12h 05m
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>$156</td>
                      <td>Illustration</td>
                      <td>
                        <button className="btn edge-btn f-13 w-100 btn-light-tertiary">
                          Pending
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="flex-shrink-0">
                            <img
                              src="../assets/images/dashboard1/invest/03.jpg"
                              alt=""
                            />
                          </div>
                          <div className="flex-grow-1">
                            {" "}
                            <a href="user-profile.html">
                              <h6 className="f-w-500">Computer science</h6>
                            </a>
                            <span className="font-light f-w-400 f-13">
                              06h 15m
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>$695</td>
                      <td>UX/UI Design</td>
                      <td>
                        <button className="btn edge-btn f-13 w-100 btn-light-primary">
                          Done
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="flex-shrink-0">
                            <img
                              src="../assets/images/dashboard1/invest/04.jpg"
                              alt=""
                            />
                          </div>
                          <div className="flex-grow-1">
                            {" "}
                            <a href="user-profile.html">
                              <h6 className="f-w-500">Web designer</h6>
                            </a>
                            <span className="font-light f-w-400 f-13">
                              04h 30m
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>$364</td>
                      <td>Leadership</td>
                      <td>
                        <button className="btn edge-btn f-13 w-100 btn-light-tertiary">
                          Done
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3 order-1 order-xl-0">
          <div className="card schedule-card">
            <div className="card-header pb-0">
              <h4 className="mb-2">Schedule Time</h4>
              <div className="dropdown icon-dropdown">
                <button
                  className="btn dropdown-toggle"
                  id="userdropdown8"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="icon-more-alt"></i>
                </button>
                <div
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="userdropdown8"
                >
                  <a className="dropdown-item" href="#">
                    Weekly
                  </a>
                  <a className="dropdown-item" href="#">
                    Monthly
                  </a>
                  <a className="dropdown-item" href="#">
                    Yearly
                  </a>
                </div>
              </div>
            </div>
            <div className="card-body pt-0">
              <div className="d-flex justify-content-between mb-3">
                <h5>Aug 2024</h5>
                <div className="d-flex align-items-center gap-2 monthly-time">
                  <h5 className="font-light">Month </h5>
                  <h5 className="font-light">Year</h5>
                </div>
              </div>
              <ul
                className="schedule-wrapper nav nav-tabs"
                id="myTab"
                role="tablist"
              >
                <li className="nav-item">
                  <a
                    className="nav-link active"
                    id="mon-tab"
                    data-bs-toggle="tab"
                    href="#mon"
                    role="tab"
                    aria-controls="mon"
                    aria-selected="false"
                  >
                    <span>Mo </span>
                    <h6>01</h6>
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link"
                    id="tue-tab"
                    data-bs-toggle="tab"
                    href="#tue"
                    role="tab"
                    aria-controls="tue"
                    aria-selected="true"
                  >
                    <span>Tu </span>
                    <h6>02</h6>
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link"
                    id="wed-tab"
                    data-bs-toggle="tab"
                    href="#wed"
                    role="tab"
                    aria-controls="wed"
                    aria-selected="false"
                  >
                    <span>We </span>
                    <h6>03</h6>
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link"
                    id="thu-tab"
                    data-bs-toggle="tab"
                    href="#thu"
                    role="tab"
                    aria-controls="thu"
                    aria-selected="false"
                  >
                    <span>Th </span>
                    <h6>04</h6>
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link"
                    id="frd-tab"
                    data-bs-toggle="tab"
                    href="#frd"
                    role="tab"
                    aria-controls="frd"
                    aria-selected="true"
                  >
                    <span>Fr </span>
                    <h6>05</h6>
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link font-primary"
                    id="sat-tab"
                    data-bs-toggle="tab"
                    href="#sat"
                    role="tab"
                    aria-controls="sat"
                    aria-selected="false"
                  >
                    <span>Sa </span>
                    <h6>06</h6>
                  </a>
                </li>
              </ul>
              <div className="tab-content" id="myTabContent">
                <div
                  className="tab-pane fade active show"
                  id="mon"
                  role="tabpanel"
                  aria-labelledby="mon-tab"
                >
                  <ul className="activity-update">
                    <li className="d-flex align-items-center b-l-primary">
                      <div className="flex-grow-1">
                        {" "}
                        <span>10:00 to 10:20 am</span>
                        <h5>Mobile Application Release</h5>
                        <h6>Hannah</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/11.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                    <li className="d-flex align-items-center b-l-secondary">
                      <div className="flex-grow-1">
                        {" "}
                        <span>12:00 to 01:45 am</span>
                        <h5>General Meeting</h5>
                        <h6>Madeleine Lisa</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/1.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                    <li className="d-flex align-items-center b-l-tertiary">
                      <div className="flex-grow-1">
                        {" "}
                        <span>06:00 to 11:30 am</span>
                        <h5>Client Visit</h5>
                        <h6>Hemmings Edmunds</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/3.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                  </ul>
                </div>
                <div
                  className="tab-pane fade"
                  id="tue"
                  role="tabpanel"
                  aria-labelledby="tue-tab"
                >
                  <ul className="activity-update">
                    <li className="d-flex align-items-center b-l-info">
                      <div className="flex-grow-1">
                        {" "}
                        <span>12:00 to 02:20 am</span>
                        <h5>What`s the project report update?</h5>
                        <h6>Loie Fenter</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/2.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                    <li className="d-flex align-items-center b-l-success">
                      <div className="flex-grow-1">
                        {" "}
                        <span>04:00 to 08:20 am</span>
                        <h5>James created changelog page</h5>
                        <h6>Anna Catmire</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/4.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                  </ul>
                </div>
                <div
                  className="tab-pane fade"
                  id="wed"
                  role="tabpanel"
                  aria-labelledby="wed-tab"
                >
                  <ul className="activity-update">
                    <li className="d-flex align-items-center b-l-danger">
                      <div className="flex-grow-1">
                        {" "}
                        <span>09:00 to 02:20 am</span>
                        <h5>Dima phizeg edited ACME 2.4</h5>
                        <h6>Susan Connor</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/5.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                    <li className="d-flex align-items-center b-l-dark">
                      <div className="flex-grow-1">
                        {" "}
                        <span>10:00 to 01:45 am</span>
                        <h5>Complete the medical ui system idea.</h5>
                        <h6>Jeff Johnson</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/6.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                    <li className="d-flex align-items-center b-l-warning">
                      <div className="flex-grow-1">
                        {" "}
                        <span>04:00 to 10:30 am</span>
                        <h5>Make a new landing page.</h5>
                        <h6>Roger Lum</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/9.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                  </ul>
                </div>
                <div
                  className="tab-pane fade"
                  id="thu"
                  role="tabpanel"
                  aria-labelledby="thu-tab"
                >
                  <ul className="activity-update">
                    <li className="d-flex align-items-center b-l-primary">
                      <div className="flex-grow-1">
                        {" "}
                        <span>10:00 to 10:20 am</span>
                        <h5>Mobile Application Release</h5>
                        <h6>Hannah</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/11.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                    <li className="d-flex align-items-center b-l-secondary">
                      <div className="flex-grow-1">
                        {" "}
                        <span>12:00 to 01:45 am</span>
                        <h5>General Meeting</h5>
                        <h6>Madeleine Lisa</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/1.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                    <li className="d-flex align-items-center b-l-tertiary">
                      <div className="flex-grow-1">
                        {" "}
                        <span>06:00 to 11:30 am</span>
                        <h5>Client Visit</h5>
                        <h6>Hemmings Edmunds</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/3.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                  </ul>
                </div>
                <div
                  className="tab-pane fade"
                  id="frd"
                  role="tabpanel"
                  aria-labelledby="frd-tab"
                >
                  <ul className="activity-update">
                    <li className="d-flex align-items-center b-l-info">
                      <div className="flex-grow-1">
                        {" "}
                        <span>12:00 to 02:20 am</span>
                        <h5>What`s the project report update?</h5>
                        <h6>Loie Fenter</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/2.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                    <li className="d-flex align-items-center b-l-success">
                      <div className="flex-grow-1">
                        {" "}
                        <span>04:00 to 08:20 am</span>
                        <h5>James created changelog page</h5>
                        <h6>Anna Catmire</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/4.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                  </ul>
                </div>
                <div
                  className="tab-pane fade"
                  id="sat"
                  role="tabpanel"
                  aria-labelledby="sat-tab"
                >
                  <ul className="activity-update">
                    <li className="d-flex align-items-center b-l-danger">
                      <div className="flex-grow-1">
                        {" "}
                        <span>09:00 to 02:20 am</span>
                        <h5>Dima phizeg edited ACME 2.4</h5>
                        <h6>Susan Connor</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/5.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                    <li className="d-flex align-items-center b-l-dark">
                      <div className="flex-grow-1">
                        {" "}
                        <span>10:00 to 01:45 am</span>
                        <h5>Complete the medical ui system idea.</h5>
                        <h6>Jeff Johnson</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/6.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                    <li className="d-flex align-items-center b-l-warning">
                      <div className="flex-grow-1">
                        {" "}
                        <span>04:00 to 10:30 am</span>
                        <h5>Make a new landing page.</h5>
                        <h6>Roger Lum</h6>
                      </div>
                      <div className="flex-shrink-0">
                        {" "}
                        <img
                          className="img-40 b-r-10"
                          src="../assets/images/avatar/9.jpg"
                          alt=""
                        />
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-12 col-xl-2 custom-margin">
          <div className="row">
            <div className="col-6 col-xl-12 col-lg-5">
              <div className="card visit-card card-hover">
                <div className="card-header pb-0">
                  <h4>Total visit</h4>
                  <div className="dropdown icon-dropdown">
                    <button
                      className="btn dropdown-toggle"
                      id="userdropdown03"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <i className="icon-more-alt"></i>
                    </button>
                    <div
                      className="dropdown-menu dropdown-menu-end"
                      aria-labelledby="userdropdown03"
                    >
                      <a className="dropdown-item" href="#">
                        Weekly
                      </a>
                      <a className="dropdown-item" href="#">
                        Monthly
                      </a>
                      <a className="dropdown-item" href="#">
                        Yearly
                      </a>
                    </div>
                  </div>
                </div>
                <div className="card-body pb-0">
                  <ul className="d-flex justify-content-xl-between justify-content-evenly">
                    <li>
                      <div className="badge bg-light-primary b-r-0">
                        <svg className="svg-menu me-1">
                          <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#mobile"></use>
                        </svg>
                        Mobile
                      </div>
                      <div className="d-block text-center mt-2">
                        <h6 className="f-w-500">68,9%</h6>
                        <span className="font-light f-13">20,600</span>
                      </div>
                    </li>
                    <li>
                      <div className="badge bg-light-secondary b-r-0">
                        <svg className="svg-menu me-1">
                          <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#desktop"></use>
                        </svg>
                        Desktop
                      </div>
                      <div className="d-block text-center mt-2">
                        <h6 className="f-w-500">13,4%</h6>
                        <span className="font-light f-13">02,450</span>
                      </div>
                    </li>
                  </ul>
                </div>
                <div className="visit-chart"></div>
              </div>
            </div>
            <div className="col-6 col-xl-12 col-lg-7">
              <div className="card visit-card card-hover">
                <div className="card-header pb-0">
                  <h4>Total Earning</h4>
                  <div className="dropdown icon-dropdown">
                    <button
                      className="btn dropdown-toggle"
                      id="userdropdown02"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <i className="icon-more-alt"></i>
                    </button>
                    <div
                      className="dropdown-menu dropdown-menu-end"
                      aria-labelledby="userdropdown02"
                    >
                      <a className="dropdown-item" href="#">
                        Weekly
                      </a>
                      <a className="dropdown-item" href="#">
                        Monthly
                      </a>
                      <a className="dropdown-item" href="#">
                        Yearly
                      </a>
                    </div>
                  </div>
                </div>
                <div className="card-body py-0 total-earn">
                  <h4 className="font-primary mt-1">Rp 30.000</h4>
                  <p className="f-13 font-light">
                    Compared to Rp 23.000 Yesterday
                  </p>
                  <div className="earn-chart" id="earn-chart"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3 custom-margin">
          <div className="card notification-card">
            <div className="card-header">
              <h4>Notifications</h4>
              <div className="dropdown icon-dropdown">
                <button
                  className="btn dropdown-toggle"
                  id="userdropdown5"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="icon-more-alt"></i>
                </button>
                <div
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="userdropdown5"
                >
                  <a className="dropdown-item" href="#">
                    Weekly
                  </a>
                  <a className="dropdown-item" href="#">
                    Monthly
                  </a>
                  <a className="dropdown-item" href="#">
                    Yearly
                  </a>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="d-flex bg-light gap-3">
                <div className="flex-shrink-0">
                  {" "}
                  <img
                    className="img-40 b-r-15"
                    src="../assets/images/avatar/10.jpg"
                    alt="Use1"
                  />
                </div>
                <div className="flex-grow-1">
                  <a href="user-profile.html">
                    <h6>Polly edited Contact page</h6>
                  </a>
                  <span>18 mins ago . Craftwork design</span>
                </div>
                <div className="circle-dot-primary">
                  <span></span>
                </div>
              </div>
              <div className="d-flex gap-3">
                <div className="flex-shrink-0">
                  {" "}
                  <span className="bg-secondary">KP</span>
                </div>
                <div className="flex-grow-1">
                  <a href="user-profile.html">
                    <h6>James left a comment on ACME 2.1</h6>
                  </a>
                  <span>3 hours ago . ACME</span>
                </div>
              </div>
              <div className="d-flex gap-3">
                <div className="flex-shrink-0">
                  {" "}
                  <img
                    className="img-40 b-r-15"
                    src="../assets/images/avatar/4.jpg"
                    alt="Use2"
                  />
                </div>
                <div className="flex-grow-1">
                  <a href="user-profile.html">
                    <h6>Mary shared the file isometric 2.0</h6>
                  </a>
                  <span>4 hours ago . Craftwork Design</span>
                  <div className="d-flex gap-2 p-0 mt-2">
                    <button className="btn btn-outline-dark">Decline</button>
                    <button className="btn btn-primary">Accept</button>
                  </div>
                </div>
              </div>
              <div className="d-flex gap-3 bg-light">
                <div className="flex-shrink-0">
                  {" "}
                  <span className="bg-tertiary">HS</span>
                </div>
                <div className="flex-grow-1">
                  <a href="user-profile.html">
                    <h6>Dima phizeg edited ACME 2.4</h6>
                  </a>
                  <span>3 hours ago . ACME</span>
                </div>
                <div className="circle-dot-primary">
                  <span></span>
                </div>
              </div>
              <div className="d-flex gap-3">
                <div className="flex-shrink-0">
                  {" "}
                  <img
                    className="img-40 b-r-15"
                    src="../assets/images/avatar/12.jpg"
                    alt="Use3"
                  />
                </div>
                <div className="flex-grow-1">
                  <a href="user-profile.html">
                    <h6>James created changelog page</h6>
                  </a>
                  <span>3 hours ago . Blank</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppTestContent;
