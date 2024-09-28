import React from "react";
import AppLocalizer from "../../components/dropdown/AppLocalizer";
import { Properties } from "../../components/properties/Properties";

const Auth: React.FC<Properties> = ({ children }) => {
  return (
    <div>
      <AppLocalizer isLinear={false} />
      {children}
    </div>
  );
};

export default Auth;
