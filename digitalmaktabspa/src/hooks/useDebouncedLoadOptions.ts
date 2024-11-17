import { debounce } from "lodash";
import { OptionsOrGroups, GroupBase } from "react-select";
import { AsyncSelectOption } from "../components/properties/InputProps";
import { GLOBAL_DEBOUNCE_DELAY } from "../config/config";

const useDebouncedLoadOptions = (
  loadOptions: (inputValue: string) => Promise<AsyncSelectOption[]>
) => {
  // Debounce function defined outside useCallback to ensure stability
  const debouncedFetch = debounce(
    (
      inputValue: string,
      callback: (
        options: OptionsOrGroups<
          AsyncSelectOption,
          GroupBase<AsyncSelectOption>
        >
      ) => void
    ) => {
      loadOptions(inputValue).then((options) => callback(options));
    },
    GLOBAL_DEBOUNCE_DELAY
  );

  return debouncedFetch;
};

export default useDebouncedLoadOptions;
