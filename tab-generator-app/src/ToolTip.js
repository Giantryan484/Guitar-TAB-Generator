import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import './ToolTip.css';

const Tooltip = ({ message }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className='tooltip-container'>
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <FontAwesomeIcon className='tooltip-icon' icon={faCircleInfo} />
            </div>
            <div className={`tooltip-box ${isHovered ? 'visible' : 'hidden'}`}>
                {message}
            </div>
        </div>
    );
};

export default Tooltip;
