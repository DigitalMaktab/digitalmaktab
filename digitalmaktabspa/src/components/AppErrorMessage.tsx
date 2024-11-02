import React from "react";

const AppErrorMessage = ({
  error,
  visible,
}: {
  error: string | Record<string, any> | undefined;
  visible: boolean;
}) => {
  if (!error || !visible) return null;
  const errorMessage =
    typeof error === "string" ? error : JSON.stringify(error, null, 2); // You can also customize how to display nested errors

  return (
    <p style={{ whiteSpace: "pre-wrap" }} className="text-danger">
      {errorMessage}
    </p>
  );
};

export default AppErrorMessage;
