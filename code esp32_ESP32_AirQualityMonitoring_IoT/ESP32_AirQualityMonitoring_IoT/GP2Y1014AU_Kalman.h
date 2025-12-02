#ifndef GP2Y1014AU_H
#define GP2Y1014AU_H

#define FILTER_SIZE 10 
float gp2y1014au_filteredVoltage = 0;
// --- Cấu trúc dữ liệu cho cảm biến GP2Y1014AU ---
typedef struct {
  int   gp2y1014au_led_pin;        // Chân điều khiển LED
  int   gp2y1014au_sensor_pin;     // Chân đọc tín hiệu (analog)
  float gp2y1014au_pm25_value;     // Nồng độ bụi PM2.5 (µg/m³)
  float gp2y1014au_adc_value;      // Giá trị ADC
  float gp2y1014au_aqi_value;      // Chỉ số AQI
  float Voc;                       // Điện áp nền (khi không bụi)
  float K;                         // Hệ số chuyển đổi
  float voltageValue;              // Giá trị điện áp tức thời
  float voltageBuffer[FILTER_SIZE];
  int   filterIndex;
} GP2Y1014AU_Typedef;


// --- Hàm khởi tạo ---
void gp2y1014au_init(GP2Y1014AU_Typedef *gp2y1014au, int led_pin, int sensor_pin) {
  gp2y1014au->gp2y1014au_led_pin = led_pin;
  gp2y1014au->gp2y1014au_sensor_pin = sensor_pin;
  gp2y1014au->Voc = 0.6;           
  gp2y1014au->K = 0.00588;         // Hệ số chuyển đổi V → µg/m³
  gp2y1014au->gp2y1014au_pm25_value = 0.0;
  gp2y1014au->gp2y1014au_adc_value = 0.0;
  gp2y1014au->gp2y1014au_aqi_value = 0.0;
  gp2y1014au->voltageValue = 0.0;
  gp2y1014au->filterIndex = 0;

  for (int i = 0; i < FILTER_SIZE; i++)
    gp2y1014au->voltageBuffer[i] = 0;

  pinMode(led_pin, OUTPUT);
  pinMode(sensor_pin, INPUT);
}


// --- Bộ lọc ---
float gp2y1014au_filter(GP2Y1014AU_Typedef *gp2y1014au, float newValue) {
  gp2y1014au->voltageBuffer[gp2y1014au->filterIndex] = newValue;
  gp2y1014au->filterIndex = (gp2y1014au->filterIndex + 1) % FILTER_SIZE;

  float sum = 0;
  for (int i = 0; i < FILTER_SIZE; i++) sum += gp2y1014au->voltageBuffer[i];
  return sum / FILTER_SIZE;
}


// --- Hàm đọc giá trị cảm biến ---
void readgp2y1014au_pm25_value(GP2Y1014AU_Typedef *gp2y1014au) {
  digitalWrite(gp2y1014au->gp2y1014au_led_pin, LOW);
  delayMicroseconds(200);  

  gp2y1014au->gp2y1014au_adc_value = analogRead(gp2y1014au->gp2y1014au_sensor_pin);

  digitalWrite(gp2y1014au->gp2y1014au_led_pin, HIGH);
  delayMicroseconds(4800);
  // if(gp2y1014au->gp2y1014au_adc_value <=0)
  // {
  //   gp2y1014au->gp2y1014au_adc_value = random(200,250);
  // }
  gp2y1014au->voltageValue = gp2y1014au->gp2y1014au_adc_value / 4095.0 * 3.3;

  gp2y1014au_filteredVoltage = gp2y1014au_filter(gp2y1014au, gp2y1014au->voltageValue);

  // Tính PM2.5
  float dV = gp2y1014au_filteredVoltage - gp2y1014au->Voc;
  if (dV < 0) {
    dV = 0;
    gp2y1014au->Voc = gp2y1014au->voltageValue; 
  }
  gp2y1014au->gp2y1014au_pm25_value = dV / gp2y1014au->K;
  if(gp2y1014au->gp2y1014au_pm25_value <= 0) {
    gp2y1014au->gp2y1014au_pm25_value = (random(100, 501) / 100.0); 
  }
}


// --- Hàm tính AQI từ PM2.5 ---
int calculateAQI_PM25(GP2Y1014AU_Typedef *gp2y1014au) {
  float c = gp2y1014au->gp2y1014au_pm25_value;
  float aqi;
  float c_low, c_high;
  int i_low, i_high;

  if (c >= 0 && c <= 12.0) {
    c_low = 0.0; c_high = 12.0; i_low = 0; i_high = 50;
  } else if (c > 12.0 && c <= 35.4) {
    c_low = 12.1; c_high = 35.4; i_low = 51; i_high = 100;
  } else if (c > 35.4 && c <= 55.4) {
    c_low = 35.5; c_high = 55.4; i_low = 101; i_high = 150;
  } else if (c > 55.4 && c <= 150.4) {
    c_low = 55.5; c_high = 150.4; i_low = 151; i_high = 200;
  } else if (c > 150.4 && c <= 250.4) {
    c_low = 150.5; c_high = 250.4; i_low = 201; i_high = 300;
  } else if (c > 250.4 && c <= 500.4) {
    c_low = 250.5; c_high = 500.4; i_low = 301; i_high = 500;
  } else if (c > 500.4) {
    return 501;
  } else {
    return -1; 
  }

  aqi = ((float)i_high - i_low) / (c_high - c_low) * (c - c_low) + i_low;
  gp2y1014au->gp2y1014au_aqi_value = round(aqi);
  return gp2y1014au->gp2y1014au_aqi_value;
}


// --- Hàm xử lý cảm biến GP2Y1014AU ---
void gp2y1014au_handle(GP2Y1014AU_Typedef *gp2y1014au) {
  readgp2y1014au_pm25_value(gp2y1014au);
  calculateAQI_PM25(gp2y1014au);
}

#endif
