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
