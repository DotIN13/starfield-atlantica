import { getScene, SCENE_AOD, SCENE_WATCHFACE } from "@zos/app";
import ui from "@zos/ui";
import { Time, BloodOxygen, HeartRate, Compass } from "@zos/sensor";
import { assets, log, px } from "@zos/utils";

const logger = log.getLogger("starfield-watchface");

const aqiUrl =
  "https://api.waqi.info/feed/shanghai/?token=823de469ce4aa7d59b9e5ae5cbfc6e00a37c47b0";

const watchW = 480;
const gaugeW = 412;
const time = new Time();
const bloodOxygen = new BloodOxygen();
const heartRate = new HeartRate();

const img = assets("images");

function range(start, end, step = 1) {
  if (arguments.length === 1) {
    end = start;
    start = 0;
    step = 1;
  }

  const result = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }

  return result;
}

const getFormatTime = () => {
  const hh = time.getFormatHour().toString().padStart(2, "0");
  const mm = time.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
};

const allChars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const getFormatDate = (month, day) => {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Debug
  // month = Math.floor(Math.random() * 12);

  return `${monthNames[month - 1]} ${day}`;
};

const getFormatDay = (day) => {
  const dayNames = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return dayNames[day - 1];
};

// Image for o2 and co2 indicators
const gaugeImage = (type, value) => {
  return img(`${type}/${value}.png`);
};

// Map O2 levels to heart rate readings
const mapO2 = (value) => {
  if (value == 0) return 24; // A zero reading indicates that the sensor is not working

  const heartRateMin = 60;
  const heartRateMax = 200;

  if (value > heartRateMax) return 0;
  if (value < heartRateMin) return 24;

  const percentage = (heartRateMax - value) / (heartRateMax - heartRateMin);

  return parseInt(24 * percentage);
};

// Map CO2 levels to spo2 readings
const mapCo2 = (value) => {
  if (value == 0) return 0; // A zero reading indicates that the sensor is not working

  const spo2Min = 90;
  const spo2Max = 100;

  if (value > spo2Max || value < spo2Min) {
    logger.error("SpO2 value out of range, reading is ", value);
    return 0;
  }

  const percentage = (spo2Max - value) ** 3 / 10 ** 3;

  return parseInt(24 * percentage);
};

const co2Bleed = [
  89, 89, 92, 98, 105, 115, 127, 140, 155, 171, 189, 206, 225, 248, 272, 295,
  317, 337, 355, 372, 386, 397, 405, 410, 413,
];

const normalizeAngle = (angle) => {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
};

const shortestAnglePath = (angle1, angle2) => {
  // Normalize angles
  angle1 = angle1 % 360;
  angle2 = angle2 % 360;

  // Calculate clockwise difference
  let clockwiseDiff = (angle2 - angle1 + 360) % 360;

  // Calculate counterclockwise difference
  let counterclockwiseDiff = clockwiseDiff - 360;

  // Choose the shortest path by magnitude
  if (Math.abs(clockwiseDiff) <= Math.abs(counterclockwiseDiff)) {
    return clockwiseDiff;
  } else {
    return counterclockwiseDiff;
  }
};

WatchFace({
  initView() {
    rootPath = "images/";

    this.screenType = getScene();
    this.screenPaused = false;

    this.imgBg = null;

    this.currentTime = null;
    this.currentMonth = null;
    this.currentDate = null;
    this.currentDay = null;

    this.compass = null;
    this.compassDialAngle = 0;
    this.compassAngle = 0;

    /**
     * Clockhands
     */
    const hourHand = ui.createWidget(ui.widget.TIME_POINTER, {
      hour_path: img("clockhands/hour.png"),
      hour_centerX: px(watchW / 2),
      hour_centerY: px(watchW / 2),
      hour_posX: px(34 / 2),
      hour_posY: px(watchW / 2 + 1),
      show_level: ui.show_level.ONLY_NORMAL,
    });

    const minuteHand = ui.createWidget(ui.widget.TIME_POINTER, {
      minute_path: img("clockhands/minute.png"),
      minute_centerX: px(watchW / 2),
      minute_centerY: px(watchW / 2),
      minute_posX: px(18 / 2),
      minute_posY: px(watchW / 2 + 1),
      show_level: ui.show_level.ONLY_NORMAL,
    });

    const secondHand = ui.createWidget(ui.widget.TIME_POINTER, {
      second_path: img("clockhands/second.png"),
      second_centerX: px(watchW / 2),
      second_centerY: px(watchW / 2),
      second_posX: px(12 / 2),
      second_posY: px(watchW / 2 + 1),
      show_level: ui.show_level.ONLY_NORMAL,
    });

    /**
     * Clock background
     */
    if (this.screenType == SCENE_AOD) {
      this.imgBg = ui.createWidget(ui.widget.FILL_RECT, {
        x: px(0),
        y: px(0),
        w: px(watchW),
        h: px(watchW),
        color: 0x000000,
      });
    } else {
      this.imgBg = ui.createWidget(ui.widget.IMG, {
        x: px(0),
        y: px(0),
        w: px(watchW),
        h: px(watchW),
        src: img("bg/bg.png"),
        // auto_scale: true,
        show_level: ui.show_level.ONLY_NORMAL,
      });

      // Draw a white circle, and then draw a black circle with 1 less pixels of radius, to create a white ring
      const circleRadius = 195;
      const circle = ui.createWidget(ui.widget.CIRCLE, {
        center_x: px(watchW / 2),
        center_y: px(watchW / 2),
        radius: px(circleRadius),
        color: 0xffffff,
        show_level: ui.show_level.ONLY_NORMAL,
      });

      const circle2 = ui.createWidget(ui.widget.CIRCLE, {
        center_x: px(watchW / 2),
        center_y: px(watchW / 2),
        radius: px(circleRadius - 2),
        color: 0x000000,
        show_level: ui.show_level.ONLY_NORMAL,
      });
    }

    /**
     * O2 and CO2 indicators
     */

    this.o2Props = {
      x: px(0),
      y: px(watchW / 2 - 22),
      w: px(watchW),
      h: px(watchW / 2),
      pos_x: px(watchW / 2 - gaugeW / 2),
      pos_y: px(0),
      src: gaugeImage("o2", 24),
      // auto_scale: true,
      show_level: ui.show_level.ONLY_NORMAL,
    };
    this.o2 = ui.createWidget(ui.widget.IMG, this.o2Props);

    this.co2Props = {
      x: px(0),
      y: px(watchW / 2 - 22),
      w: px(watchW),
      h: px(watchW / 2),
      pos_x: px(watchW / 2 + gaugeW / 2 - co2Bleed[0]),
      pos_y: px(0),
      src: gaugeImage("co2", 0),
      // auto_scale: true,
      show_level: ui.show_level.ONLY_NORMAL,
    };
    this.co2 = ui.createWidget(ui.widget.IMG, this.co2Props);

    const o2Label = ui.createWidget(ui.widget.IMG, {
      x: px(0),
      y: px(0),
      w: px(watchW),
      h: px(watchW / 2),
      pos_x: px(watchW / 2 - 175),
      pos_y: px(watchW / 2 - 32),
      src: img("o2.png"),
      // auto_scale: true,
      show_level: ui.show_level.ONLY_NORMAL,
    });

    const co2Label = ui.createWidget(ui.widget.IMG, {
      x: px(0),
      y: px(0),
      w: px(watchW),
      h: px(watchW / 2),
      pos_x: px(watchW / 2 + 144),
      pos_y: px(watchW / 2 - 32),
      src: img("co2.png"),
      // auto_scale: true,
      show_level: ui.show_level.ONLY_NORMAL,
    });

    bloodOxygen.start();
    bloodOxygen.onChange(() => this.updateGauges());
    heartRate.onLastChange(() => this.updateGauges());

    this.updateGauges();

    /**
     * Compass
     */
    if (this.screenType == SCENE_WATCHFACE) {
      try {
        this.compass = new Compass();
        this.compass.start();
      } catch (e) {
        logger.debug("Compass initialization error:", e);
      }

      const compassW = 274;
      this.compassDial = ui.createWidget(ui.widget.IMG, {
        x: px(watchW / 2 - compassW / 2),
        y: px(watchW / 2 - compassW / 2),
        w: px(compassW),
        h: px(compassW),
        pos_x: px(0),
        pos_y: px(0),
        center_x: px(compassW / 2),
        center_y: px(compassW / 2),
        src: img("compass/compass.png"),
        angle: this.getCompassAngle(),
        // auto_scale: true,
        show_level: ui.show_level.ONLY_NORMAL,
      });

      logger.log("Compass widget created.");
    }

    // const stepProgress = ui.createWidget(ui.widget.IMG_POINTER, {
    //   src: img("steps/progress.png"),
    //   center_x: px(watchW / 2), // Center of rotation
    //   center_y: px(watchW / 2),
    //   x: px(188), // Location of the widget, when not rotated
    //   y: px(0),
    //   start_angle: 180,
    //   end_angle: 0,
    //   cover_path: img("steps/track.png"),
    //   cover_x: px(51),
    //   cover_y: px(51),
    //   type: ui.data_type.STEP,
    //   show_level: ui.show_level.ONLY_NORMAL,
    // });

    // logger.log("StepProgress widget created.");

    /**
     * Center time widget
     */
    const centerTimeW = 180;
    const centerTimeH = 60;
    this.centerTimeProps = {
      x: px(watchW / 2 - centerTimeW / 2),
      y: px(watchW / 2 - centerTimeH / 2),
      w: px(centerTimeW),
      h: px(centerTimeH),
      color: 0xffffff,
      text_size: 60,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text_style: ui.text_style.NONE,
      font: "fonts/nb16.ttf",
      text: allChars,
      show_level: ui.show_level.ONLY_NORMAL | ui.show_level.ONAL_AOD,
    };
    this.centerTime = ui.createWidget(ui.widget.TEXT, this.centerTimeProps);

    logger.log("CenterTime widget created.");

    /**
     * Center date widget
     */
    const centerDateW = 180;
    const centerDateH = 30;
    this.centerDateProps = {
      x: px(watchW / 2 - centerDateW / 2),
      y: px(watchW / 2 - centerDateH / 2 + 48),
      w: px(centerDateW),
      h: px(centerDateH),
      color: 0xffffff,
      text_size: 24,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text_style: ui.text_style.NONE,
      font: "fonts/nb16.ttf",
      text: allChars,
      show_level: ui.show_level.ONLY_NORMAL,
    };
    this.centerDate = ui.createWidget(ui.widget.TEXT, this.centerDateProps);

    logger.log("CenterDate widget created.");

    /**
     * Center day-of-the-week widget
     */
    const centerDayW = 180;
    const centerDayH = 30;
    this.centerDayProps = {
      x: px(watchW / 2 - centerDayW / 2),
      y: px(watchW / 2 - centerDayH / 2 - 46),
      w: px(centerDayW),
      h: px(centerDayH),
      color: 0xffffff,
      text_size: 24,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text_style: ui.text_style.NONE,
      font: "fonts/nb16.ttf",
      text: allChars,
      show_level: ui.show_level.ONLY_NORMAL,
    };
    this.centerDay = ui.createWidget(ui.widget.TEXT, this.centerDayProps);

    this.updateTime();
    this.updateDate();

    time.onPerMinute(() => this.updateTime());
    time.onPerDay(() => this.updateDate());

    logger.log("CenterDay widget created.");

    /**
     * Compass update
     */
    if (this.compass) {
      this.compass.onChange(() => this.compassCallback());
      if (!this.compassInterval) this.animateCompassDial();
      logger.log("Started compass animation.");
    }
  },

  updateGauges() {
    const { value: spo2Readings, retCode: spo2RetCode } =
      bloodOxygen.getCurrent();
    const heartRateReadings = heartRate.getLast();

    let o2 = mapO2(heartRateReadings);
    let co2 = mapCo2(spo2Readings);

    if (![2, 8, 9].includes(spo2RetCode)) co2 = 0;

    // Debug
    // co2 = 24

    o2 = Math.min(24 - co2, o2); // The sum of o2 and co2 cannot be greater than 24

    // logger.debug(
    //   "Updating o2 and co2 gauges. spo2 is ",
    //   spo2Readings,
    //   ", o2 retCode is",
    //   o2RetCode,
    //   ", heartrate is ",
    //   heartRateReadings,
    //   ", co2 bleed is ",
    //   co2Bleed[co2]
    // );

    this.o2Props.src = gaugeImage("o2", o2);
    this.co2Props.src = gaugeImage("co2", co2);

    this.o2Props.alpha = o2 == 0 ? 0 : 255;
    this.co2Props.alpha = co2 == 0 ? 0 : 255;

    this.co2Props.pos_x = px(watchW / 2 + gaugeW / 2 - co2Bleed[co2]);

    this.o2.setProperty(ui.prop.MORE, this.o2Props);
    this.co2.setProperty(ui.prop.MORE, this.co2Props);
  },

  animateCompassDial() {
    this.compassInterval = setInterval(() => {
      if (this.screenPaused) return;
      // logger.debug(this.compassAngle, this.compassDialAngle);

      if (
        typeof this.compassAngle != "number" ||
        typeof this.compassDialAngle != "number"
      )
        return;

      let currentAngle = this.compassDialAngle;
      const anglePath = shortestAnglePath(currentAngle, this.compassAngle);
      const angleDistance = Math.abs(anglePath);
      if (angleDistance < 1.0) return;

      // Calculate the base increment
      const increment = anglePath / (200 / 25); // 200ms

      // Adjust current angle
      currentAngle += increment;
      currentAngle = normalizeAngle(currentAngle);

      this.compassDial.setProperty(ui.prop.ANGLE, currentAngle);
      this.compassDialAngle = currentAngle;
    }, 25);
  },

  getCompassAngle() {
    const angle = this.compass.getDirectionAngle();
    if (isNaN(angle) || angle === undefined || typeof angle != "number")
      return this.compassAngle;

    // The compass is not returning the current angle of North,
    // but the angle of the direction the watch is facing.
    // So we need to invert the angle to get the rotation for the dial.
    return 360 - angle;
  },

  compassCallback() {
    if (this.compass.getStatus()) {
      // logger.debug("Direction:", this.compass.getDirection())
      // logger.debug("Compass angle readings:", this.compass.getDirectionAngle());
      this.compassAngle = this.getCompassAngle();
    }
  },

  updateTime() {
    // Do nothing if the widget is not initialized
    if (!this.centerTime) return;
    if (this.currentTime == time.getTime()) return;

    this.centerTime.setProperty(ui.prop.TEXT, getFormatTime());

    this.currentTime = time.getTime();
  },

  updateDate() {
    // Do nothing if the widgets are not initialized
    if (!this.centerDate || !this.centerDay) return;
    if (
      this.currentMonth == time.getMonth() &&
      this.currentDate == time.getDate() &&
      this.currentDay == time.getDay()
    )
      return;

    this.centerDate.setProperty(ui.prop.TEXT, {
      text: getFormatDate(time.getMonth(), time.getDate()),
    });
    this.centerDay.setProperty(ui.prop.TEXT, {
      text: getFormatDay(time.getDay()),
    });

    this.currentMonth = time.getMonth();
    this.currentDate = time.getDate();
    this.currentDay = time.getDay();
  },

  onInit() {
    logger.log("Watchface init.");
  },

  build() {
    logger.log("Watchface build.");
    this.initView();
  },

  onPause() {
    logger.log("Watchface pause.");

    this.screenPaused = true;

    if (this.compass) {
      this.compass.stop();
      clearInterval(this.compassInterval);
      this.compassInterval = null;
    }
  },

  onResume() {
    logger.log("Watchface resume.");

    this.screenPaused = false;

    this.updateTime();
    this.updateDate();
    this.updateGauges();

    if (this.compass) {
      try {
        this.compass.start();
        this.compassDial.setProperty(ui.prop.ANGLE, this.getCompassAngle());
        if (!this.compassInterval) this.animateCompassDial();
      } catch (e) {
        logger.debug("Compass resume error:", e);
      }
    }
  },

  onDestroy() {
    logger.log("Watchface destroy.");

    bloodOxygen.stop();
    bloodOxygen.offChange(callback);

    // When not needed for use
    if (this.compass) {
      this.compass.offChange();
      this.compass.stop();
      this.campass = null;
    }
  },
});
