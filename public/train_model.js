// public/train_model.js
import 'dotenv/config';
import * as tf from '@tensorflow/tfjs-node';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MODEL_DIR = path.resolve(__dirname, './model');
const BUCKET = process.env.SUPABASE_BUCKET || 'model';

// 🧩 Fetch gesture samples
async function fetchSamples() {
  console.log('📦 Fetching gesture samples...');
  let all = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('gesture_sample')
      .select('gloss, landmarks')
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data.length) break;

    all.push(...data);
    from += pageSize;
    if (data.length < pageSize) break;
  }

  console.log(`✅ Loaded ${all.length} samples`);
  return all;
}

// 🧮 Normalize landmarks
function normalize(landmarks) {
  const base = landmarks[0];
  return landmarks.flatMap((pt) => [pt.x - base.x, pt.y - base.y, pt.z - base.z]);
}

// 🧠 Train the model
async function trainModel(data) {
  const valid = data.filter(
    (s) => s.gloss && Array.isArray(s.landmarks) && s.landmarks.length === 21
  );

  if (!valid.length) throw new Error('No valid training data found.');

  const labels = [...new Set(valid.map((s) => s.gloss.trim().toUpperCase()))];
  const labelToIndex = Object.fromEntries(labels.map((l, i) => [l, i]));

  const xs = [];
  const ys = [];

  for (const s of valid) {
    const flat = normalize(s.landmarks);
    if (flat.length !== 63) continue;
    xs.push(flat);
    ys.push(labelToIndex[s.gloss.trim().toUpperCase()]);
  }

  const xsTensor = tf.tensor2d(xs);
  const ysTensor = tf.oneHot(tf.tensor1d(ys, 'int32'), labels.length);

  console.log(`🧠 Training model with ${xs.length} samples (${labels.length} gestures)`);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [63], units: 128, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: labels.length, activation: 'softmax' }));

  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  const history = await model.fit(xsTensor, ysTensor, {
    epochs: 40,
    batchSize: 32,
    verbose: 1,
    callbacks: {
      onEpochEnd: (epoch, logs) =>
        console.log(
          `📊 Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)} acc=${(
            logs.acc * 100
          ).toFixed(2)}%`
        ),
    },
  });

  fs.mkdirSync(MODEL_DIR, { recursive: true });
  await model.save(`file://${MODEL_DIR}`);
  fs.writeFileSync(`${MODEL_DIR}/labels.json`, JSON.stringify(labels, null, 2));

  const finalAcc =
    history.history.acc.at(-1) * 100 || 0;
  const finalLoss =
    history.history.loss.at(-1) || 0;

  console.log(`✅ Training complete: Accuracy=${finalAcc.toFixed(2)}%, Loss=${finalLoss.toFixed(4)}`);
  return { finalAcc, finalLoss };
}

// ☁️ Upload trained model to Supabase
async function uploadModel() {
  console.log('☁️ Uploading model files...');
  const files = fs.readdirSync(MODEL_DIR);

  for (const file of files) {
    const buffer = fs.readFileSync(path.join(MODEL_DIR, file));
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(file, buffer, {
        upsert: true,
        contentType: 'application/octet-stream',
      });
    if (error) console.error(`❌ Upload failed for ${file}: ${error.message}`);
    else console.log(`✅ Uploaded: ${file}`);
  }

  console.log('🚀 Upload complete.');
}

// 🧩 Save model version info
async function saveModelVersion(finalAcc, finalLoss) {
  const version = `v${Date.now()}`;
  const filePath = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/model.json`;

  const { error } = await supabase.from('model_versions').insert([
    {
      version,
      accuracy: finalAcc.toFixed(2),
      loss: finalLoss.toFixed(4),
      file_path: filePath,
    },
  ]);

  if (error) console.error('❌ Error saving version:', error.message);
  else console.log(`✅ Model version ${version} saved.`);
}

// Main flow
(async () => {
  try {
    const data = await fetchSamples();
    const { finalAcc, finalLoss } = await trainModel(data);
    await uploadModel();
    await saveModelVersion(finalAcc, finalLoss);
    console.log('🎉 Model training, upload, and logging complete.');
  } catch (err) {
    console.error('❌ Training error:', err.message);
  }
})();
