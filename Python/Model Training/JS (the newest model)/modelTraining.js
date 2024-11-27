// To fix the Python corruption... how about we just don't use python:
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const batchSize = 32;
const url = 'mongodb://127.0.0.1:27017';
const dbName = 'ML_DATA';
const collectionName = 'TAB_GENERATOR';

function addRandomNoise(inputs, noiseFactor) {
    const noise = tf.randomNormal(inputs.shape).mul(noiseFactor);
    return inputs.add(noise);
}
  
function addRandomHum(inputs, humStrength, humProb) {
    const mask = tf.randomUniform(inputs.shape).less(humProb).toFloat();
    const hum = mask.mul(humStrength);
    return inputs.add(hum);
}

function augmentData(inputs, labels) {
    inputs = addRandomNoise(inputs, 0.04);
    inputs = addRandomHum(inputs, 0.02, 0.1);
    return { xs: inputs, ys: labels };
}

const preprocessBatch = (batch) => {
    const inputs = batch.map(pair => tf.tensor(pair.spectrogram)); 
    const labels = batch.map(pair => tf.tensor(pair.midi));

    const inputTensor = tf.stack(inputs).expandDims(-1); 
    const labelTensor = tf.stack(labels);

    return { xs: inputTensor, ys: labelTensor };
};

// connect to MongoDB and stream data (loading json as a string threw errors)
async function getBatchedDataset() {
    const client = new MongoClient(url);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const cursor = collection.find();
    const dataset = [];

    while (await cursor.hasNext()) {
        const batch = [];
        for (let i = 0; i < batchSize && await cursor.hasNext(); i++) {
            batch.push(await cursor.next());
        }
        const { xs, ys } = preprocessBatch(batch);
        dataset.push(augmentData(xs, ys));
    }

    client.close();
    return tf.data.array(dataset);
}

const inputLayer = tf.input({ shape: [64, 128, 1] });

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

const epochs = 100;

(async () => {
    const dataset = await getBatchedDataset();

    const history = await model.fitDataset(dataset, {
        epochs: epochs,
        callbacks: [tf.node.tensorBoard('training_logs'), tf.callbacks.earlyStopping({monitor: 'loss', patience: 3})]
    });

    const savePath = "model";
    await model.save(`file://${savePath}`);
    console.log('Model saved at', savePath);
})();
