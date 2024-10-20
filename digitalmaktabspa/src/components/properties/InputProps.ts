type PlaceHolder = string;

export interface InputProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: PlaceHolder;
  value?: string;
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
  countryCodeName: string;
}

export interface PhoneNumberValue {
  countryCode: string;
  phoneNumber: string;
}

export interface Select2Props extends InputProps {
  data: { id: string; text: string }[];
  value: string;
  onChange: (value: string) => void;
}

export interface PhoneNumberProps extends InputProps {
  rest?: React.InputHTMLAttributes<HTMLSelectElement>;
  onChange: (value: PhoneNumberValue) => void;
}
