// Lấy các phần tử cần thiết từ .html
// device element
const fanOnButton = document.getElementById('fan-on');
const fanOffButton = document.getElementById('fan-off');
const fan_state = document.getElementById('fan-status');

const lightOnButton = document.getElementById('light-on');
const lightOffButton = document.getElementById('light-off');
const light_state = document.getElementById('light-status');

const buzzerOnButton = document.getElementById('buzzer-on');
const buzzerOffButton = document.getElementById('buzzer-off');
const buzzer_state = document.getElementById('buzzer-status');

// sensor element
const temperature = document.getElementById("temperature");
const humidity = document.getElementById("humidity");
const airquality = document.getElementById("airquality");
const pm25level = document.getElementById("pm25");
// threshold element
const threshold_temperature = document.getElementById("tempthreshold");
const threshold_humidity = document.getElementById("humiditythreshold");
const threshold_pm25 = document.getElementById("pm25threshold");


// BUTTON DEVICE HANDLE
// Cập nhật trạng thái khi nhấn "Bật" cho Quạt
fanOnButton.addEventListener('click', () => {
  db.ref("/Smart_Farm_System_IoT/device_state").update({
      fan_state : 1
  })
  fan_state.textContent = 'Trạng thái: Bật'; 
});

// Cập nhật trạng thái khi nhấn "Tắt" cho Quạt
fanOffButton.addEventListener('click', () => {
  db.ref("/Smart_Farm_System_IoT/device_state").update({
      fan_state : 0
  })
  fan_state.textContent = 'Trạng thái: Tắt'; 
});

// Cập nhật trạng thái khi nhấn "Bật" cho Đèn
lightOnButton.addEventListener('click', () => {
  db.ref("/Smart_Farm_System_IoT/device_state").update({
      light_state : 1
  })
  light_state.textContent = 'Trạng thái: Bật'; 
});

// Cập nhật trạng thái khi nhấn "Tắt" cho Đèn
lightOffButton.addEventListener('click', () => {
  db.ref("/Smart_Farm_System_IoT/device_state").update({
      light_state : 0
  })
  light_state.textContent = 'Trạng thái: Tắt'; 
});

// Cập nhật trạng thái khi nhấn "Bật" cho buzzer
buzzerOnButton.addEventListener('click', () => {
  db.ref("/Smart_Farm_System_IoT/device_state").update({
      buzzer_state : 1
  })
  buzzer_state.textContent = 'Trạng thái: Bật'; 
});

// Cập nhật trạng thái khi nhấn "Tắt" cho buzzer
buzzerOffButton.addEventListener('click', () => {
  db.ref("/Smart_Farm_System_IoT/device_state").update({
      buzzer_state : 0
  })
  buzzer_state.textContent = 'Trạng thái: Tắt'; 
});

// ĐỒNG BỘ device_state TỪ FIREBASE VỀ WEB
// Quạt
db.ref("/Smart_Farm_System_IoT/device_state/fan_state").on("value", snapshot => {
  const state = snapshot.val();
  if (state === 1) {
      fan_state.textContent = "Trạng thái: Bật";
  } else {
      fan_state.textContent = "Trạng thái: Tắt";
  }
});

// Đèn
db.ref("/Smart_Farm_System_IoT/device_state/light_state").on("value", snapshot => {
  const state = snapshot.val();
  if (state === 1) {
      light_state.textContent = "Trạng thái: Bật";
  } else {
      light_state.textContent = "Trạng thái: Tắt";
  }
});

// buzzer
db.ref("/Smart_Farm_System_IoT/device_state/buzzer_state").on("value", snapshot => {
  const state = snapshot.val();
  if (state === 1) {
      buzzer_state.textContent = "Trạng thái: Bật";
  } else {
      buzzer_state.textContent = "Trạng thái: Tắt";
  }
});

// UPDATE SENSOR VALUE HANDLE
// UPDATE temperature
db.ref("/Smart_Farm_System_IoT/sensor/temperature").on("value", function(snapshot){
  const temperature_value = snapshot.val();
  temperature.innerText = temperature_value;
  console.log("Nhiệt độ:", temperature_value);
});
// UPDATE humidity
db.ref("/Smart_Farm_System_IoT/sensor/humidity").on("value", function(snapshot){
  const humidity_value = snapshot.val();
  humidity.innerText = humidity_value;
  console.log("Độ ẩm:", humidity_value);
});
// UPDATE airquality
db.ref("/Smart_Farm_System_IoT/sensor/airquality").on("value", function(snapshot){
  const airquality_value = snapshot.val();
  airquality.innerText = airquality_value;
  console.log("Không khí:", airquality_value);
});
// UPDATE pm25
db.ref("/Smart_Farm_System_IoT/sensor/pm25").on("value", function(snapshot){
  const pm25_value = snapshot.val();
  // hiển thị 2 chữ số sau dấu phẩy
  pm25level.innerText = (pm25_value !== null) ? pm25_value.toFixed(2) : '--';
  console.log("Nồng độ bụi pm2.5:", pm25_value);
});


// UPDATE THRESHOLD  HANDLE
// Hàm xử lý khi nhập giá trị ngưỡng vào placeholder
function handleThresholdInput(inputElement, keyName, unit = "") {
  const saveValue = () => {
      const value = Number(inputElement.value.trim());
      if (!isNaN(value) && inputElement.value.trim() !== "") {
          db.ref("/Smart_Farm_System_IoT/threshold").update({
              [keyName]: value
          });
          inputElement.placeholder = value + unit;
          inputElement.value = "";
      }
  };

  inputElement.addEventListener("blur", saveValue);
  inputElement.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
          saveValue();
          inputElement.blur();
      }
  });
}

// Cập nhật placeholder ban đầu từ Firebase
db.ref("/Smart_Farm_System_IoT/threshold/threshold_temperature").once("value").then(snapshot => {
  const val = snapshot.val();
  if (val !== null) threshold_temperature.placeholder = val + "°C";
});

db.ref("/Smart_Farm_System_IoT/threshold/threshold_humidity").once("value").then(snapshot => {
  const val = snapshot.val();
  if (val !== null) threshold_humidity.placeholder = val + "%";
});

db.ref("/Smart_Farm_System_IoT/threshold/threshold_pm25").once("value").then(snapshot => {
  const val = snapshot.val();
  if (val !== null) threshold_pm25.placeholder = val + " µg/m³";
});

// Gán sự kiện nhập cho các input ngưỡng
handleThresholdInput(threshold_temperature, "threshold_temperature", "°C");
handleThresholdInput(threshold_humidity, "threshold_humidity", "%");
handleThresholdInput(threshold_pm25, "threshold_pm25", "µg/m³");

// WARNING OUT OF THRESHOLD HANDLE
let isFirstTemp = true;
let isFirstHumidity = true;
let isFirstPm25 = true;

// CỜ TRẠNG THÁI CẢNH BÁO
let isOverTemp = false;
let isOverHumidity = false;
let isOverPM25 = false;

// CẢNH BÁO NHIỆT ĐỘ
function checkTemperatureThreshold() {
  Promise.all([
    db.ref("/Smart_Farm_System_IoT/sensor/temperature").once("value"),
    db.ref("/Smart_Farm_System_IoT/threshold/threshold_temperature").once("value")
  ]).then(([tempSnap, thresholdSnap]) => {
    const temp = tempSnap.val();
    const threshold = thresholdSnap.val();
    temperature.innerText = temp;

    if (threshold === null) return;

    if (temp > threshold && !isOverTemp) {
      alert("⚠️ Nhiệt độ vượt ngưỡng: " + temp + "°C");
      isOverTemp = true; 
    } else if (temp <= threshold && isOverTemp) {
      isOverTemp = false;
    }
  });
}

// CẢNH BÁO ĐỘ ẨM
function checkHumidityThreshold() {
  Promise.all([
    db.ref("/Smart_Farm_System_IoT/sensor/humidity").once("value"),
    db.ref("/Smart_Farm_System_IoT/threshold/threshold_humidity").once("value")
  ]).then(([humiditySnap, thresholdSnap]) => {
    const humidityValue = humiditySnap.val();
    const threshold = thresholdSnap.val();
    humidity.innerText = humidityValue;

    if (threshold === null) return;

    if (humidityValue > threshold && !isOverHumidity) {
      alert("⚠️ Độ ẩm vượt ngưỡng: " + humidityValue + "%");
      isOverHumidity = true;
    } else if (humidityValue <= threshold && isOverHumidity) {
      isOverHumidity = false;
    }
  });
}

// CẢNH BÁO NỒNG ĐỘ BỤI PM2.5
function checkpm25threshold() {
  Promise.all([
    db.ref("/Smart_Farm_System_IoT/sensor/pm25").once("value"),
    db.ref("/Smart_Farm_System_IoT/threshold/threshold_pm25").once("value")
  ]).then(([pm25Snap, thresholdSnap]) => {
    const pm25Value = pm25Snap.val();
    const threshold = thresholdSnap.val();
    pm25level.innerText = (pm25Value !== null) ? pm25Value.toFixed(2) : '--';

    if (threshold === null) return;

    if (pm25Value > threshold && !isOverPM25) {
      alert("⚠️ Nồng độ bụi PM2.5 vượt ngưỡng: " + pm25Value + " µg/m³");
      isOverPM25 = true;
    } else if (pm25Value <= threshold && isOverPM25) {
      isOverPM25 = false;
    }
  });
}

function checkFanBuzzerAuto() {
  // Lấy chế độ hiện tại từ Firebase
  db.ref("/Smart_Farm_System_IoT/Mode").once("value").then(snapshot => {
    const mode = snapshot.val(); // 0 = Manual, 1 = Auto
    if (mode === 0) return;// Nếu Manual, không cập nhật gì

    //  Auto, kiểm tra cảm biến và ngưỡng
    Promise.all([
      db.ref("/Smart_Farm_System_IoT/sensor/temperature").once("value"),
      db.ref("/Smart_Farm_System_IoT/sensor/humidity").once("value"),
      db.ref("/Smart_Farm_System_IoT/sensor/pm25").once("value"),
      db.ref("/Smart_Farm_System_IoT/threshold/threshold_temperature").once("value"),
      db.ref("/Smart_Farm_System_IoT/threshold/threshold_humidity").once("value"),
      db.ref("/Smart_Farm_System_IoT/threshold/threshold_pm25").once("value")
    ]).then(([tempSnap, humSnap, pm25Snap, tempThreshSnap, humThreshSnap, pm25ThreshSnap]) => {
      const temp = tempSnap.val();
      const hum = humSnap.val();
      const pm25 = pm25Snap.val();

      const tempThresh = tempThreshSnap.val();
      const humThresh = humThreshSnap.val();
      const pm25Thresh = pm25ThreshSnap.val();

      const over = (tempThresh !== null && temp > tempThresh) ||
                   (humThresh !== null && hum > humThresh) ||
                   (pm25Thresh !== null && pm25 > pm25Thresh);

      //CẬP NHẬT GIAO DIỆN
      fan_state.textContent = over ? "Trạng thái: Bật" : "Trạng thái: Tắt";
      buzzer_state.textContent = over ? "Trạng thái: Bật" : "Trạng thái: Tắt";
    });
  });
}


// Lấy phần tử select chế độ
const modeSelect = document.getElementById("mode-select");

modeSelect.addEventListener("change", () => {
  const selectedMode = modeSelect.options[modeSelect.selectedIndex].text;

  let modeValue = 0;
  if (selectedMode === "Auto") {
      modeValue = 1;
  } else if (selectedMode === "Manual") {
      modeValue = 0;
  }

  db.ref("/Smart_Farm_System_IoT/Mode").set(modeValue)
      .then(() => {
          console.log("Cập nhật chế độ thành công:", modeValue);
      })
      .catch((error) => {
          console.error("Lỗi khi cập nhật chế độ:", error);
      });
});


db.ref("/Smart_Farm_System_IoT/sensor/temperature").on("value", checkTemperatureThreshold);
db.ref("/Smart_Farm_System_IoT/threshold/threshold_temperature").on("value", checkTemperatureThreshold);

db.ref("/Smart_Farm_System_IoT/sensor/humidity").on("value", checkHumidityThreshold);
db.ref("/Smart_Farm_System_IoT/threshold/threshold_humidity").on("value", checkHumidityThreshold);

db.ref("/Smart_Farm_System_IoT/sensor/pm25").on("value", checkpm25threshold);
db.ref("/Smart_Farm_System_IoT/threshold/threshold_pm25").on("value", checkpm25threshold);


db.ref("/Smart_Farm_System_IoT/sensor/temperature").on("value", checkFanBuzzerAuto);
db.ref("/Smart_Farm_System_IoT/sensor/humidity").on("value", checkFanBuzzerAuto);
db.ref("/Smart_Farm_System_IoT/sensor/pm25").on("value", checkFanBuzzerAuto);
db.ref("/Smart_Farm_System_IoT/threshold/threshold_temperature").on("value", checkFanBuzzerAuto);
db.ref("/Smart_Farm_System_IoT/threshold/threshold_humidity").on("value", checkFanBuzzerAuto);
db.ref("/Smart_Farm_System_IoT/threshold/threshold_pm25").on("value", checkFanBuzzerAuto);