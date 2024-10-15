// Import necessary libraries and icons
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faStop, faUndo, faTrash, faHandPointer, faPlus } from '@fortawesome/free-solid-svg-icons';
import './TempoTapper.css';

function TempoTapper({ spectrogramUrl, file, audioRef }) {
    // useState hooks to manage component state
    const [tapTimes, setTapTimes] = useState([]); // Stores the times of taps on the spectrogram (eventually will be sent to backend for processing)
    const [isPlaying, setIsPlaying] = useState(false); // Tracks whether the audio is currently playing (toggles play/pause icon)
    const [highlightedTap, setHighlightedTap] = useState(null); // Index of the currently highlighted tap (for use in movement and deletion of taps)
    const [spectrogramWidth, setSpectrogramWidth] = useState(0); // Width of the spectrogram image (used when converting mouse placement to times)
    const [currentTime, setCurrentTime] = useState(0); // Current time in the audio playback (used when animating currentTime bar)
    const [lastTime, setLastTime] = useState(0); // Last recorded time during playback (used when interpolating between the audio time checks [see updateCurrentTimeBar])
    const [wasJustStopped, setWasJustStopped] = useState(true); // Indicates if playback was recently stopped (to halt currentTime bar while wav file loads)
    const [isHovered, setIsHovered] = useState(false); // Indicates if the tap button is hovered (so the effect that checks for clicks doesn't activate erroneously)
    const [isAddTapMode, setIsAddTapMode] = useState(false); // Toggles add tap mode (plus button)
    const [isOn, setIsOn] = useState(false); // Toggle switch for different modes (measure or quarter note)

    // useRef hooks to reference DOM elements
    const scrollContentRef = useRef(null); // Reference to the scrollable content area (used to auto scroll while playing)
    const currentTimeBarRef = useRef(null); // Reference to the current time bar element (used to animate the scrolling currentTime bar)
    const spectrogramRef = useRef(null); // Reference to the spectrogram image element (used to convert tap placement to times)

    // Handle tap action, recording the current time
    const handleTap = useCallback(() => {
        if (isPlaying) {
            const currentTime = audioRef.current.currentTime;
            setTapTimes((prevTapTimes) => [...prevTapTimes, currentTime]);
        }
    }, [isPlaying, audioRef]);

    // Stop audio playback
    const handleStop = useCallback(() => {
        audioRef.current.pause();
        setIsPlaying(false);
        setWasJustStopped(true);
    }, [audioRef]);

    // Delete the highlighted tap
    const handleDeleteTap = useCallback(() => {
        const newTapTimes = tapTimes.filter((_, index) => index !== highlightedTap);
        setTapTimes(newTapTimes);
        setHighlightedTap(null);
    }, [highlightedTap, tapTimes]);

    // Handle click on the spectrogram to add a new tap
    const handleSpectrogramClick = (e) => {
        if (isAddTapMode) {
            setSpectrogramWidth(spectrogramRef.current.offsetWidth);
            const newPosition = e.clientX - scrollContentRef.current.getBoundingClientRect().left + scrollContentRef.current.scrollLeft;
            const duration = audioRef.current.duration;
            const newTapTime = (newPosition / spectrogramWidth) * duration;

            setTapTimes((prevTapTimes) => [...prevTapTimes, newTapTime]);
        }
    };

    // Toggle add tap mode
    const handleTapModeToggle = () => {
        setIsAddTapMode(!isAddTapMode);
    };

    // Toggle play/pause state
    const handleTogglePlay = () => {
        if (!file) return;

        if (isPlaying) {
            handleStop();
        } else {
            handlePlay();
        }
        document.activeElement.blur(); // Unfocus the button to prevent spacebar trigger
    };

    // Start audio playback
    const handlePlay = () => {
        console.log(currentTime, audioRef.current.duration);
        if (Math.abs(currentTime - audioRef.current.duration) < 0.001) {
            console.log("equal");
            setCurrentTime(0);
            setLastTime(0);
            if (currentTimeBarRef.current) {
                currentTimeBarRef.current.style.left = '0px';
            }
            if (scrollContentRef.current) {
                scrollContentRef.current.scrollLeft = 0;
            }
            audioRef.current.currentTime = 0; // Directly set audio currentTime to 0
        }
        console.log(currentTime, audioRef.current.duration);
        setSpectrogramWidth(spectrogramRef.current.offsetWidth); // Set width upon playing
        audioRef.current.currentTime = currentTime; // Ensure this is set correctly
        audioRef.current.play();
        setIsPlaying(true);
    };

    // Handle drag start for a tap marker
    const handleDragStart = (e, index) => {
        e.dataTransfer.setData('index', index);
    };

    // Handle drop for updating tap position
    const handleDrop = (e) => {
        const index = e.dataTransfer.getData('index');
        const newPosition = e.clientX - scrollContentRef.current.getBoundingClientRect().left + scrollContentRef.current.scrollLeft;
        const duration = audioRef.current.duration;
        const newTapTime = (newPosition / spectrogramWidth) * duration;
        const newTapTimes = [...tapTimes];
        newTapTimes[index] = newTapTime;
        setTapTimes(newTapTimes);
    };

    // Handle click on a tap marker to highlight it
    const handleTapClick = (index) => {
        if (highlightedTap === index) {
            setHighlightedTap(null);
        } else {
            setHighlightedTap(index);
        }
    };

    // Reset the current time to the beginning
    const handleResetCurrentTime = () => {
        handleStop();
        setCurrentTime(0);
        setLastTime(0);
        if (currentTimeBarRef.current) {
            currentTimeBarRef.current.style.left = '0px';
        }
        if (scrollContentRef.current) {
            scrollContentRef.current.scrollLeft = 0;
        }
    };

    // Clear all tap markers
    const handleClearTaps = () => {
        setTapTimes([]);
        setHighlightedTap(null);
    };

    // Handle drag start for the current time bar
    const handleCurrentTimeBarDragStart = (e) => {
        e.dataTransfer.setData('currentTimeBar', 'true');
    };

    // Handle drop for moving the current time bar
    const handleCurrentTimeBarDrop = (e) => {
        const isCurrentTimeBar = e.dataTransfer.getData('currentTimeBar');
        if (isCurrentTimeBar) {
            const newPosition = e.clientX - scrollContentRef.current.getBoundingClientRect().left + scrollContentRef.current.scrollLeft;
            const duration = audioRef.current.duration;
            const newTime = (newPosition / spectrogramWidth) * duration;
            setCurrentTime(newTime);
            if (currentTimeBarRef.current) {
                currentTimeBarRef.current.style.left = `${Math.min(newPosition, spectrogramWidth)}px`;
            }
        }
    };

    // Scroll to a specific tap marker
    const scrollToTap = useCallback((index) => {
        const tapTime = tapTimes[index];
        const duration = audioRef.current.duration;
        const newPosition = (tapTime / duration) * spectrogramWidth;
        scrollContentRef.current.scrollLeft = Math.max(newPosition - scrollContentRef.current.clientWidth / 2, 0);
    }, [audioRef, spectrogramWidth, tapTimes]);

    // Move a tap marker by a specific amount
    const moveTap = useCallback((index, amount) => {
        const newTapTimes = [...tapTimes];
        newTapTimes[index] = Math.max(0, Math.min(audioRef.current.duration, newTapTimes[index] + amount));
        setTapTimes(newTapTimes);
    }, [audioRef, tapTimes]);

    // Toggle the state for the switch between marking measures and quarter notes
    const handleToggle = () => {
        setIsOn(!isOn);
    };

    // Effect hook to set spectrogram width when the component mounts or URL changes
    useEffect(() => {
        if (spectrogramRef.current) {
            setSpectrogramWidth(spectrogramRef.current.offsetWidth);
        }
    }, [spectrogramUrl, spectrogramRef]);

    // Effect hook to handle keyboard and mouse events for taps
    useEffect(() => {
        const handleSpacebar = (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent default spacebar action
                handleTap();
            }
        };

        const handleClick = (e) => {
            if (isHovered) {
                handleTap();
            }
        };

        window.addEventListener('keydown', handleSpacebar);
        window.addEventListener('mousedown', handleClick);
        return () => {
            window.removeEventListener('keydown', handleSpacebar);
            window.removeEventListener('mousedown', handleClick);
        };
    }, [handleTap, isHovered]);

    // Effect hook to handle keydown events for navigation and editing
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Tab' && highlightedTap !== null) {
                e.preventDefault();
                if (tapTimes.length > 0) {
                    let nextIndex;
                    if (e.shiftKey) {
                        nextIndex = (highlightedTap - 1 + tapTimes.length) % tapTimes.length;
                    } else {
                        nextIndex = (highlightedTap + 1) % tapTimes.length;
                    }
                    setHighlightedTap(nextIndex);
                    scrollToTap(nextIndex);
                }
            }

            if (highlightedTap !== null) {
                const movement = 0.05; // Movement amount in seconds
                if (e.code === 'ArrowRight') {
                    e.preventDefault();
                    moveTap(highlightedTap, movement);
                } else if (e.code === 'ArrowLeft') {
                    e.preventDefault();
                    moveTap(highlightedTap, -movement);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [highlightedTap, tapTimes, moveTap, scrollToTap]);

    // Effect hook to update the current time bar position
    useEffect(() => {
        let animationFrameId;

        const updateCurrentTimeBar = () => {
            if (isPlaying && currentTimeBarRef.current && spectrogramWidth) {
                let elapsed = audioRef.current.currentTime;
                const increment = 0.01697; // Incremental time update
                if (wasJustStopped) {
                    if (Math.abs(lastTime - elapsed) < 0.0001) {
                        // Do nothing; waiting for audio to load
                    } else {
                        setWasJustStopped(false);
                    }
                } else if (Math.abs(lastTime - elapsed) < 0.00001) {
                    elapsed = currentTime + increment;
                } else {
                    setLastTime(elapsed);
                }

                setCurrentTime(elapsed);

                const duration = audioRef.current.duration;
                const newPosition = (elapsed / duration) * spectrogramWidth;

                if (newPosition > scrollContentRef.current.scrollLeft + scrollContentRef.current.clientWidth / 2) {
                    scrollContentRef.current.scrollLeft = newPosition - scrollContentRef.current.clientWidth / 2;
                }

                currentTimeBarRef.current.style.left = `${Math.min(newPosition, spectrogramWidth)}px`;

                if (elapsed >= duration) {
                    handleStop();
                } else {
                    animationFrameId = requestAnimationFrame(updateCurrentTimeBar);
                }
            }
        };

        if (isPlaying) {
            animationFrameId = requestAnimationFrame(updateCurrentTimeBar);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isPlaying, spectrogramWidth, audioRef, handleStop, currentTime, lastTime, wasJustStopped]);

    // Effect hook to handle delete key for removing taps
    useEffect(() => {
        const handleDelete = (e) => {
            if (highlightedTap !== null && e.code === 'Backspace') {
                e.preventDefault(); // Prevent default backspace action
                handleDeleteTap();
            }
        };
        window.addEventListener('keydown', handleDelete);
        return () => {
            window.removeEventListener('keydown', handleDelete);
        };
    }, [highlightedTap, handleDeleteTap]);

    return (
        <div className='player'>
            {/* Toggle switch for marking mode */}
            <div className='toggle-switch' onClick={handleToggle}>
                <div className='switch-labels'>
                    <span className={`label ${!isOn ? 'selected' : ''}`}>Mark Measures</span>
                </div>
                <div className={`switch ${isOn ? 'switch-on' : 'switch-off'}`}>
                    <div className='switch-circle'></div>
                </div>
                <div className='switch-labels'>
                    <span className={`label ${isOn ? 'selected' : ''}`}>Mark Quarter Notes</span>
                </div>
            </div>
            {/* Spectrogram and controls */}
            <div className='frame'>
                <div className='scrollContainer' onClick={handleSpectrogramClick} onDrop={handleDrop} ref={scrollContentRef} onDragOver={(e) => e.preventDefault()}>
                    <div className='scrollContent' onDrop={handleCurrentTimeBarDrop} onDragOver={(e) => e.preventDefault()}>
                        <img
                            src={spectrogramUrl}
                            alt='Spectrogram'
                            className='spectrogram'
                            ref={spectrogramRef}
                        />
                        <div className='currentTimeBar' ref={currentTimeBarRef} draggable='true' onDragStart={handleCurrentTimeBarDragStart}></div>
                        {tapTimes.map((tap, index) => (
                            <div
                                key={index}
                                className={`tapMarker ${highlightedTap === index ? 'highlighted' : ''}`}
                                style={{ left: `${(tap / audioRef.current.duration) * spectrogramWidth}px` }}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onClick={() => handleTapClick(index)}
                            ></div>
                        ))}
                    </div>
                </div>
                <div className='controls'>
                    <button title='Play/Pause' onClick={handleTogglePlay} className='controlButton'>
                        <FontAwesomeIcon icon={isPlaying ? faStop : faPlay} />
                    </button>
                    <button
                        title='Tap while playing to mark beat'
                        disabled={!isPlaying}
                        className='controlButton tapButton'
                        id='tapButton'
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        <FontAwesomeIcon icon={faHandPointer} />
                    </button>
                    <button title='Go to beginning' onClick={handleResetCurrentTime} className='controlButton'>
                        <FontAwesomeIcon icon={faUndo} />
                    </button>
                    <button title='Manually add beats (click)' onClick={handleTapModeToggle} className={`controlButton ${isAddTapMode ? 'tapModeButton' : ''}`} >
                        <FontAwesomeIcon icon={faPlus} />
                    </button>
                    <button title='Clear All' onClick={handleClearTaps} className='controlButton clearButton'>
                        <FontAwesomeIcon icon={faTrash} /> Clear All
                    </button>
                    {highlightedTap !== null && (
                        <button title='Delete Marker' onClick={handleDeleteTap} className='controlButton deleteButton'>
                            <FontAwesomeIcon icon={faTrash} /> Delete Marker
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TempoTapper;
