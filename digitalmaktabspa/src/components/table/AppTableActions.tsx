import { Link } from "react-router-dom";
import { TableActionsProps } from "./properties/TableActionPrps";
import AppButton from "../AppButton";
import FeatherIcon from "feather-icons-react";

const AppTableActions: React.FC<TableActionsProps> = ({ actions }) => (
  <div className="d-flex gap-2">
    {actions.map((action, index) =>
      action.route ? (
        <Link key={index} to={action.route} className="btn btn-primary btn-xs">
          {action.icon && <FeatherIcon icon={action.icon} />} {action.label}
        </Link>
      ) : (
        <AppButton
          key={index}
          label={action.label}
          onButtonClick={action.onClick}
          className="btn-secondary btn-xs"
          icon={action.icon}
          type="button"
        />
      )
    )}
  </div>
);

export default AppTableActions;
