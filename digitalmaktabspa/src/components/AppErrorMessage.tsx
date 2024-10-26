import React from "react";

const AppErrorMessage = ({
  error,
  visible,
}: {
  error: string | Record<string, any> | undefined;
  visible: boolean;
}) => {
  // If there is no error or the field has not been touched, don't show the error
  if (!error || !visible) return null;
  // If the error is an object (for nested fields), you may want to stringify it or handle it differently
  const errorMessage =
    typeof error === "string" ? error : JSON.stringify(error, null, 2); // You can also customize how to display nested errors

  return (
    <p style={{ whiteSpace: "pre-wrap" }} className="text-danger">
      {errorMessage}
    </p>
  );
};

export default AppErrorMessage;
