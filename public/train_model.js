import 'dotenv/config';
import * as tf from '@tensorflow/tfjs-node';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// 2. Fetch gesture samples
console.log('📦 Fetching gesture samples from Supabase...');
const { data, error } = await supabase.from('gesture_sample').select('gloss, landmarks');

if (error) {
    console.error('❌ Error fetching data from Supabase:', error.message);
    process.exit(1);
}
if (!data || data.length === 0) {
    console.log('⚠️ No gesture data found in gesture_sample table.');
    process.exit(1);
}

// 3. Preprocess the data
const labelsSet = new Set(data.map(s => s.gloss));
const labels = Array.from(labelsSet);
const labelToIndex = Object.fromEntries(labels.map((l, i) => [l, i]));

// Normalize landmarks
function normalize(landmarks) {
    const base = landmarks[0]; // wrist
    return landmarks.flatMap(pt => [pt.x - base.x, pt.y - base.y, pt.z - base.z]);
}

const xs = [];
const ys = [];

for (const sample of data) {
    const norm = normalize(sample.landmarks);
    const labelIndex = labelToIndex[sample.gloss];
    xs.push(norm);
    ys.push(labelIndex);
}

// 4. Convert to tensors
const xsTensor = tf.tensor2d(xs);                      // shape: [samples, 63]
const ysTensor = tf.tensor1d(ys, 'int32');             // shape: [samples]
const ysOneHot = tf.oneHot(ysTensor, labels.length);   // shape: [samples, numClasses]

// 5. Define and train the model
const model = tf.sequential();
model.add(tf.layers.dense({ inputShape: [63], units: 64, activation: 'relu' }));
model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
model.add(tf.layers.dense({ units: labels.length, activation: 'softmax' }));

model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
});

console.log("⏳ Training...");
await model.fit(xsTensor, ysOneHot, {
    epochs: 30,
    batchSize: 32,
    callbacks: {
        onEpochEnd: (epoch, logs) =>
            console.log(`📊 Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)} acc=${(logs.acc * 100).toFixed(2)}%`)
    }
});

// 6. Save the model and labels
await model.save('file://model');
import fs from 'fs';
fs.writeFileSync('model/labels.json', JSON.stringify(labels));
console.log("✅ Model training complete. Saved to /model folder.");
