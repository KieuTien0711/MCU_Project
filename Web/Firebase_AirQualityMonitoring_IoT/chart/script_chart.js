// script_chart.js – Realtime chart + dự đoán
let chart = null;
let isPaused = false;
let modelTemp, modelHumid, modelPM25;
let modelReady = false;

// Chart realtime
const ctx = document.getElementById('realtimeChart').getContext('2d');
chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: 'Nhiệt độ °C', data: [], borderColor: '#ef4444', tension: 0.4, pointRadius: 3 },
      { label: 'Độ ẩm %', data: [], borderColor: '#3b82f6', tension: 0.4, pointRadius: 3 },
      { label: 'PM2.5', data: [], borderColor: '#fbbf24', tension: 0.4, pointRadius: 3 }
    ]
  },
  options: { responsive: true, maintainAspectRatio: false, animation: false }
});

// Pause/Run button
document.getElementById('toggleButton').onclick = () => {
  isPaused = !isPaused;
  document.getElementById('toggleButton').textContent = isPaused ? 'Run' : 'Pause';
};

// Tạo model AI
function createModel() {
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [1] }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1 }));
  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
  return model;
}

// Lấy 100 dữ liệu gần nhất từ Firebase
async function getHistoryData() {
  const snap = await window.db.ref("Smart_Farm_System_IoT/history").limitToLast(100).once("value");
  const data = Object.values(snap.val() || {});
  return data.map((d, i) => ({
    idx: i,
    t: parseFloat(d.temp) || 35,
    h: parseFloat(d.humid) || 50,
    p: parseFloat(d.pm25) || 1
  }));
}

// Train AI từ 100 dữ liệu gần nhất
async function trainModels() {
  const valid = await getHistoryData();
  if (valid.length < 20) return;

  const xs = tf.tensor2d(valid.map(p => [p.idx]));
  const ysTemp = tf.tensor2d(valid.map(p => [p.t]));
  const ysHumid = tf.tensor2d(valid.map(p => [p.h]));
  const ysPM25 = tf.tensor2d(valid.map(p => [p.p]));

  if (!modelTemp) {
    modelTemp = createModel();
    modelHumid = createModel();
    modelPM25 = createModel();
  }

  await Promise.all([
    modelTemp.fit(xs, ysTemp, { epochs: 5, verbose: 0 }),
    modelHumid.fit(xs, ysHumid, { epochs: 5, verbose: 0 }),
    modelPM25.fit(xs, ysPM25, { epochs: 5, verbose: 0 })
  ]);

  modelReady = true;
  tf.dispose([xs, ysTemp, ysHumid, ysPM25]);
}

// Dự đoán dựa trên dữ liệu cuối cùng
async function predictWithAI() {
  if (!modelReady) return;
  const valid = await getHistoryData();
  if (!valid.length) return;

  const lastIdx = valid[valid.length - 1].idx;
  const lastPoint = valid[valid.length - 1];

  const times = [
    { label: "+6s", idx: lastIdx + 1 },
    { label: "+30s", idx: lastIdx + 5 },
    { label: "+1m", idx: lastIdx + 10 },
    { label: "+5m", idx: lastIdx + 50 },
    { label: "+10m", idx: lastIdx + 100 }
  ];

  const preds = times.map(async t => {
    const input = tf.tensor2d([[t.idx]]);
    const [pT, pH, pP] = await Promise.all([
      modelTemp.predict(input).data(),
      modelHumid.predict(input).data(),
      modelPM25.predict(input).data()
    ]);
    input.dispose();

    // Giới hạn dự đoán
    return {
      label: t.label,
      temp: Math.max(18, Math.min(50, pT[0] || lastPoint.t)),
      humid: Math.round(Math.max(30, Math.min(100, pH[0] || lastPoint.h))),
      pm25: Math.max(1, Math.min(300, pP[0] || lastPoint.p))
    };
  });

  const results = await Promise.all(preds);

  // Hiển thị
  document.getElementById('aiForecast').innerHTML = `
    <h2 style="color:#10b981;margin:0 0 10px">AI TensorFlow.js – Dự đoán realtime</h2>
    <div class="grid">
      ${results.map(r => `
        <div class="card ${r.pm25>50?'bad':r.pm25>25?'medium':'good'}">
          <b>${r.label}</b><br>
          ${r.temp.toFixed(1)}°C<br>
          ${r.humid}%<br>
          PM2.5 ${r.pm25.toFixed(1)}
        </div>
      `).join('')}
    </div>
    <p style="font-size:12px;color:#6ee7b7;text-align:center;margin:8px 0 0">
      AI TensorFlow.js • Training 100 điểm gần nhất • Client-side
    </p>
  `;
}

// MAIN LOOP – realtime
async function mainLoop() {
  if (isPaused) { setTimeout(mainLoop, 6000); return; }

  const snap = await window.db.ref("Smart_Farm_System_IoT/sensor").once("value");
  const d = snap.val();
  if (d) {
    const time = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    chart.data.labels.push(time);
    if (chart.data.labels.length > 50) chart.data.labels.shift();

    chart.data.datasets[0].data.push(d.temperature || 33);
    chart.data.datasets[1].data.push(d.humidity || 56);
    chart.data.datasets[2].data.push(d.pm25 || 1);

    chart.data.datasets.forEach(ds => { if (ds.data.length > 50) ds.data.shift(); });
    chart.update('none');
  }

  await trainModels();
  await predictWithAI();

  setTimeout(mainLoop, 6000);
}

// KHỞI ĐỘNG
window.onload = () => {
  document.getElementById('status').textContent = 'AI TensorFlow.js đang khởi động...';
  trainModels().then(() => {
    predictWithAI();
    document.getElementById('status').textContent = 'AI TensorFlow.js đã sẵn sàng!';
    setTimeout(mainLoop, 3000);
  });
};
