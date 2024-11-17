import React, { useState } from "react";
import { borrow, download, searchBooks } from "../../api/library/libApi";
import AppCard from "../../components/card/AppCard";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import AppForm from "../../components/form/AppForm";
import AppFormInput from "../../components/form/AppFormInput";
import AppButton from "../../components/AppButton";
import AppImg from "../../components/AppImg";
import { OpenLibrary, OpenLibraryBook } from "../../models/Book";
import AppPagination from "../../components/table/AppPagination";
import AppSelect2 from "../../components/input/AppSelect2";
import { Select2Option } from "../../components/properties/InputProps";

const OnlineLibrary = () => {
  const { t, formatNumber } = useAppLocalizer();
  const [openLibraryData, setOpenLibraryData] = useState<OpenLibrary | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [query, setQuery] = useState("");
  const [booksPerPage, setBooksPerPage] = useState(12);

  const booksPerPageOptions: Select2Option[] = [8, 12, 24, 48].map((count) => ({
    id: count.toString(),
    text: t("library.booksPerPage.label", {
      value: formatNumber(count),
    }),
  }));

  const initialValues = {
    query: "",
  };

  const handleSearch = async (value: typeof initialValues, page = 1) => {
    if (value.query !== "") {
      setLoading(true);
      const data = await searchBooks(value.query, page, booksPerPage); // Pass page and booksPerPage to the API
      if (data) setOpenLibraryData(data);
      setLoading(false);
      setCurrentPage(page); // Update currentPage state
      setQuery(value.query); // Store the current query
    }
  };

  const handlePageChange = (page: number) => {
    handleSearch({ query }, page); // Use the existing query and new page
  };

  const handleBooksPerPageChange = (value: string) => {
    const newBooksPerPage = parseInt(value, 10);
    setBooksPerPage(newBooksPerPage);
  };

  const handleBookDetails = async (workId: string) => {
    if (openLibraryData) {
      const filteredBooks: OpenLibraryBook[] = openLibraryData!.docs.filter(
        (book: OpenLibraryBook) => book.key === workId
      ) as OpenLibraryBook[];

      const selectedBook: OpenLibraryBook = filteredBooks[0];

      if (selectedBook.ia && selectedBook.ia.length > 0) {
        const archiveOrgIa: string = selectedBook.ia[0];

        window.open(
          `https://archive.org/stream/${archiveOrgIa}#1`,
          "_blank",
          "noopener,noreferrer"
        );
      }
    }
  };

  return (
    <AppCard title={t("library.onlineLibrary.label")}>
      <AppForm initialValues={initialValues} onSubmit={handleSearch}>
        <div className="row">
          <div className="col-sm-8" style={{ marginTop: -25 }}>
            <AppFormInput
              type="text"
              placeholder={t("library.search.placeholder")}
              name="query"
              label=""
            />
          </div>
          <div className="col-sm-2">
            <AppSelect2
              name=""
              label=""
              value={booksPerPage.toString()}
              onChange={handleBooksPerPageChange}
              data={booksPerPageOptions}
            />
          </div>
          <div className="col-sm-2">
            <AppButton
              type="submit"
              label={t("library.search.label")}
              className="btn-block"
            />
          </div>
        </div>
      </AppForm>

      <div className="row" style={{ margin: 10, padding: 10 }}>
        {loading
          ? // Placeholder cards displayed while loading
            Array.from({ length: booksPerPage }).map((_, index) => (
              <div className="col-md-3 mb-3" key={index}>
                <AppCard className="p-3 placeholder-card">
                  <div className="row g-0 align-items-center">
                    <div className="col-md-4">
                      <div className="placeholder-image" />
                    </div>
                    <div className="col-md-8">
                      <div className="card-body">
                        <h5 className="card-title placeholder-text">
                          {t("asyncSelect.loading.label")}
                        </h5>
                        <p className="card-text placeholder-text">
                          {t("book.author")}: ...
                        </p>
                      </div>
                    </div>
                  </div>
                </AppCard>
              </div>
            ))
          : openLibraryData?.docs
          ? // Actual book results
            openLibraryData.docs.map((book) => (
              <div className="col-md-3 mb-3" key={book.key}>
                <AppCard
                  className="p-3"
                  styles={{ minHeight: 180 }}
                  onClick={() => {
                    handleBookDetails(book.key);
                  }}
                >
                  <div className="row g-0 align-items-center">
                    <div className="col-md-4">
                      {book.cover_i ? (
                        <AppImg
                          className="img-fluid rounded-start"
                          style={{
                            height: 150,
                            width: "100%",
                            objectFit: "cover",
                          }}
                          src={`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`}
                          alt={`${book.title} cover`}
                        />
                      ) : (
                        <div className="placeholder-image">
                          <span>{t("library.noImageAvailable")}</span>
                        </div>
                      )}
                    </div>
                    <div className="col-md-8">
                      <div className="card-body">
                        <h5 className="card-title">{book.title}</h5>
                        <p className="card-text">
                          {t("book.author")}:{" "}
                          {book.author_name
                            ? book.author_name.join(", ")
                            : t("library.onlineLibrary.unknownAuthor.label")}
                        </p>
                      </div>
                    </div>
                  </div>
                </AppCard>
              </div>
            ))
          : null}
      </div>
      {openLibraryData && (
        <div className="row">
          <div className="col-md-12">
            <AppPagination
              currentPage={currentPage}
              totalPages={Math.ceil(openLibraryData.numFound / booksPerPage)}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}
    </AppCard>
  );
};

export default OnlineLibrary;
