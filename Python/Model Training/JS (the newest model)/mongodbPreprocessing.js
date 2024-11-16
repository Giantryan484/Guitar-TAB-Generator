// This file converts the json file output into mongoDB
const fs = require('fs');
const { MongoClient } = require('mongodb');
const JSONStream = require('JSONStream');

const url = 'mongodb://127.0.0.1:27017';
const dbName = 'ML_DATA';
const collectionName = 'TAB_GENERATOR';

async function main() {
  const client = new MongoClient(url);
  await client.connect();
  console.log('Connected to database');
  
  const db = client.db(dbName);
  const collection = db.collection(collectionName);
  
  let idCounter = 1;
  const stream = fs.createReadStream('Python/Data/dataset.json', { encoding: 'utf8' })
    .pipe(JSONStream.parse('*'));

  stream.on('data', async (entry) => {
    const document = {
      id: idCounter++,
      spectrogram: entry[0],
      midi: entry[1]
    };
    await collection.insertOne(document);
  });

  stream.on('end', () => {
    console.log('Finished processing file');
    client.close();
  });

  stream.on('error', (err) => {
    console.error('Error reading file:', err);
    client.close();
  });
}

main().catch(console.error);