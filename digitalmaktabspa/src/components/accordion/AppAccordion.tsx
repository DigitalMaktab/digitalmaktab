import React, { useState } from "react";
import { FiCheckSquare } from "react-icons/fi";

interface AccordionItem {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
}

const AppAccordion: React.FC<AccordionProps> = ({ items }) => {
  const [openItem, setOpenItem] = useState<string | null>(items[0]?.id || null);

  const toggleItem = (id: string) => {
    setOpenItem((prev) => (prev === id ? null : id));
  };

  return (
    <div className="accordion" id="accordionExample">
      {items.map((item) => (
        <div key={item.id} className="accordion-item">
          {/* Header */}
          <h2 className="accordion-header" id={`heading-${item.id}`}>
            <button
              className={`accordion-button ${
                openItem === item.id ? "" : "collapsed"
              } gap-2 accordion-light-secondary`}
              type="button"
              onClick={() => toggleItem(item.id)}
              aria-expanded={openItem === item.id}
              aria-controls={`collapse-${item.id}`}
            >
              {item.title}
            </button>
          </h2>

          {/* Body */}
          <div
            className={`accordion-collapse collapse ${
              openItem === item.id ? "show" : ""
            }`}
            id={`collapse-${item.id}`}
            aria-labelledby={`heading-${item.id}`}
          >
            <div className="accordion-body">
              <p>{item.description}</p>
              {item.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AppAccordion;
