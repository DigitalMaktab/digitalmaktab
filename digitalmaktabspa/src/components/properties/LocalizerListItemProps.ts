import { SupportedLanguageProps } from "./SupportedLanguageProps";

export interface LocalizerListItemProps {
  language: string;
  flag: string;
  onSelect?: () => void;
}
