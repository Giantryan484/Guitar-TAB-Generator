import React, { useState, useRef, useEffect } from 'react';
import TempoTapper from './TempoTapper';
import Tooltip from './ToolTip';
import * as tf from '@tensorflow/tfjs';
import './TABGenerator.css';
import LoadingIcon from './LoadingIcon';
import Dropdown from './Dropdown';
import { analyze } from 'web-audio-beat-detector';
import { processML_Outputs } from './TABGenerationFunctions';

// This component has waaaaay too much functionality for React. But I don't have time to refactor it.
function TABGenerator() {
    const [file, setFile] = useState(null);
    const [spectrogramUrl, setSpectrogramUrl] = useState('');
    const [waveformUrl, setWaveformUrl] = useState('');
    const [BPM, setBPM] = useState(120.0);
    const [estimatedBPM, setEstimatedBPM] = useState(false);
    const [exampleFile, setExampleFile] = useState('');
    const [fileName, setFileName] = useState('');
    const [audioLoaded, setAudioLoaded] = useState(false);
    const [tempoType, setTempoType] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState(false);
    const [PdfUrl, setPdfUrl] = useState('');
    const [tapTimes, setTapTimes] = useState([]);
    const [isOn, setIsOn] = useState(false);
    const [loadStatus, setLoadStatus] = useState(["Processing", ""]);
    const [outputImageURL, setOutputImageURL] = useState('');
    const [outputsSaved, setOutputsSaved] = useState(null);
    const [threshold, setThreshold] = useState(0.10);
    const [thresholdOutputImageURL, setThresholdOutputImageURL] = useState(null);
    const audioRef = useRef(null);

    useEffect(() => {
        if (exampleFile && !audioRef.current.src.includes(exampleFile)) {
            setFile(true);
            setFileName(exampleFile);
            audioRef.current.src = "/" + exampleFile;
            console.log(exampleFile, "/" + exampleFile);
            handleUpload();
        }
    }, [exampleFile]);

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
        setFileName(event.target.files[0].name);
        const audioUrl = URL.createObjectURL(event.target.files[0]);
        audioRef.current.src = audioUrl;
        handleUpload();
    };

    // --- Spectrogram helper Functions (copied from ./Dataset Generation/tf_audio_processing.js) ---

    // creates length-64 slices of a given spectrogram array from an array of proportions that denote beats in the audio.
    async function create_64th_note_slices_from_times_array(array, times, marking_type = "quarter", audioDuration) {
        let new_array = [];
        let measure_lower_bound = 0;
        times.push(audioDuration); // adds end of audio as the end of a measure
        let divisor;

        if (marking_type === "quarter") {
            divisor = 16; // how many times to divide each time slice
        } else {
            divisor = 64;
        }

        for (let i = 0; i < times.length; i++) {
            let measure_upper_bound = times[i];// * audioDuration;

            if (!measure_upper_bound) { // skip "undefined"s
                continue;
            }

            let seconds_per_64th_note = (measure_upper_bound - measure_lower_bound) / divisor;
            let current_time = measure_lower_bound;

            if (measure_upper_bound <= measure_lower_bound) { // avoid infinite loop
                measure_lower_bound = measure_upper_bound;
                continue;
            }

            while (current_time < measure_upper_bound) {
                if (current_time >= measure_upper_bound) break;
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

            measure_lower_bound = measure_upper_bound;
        }

        return new_array;
    }

    // creates length-64 slices of a given spectrogram array for input into the CNN 
    async function create_64th_note_slices_from_bpm(array, bpm, audioDuration) {
        const beats_per_second = bpm / 60;
        const seconds_per_beat = 1 / beats_per_second;
        const seconds_per_64th_note = seconds_per_beat / 16;
        let new_array = [];
        let current_time = 0;
        // console.log("Duration, seconds per slice: ", audioDuration, seconds_per_64th_note)

        while (current_time < audioDuration) {
            let lower_bound = Math.floor((current_time / audioDuration) * array.length);
            let upper_bound = Math.floor(((current_time + seconds_per_64th_note) / audioDuration) * array.length);

            // Ensure upper_bound does not exceed the length of the array
            if (upper_bound >= array.length) {
                upper_bound = array.length - 1;
            }

            let array_slice = array.slice(lower_bound, upper_bound + 1);

            // console.log("slice: ", current_time, array_slice);

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

            // console.log("slice, averaged: ", current_time, avg_array_slice);

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
        let minVal = Infinity;
        for (const value of flattened) {
            if (value < minVal) {
                minVal = value;
            }
        }
        let maxVal = -Infinity;
        for (const value of flattened) {
            if (value > maxVal) {
                maxVal = value;
            }
        }

        const normalized_array = array.map(row =>
            row.map(value => (value - minVal) / (maxVal - minVal))
        );

        return normalized_array;
    }

    // round array values up to 1 based on a threshold
    function thresholdArray(array, threshold) {
        return array.map(row =>
            row.map(value => value < threshold ? 0 : 1)
        );
    };

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

    // estimate BPM from an audio buffer
    async function estimateBPM(audioBuffer) {
        const bpm = await analyze(audioBuffer); // boy do I love libraries that do this stuff for me! Full credit to: https://github.com/chrisguttandin/web-audio-beat-detector
        return parseFloat(bpm.toFixed(3));
    }

    const createSpectrogramInput = async (data, bpm = 120) => {
        // TODO: take BPM input, or take manual input/create manual function.
        // const audio = new (window.AudioContext || window.webkitAudioContext)();

        // const decodedData = await audio.decodeAudioData(arrayBuffer);
        // const channelData = decodedData.getChannelData(0);
        const audioTensor = tf.tensor1d(data);
        // const audioDuration = data.duration;
        const audioDuration = audioRef.current.duration;
        // console.log("raw audio data (duration, data): ", audioDuration, data);

        // Do the STFT
        const frameLength = 8192;
        const frameStep = 4096;
        const stft = tf.signal.stft(audioTensor, frameLength, frameStep);
        const spectrogram = stft.abs();

        const eps = tf.scalar(Number.EPSILON);  // small constant to avoid log(0)
        const logSpectrogram = spectrogram.add(eps).log();

        const array = await logSpectrogram.array();

        // console.log("inputs before log: ", array);

        // Prepares the spectrogram for input into the CNN
        const shortened_array = await reduce_height_logarithmically(array, 400);

        // console.log("inputs after log: ", shortened_array);

        let array_64ths;

        if (tempoType) { // NOT bpm
            let marking_type;
            if (isOn) {
                marking_type = "quarter";
            } else {
                marking_type = "measure";
            }
            array_64ths = await create_64th_note_slices_from_times_array(shortened_array, tapTimes, marking_type, audioDuration);
            // console.log("not bpm");
        } else {
            array_64ths = await create_64th_note_slices_from_bpm(shortened_array, bpm, audioDuration);
            // console.log("bpm");
        }

        // console.log("inputs after 64thed: ", array_64ths);

        const rounded_array = await roundUpArrayValues(array_64ths);

        // console.log("inputs after rounding: ", rounded_array);

        const ML_array = await normalizeArray(rounded_array);

        // console.log("inputs after all: ", ML_array);


        return ML_array
    }

    const createSpectrogramImage = async (data) => {
        const audioTensor = tf.tensor1d(data);

        // Do the STFT
        const frameLength = 4096;
        const frameStep = 256;
        const stft = tf.signal.stft(audioTensor, frameLength, frameStep);
        const spectrogram = stft.abs();

        const eps = tf.scalar(Number.EPSILON);  // small constant to avoid log(0)
        const logSpectrogram = spectrogram.add(eps).log();

        const array = await logSpectrogram.array();

        // Preprocess spectrogram image for display to the user
        const shortened_array = await reduce_height_logarithmically(array, 400);
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
        canvas.width = width;
        canvas.height = height;
        const step = Math.ceil(data.length / width); // how far to step for each rectangle
        const amp = height / 2;

        // context.fillStyle = 'white'; // white background
        // context.fillRect(0, 0, width, height);

        // context.fillStyle = 'rgb(92, 219, 149)'; // Set color
        context.fillStyle = '#379683'; // Set color

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
        await setSpectrogramUrl('');
        await setWaveformUrl('');
        await setEstimatedBPM(null);
        await setPdfUrl('');
        // await setML_Inputs(null);
        // await setML_Outputs(null);
        // await setPDFBytes(null);
        await setSubmissionStatus(false);
        await setTapTimes([]);
        await setExampleFile('');
        await setOutputsSaved(null);
        await setOutputImageURL('');


        const arrayBuffer = await fetchAudioAsArrayBuffer(audioRef.current.src);
        const audio = new (window.AudioContext || window.webkitAudioContext)();
        const decodedData = await audio.decodeAudioData(arrayBuffer);
        const data = decodedData.getChannelData(0);

        // console.log(data.length);

        const spectrogram = await createSpectrogramImage(data);
        setSpectrogramUrl(spectrogram);

        const waveform = await createWaveformImage(data);
        setWaveformUrl(waveform);

        try {
            const bpm = await estimateBPM(decodedData)
            setEstimatedBPM(bpm);
            setBPM(bpm);
        } catch {
            setEstimatedBPM("Unknown; Your audio may be too quiet.");
            setBPM(0);
        }
        // const bpm = await estimateBPM(decodedData)
        // setEstimatedBPM(bpm);
        // setBPM(bpm);

        await new Promise((resolve) => setTimeout(resolve, 200))

        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth',
        });

        // setML_Inputs(createSpectrogramInput(array, bpm, audioDuration));
    };

    const onLoadedMetadata = () => {
        setAudioLoaded(true);
    };

    const handleBPM = (e) => {
        setBPM(e.target.value);
    };

    const runMLModel = async (inputs) => {
        let len = inputs.length;
        const master_outputs = [];

        const model = await tf.loadLayersModel('/model/model.json');
        // console.log("Model loaded successfully:", model.summary());
        // console.log("inputs: ", inputs);

        // convert inputs (long list of size 128 spectrogram slices) into ML_inputs (64x128 array of slices, model predicts next slice.)
        function createSubArrays(bigArray, windowSize = 64) {
            const subArrays = [];
            const numRows = bigArray.length;

            if (numRows < windowSize) {
                throw new Error("The audio is less than a measure long. The model is unable to parse it.");
            }

            for (let i = 0; i <= numRows - windowSize; i++) {
                const subArray = bigArray.slice(i, i + windowSize);
                subArrays.push(subArray);
            }

            return subArrays;
        }

        // console.log("got here")
        const ML_inputs = createSubArrays(inputs);
        len = ML_inputs.length;

        function flattenArray(array) {
            return array.reduce((flattened, row) => flattened.concat(row), []);
        }

        // console.log("ML_inputs: ", ML_inputs);

        for (let i = 0; i < len; i++) {
            await setLoadStatus(["Running the Model", `Parsing slice ${i + 1}/${len}`]);
            await new Promise(resolve => setTimeout(resolve, 0)); // Yield control back to the event loop
            let input = ML_inputs[i];
            let flattened_input = flattenArray(input);
            const tfInput = tf.tensor(flattened_input).reshape([1, 64, 128, 1]);

            const output = model.predict(tfInput);
            const outputArray = output.arraySync()[0];
            master_outputs.push(outputArray);

            tfInput.dispose();
            output.dispose();
        }
        // console.log("master_outputs: ", master_outputs);

        const values = Array(32 + len - 1).fill(0).map(() => Array(49).fill(0));
        const counts = Array(32 + len - 1).fill(0).map(() => Array(49).fill(0));

        // aggregation
        for (let i = 0; i < master_outputs.length; i++) {
            for (let slice_index = 0; slice_index < master_outputs[i].length; slice_index++) {
                const slice = master_outputs[i][slice_index];
                for (let value_index = 0; value_index < slice.length; value_index++) {
                    values[i + slice_index][value_index] += slice[value_index];
                    counts[i + slice_index][value_index] += 1;
                }
            }
        }

        const output = values.map((row, i) =>
            row.map((val, j) => (counts[i][j] === 0 ? 0 : val / counts[i][j]))
        );

        // console.log("final outputs: ", output);

        return output;
    };

    const handleSubmit = async () => {
        // iframeRef.current.src = null;
        await setSubmissionStatus(true);
        await setPdfUrl(null);
        await setOutputImageURL('');
        await setThresholdOutputImageURL('');
        await setOutputsSaved(null);
        await setThreshold(0.1);

        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth',
        });

        setLoadStatus(["Preparing Audio", "This may take a while..."]);
        const arrayBuffer = await fetchAudioAsArrayBuffer(audioRef.current.src);
        const audio = new (window.AudioContext || window.webkitAudioContext)();
        const decodedData = await audio.decodeAudioData(arrayBuffer);
        const data = decodedData.getChannelData(0);

        await console.log(tapTimes);

        // console.log("original data", data);

        const inputs = await createSpectrogramInput(data, BPM); // requires bpm and spectrogram inputs
        // console.log("original inputs", inputs);

        // setLoadStatus(["Running the Model", "Initializing..."]);
        const outputs = await runMLModel(inputs);
        setOutputsSaved(outputs);

        const outputTranposed = outputs[0].map((_, colIndex) => outputs.map(row => row[colIndex]));
        const outputAmplified = outputTranposed.map((arr) => arr.map((item) => Math.sqrt(item)));
        const outputReversed = outputAmplified.reverse();
        const outputImage = await generateImageFrom2DArray(outputReversed);
        setOutputImageURL(outputImage);

        const thresholdOutputs = thresholdArray(outputs, 0.2);
        const thresholdTransposed = thresholdOutputs[0].map((_, colIndex) => thresholdOutputs.map(row => row[colIndex]));
        const thresholdReversed = thresholdTransposed.reverse();
        const thresholdImage = await generateImageFrom2DArray(thresholdReversed);
        setThresholdOutputImageURL(thresholdImage);

        setLoadStatus(["Optimizing TABs", "This may take a while..."]);
        const TABsURL = await processML_Outputs(outputs, fileName);
        setPdfUrl(TABsURL);
    }


    const handleThresholdChange = async (e) => {
        await setThreshold(e.target.value);
        const thresholdOutputs = thresholdArray(outputsSaved, e.target.value);
        const thresholdTransposed = thresholdOutputs[0].map((_, colIndex) => thresholdOutputs.map(row => row[colIndex]));
        const thresholdReversed = thresholdTransposed.reverse();
        const thresholdImage = await generateImageFrom2DArray(thresholdReversed);
        setThresholdOutputImageURL(thresholdImage);
    }

    const handleThresholdRefresh = async () => {
        const thresholdOutputs = thresholdArray(outputsSaved, threshold)
        const TABsURL = await processML_Outputs(thresholdOutputs, fileName);
        setPdfUrl(TABsURL);
    }


    return (
        <div className='container'>
            <div className='center-column'>
                <h1 className='title'>Guitar TAB Generator</h1>
                <p>UPDATE 11/27/24: After over a month working on this thing, I finally got it working by rebuilding <i>everything</i> in javascript. Now, the entire site should work... but it's not very good right now. The current site uses a placeholder model trained on a very small dataset, and I need to redesign and retrain the model from scratch. In the meantime, you can use the current state of the website to get an idea of how the final product will operate.</p>
                <p>This is an interactive demo that uses a Convolutional Neural Network to create playable TABS from audio of a solo guitar. Use it to learn your favorite guitar melodies!</p>
                <img
                    src={"demo_image(1).png"}
                    alt='waveform being transformed into TABs'
                    // className='audio-image'
                    style={{
                        width: "700px",
                        height: "128px"
                    }}
                />
                <p>For a detailed overview of how this works and how I made it, visit the <a href="https://github.com/Giantryan484/Guitar-TAB-Generator" style={{ color: "var(--secondary-color)" }}>GitHub Repo</a></p>
                <hr />
                <div className='header'><h2>Upload Audio File <Tooltip message={'This should be audio of only guitar playing. Other instruments (drums, vocals, bass) could throw off the model. The accepted file formats are .wav, .mp3, .ogg, and .flac'} /></h2></div>
                <div className='upload-container'>
                    <div className='button-and-name'>
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
                        <div className='filename' style={{ padding: `${fileName ? "10px" : "0px"}` }}>{fileName}</div>
                    </div>
                    <Dropdown
                        mainString={"(Or use an example file)"}
                        listStrings={["Blackbird-(The_Beatles).mp3", "Beat_It-(Michael_Jackson).mp3", "Maple_Syrup-(The_Backseat_Lovers).mp3", "Spanish_Romance-(Unknown).mp3"]}
                        setState={setExampleFile}
                    />
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
                    {estimatedBPM && (
                        <div className='audio-estimates'>
                            Estimated BPM: {estimatedBPM}&nbsp;&nbsp;&nbsp;&nbsp;Duration: {parseFloat(audioRef.current.duration.toFixed(3))}s
                            {/* add duration and estimates bpm */}
                        </div>
                    )}
                    {file && audioLoaded && (
                        (!waveformUrl || !spectrogramUrl || !estimatedBPM) && (
                            <LoadingIcon message={"Processing"} subMessage={"(This can take a while for longer files)"} />
                        )
                    )}
                </div>
                <audio ref={audioRef} onLoadedMetadata={onLoadedMetadata} />
                {(file && audioLoaded && waveformUrl && spectrogramUrl && estimatedBPM) && (
                    <div style={{ width: "100%" }}>
                        <hr />
                        <div className='header'><h2>Mark Beats <Tooltip message={'I\'ve had a tool estimate the bpm of your recording, but you can enter a revised one if needed. You can also manually mark time for more precise or customized results.'} /></h2></div>
                        <div className='timing-selector'>
                            <button onClick={() => setTempoType(false)} className={`timingButton ${!tempoType ? 'active' : ''}`}>Use a Set BPM</button>
                            <button onClick={() => setTempoType(true)} className={`timingButton ${tempoType ? 'active' : ''}`}>Mark Measures Manually</button>
                        </div>
                        {tempoType && (
                            file && (
                                audioLoaded && (
                                    spectrogramUrl && (
                                        <div className='tempo-tapper-container'>
                                            <TempoTapper
                                                spectrogramUrl={spectrogramUrl}
                                                file={file}
                                                audioRef={audioRef}
                                                tapTimes={tapTimes}
                                                setTapTimes={setTapTimes}
                                                isOn={isOn}
                                                setIsOn={setIsOn}
                                            />
                                            <button className='submitButton' onClick={handleSubmit}>Submit</button>
                                            {/* <button className='printButton'>Print</button> Make into separate object eventually */}
                                        </div>
                                    )
                                )
                            )
                        )}
                        {!tempoType && (
                            <div className='tempo-area'>
                                <div className='BPM-input-area'>
                                    <label className='BPM-label'>Enter a BPM:</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={BPM}
                                        onChange={handleBPM}
                                        className='BPM-input'
                                    />
                                </div>
                                <button className='submitButton' onClick={handleSubmit}>Submit</button>
                            </div>
                        )}
                    </div>
                )}
                {submissionStatus && (
                    <div style={{ width: "100%" }}>
                        <hr />
                        <div className='header'><h2>Run the Model <Tooltip message={'The machine learning model is looking at measure-long slices and figuring out what notes are being played.'} /></h2></div>
                        {!PdfUrl && (
                            <LoadingIcon message={loadStatus[0]} subMessage={loadStatus[1]} />
                        )}
                        {outputImageURL && (
                            //<iframe src={PdfUrl} width="100%" height="600px" title='pdf-display' /> // change to a "complete" message
                            <div>
                                {/* <p style={{textAlign: "center"}}>Complete:</p> */}
                                <p style={{ textAlign: "center" }}>Model Output:</p>
                                <div style={{ display: "flex", justifyContent: "center" }}>
                                    <img
                                        src={outputImageURL}
                                        alt='A MIDI visualization of the output from the model'
                                        style={{
                                            width: "500px",
                                            height: "200px"
                                        }}
                                    />
                                </div>
                                {/* <p style={{textAlign: "center"}}>Change threshold for TAB recognition:</p> */}
                            </div>
                        )}
                    </div>
                )}
                {(outputsSaved && thresholdOutputImageURL) && (
                    <div style={{ width: "100%" }}>
                        <hr />
                        <div className='header'><h2>Generate TABs <Tooltip message={'The notes detected by the CNN model are converted to TABs using an algorithm that minimizes distance between frets.'} /></h2></div>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <div className='tempo-area'>
                                <div className='BPM-input-area'>
                                    <label className='BPM-label'>Enter a Threshold:</label>
                                    <input
                                        type="number"
                                        step="0.002"
                                        value={threshold}
                                        onChange={handleThresholdChange}
                                        className='BPM-input'
                                        min="0"
                                        max="1"
                                    />
                                </div>                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <img
                                src={thresholdOutputImageURL}
                                alt='A MIDI visualization of the output from the model'
                                style={{
                                    width: "500px",
                                    height: "200px",
                                    padding: "10px"
                                }}
                            />
                        </div>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <button
                                className='submitButton'
                                onClick={handleThresholdRefresh}
                                style={{
                                    marginBottom: "20px"
                                }}
                            >
                                Refresh PDF
                            </button>
                        </div>
                        {PdfUrl && (
                            <iframe src={PdfUrl} width="100%" height="600px" title='pdf-display' />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default TABGenerator;
