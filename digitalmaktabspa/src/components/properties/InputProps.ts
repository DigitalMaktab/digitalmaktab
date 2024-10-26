import { FormikHelpers } from "formik";

type PlaceHolder = string;

export interface InputProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: PlaceHolder;
  value?: string;
  required?: boolean;
  // setFieldValue?: FormikHelpers<any>["setFieldValue"];
  setFieldValue?: (field: string, value: any) => void;
}

export interface FileInputProps extends InputProps {
  rest?: React.InputHTMLAttributes<HTMLInputElement>;
}

export interface PasswordInputProps extends InputProps {
  rest?: React.InputHTMLAttributes<HTMLInputElement>;
}

export interface PhoneNumberInputProps extends InputProps {
  rest?: React.InputHTMLAttributes<HTMLSelectElement>;
  onChange: (value: PhoneNumberValue) => void;
  phonenumbervalue: PhoneNumberValue;
  countryIdName: string;
}

export interface PhoneNumberValue {
  countryId: string;
  number: string;
}

export interface Select2Props extends InputProps {
  data: { id: string; text: string }[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  loadingError?: boolean;
}

export interface PhoneNumberProps extends InputProps {
  rest?: React.InputHTMLAttributes<HTMLSelectElement>;
  onChange: (value: PhoneNumberValue) => void;
}
