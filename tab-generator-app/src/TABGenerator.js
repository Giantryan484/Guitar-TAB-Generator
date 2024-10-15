import React, { useState, useRef } from 'react';
import TempoTapper from './TempoTapper';
import Tooltip from './ToolTip';
import * as tf from '@tensorflow/tfjs';
import './TABGenerator.css';

// This component has waaaaay too much functionality for React. But I don't have time to refactor it.
function TABGenerator() {
    const [file, setFile] = useState(null);
    const [spectrogramUrl, setSpectrogramUrl] = useState('');
    const [waveformUrl, setWaveformUrl] = useState('');
    const [ML_Inputs, setML_Inputs] = useState('');
    const audioRef = useRef(null);
    const [audioLoaded, setAudioLoaded] = useState(false);
    const [tempoType, setTempoType] = useState(true);

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
        const audioUrl = URL.createObjectURL(event.target.files[0]);
        audioRef.current.src = audioUrl;
    };

    // --- Spectrogram helper Functions (copied from ./Dataset Generation/tf_audio_processing.js) ---

    // creates length-64 slices of a given spectrogram array for input into the CNN 
    async function create_64th_note_slices_from_bpm(array, bpm, audioDuration) {
        const beats_per_second = bpm / 60;
        const seconds_per_beat = 1 / beats_per_second;
        const seconds_per_64th_note = seconds_per_beat / 16;
        let new_array = [];
        let current_time = 0;

        while (current_time < audioDuration) {
            let lower_bound = Math.floor((current_time / audioDuration) * array.length);
            let upper_bound = Math.floor(((current_time + seconds_per_64th_note) / audioDuration) * array.length);

            // Ensure upper_bound does not exceed the length of the array
            if (upper_bound >= array.length) {
                upper_bound = array.length - 1;
            }

            let array_slice = array.slice(lower_bound, upper_bound + 1);

            // If array_slice is empty (not sure when this will happen, but just in case), use the last available slice
            if (array_slice.length === 0) {
                array_slice = [array[array.length - 1]];
            }

            // Averaging the values of the slices
            let avg_array_slice = [];
            for (let i = 0; i < array[0].length; i++) {
                let sum = 0;
                for (let j = 0; j < array_slice.length; j++) {
                    sum += array_slice[j][i];
                }
                let average_value = sum / array_slice.length;
                avg_array_slice.push(average_value);
            }

            new_array.push(avg_array_slice);
            current_time += seconds_per_64th_note;
        }

        return new_array;
    }

    // reduces the height of the spectrogram to 128 by averaging frequencies into logarithmically-sized buckets
    async function reduce_height_logarithmically(array, num_buckets) {
        const image_height = array[0].length;
        // const num_buckets = 400;
        const root = Math.pow(image_height, 1.0 / num_buckets);
        let new_array = [];

        const average = array => array.reduce((a, b) => a + b, 0) / array.length;

        // Iterate over each row
        for (let j = 0; j < array.length; j++) {
            let array_slice = array[j];
            let new_array_slice = [];
            let current_index = 0;

            // Create buckets
            for (let i = 0; i < num_buckets; i++) {
                let num_items = Math.ceil(Math.pow(root, i));
                if (current_index >= array_slice.length) {
                    break; // No more data to process
                }

                num_items = Math.min(num_items, array_slice.length - current_index);
                let bucket_contents = array_slice.slice(current_index, current_index + num_items);

                // Calculate average of all values
                if (bucket_contents.length > 0) {
                    let value = average(bucket_contents);
                    new_array_slice.push(value);
                } else {
                    break;
                }
                current_index += num_items;
            }
            new_array.push(new_array_slice);
        }

        // So, the problem is, my buckets aren't quite working properly, 
        // we run out of indexes after about 2/3 of the data (because of a 
        // series of off-by-one errors). So, my solution is to over 
        // bucket-itize and then slice out the bottom 128 values for 
        // the model:

        // Here lies jank
        const sliced_array = new_array.map(row => row.slice(0, 128));

        return sliced_array;
    }

    // rounds up super small values to 10e-6 so normalization works better
    async function roundUpArrayValues(array) {
        for (let i = 0; i < array.length; i++) {
            for (let j = 0; j < array[i].length; j++) {
                if (array[i][j] < 0.000001) {
                    array[i][j] = 0.000001;
                }
            }
        }
        return array;
    }

    // normalize array between 0-1
    async function normalizeArray(array) {
        if (!Array.isArray(array)) {
            throw new Error("Expected a non-empty 2D array for normalization");
        }
        const flattenArray = (arr) => arr.reduce((acc, val) => acc.concat(val), []);

        const flattened = flattenArray(array);
        const minVal = Math.min(...flattened);
        const maxVal = Math.max(...flattened);

        const normalized_array = array.map(row =>
            row.map(value => (value - minVal) / (maxVal - minVal))
        );

        return normalized_array;
    }

    // creates a link to a grayscale image from a 2D array of values 0-1
    async function generateImageFrom2DArray(array) {
        // This seems terribly inefficient, but whatever. 
        // I'm not a js dev, so I won't judge what must be done.
        // Why isn't this a built-in function anyways?

        const canvas = document.createElement('canvas'); // don't load in DOM
        const context = canvas.getContext('2d');
        const width = array[0].length;
        const height = array.length;
        canvas.width = width;
        canvas.height = height;

        const imageData = context.createImageData(width, height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const value = Math.floor(array[y][x] * 255);
                const index = (y * width + x) * 4; // position in data array (* 4 because each pixel has RGBA values)

                // Set RGBA values in data array
                imageData.data[index] = value;     // red
                imageData.data[index + 1] = value; // green
                imageData.data[index + 2] = value; // blue
                imageData.data[index + 3] = 255;   // alpha
            }
        }

        context.putImageData(imageData, 0, 0);

        const jpgDataUrl = canvas.toDataURL('image/jpeg');
        return jpgDataUrl;
    }

    // converts file to array buffer for processing.
    async function fetchAudioAsArrayBuffer(url) {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            return arrayBuffer;
        } catch (error) {
            console.error('Error fetching audio file:', error);
        }
    }

    const createSpectrogramInput = async (arrayBuffer) => {
        // TODO: take BPM input, or take manual input/create manual function.
        const audio = new (window.AudioContext || window.webkitAudioContext)();

        const decodedData = await audio.decodeAudioData(arrayBuffer);
        const channelData = decodedData.getChannelData(0);
        const audioTensor = tf.tensor1d(channelData);
        const audioDuration = decodedData.duration;

        // Do the STFT
        const frameLength = 8192;
        const frameStep = 4096;
        const stft = tf.signal.stft(audioTensor, frameLength, frameStep);
        const spectrogram = stft.abs();

        const eps = tf.scalar(Number.EPSILON);  // small constant to avoid log(0)
        const logSpectrogram = spectrogram.add(eps).log();

        const array = await logSpectrogram.array();

        // Prepares the spectrogram for input into the CNN
        const shortened_array = await reduce_height_logarithmically(array, 400);
        const array_64ths = await create_64th_note_slices_from_bpm(shortened_array, 120, audioDuration);
        const rounded_array = await roundUpArrayValues(array_64ths);
        const ML_array = await normalizeArray(rounded_array);

        return ML_array
    }

    const createSpectrogramImage = async (data) => {
        const audioTensor = tf.tensor1d(data);

        // Do the STFT
        const frameLength = 4096;
        const frameStep = 512;
        const stft = tf.signal.stft(audioTensor, frameLength, frameStep);
        const spectrogram = stft.abs();

        const eps = tf.scalar(Number.EPSILON);  // small constant to avoid log(0)
        const logSpectrogram = spectrogram.add(eps).log();

        const array = await logSpectrogram.array();

        // Preprocess spectrogram image for display to the user
        const shortened_array = await reduce_height_logarithmically(array, 128);
        const rounded_array = await roundUpArrayValues(shortened_array);
        const normalized_array = await normalizeArray(rounded_array);
        const transposed_array = normalized_array[0].map((_, colIndex) => normalized_array.map(row => row[colIndex]));
        const Image_array = transposed_array.reverse();

        const url = await generateImageFrom2DArray(Image_array);

        return url;
    }

    const createWaveformImage = async (data) => {
        const canvas = document.createElement('canvas'); // don't load in DOM
        const context = canvas.getContext('2d');

        const width = 300;
        const height = 128;
        const step = Math.ceil(data.length / width); // how far to step for each rectangle
        const amp = height / 2;

        // context.fillStyle = 'white'; // white background
        // context.fillRect(0, 0, width, height);

        context.fillStyle = 'rgb(92, 219, 149)'; // Set color

        // draw amplitudes (creating the waveform manually)
        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const data_point = data[(i * step) + j];
                if (data_point < min) min = data_point;
                if (data_point > max) max = data_point;
            }
            context.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
        const url = canvas.toDataURL('image/png');

        return url;
    };

    const handleUpload = async () => {
        const arrayBuffer = await fetchAudioAsArrayBuffer(audioRef.current.src);
        const audio = new (window.AudioContext || window.webkitAudioContext)();
        const decodedData = await audio.decodeAudioData(arrayBuffer);
        const data = decodedData.getChannelData(0);

        console.log(data.length);

        const spectrogram = await createSpectrogramImage(data);
        const waveform = await createWaveformImage(data);

        setSpectrogramUrl(spectrogram);
        setWaveformUrl(waveform);
        // setML_Inputs(createSpectrogramInput(array, bpm, audioDuration));
    };

    const onLoadedMetadata = () => {
        setAudioLoaded(true);
    };

    return (
        <div className='container'>
            <div className='center-column'>
                <h1 className='title'>Guitar TAB Generator</h1>
                <p>This is an interactive demo that uses a Convolutional Neural Network to identify notes in audio of a solo guitar. Use it to learn your favorite guitar melodies!</p>
                <p>For a detailed overview of how this works and how I developed it, visit the <span href="https://github.com/Giantryan484/Guitar-TAB-Generator">GitHub Repo</span></p>
                <div className='header'><h2>Upload Audio File <Tooltip message={'This should be audio of only guitar playing. Other instruments (drums, vocals, bass) could throw off my model. The accepted file formats are .wav, .mp3, .ogg, and .flac'} /></h2></div>
                <div className='upload-container'>
                    <input
                        type='file'
                        accept='.wav,.mp3,.ogg,.flac'
                        onChange={handleFileChange}
                        id='fileInput'
                        className='hiddenInput'
                    />
                    <label htmlFor='fileInput' className='customFileButton'>
                        Choose File
                    </label>
                    {file && (
                        audioLoaded && (
                            <audio controls src={audioRef.current.src} className="audio-player">
                                Your browser does not support the audio element.
                            </audio>
                        )
                    )}
                    {waveformUrl && (
                        <img
                            src={waveformUrl}
                            alt='Waveform'
                            className='audio-image'
                        />
                    )}
                    {spectrogramUrl && (
                        <img
                            src={spectrogramUrl}
                            alt='Spectrogram'
                            className='audio-image'
                        />
                    )}
                </div>
                <button
                    onClick={handleUpload}
                    className={`uploadButton ${file ? 'active' : ''}`}
                    disabled={!file}
                >
                    Upload and Generate Spectrogram
                </button>
                <audio ref={audioRef} onLoadedMetadata={onLoadedMetadata} />
                <div className='timing-selector'>
                    <button onClick={() => setTempoType(false)} className={`timingButton ${!tempoType ? 'active' : ''}`}>Choose a Tempo</button>
                    <button onClick={() => setTempoType(true)} className={`timingButton ${tempoType ? 'active' : ''}`}>Mark Measures Manually</button>
                </div>
                {tempoType && (
                    file && (
                        audioLoaded && (
                            spectrogramUrl && (
                                <div className='tempo-tapper-container'>
                                    <TempoTapper spectrogramUrl={spectrogramUrl} file={file} audioRef={audioRef} />
                                    <button className='printButton'>Print</button> {/*Make into separate object eventually*/}
                                </div>
                            )
                        )
                    )
                )}

            </div>
        </div>
    );
}

export default TABGenerator;
