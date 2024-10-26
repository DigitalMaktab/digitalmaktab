import React from "react";
import AppModal from "./modal/AppModal";

interface AppLoaderProps {
  isVisible: boolean;
  error: string[] | null;
  onCloseError: () => void;
}

const AppLoader: React.FC<AppLoaderProps> = ({
  isVisible,
  error,
  onCloseError,
}) => {
  return (
    <>
      {isVisible && (
        <div className="loader-wrapper">
          <div className="loader">Loading...</div>
        </div>
      )}
      <AppModal
        isVisible={!!error}
        onClose={onCloseError}
        title="Ohh! Something went wrong!"
        errors={error || []}
        imageSrc="../assets/images/gif/danger.gif"
      />
    </>
  );
};

export default AppLoader;
