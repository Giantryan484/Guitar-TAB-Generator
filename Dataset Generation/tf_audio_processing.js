const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const wav = require('node-wav');

const audioFilePath = process.argv[2];
const outputJsonPath = process.argv[3];

const buffer = fs.readFileSync(audioFilePath);
const wavData = wav.decode(buffer);
const audioTensor = tf.tensor1d(wavData.channelData[0]);
const audioDuration = wavData.channelData[0].length / wavData.sampleRate;
const frameLength = 8192;
const frameStep = 4096;

// Compute the STFT
const stft = tf.signal.stft(audioTensor, frameLength, frameStep);
const spectrogram = stft.abs();

const eps = tf.scalar(Number.EPSILON);  // small constant to avoid log(0)
const logSpectrogram = spectrogram.add(eps).log();

function reduce_height_logarithmically(array) {
    const image_height = array[0].length;
    // So, the problem is, my buckets aren't quite working properly, we run out of indexes after about 2/3 of the data. SO, my solution is to over bucket-itize and then slice out the bottom 128 values for the model.
    const num_buckets = 400;
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
            // Calculate number of items for this bucket
            let num_items = Math.ceil(Math.pow(root, i));

            // If current_index exceeds the array length, stop the loop
            if (current_index >= array_slice.length) {
                break; // No more data to process
            }

            // Adjust the number of items if near the end of the row
            num_items = Math.min(num_items, array_slice.length - current_index);

            // Get the slice for this bucket
            let bucket_contents = array_slice.slice(current_index, current_index + num_items);

            // If bucket_contents is not empty, calculate the average
            if (bucket_contents.length > 0) {
                let value = average(bucket_contents);
                new_array_slice.push(value);
            } else {
                // No valid data left, exit the loop
                // master_length = i;
                break;
            }

            // Update current_index for the next bucket
            current_index += num_items;
        }

        // // Fill the remaining buckets with the last valid value or handle empty case
        // while (new_array_slice.length < num_buckets) {
        //     new_array_slice.push(new_array_slice[new_array_slice.length - 1] || 0);
        // }

        // Add this new reduced slice to the new array
        new_array.push(new_array_slice);
    }

    return new_array;
}

function create_32nd_note_slices(array, bpm, audioDuration) {
    const beats_per_second = bpm / 60;
    const seconds_per_beat = 1 / beats_per_second;
    const seconds_per_32nd_note = seconds_per_beat / 8;
    let new_array = [];
    let current_time = 0;

    while (current_time < audioDuration) {
        let lower_bound = Math.floor((current_time / audioDuration) * array.length);
        let upper_bound = Math.floor(((current_time + seconds_per_32nd_note) / audioDuration) * array.length);

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
        current_time += seconds_per_32nd_note;
    }

    return new_array;
}

function roundUpArrayValues(arr) {
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr[i].length; j++) {
            if (arr[i][j] < 0.000001) {
                arr[i][j] = 0.000001;
            }
        }
    }
    return arr;
}

logSpectrogram.array().then(array => {

    const shortened_array = reduce_height_logarithmically(array);
    const array_32nds = create_32nd_note_slices(shortened_array, 120, audioDuration);
    // console.log(array_32nds.length / 32);
    // const shortened_array = result[0];
    // const master_length = result[1];
    // const shortened_array = array;


    // rearrange to traditional spectrogram format; `array.T[::-1]` in python
    // const transposed_array = array_32nds[0].map((_, colIndex) => array_32nds.map(row => row[colIndex]));
    // const reversed_array = transposed_array.reverse();
    // const truncated_array = reversed_array.slice(-128);
    const sliced_array = array_32nds.map(row => row.slice(0, 128));

    // round up to 10e-6 (so normalization works better)
    const rounded_array = roundUpArrayValues(sliced_array);

    // normalize array between 0-1
    const flattened = rounded_array.flat();
    const minVal = Math.min(...flattened);
    const maxVal = Math.max(...flattened);

    const normalized_array = sliced_array.map(row =>
        row.map(value => (value - minVal) / (maxVal - minVal))
    );

    // const transposed_array = normalized_array[0].map((_, colIndex) => normalized_array.map(row => row[colIndex]));
    // const reversed_array = transposed_array.reverse();

    fs.writeFileSync(outputJsonPath, JSON.stringify(normalized_array));
    // console.log('STFT data saved to', outputJsonPath);
});

