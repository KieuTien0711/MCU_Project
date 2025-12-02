#ifndef DHT11_H
#define DHT11_H
#include "Arduino.h"
#include <DHT.h>

typedef struct{
  float     temperature_value;
  float     humidity_value;
} Dht11_Typedef;


const int DHTPIN = 27;

const int DHTTYPE = DHT22;

DHT dht(DHTPIN, DHTTYPE);

void dht11_init(){
    dht.begin();
}
void dht11_handle(Dht11_Typedef *dht11){
  dht11->humidity_value = dht.readHumidity();  //Read the humidity
  dht11->temperature_value  = dht.readTemperature(); // or dht.readTemperature(true) for Fahrenheit
  if (isnan(dht11->humidity_value) || isnan(dht11->temperature_value)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
}
#endif