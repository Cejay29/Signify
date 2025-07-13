import 'dotenv/config';
import * as tf from '@tensorflow/tfjs-node';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

// 3. Normalize and clean gloss labels
const cleanGloss = (sample) => sample.gloss.trim().toUpperCase();
const validSamples = data.filter(sample =>
    Array.isArray(sample.landmarks) &&
    sample.landmarks.length === 21 &&
    sample.landmarks.every(p => 'x' in p && 'y' in p && 'z' in p)
);

const labelsSet = new Set(validSamples.map(cleanGloss));
const labels = Array.from(labelsSet);
const labelToIndex = Object.fromEntries(labels.map((label, idx) => [label, idx]));

// Normalize landmarks
function normalize(landmarks) {
    const base = landmarks[0]; // wrist
    return landmarks.flatMap(pt => [
        pt.x - base.x,
        pt.y - base.y,
        pt.z - base.z
    ]);
}

// 4. Build training data
const xs = [];
const ys = [];

for (const sample of validSamples) {
    const norm = normalize(sample.landmarks);
    if (!norm || norm.length !== 63) {
        console.warn(`⚠️ Skipping malformed sample for gloss: ${sample.gloss}`);
        continue;
    }

    const gloss = cleanGloss(sample);
    const labelIndex = labelToIndex[gloss];

    if (labelIndex === undefined) {
        console.warn(`⚠️ Unknown label "${gloss}" not in label index`);
        continue;
    }

    xs.push(norm);
    ys.push(labelIndex);
}

// 5. Convert to tensors
const xsTensor = tf.tensor2d(xs);                    // shape: [samples, 63]
const ysTensor = tf.tensor1d(ys, 'int32');           // shape: [samples]
const ysOneHot = tf.oneHot(ysTensor, labels.length); // shape: [samples, numClasses]

// 6. Define and train the model
const model = tf.sequential();
model.add(tf.layers.dense({ inputShape: [63], units: 64, activation: 'relu' }));
model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
model.add(tf.layers.dense({ units: labels.length, activation: 'softmax' }));

model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
});

console.log(`🧠 Training model on ${xs.length} samples, ${labels.length} classes...`);
await model.fit(xsTensor, ysOneHot, {
    epochs: 30,
    batchSize: 32,
    callbacks: {
        onEpochEnd: (epoch, logs) =>
            console.log(`📊 Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)} acc=${(logs.acc * 100).toFixed(2)}%`)
    }
});

// 7. Save model and labels
await model.save('file://model');
fs.writeFileSync('model/labels.json', JSON.stringify(labels, null, 2));
console.log("✅ Model training complete. Saved to /model folder.");
