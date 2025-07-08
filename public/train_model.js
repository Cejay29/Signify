import * as tf from '@tensorflow/tfjs-node';
import fs from 'fs';

// Load processed data
const { xs: rawXs, ys: rawYs, labels } = JSON.parse(fs.readFileSync('processed_data.json', 'utf-8'));

// Convert to tensors
const xs = tf.tensor2d(rawXs);                      // shape: [samples, 63]
const ysTensor = tf.tensor1d(rawYs, 'int32');       // shape: [samples]
const ysOneHot = tf.oneHot(ysTensor, labels.length); // shape: [samples, numClasses]

// Build model
const model = tf.sequential();
model.add(tf.layers.dense({ inputShape: [63], units: 64, activation: 'relu' }));
model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
model.add(tf.layers.dense({ units: labels.length, activation: 'softmax' }));

model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
});

// Train
console.log("⏳ Training...");
await model.fit(xs, ysOneHot, {
    epochs: 30,
    batchSize: 32,
    callbacks: {
        onEpochEnd: (epoch, logs) =>
            console.log(`Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)} acc=${(logs.acc * 100).toFixed(2)}%`)
    }
});

// Save model and labels
await model.save('file://model');
fs.writeFileSync('model/labels.json', JSON.stringify(labels));
console.log("✅ Model training complete. Saved to /model folder.");
