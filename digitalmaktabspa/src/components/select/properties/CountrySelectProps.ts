export interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
  label?: string;
  required?: boolean;
  showSelect2Lable?: boolean;
}
