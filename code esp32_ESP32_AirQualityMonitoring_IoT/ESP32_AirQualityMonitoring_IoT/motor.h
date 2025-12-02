#ifndef MOTOR_H
#define MOTOR_H

enum MotorControl{
  MOTOR_LEFT,
  MOTOR_RIGHT
};

// Hàm khởi tạo motor
void motor_init();

void motor(MotorControl motorType, int PWM);

#endif
