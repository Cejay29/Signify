import * as tf from '@tensorflow/tfjs-node';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// --- 1. Load model and labels ---
const model = await tf.loadLayersModel('file://model/model.json');
const labels = JSON.parse(fs.readFileSync('model/labels.json', 'utf8'));

// --- 2. Connect to Supabase and fetch new gesture samples (your test set) ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
console.log('📦 Fetching test gesture samples from Supabase...');

// You can fetch from a specific table or filtered dataset (e.g., those not used in training)
const { data, error } = await supabase
  .from('gesture_sample_test') // 👈 make a separate table or filtered view for testing
  .select('gloss, landmarks');

if (error) {
  console.error('❌ Supabase fetch error:', error);
  process.exit(1);
}

console.log(`✅ Fetched ${data.length} test samples.`);

// --- 3. Preprocess data (same normalization logic as training) ---
function normalize(landmarks) {
  const base = landmarks[0];
  return landmarks.flatMap(pt => [pt.x - base.x, pt.y - base.y, pt.z - base.z]);
}

const xs = [];
const ys = [];

for (const sample of data) {
  if (
    !sample.gloss ||
    !Array.isArray(sample.landmarks) ||
    sample.landmarks.length !== 21
  ) continue;

  const norm = normalize(sample.landmarks);
  if (norm.length !== 63) continue;

  const labelIndex = labels.indexOf(sample.gloss.trim().toUpperCase());
  if (labelIndex === -1) continue;

  xs.push(norm);
  ys.push(labelIndex);
}

// --- 4. Convert to tensors ---
const xsTensor = tf.tensor2d(xs);
const ysTensor = tf.tensor1d(ys, 'int32');
const ysOneHot = tf.oneHot(ysTensor, labels.length);

// --- 5. Evaluate model ---
const evalResult = model.evaluate(xsTensor, ysOneHot);
const loss = (await evalResult[0].data())[0];
const acc = (await evalResult[1].data())[0];

console.log(`🎯 Test Accuracy: ${(acc * 100).toFixed(2)}%`);
console.log(`📉 Test Loss: ${loss.toFixed(4)}`);

