export interface ButtonProperties {
  label: string;
  type: "submit" | "button" | "reset" | undefined;
  block?: boolean;
  onButtonClick?: (event: any) => void;
  inModal?: boolean;
  inRow?: boolean;
  icon?: string;
  iconSize?: number;
  disabled?: boolean | undefined;
  className?: string;
  style?: any;
}
