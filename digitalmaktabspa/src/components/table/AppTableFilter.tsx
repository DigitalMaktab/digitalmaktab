import React from "react";
import { useTranslation } from "react-i18next";
import { Column } from "./properties/TableProps";
import AppInput from "../input/AppInput";
import { TableFiltersProps } from "./properties/TableFilterProps";
import AppCountrySelect from "../select/AppCountrySelect";
import AppBranchSelect from "../select/AppBranchSelect";
import AppButton from "../AppButton";
import AppClassTypeSelect from "../select/AppClassTypeSelect";
import AppShiftSelect from "../select/AppShiftSelect";
import AppHorizontalSpacer from "../spacer/AppHorizontalSpacer";

// Mapping for specific accessors to their corresponding filter components
const filterComponentMapping: { [key: string]: React.FC<any> } = {
  country: AppCountrySelect,
  branch: AppBranchSelect,
  classTypeValue: AppClassTypeSelect,
  shiftValue: AppShiftSelect,
};

// Mapping for display accessors to their filter accessors
const filterAccessorMapping: { [key: string]: string } = {
  branch: "branchId",
  country: "countryId",
  classTypeValue: "classType",
  shiftValue: "shift",
};

const AppTableFilters = <T,>({
  columns,
  filters,
  onFilterChange,
  onApplyFilters,
}: TableFiltersProps<T>) => {
  const { t } = useTranslation();

  // Reset all filters to their default values (empty)
  const resetFilters = () => {
    const clearedFilters = columns.reduce((acc, column) => {
      const filterAccessor =
        filterAccessorMapping[column.accessor as string] || column.accessor;
      acc[filterAccessor as string] = ""; // Reset each filter to an empty string
      return acc;
    }, {} as { [key: string]: string });

    Object.keys(clearedFilters).forEach((key) =>
      onFilterChange(key, clearedFilters[key])
    );
  };

  // Helper function to render the correct filter input based on the column type
  const renderFilterInput = (column: Column<T>) => {
    if (!column.filter) return null;

    // Determine if the column accessor should map to a different filter accessor
    const filterAccessor: string =
      filterAccessorMapping[column.accessor as string] ||
      (column.accessor as string);
    const Component = filterComponentMapping[column.accessor as string];

    // Render dropdown components based on mapped accessor
    if (Component) {
      return (
        <Component
          name={filterAccessor}
          value={filters[filterAccessor] || ""}
          onChange={(selectedValue: any) =>
            onFilterChange(filterAccessor, selectedValue)
          }
          required={false}
        />
      );
    }

    // Render text input for text-based filters
    if (column.filter.type === "text") {
      return (
        <AppInput
          type="text"
          name={filterAccessor}
          label={t(column.header)}
          placeholder={t(column.header)}
          value={filters[filterAccessor] || ""}
          onChange={(e) => onFilterChange(filterAccessor, e.target.value)}
        />
      );
    }

    // Render fallback message for unsupported filters
    return (
      <p className="txt-danger">
        {t("filters.implementation.required", { value: t(column.header) })}
      </p>
    );
  };

  return (
    <div className="filter-form mb-3">
      <div className="row">
        {columns
          .filter((column) => column.filter) // Only render columns with filters
          .map((column, index) => (
            <div key={index} className="col-sm-3 mb-2">
              {renderFilterInput(column)}
            </div>
          ))}
      </div>
      {/* Uncomment this section if you want to include the Apply Filters button */}
      <div className="row">
        <div className="col d-flex justify-content-end">
          <AppButton
            label={t("filters.button.reset")}
            type="button"
            onButtonClick={resetFilters}
            className="btn-secondary btn-xs"
          />
          <AppHorizontalSpacer />
          <AppButton
            label={t("filters.button.label")}
            type="button"
            onButtonClick={onApplyFilters}
            className="btn-primary btn-xs"
          />
        </div>
      </div>
    </div>
  );
};

export default AppTableFilters;
