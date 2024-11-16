// Import TensorFlow.js and necessary modules
// mongod --dbpath "/Users/ryanmccormick/mongodb-data"
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Load the dataset
const batchSize = 32;
const url = 'mongodb://127.0.0.1:27017';
const dbName = 'ML_DATA';
const collectionName = 'TAB_GENERATOR';

// Preprocess each batch
const preprocessBatch = (batch) => {
    const inputs = batch.map(pair => tf.tensor(pair.spectrogram)); 
    const labels = batch.map(pair => tf.tensor(pair.midi));

    const inputTensor = tf.stack(inputs).expandDims(-1); 
    const labelTensor = tf.stack(labels);

    return { xs: inputTensor, ys: labelTensor };
};

// Connect to MongoDB and stream data
async function getBatchedDataset() {
    const client = new MongoClient(url);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const cursor = collection.find();
    const dataset = [];

    // Fetch data in batches
    while (await cursor.hasNext()) {
        const batch = [];
        for (let i = 0; i < batchSize && await cursor.hasNext(); i++) {
            batch.push(await cursor.next());
        }
        dataset.push(preprocessBatch(batch));
    }

    client.close();
    return tf.data.array(dataset);
}

// Model Structure
const inputLayer = tf.input({ shape: [64, 128, 1] }); // 32 time steps, 128 frequency bins, 1 channel

let cnn = tf.layers.conv2d({
    filters: 32,
    kernelSize: [3, 3],
    activation: 'relu',
    padding: 'same',
}).apply(inputLayer);

cnn = tf.layers.maxPooling2d({ poolSize: [2, 2] }).apply(cnn);

cnn = tf.layers.conv2d({
    filters: 64,
    kernelSize: [3, 3],
    activation: 'relu',
    padding: 'same',
}).apply(cnn);

cnn = tf.layers.maxPooling2d({ poolSize: [2, 2] }).apply(cnn);

const cnnFlattened = tf.layers.flatten().apply(cnn); 

const reshaped = tf.layers.reshape({ targetShape: [32, 1024] }).apply(cnnFlattened);

const gru = tf.layers.gru({
    units: 128,
    returnSequences: true,
}).apply(reshaped);

const outputLayer = tf.layers.timeDistributed({
    layer: tf.layers.dense({ units: 49, activation: 'softmax' }),
}).apply(gru);

const model = tf.model({ inputs: inputLayer, outputs: outputLayer });
model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy' });

console.log(model.summary());

// Training Parameters
const epochs = 35;

// Train the model
(async () => {
    const dataset = await getBatchedDataset();
    const history = await model.fitDataset(dataset, {
        epochs: epochs,
        callbacks: tf.node.tensorBoard('training_logs'),
    });

    // Save the model
    const savePath = "/Users/ryanmccormick/Downloads/Code/TAB-Generator/Python/Model Training/JS (the newest model)/model";
    await model.save(`file://${savePath}`);
    console.log('Model saved at', savePath);
})();
