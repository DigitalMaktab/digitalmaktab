import { GroupBase, OptionsOrGroups, SingleValue } from "react-select";

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
  phoneNumber?: PhoneNumberValue;
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
  data: Select2Option[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  loadingError?: boolean;
  labelVisible?: boolean;
  showLable?: boolean;
  searchHandler?: (value: string) => void;
}

export interface PhoneNumberProps extends InputProps {
  rest?: React.InputHTMLAttributes<HTMLSelectElement>;
  onChange: (value: PhoneNumberValue) => void;
}

export interface Select2Option {
  id: string;
  text: string;
}

export interface AsyncSelectOption {
  id: string;
  label: string;
}

export interface AsyncSelectProps extends InputProps {
  loadOptions: (
    inputValue: string
  ) => Promise<
    OptionsOrGroups<AsyncSelectOption, GroupBase<AsyncSelectOption>>
  >;
  onChange: (selectedOption: SingleValue<AsyncSelectOption>) => void;
  showLable?: boolean;
}
