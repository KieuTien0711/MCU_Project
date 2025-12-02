#ifndef MQ135_H
#define MQ135_H

#include <Arduino.h>
#include <math.h>

// ======================= STRUCT SENSOR =======================
typedef struct {
  uint8_t   mq135_pin;
  uint16_t  mq135_adc_value;
  float     mq135_ppm;
  float     mq135_Rs;
} MQ135_Typedef;

// ======================= CONST CONFIG ========================
const float MQ135_VCC = 3.3;
const float MQ135_RL  = 10.0;
float       MQ135_R0  = 10.0;      // sẽ được hiệu chuẩn tại init()
const int   ADC_MAX_VALUE = 4095;

// Công thức tính CO2 ppm (theo MQ135 datasheet)
const float CO2_A = -2.769;
const float CO2_B =  2.602;

// Bộ lọc điện áp (EMA)
float mq135_filteredVoltage = 0;
const float alpha_up   = 0.9;
const float alpha_down = 0.2;

// ======================= READ ADC ============================
static uint16_t read_mq135_adc(MQ135_Typedef *mq135, uint8_t samples = 10) {
    uint32_t sum = 0;
    for (uint8_t i = 0; i < samples; i++) {
        sum += analogRead(mq135->mq135_pin);
    }
    mq135->mq135_adc_value = sum / samples;
    return mq135->mq135_adc_value;
}

// ======================= INIT SENSOR + CALIBRATION ===========
// => Hiệu chuẩn R0 dựa vào Rs khi khởi động (mặc định coi môi trường ~400ppm CO2)
void mq135_init(MQ135_Typedef *mq135, uint8_t mq135_pin) {
    mq135->mq135_pin = mq135_pin;
    pinMode(mq135->mq135_pin, INPUT);

    uint16_t adc = read_mq135_adc(mq135);
    mq135_filteredVoltage = (adc / (float)ADC_MAX_VALUE) * MQ135_VCC;

    mq135->mq135_Rs = ((MQ135_VCC * MQ135_RL) / mq135_filteredVoltage) - MQ135_RL;

    // Datasheet: Rs/R0 ≈ 3.6 tại 400ppm CO2
    MQ135_R0 = mq135->mq135_Rs / 3.6f;
}

// ======================= MAIN HANDLE =========================
void mq135_handle(MQ135_Typedef *mq135) {
    uint16_t adc = read_mq135_adc(mq135);
    float voltage = (adc / (float)ADC_MAX_VALUE) * MQ135_VCC;

    // lọc điện áp
    if (voltage > mq135_filteredVoltage) {
        mq135_filteredVoltage = alpha_up * voltage + (1.0f - alpha_up) * mq135_filteredVoltage;
    } else {
        mq135_filteredVoltage = alpha_down * voltage + (1.0f - alpha_down) * mq135_filteredVoltage;
    }

    if (mq135_filteredVoltage < 0.05f) return;  // chống chia 0

    mq135->mq135_Rs = ((MQ135_VCC * MQ135_RL) / mq135_filteredVoltage) - MQ135_RL;

    float ratio = mq135->mq135_Rs / MQ135_R0;
    mq135->mq135_ppm = pow(10, (CO2_A * log10(ratio) + CO2_B));
}

#endif
