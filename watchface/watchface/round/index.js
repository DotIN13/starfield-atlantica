import { log, px } from "@zos/utils";
import { getScene, SCENE_AOD, SCENE_WATCHFACE } from "@zos/app";
import ui from "@zos/ui";
import { Time } from "@zos/sensor";

import { Compass } from "@zos/sensor";

const logger = log.getLogger("starfield-watchface");

const watchW = 480;
const time = new Time();

const img = (function (type) {
  return (path) => type + "/" + path;
})("images");

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
     * Compass
     */
    if (this.screenType == SCENE_WATCHFACE) {
      this.compass = new Compass();
      this.compass.start();

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
        angle: 0,
        // auto_scale: true,
        show_level: ui.show_level.ONLY_NORMAL,
      });

      logger.log("Compass widget created.");
    }

    const stepProgress = ui.createWidget(ui.widget.IMG_POINTER, {
      src: img("steps/progress.png"),
      center_x: px(watchW / 2), // Center of rotation
      center_y: px(watchW / 2),
      x: px(188), // Location of the widget, when not rotated
      y: px(0),
      start_angle: 180,
      end_angle: 0,
      cover_path: img("steps/track.png"),
      cover_x: px(51),
      cover_y: px(51),
      type: ui.data_type.STEP,
      show_level: ui.show_level.ONLY_NORMAL,
    });

    logger.log("StepProgress widget created.");

    /**
     * Center time widget
     */
    const centerTimeW = 180;
    const centerTimeH = 60;
    this.centerTimeProperties = {
      x: px(watchW / 2 - centerTimeW / 2),
      y: px(watchW / 2 - centerTimeH / 2),
      w: px(centerTimeW),
      h: px(centerTimeH),
      color: 0xffffff,
      text_size: 60,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text_style: ui.text_style.NONE,
      font: "fonts/nb15.ttf",
      text: allChars,
      show_level: ui.show_level.ONLY_NORMAL | ui.show_level.ONAL_AOD,
    };
    this.centerTime = ui.createWidget(
      ui.widget.TEXT,
      this.centerTimeProperties
    );

    logger.log("CenterTime widget created.");

    /**
     * Center date widget
     */
    const centerDateW = 180;
    const centerDateH = 30;
    this.centerDateProperties = {
      x: px(watchW / 2 - centerDateW / 2),
      y: px(watchW / 2 - centerDateH / 2 + 48),
      w: px(centerDateW),
      h: px(centerDateH),
      color: 0xffffff,
      text_size: 24,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text_style: ui.text_style.NONE,
      font: "fonts/nb15.ttf",
      text: allChars,
      show_level: ui.show_level.ONLY_NORMAL,
    };
    this.centerDate = ui.createWidget(
      ui.widget.TEXT,
      this.centerDateProperties
    );

    logger.log("CenterDate widget created.");

    /**
     * Center day-of-the-week widget
     */
    const centerDayW = 180;
    const centerDayH = 30;
    this.centerDayProperties = {
      x: px(watchW / 2 - centerDayW / 2),
      y: px(watchW / 2 - centerDayH / 2 - 46),
      w: px(centerDayW),
      h: px(centerDayH),
      color: 0xffffff,
      text_size: 24,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text_style: ui.text_style.NONE,
      font: "fonts/nb15.ttf",
      text: allChars,
      show_level: ui.show_level.ONLY_NORMAL,
    };
    this.centerDay = ui.createWidget(ui.widget.TEXT, this.centerDayProperties);

    logger.log("CenterDay widget created.");

    this.updateTime();
    this.updateDate();

    time.onPerMinute(() => this.updateTime());
    time.onPerDay(() => this.updateDate());

    /**
     * Compass update
     */
    if (this.compass) {
      logger.log("Starting compass animation.");
      this.compass.onChange(() => this.compassCallback());
      if (!this.compassInterval) this.animateCompassDial();
    }
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

      this.compassDial.setProperty(ui.prop.ANGLE, { angle: currentAngle });
      this.compassDialAngle = currentAngle;
    }, 25);
  },

  getCompassAngle() {
    const angle = this.compass.getDirectionAngle();
    if (isNaN(angle) || angle === undefined || typeof angle != "number")
      return this.compassAngle;

    return angle;
  },

  compassCallback() {
    if (this.compass.getStatus()) {
      // logger.debug("Direction:", this.compass.getDirection())
      // logger.debug(this.compass.getDirectionAngle())
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

    if (this.compass) {
      this.compass.start();
      this.compassDial.setProperty(ui.prop.ANGLE, {
        angle: this.getCompassAngle(),
      });
      if (!this.compassInterval) this.animateCompassDial();
    }
  },

  onDestroy() {
    logger.log("Watchface destroy.");

    // When not needed for use
    if (this.compass) {
      this.compass.offChange();
      this.compass.stop();
      this.campass = null;
    }
  },
});
