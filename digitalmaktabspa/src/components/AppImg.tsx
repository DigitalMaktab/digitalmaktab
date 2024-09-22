import React from "react";
import { ImageProps } from "./properties/ImageProps";

const AppImg: React.FC<ImageProps> = ({ src, className, alt, style }) => {
  return <img className={className} src={src} alt={alt} style={{ ...style }} />;
};

export default AppImg;
