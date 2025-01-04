import { Properties } from "../../../components/properties/Properties";

export interface EditorProps<T = any> extends Properties {
  initialData?: T;
}
