import { useMemo } from "react";
import { Action } from "../components/table/properties/TableActionPrps";
export function useTableActions(
  defaultActions: Action[],
  providedActions?: Action[]
): Action[] {
  return useMemo(
    () => providedActions || defaultActions,
    [providedActions, defaultActions]
  );
}
