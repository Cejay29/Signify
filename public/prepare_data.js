// prepare_data.js
const fs = require("fs");

// Load gesture data from file
const raw = fs.readFileSync("gesture_data.json");
const samples = JSON.parse(raw);

// Collect all unique labels
const labelsSet = new Set(samples.map(s => s.label));
const labels = Array.from(labelsSet);
const labelToIndex = Object.fromEntries(labels.map((l, i) => [l, i]));

console.log("Labels found:", labels);

// Normalize & flatten landmarks
function normalize(landmarks) {
  const base = landmarks[0]; // wrist
  return landmarks.flatMap(pt => [pt.x - base.x, pt.y - base.y, pt.z - base.z]);
}

// Prepare training data
const xs = [];
const ys = [];

for (const sample of samples) {
  const norm = normalize(sample.landmarks);
  const labelIndex = labelToIndex[sample.label];

  xs.push(norm);
  ys.push(labelIndex);
}

// Save to new file
fs.writeFileSync("processed_data.json", JSON.stringify({ xs, ys, labels }, null, 2));

console.log("✅ Processed data saved to processed_data.json");
