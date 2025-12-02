#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "dht11.h"
#include "MQ135.h"
#include "GP2Y1014AU_Kalman.h"
#include "motor.h"

// ====== WiFi ======
const char* ssid = "T1";
const char* password = "12345678";

// ====== Firebase ======
#define FIREBASE_URL "https://airmonitoring-project-default-rtdb.firebaseio.com/Smart_Farm_System_IoT.json"
String modePath = "/Smart_Farm_System_IoT/Mode.json";
// ====== Thiết bị ======
#define LIGHT_PIN 15
#define BUZZER_PIN 22
#define MQ135_PIN 35
#define GP2Y1014AU_SENSOR_PIN 36
#define GP2Y1014AU_LED_PIN 14

// ====== Cảm biến ======
Dht11_Typedef dht11;
MQ135_Typedef mq135;
GP2Y1014AU_Typedef gp2y1014au;

// ====== Biến toàn cục ======
float threshold_temp = 35;
float threshold_humi = 78;
float threshold_pm25 = 15;

// --- Trạng thái nhận từ Firebase ---
int fan_state_fb = 0;
int light_state_fb = 0;
int buzzer_state_fb = 0;

//chống gửi ngược lặp---
unsigned long fan_suppress_until = 0;
unsigned long light_suppress_until = 0;
unsigned long buzzer_suppress_until = 0;
const unsigned long SUPPRESS_MS = 0;

// --- Chế độ ---
bool auto_mode = false; // true: AUTO ; false: MANUAL
String airStatus;

// --- Cờ đồng bộ ---
bool firebase_ready = false;

// ====== FreeRTOS ======
TaskHandle_t firebaseTaskHandle, sensorTaskHandle, controlTaskHandle, sendSensorTaskHandle;
StaticJsonDocument<2048> firebaseData;
SemaphoreHandle_t dataMutex;

//------------------- DEBUG TRÊN SERIAL --------------------------
void SerialMonitorDebug() {
  static uint32_t time_delay_print;
  if (millis() - time_delay_print >= 1000) {
    time_delay_print = millis();

    Serial.println("======= DEBUG =======");
    // ------ DHT11 ------------------------------//
    Serial.print("Độ ẩm: ");
    Serial.print(dht11.humidity_value);
    Serial.print("%  Nhiệt độ: ");
    Serial.print(dht11.temperature_value);
    Serial.println("°C");
    
    // ------ MQ-135 ------------------------------//
    Serial.print("MQ135 ADC: ");
    Serial.println(mq135.mq135_adc_value);
    Serial.print("MQ135 PPM: ");
    Serial.println(mq135.mq135_ppm);

    Serial.print("Rs/R0 = ");
    Serial.println(mq135.mq135_Rs / MQ135_R0, 3);

    Serial.printf("Chất lượng: %s\n", airStatus.c_str());

    // ------ PM 2.5 ------------------------------//
    Serial.print("PM2.5: ");
    Serial.print(gp2y1014au.gp2y1014au_pm25_value);
    Serial.print(" µg/m³\t");

    Serial.print("adc: ");
    Serial.println(gp2y1014au.gp2y1014au_adc_value);
  
    Serial.print("voltageValue: ");
    Serial.println(gp2y1014au.voltageValue);
    Serial.print("filteredVoltage: ");
    Serial.println(gp2y1014au_filteredVoltage);

    // Debug ve nguong + trang thai thiet bi gui tu web //
    // ------------- NGƯỠNG ----------//
    Serial.print("Ngưỡng Temp: ");
    Serial.print(threshold_temp);
    Serial.print("°C  Ngưỡng Humid: ");
    Serial.print(threshold_humi);
    Serial.println("%");

    // ------ PM 2.5 ------------------------------//
    Serial.print("Ngưỡng PM2.5: ");
    Serial.print(threshold_pm25);
    Serial.println(" µg/m³\t");

    Serial.printf("FB: fan=%d light=%d buzz=%d\n", fan_state_fb, light_state_fb, buzzer_state_fb);
    Serial.printf("Auto mode: %s\n", auto_mode ? "ON" : "OFF");
    Serial.println("======================\n");
  }
}

// ====== WiFi ======
void connectWiFi() {
  Serial.print("Kết nối WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("Đã kết nối");
}

// ====== Task: đọc Firebase ======
void firebaseTask(void *parameter) {
  HTTPClient http;
  for (;;) {
    if (WiFi.status() == WL_CONNECTED) {
      http.begin(FIREBASE_URL);
      int httpCode = http.GET();
      if (httpCode == 200) {
        String payload = http.getString();

        if (xSemaphoreTake(dataMutex, 100) == pdTRUE) {
          DeserializationError err = deserializeJson(firebaseData, payload);
          if (!err) {
            firebase_ready = true;

            // Đọc chế độ và ngưỡng
            bool new_mode = firebaseData["Mode"];
            float new_th_temp = firebaseData["threshold"]["threshold_temperature"] | threshold_temp;
            float new_th_humi = firebaseData["threshold"]["threshold_humidity"] | threshold_humi;
            float new_th_pm25 = firebaseData["threshold"]["threshold_pm25"] | threshold_pm25;

            auto_mode = new_mode;
            threshold_temp = new_th_temp;
            threshold_humi = new_th_humi;
            threshold_pm25 = new_th_pm25;

            // Đọc device_state
            int fb_fan = firebaseData["device_state"]["fan_state"] | fan_state_fb;
            int fb_light = firebaseData["device_state"]["light_state"] | light_state_fb;
            int fb_buzz = firebaseData["device_state"]["buzzer_state"] | buzzer_state_fb;

            if (fb_fan != fan_state_fb) {
              fan_state_fb = fb_fan;
              fan_suppress_until = millis() + SUPPRESS_MS;
            }
            if (fb_light != light_state_fb) {
              light_state_fb = fb_light;
              light_suppress_until = millis() + SUPPRESS_MS;
            }
            if (fb_buzz != buzzer_state_fb) {
              buzzer_state_fb = fb_buzz;
              buzzer_suppress_until = millis() + SUPPRESS_MS;
            }
          } else {
            Serial.println("Parse JSON Firebase lỗi");
          }
          xSemaphoreGive(dataMutex);
        }
      } else {
        Serial.printf("Firebase HTTP error: %d\n", httpCode);
      }
      http.end();
    }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

// ====== Task: đọc cảm biến ======
void sensorTask(void *parameter) {
  for (;;) {
    dht11_handle(&dht11);
    mq135_handle(&mq135);
    gp2y1014au_handle(&gp2y1014au);

    airStatus = (mq135.mq135_ppm <= 50) ? "Good" :
                (mq135.mq135_ppm <= 1000) ? "Normal" :
                (mq135.mq135_ppm <= 5000) ? "Bad" : "Dangerous";

    vTaskDelay(pdMS_TO_TICKS(200));
  }
}


// ====== Task: điều khiển phần cứng ======
void controlTask(void *parameter) {
  for (;;) {
    if (xSemaphoreTake(dataMutex, 100) == pdTRUE) {

      // ---- AUTO mode ----
      if (auto_mode) {
        if (dht11.temperature_value > threshold_temp ||
            dht11.humidity_value > threshold_humi ||
            gp2y1014au.gp2y1014au_pm25_value > threshold_pm25) {
          fan_state_fb = 1;
          buzzer_state_fb = 1;
        } else {
          fan_state_fb = 0;
          buzzer_state_fb = 0;
        }
        light_state_fb = light_state_fb; // Giữ nguyên trạng thái đèn từ Firebase
      } 
      // ---- MANUAL mode ----
      else {
        fan_state_fb = fan_state_fb;
        buzzer_state_fb = buzzer_state_fb;
        light_state_fb = light_state_fb;
      }

      // ---- Điều khiển phần cứng ----
      motor(MOTOR_LEFT, fan_state_fb ? 255 : 0);
      digitalWrite(LIGHT_PIN, light_state_fb);
      digitalWrite(BUZZER_PIN, buzzer_state_fb);

      SerialMonitorDebug();
      xSemaphoreGive(dataMutex);
    }

    vTaskDelay(pdMS_TO_TICKS(200)); 
  }
}

// ====== Task: gửi sensor lên Firebase ======
void sendSensorTask(void *parameter) {
  HTTPClient http;
  const unsigned long SEND_INTERVAL = 2000; // 2 giây
  static unsigned long lastSend = 0;

  for (;;) {
    unsigned long now = millis();
    if (now - lastSend >= SEND_INTERVAL && WiFi.status() == WL_CONNECTED) {
      if (xSemaphoreTake(dataMutex, 100) == pdTRUE) {
        StaticJsonDocument<512> doc;
        doc["sensor"]["temperature"] = dht11.temperature_value;
        doc["sensor"]["humidity"] = dht11.humidity_value;
        doc["sensor"]["airquality"] = airStatus;
        doc["sensor"]["pm25"] = gp2y1014au.gp2y1014au_pm25_value;

        String payload;
        serializeJson(doc, payload);

        http.begin(FIREBASE_URL);
        http.addHeader("Content-Type", "application/json");
        int httpCode = http.PATCH(payload);
        if (httpCode != 200 && httpCode != 204) {
          Serial.printf("⚠️ Lỗi gửi Firebase: %d\n", httpCode);
        }
        http.end();

        xSemaphoreGive(dataMutex);
      }
      lastSend = now;
    }
    vTaskDelay(pdMS_TO_TICKS(200));
  }
}

void FirstTimereadModeFromFirebase() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(FIREBASE_URL) + modePath);
    int httpResponseCode = http.GET();
    if (httpResponseCode == 200) {
      String payload = http.getString();
      auto_mode = payload.toInt() == 1;
    }
    http.end();
  }
}

// ====== Setup ======
void setup() {
  Serial.begin(115200);
  connectWiFi();
  FirstTimereadModeFromFirebase();

  dht11_init();
  mq135_init(&mq135, MQ135_PIN);
  gp2y1014au_init(&gp2y1014au, GP2Y1014AU_LED_PIN, GP2Y1014AU_SENSOR_PIN);
  motor_init();

  pinMode(LIGHT_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  dataMutex = xSemaphoreCreateMutex();

  xTaskCreatePinnedToCore(firebaseTask, "FirebaseTask", 8192, NULL, 1, &firebaseTaskHandle, 1);
  xTaskCreatePinnedToCore(sensorTask, "SensorTask", 4096, NULL, 1, &sensorTaskHandle, 1);
  xTaskCreatePinnedToCore(controlTask, "ControlTask", 8192, NULL, 1, &controlTaskHandle, 1);
  xTaskCreatePinnedToCore(sendSensorTask, "SendSensorTask", 8192, NULL, 1, &sendSensorTaskHandle, 1);
}

// ====== Loop ======
void loop() {
}
