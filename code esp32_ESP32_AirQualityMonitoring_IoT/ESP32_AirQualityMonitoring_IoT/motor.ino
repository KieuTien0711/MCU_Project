// Motor driver for smart left and retractable right
#define left_motor_foward     16 // AIN1
#define left_motor_backward    4 // AIN2
#define left_motor_speed       2 // PWMA

#define right_motor_foward    5 // BIN1
#define right_motor_backward 18 // BIN2
#define right_motor_speed    19 // PWMB

#define STBY                  17

void motor_init() {
  pinMode(left_motor_foward, OUTPUT);
  pinMode(left_motor_backward, OUTPUT);
  pinMode(left_motor_speed, OUTPUT);

  pinMode(right_motor_foward, OUTPUT);
  pinMode(right_motor_backward, OUTPUT);
  pinMode(right_motor_speed, OUTPUT);

  pinMode(STBY, OUTPUT);

  digitalWrite(STBY, HIGH);
}

void motor(MotorControl motorType, int PWM) {

  PWM = constrain(PWM, -255, 255);
  
  switch (motorType) {
    case MOTOR_LEFT: {
      if (PWM > 0) {
        digitalWrite(left_motor_foward, HIGH);
        digitalWrite(left_motor_backward, LOW);
      } else {
        digitalWrite(left_motor_foward, LOW);
        digitalWrite(left_motor_backward, HIGH);
      }
      analogWrite(left_motor_speed, abs(PWM));
      break;
    }

    case MOTOR_RIGHT: {
      if (PWM > 0) {
        digitalWrite(right_motor_foward, HIGH);
        digitalWrite(right_motor_backward, LOW);
      } else {
        digitalWrite(right_motor_foward, LOW);
        digitalWrite(right_motor_backward, HIGH);
      }
      analogWrite(right_motor_speed, abs(PWM));
      break;
    }
  }
}
