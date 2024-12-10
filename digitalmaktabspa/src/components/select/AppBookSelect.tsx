import React from "react";
import { SelectProps } from "./properties/SelectProps";
import { AsyncSelectOption } from "../properties/InputProps";
import { Book } from "../../models/Book";
import AppAsyncSelect from "../input/AppAsyncSelect";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import useMainOperations from "../../hooks/useMainOperations";

const AppBookSelect: React.FC<SelectProps> = ({ value, onChange, name }) => {
  const { t } = useAppLocalizer();
  const { fetchBooks } = useMainOperations();

  // Define fetchBooks to fetch options based on a search term
  const getBooks = async (searchTerm: string): Promise<AsyncSelectOption[]> => {
    const response = await fetchBooks(1, 10, { searchTerm }); // Pass correct arguments
    // Safely check if response.data is an array before mapping
    const books = Array.isArray(response.data) ? (response.data as Book[]) : [];

    return books.map((book: Book) => ({
      id: book.id,
      label: `${book.bookTitle}`,
    }));
  };

  // Handle selection change
  const handleChange = (option: AsyncSelectOption | null) => {
    onChange && onChange(option!.id); // Handle null option safely
  };

  return (
    <div className="form-group">
      <AppAsyncSelect
        loadOptions={getBooks} // Use fetchBooks as the loadOptions function
        onChange={handleChange}
        placeholder={t("book.bookTitle.label")}
        name={name}
        label={t("book.bookTitle.label")}
        value={value}
      />
    </div>
  );
};

export default AppBookSelect;
