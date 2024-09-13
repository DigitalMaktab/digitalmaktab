import React from "react";
import { ImageProps } from "./properties/ImageProps";

const AppImg: React.FC<ImageProps> = ({ src, className, alt }) => {
  return <img className={className} src={src} alt={alt} />;
};

export default AppImg;
