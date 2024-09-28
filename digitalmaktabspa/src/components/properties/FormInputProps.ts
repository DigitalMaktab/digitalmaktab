import { InputProps } from "./InputProps";

export interface FormInputProps extends InputProps {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}
