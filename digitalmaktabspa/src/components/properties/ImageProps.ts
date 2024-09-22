import { StyleProps } from "./StyleProps";

export interface ImageProps extends StyleProps {
  src: string;
  className: string;
  alt?: string;
}
