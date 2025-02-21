import React from "react";

const InlineCitation = ({ source, sourceNumber, highlighted, onMouseEnter, onMouseLeave }) => {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`relative bottom-1.5 text-xs border rounded px-1 ${
        highlighted ? 'bg-[rgb(58,58,61)]' : 'bg-[rgb(78,78,81)]'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {sourceNumber}
    </a>
  );
};

export default InlineCitation;
