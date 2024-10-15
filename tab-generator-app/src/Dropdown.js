import React, { useState } from 'react';
import './Dropdown.css';

const Dropdown = ({ mainString, listStrings, setState }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (item) => {
    setState(item);
    setIsOpen(false);
  };

  return (
    <div className="dropdown-container">
      <div className="dropdown-main" onClick={handleToggle}>
        {mainString}
      </div>
      {isOpen && (
        <div className="dropdown-list" onMouseLeave={handleToggle}>
          {listStrings.map((item, index) => (
            <div key={index} className="dropdown-item" onClick={() => handleSelect(item)}>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;