export type Action = {
  label: string;
  onClick?: () => void;
  route?: string;
  icon?: string;
};

export interface TableActionsProps {
  actions: Action[];
}
