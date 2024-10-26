import React, { createContext, useContext, useState, ReactNode } from "react";
import AppLoader from "../components/AppLoader";

interface LoaderContextProps {
  showLoader: () => void;
  hideLoader: () => void;
  setError: (error: string[] | null) => void;
  clearError: () => void;
}

export const LoaderContext = createContext<LoaderContextProps | undefined>(
  undefined
);

export const LoaderProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string[] | null>(null);

  const showLoader = () => setIsLoading(true);
  const hideLoader = () => setIsLoading(false);
  const clearError = () => setError(null);

  return (
    <LoaderContext.Provider
      value={{ showLoader, hideLoader, setError, clearError }}
    >
      <AppLoader
        isVisible={isLoading}
        error={error}
        onCloseError={clearError}
      />
      {children}
    </LoaderContext.Provider>
  );
};

export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error("useLoader must be used within a LoaderProvider");
  }
  return context;
};
