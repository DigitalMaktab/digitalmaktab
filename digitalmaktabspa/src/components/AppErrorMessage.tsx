import React from "react";

const AppErrorMessage = ({ error, visible }: { error: any; visible: any }) => {
  if (!error || !visible) return null;
  return (
    <p style={{ whiteSpace: "pre-wrap" }} className="text-danger">
      {error}
    </p>
  );
};

export default AppErrorMessage;
