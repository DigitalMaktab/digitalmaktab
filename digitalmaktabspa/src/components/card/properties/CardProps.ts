import { FormProps } from "../../properties/FormProps";
import { Properties } from "../../properties/Properties";

export interface CardProps extends Properties {
  title: string;
  footerChildren?: React.ReactNode;
  onRefresh?: () => void;
  showFooter?: boolean;
}

export interface FormCardProps extends FormProps, CardProps {}