import { useEffect } from "react";
import $ from "jquery";
import { useTranslation } from "react-i18next";

// Type for Select2 options
interface SelectOption {
  id: string;
  text: string;
}

// Type for the arguments passed to Select2 callbacks
interface TranslationArgs {
  input: string;
  maximum: number;
  minimum: number;
}

// Custom hook to initialize Select2
export const useSelect2 = (
  ref: React.RefObject<HTMLSelectElement>,
  options: SelectOption[],
  loading: boolean,
  loadingError: boolean,
  label: string,
  onChange: (value: string) => void
) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!ref.current) return;

    const $select = $(ref.current);

    const select2Options = {
      data: loadingError
        ? [{ id: "", text: t("controls.select2.errorLoading") }] // Show "Error loading data" if an error occurs
        : loading
        ? [{ id: "", text: t("controls.select2.loading") }] // Show "Loading..." while data is loading
        : options.map((item) => ({ id: item.id, text: item.text })),
      placeholder: loadingError
        ? t("controls.select2.errorLoading")
        : loading
        ? t("controls.select2.loading")
        : label,
      language: {
        errorLoading: () => t("controls.select2.errorLoading"),
        inputTooLong: (args: TranslationArgs) => {
          const overChars = args.input.length - args.maximum;
          return t("controls.select2.inputTooLong", { input: overChars });
        },
        inputTooShort: (args: TranslationArgs) => {
          const remainingChars = args.minimum - args.input.length;
          return t("controls.select2.inputTooShort", { remainingChars });
        },
        loadingMore: () => t("controls.select2.loadingMore"),
        maximumSelected: (args: TranslationArgs) =>
          t("controls.select2.maximumSelected", { maximum: args.maximum }),
        noResults: () => t("controls.select2.noResults"),
        searching: () => t("controls.select2.searching"),
      },
    };

    try {
      // Initialize Select2
      $select.select2(select2Options);

      // Handle change event
      const handleChange = (e: JQuery.TriggeredEvent) => {
        const selectedValue = (e.currentTarget as HTMLSelectElement).value;
        onChange(selectedValue);
      };

      $select.on("change", handleChange);

      return () => {
        $select.off("change", handleChange);
        $select.select2("destroy"); // Cleanup Select2 on unmount
      };
    } catch (error) {
      console.error("Error initializing Select2:", error);
    }
  }, [options, loading, loadingError, ref, t, label, onChange]);
};
