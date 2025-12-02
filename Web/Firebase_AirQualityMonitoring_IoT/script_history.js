const FIREBASE_PATH = 'Smart_Farm_System_IoT/history';
const dbRef = firebase.database().ref(FIREBASE_PATH);

let currentPage = 1;
let rowsPerPage = 5;
let historyArray = [];

// ======= HÀM TIỆN ÍCH =======
function getFormattedTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
}

function parseDateString(dateStr) {
  const [datePart, timePart] = dateStr.split(' ');
  const [dd, MM, yyyy] = datePart.split('-').map(Number);
  const [hh, mm, ss] = timePart.split(':').map(Number);
  return new Date(yyyy, MM - 1, dd, hh, mm, ss);
}

// ======= GHI DỮ LIỆU LỊCH SỬ =======
async function updateHistory() {
  try {
    const [sensorRes, deviceRes] = await Promise.all([
      fetch('https://airmonitoring-project-default-rtdb.firebaseio.com/Smart_Farm_System_IoT/sensor.json'),
      fetch('https://airmonitoring-project-default-rtdb.firebaseio.com/Smart_Farm_System_IoT/device_state.json')
    ]);
    const sensor = await sensorRes.json();
    const device = await deviceRes.json();

    const timestamp = getFormattedTimestamp();
    const pm25Value = parseFloat(sensor.pm25 ?? 0).toFixed(2); // 🔹 làm tròn 2 chữ số sau dấu .

    const entry = {
      timestamp: timestamp,
      temp: sensor.temperature ?? 0,
      humid: sensor.humidity ?? 0,
      pm25: pm25Value,
      fan: device.fan_state ? "ON" : "OFF",
      light: device.light_state ? "ON" : "OFF",
      buzzer: device.buzzer_state ? "ON" : "OFF"
    };

    await dbRef.child(timestamp).set(entry);
    console.log("Đã ghi lịch sử:", timestamp);
  } catch (err) {
    console.error("Lỗi ghi lịch sử:", err);
  }
}

// ======= HIỂN THỊ LỊCH SỬ  =======
function renderTable() {
  const tbody = document.getElementById("historyData");
  if (!tbody) return;

  tbody.innerHTML = '';

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = historyArray.slice(start, end);

  pageData.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.timestamp}</td>
      <td>${item.temp ?? '--'}</td>
      <td>${item.humid ?? '--'}</td>
      <td>${parseFloat(item.pm25 ?? 0).toFixed(2)}</td> <!-- 🔹 hiển thị 2 chữ số -->
      <td>${item.fan}</td>
      <td>${item.light}</td>
      <td>${item.buzzer}</td>
    `;
    tbody.appendChild(tr);
  });

  const pageInfo = document.getElementById("pageInfo");
  if (pageInfo) {
    pageInfo.textContent = `Page ${currentPage} / ${Math.ceil(historyArray.length / rowsPerPage)}`;
  }
}

// ======= LẤY DỮ LIỆU FIREBASE =======
async function fetchHistory() {
  const snapshot = await dbRef.get();
  const data = snapshot.val();
  if (!data) {
    historyArray = [];
  } else {
    historyArray = Object.values(data).sort(
      (a, b) => parseDateString(b.timestamp) - parseDateString(a.timestamp)
    );
  }
  renderTable();
}

// ======= XOÁ TOÀN BỘ LỊCH SỬ =======
async function clearHistory() {
  const tbody = document.getElementById("historyData");
  if (!tbody) return;

  if (confirm("Bạn có chắc muốn xóa toàn bộ lịch sử?")) {
    await dbRef.remove();
    historyArray = [];
    renderTable();
    alert("Đã xóa toàn bộ lịch sử!");
  }
}

// ======= SỰ KIỆN GIAO DIỆN =======
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");
const rowsSelect = document.getElementById("rowsPerPage");
const clearBtn = document.getElementById("clearHistory");

if (prevBtn) prevBtn.addEventListener("click", () => { if (currentPage>1){currentPage--; renderTable();}});
if (nextBtn) nextBtn.addEventListener("click", () => { const maxPage=Math.ceil(historyArray.length/rowsPerPage); if(currentPage<maxPage){currentPage++; renderTable();}});
if (rowsSelect) rowsSelect.addEventListener("change", e => { rowsPerPage=parseInt(e.target.value); currentPage=1; renderTable();});
if (clearBtn) clearBtn.addEventListener("click", clearHistory);

// ======= CHẠY LIÊN TỤC =======
async function refresh() {
  await updateHistory(); 
  await fetchHistory();  
}

refresh();
setInterval(refresh, 60000); // 60s
