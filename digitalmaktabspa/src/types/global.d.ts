declare module "*.ttf" {
  const value: string;
  export default value;
}

declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

declare module "*.scss" {
  const content: { [className: string]: string };
  export default content;
}

declare module "@zoomus/websdk/dist/css/bootstrap.css";
declare module "@zoomus/websdk/dist/css/react-select.css";
