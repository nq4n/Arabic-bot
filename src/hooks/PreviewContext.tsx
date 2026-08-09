import { createContext, useContext, useState, ReactNode } from "react";
import { setPreviewMode as persistPreviewMode, isPreviewMode } from "../utils/lessonSettings";

interface PreviewContextValue {
  isPreview: boolean;
  enablePreview: () => void;
  disablePreview: () => void;
  togglePreview: () => void;
}

const PreviewContext = createContext<PreviewContextValue | undefined>(undefined);

export const PreviewProvider = ({ children }: { children: ReactNode }) => {
  const [isPreview, setIsPreview] = useState<boolean>(() => isPreviewMode());

  const enablePreview = () => {
    persistPreviewMode(true);
    setIsPreview(true);
  };
  const disablePreview = () => {
    persistPreviewMode(false);
    setIsPreview(false);
  };
  const togglePreview = () => {
    if (isPreview) {
      disablePreview();
    } else {
      enablePreview();
    }
  };

  return (
    <PreviewContext.Provider value={{ isPreview, enablePreview, disablePreview, togglePreview }}>
      {children}
    </PreviewContext.Provider>
  );
};

export const usePreview = () => {
  const context = useContext(PreviewContext);
  if (context === undefined) {
    throw new Error("usePreview must be used within a PreviewProvider");
  }
  return context;
};