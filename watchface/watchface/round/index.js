import { getScene, SCENE_WATCHFACE } from "@zos/app";
import ui from "@zos/ui";
import { Time, HeartRate, Compass } from "@zos/sensor";
import { log, px } from "@zos/utils";
import {
  getFormatDate,
  getFormatDay,
  getFormatTime,
  mapO2,
  mapCo2,
  img,
  gaugeImage,
  normalizeAngle,
  shortestAnglePath,
} from "./utils.js";

const logger = log.getLogger("starfield-watchface");

const aqiUrl =
  "https://api.waqi.info/feed/shanghai/?token=823de469ce4aa7d59b9e5ae5cbfc6e00a37c47b0";

const watchW = 480;
const gaugeW = 410;
const compassW = 272;

const time = new Time();
const heartRate = new HeartRate();

const co2Bleed = [
  89, 89, 92, 97, 105, 114, 126, 139, 154, 170, 187, 205, 223, 246, 270, 293,
  315, 335, 353, 370, 384, 395, 403, 408, 410,
];

const allChars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

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

    this.planetView = false;

    /**
     * Outer Clockhand Ring
     */

    ui.createWidget(ui.widget.CIRCLE, {
      center_x: px(watchW / 2),
      center_y: px(watchW / 2),
      radius: px(watchW / 2),
      color: 0xffffff,
      alpha: 20,
      show_level: ui.show_level.ONLY_NORMAL,
    });

    ui.createWidget(ui.widget.CIRCLE, {
      center_x: px(watchW / 2),
      center_y: px(watchW / 2),
      radius: px(watchW / 2 - 9),
      color: 0x000000,
      show_level: ui.show_level.ONLY_NORMAL,
    });

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

    ui.createWidget(ui.widget.FILL_RECT, {
      x: px(0),
      y: px(0),
      w: px(watchW),
      h: px(watchW),
      color: 0x000000,
      show_level: ui.show_level.ONLY_AOD,
    });

    ui.createWidget(ui.widget.IMG, {
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
    ui.createWidget(ui.widget.CIRCLE, {
      center_x: px(watchW / 2),
      center_y: px(watchW / 2),
      radius: px(circleRadius),
      color: 0xffffff,
      alpha: 240,
      show_level: ui.show_level.ONLY_NORMAL,
    });

    ui.createWidget(ui.widget.CIRCLE, {
      center_x: px(watchW / 2),
      center_y: px(watchW / 2),
      radius: px(circleRadius - 2),
      color: 0x000000,
      show_level: ui.show_level.ONLY_NORMAL,
    });

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
      pos_x: px(watchW / 2 - 173.5),
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
      pos_x: px(watchW / 2 + 142.5),
      pos_y: px(watchW / 2 - 32),
      src: img("co2.png"),
      // auto_scale: true,
      show_level: ui.show_level.ONLY_NORMAL,
    });

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

      this.compassDial = ui.createWidget(ui.widget.IMG, {
        x: px(watchW / 2 - compassW / 2),
        y: px(watchW / 2 - compassW / 2),
        w: px(compassW),
        h: px(compassW),
        pos_x: px(0),
        pos_y: px(0),
        center_x: px(compassW / 2),
        center_y: px(compassW / 2),
        src: img("compass/compass@2x.png"),
        angle: this.getCompassAngle(),
        auto_scale: true,
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
    const centerTimeW = 200;
    const centerTimeH = 70;
    this.centerTimeProps = {
      x: px(watchW / 2 - centerTimeW / 2),
      y: px(watchW / 2 - centerTimeH / 2),
      w: px(centerTimeW),
      h: px(centerTimeH),
      color: 0xffffff,
      text_size: 64,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text_style: ui.text_style.NONE,
      font: "fonts/nb19.ttf",
      text: allChars,
      show_level: ui.show_level.ONLY_NORMAL,
    };
    this.centerTime = ui.createWidget(ui.widget.TEXT, this.centerTimeProps);

    // AOD Center Time
    this.aodCenterTimeProps = {
      ...this.centerTimeProps,
      text_size: 60,
      show_level: ui.show_level.ONAL_AOD,
    };
    this.aodCenterTime = ui.createWidget(
      ui.widget.TEXT,
      this.aodCenterTimeProps
    );

    logger.log("CenterTime widget created.");

    /**
     * Center date widget
     */
    const centerDateW = 200;
    const centerDateH = 30;
    this.centerDateProps = {
      x: px(watchW / 2 - centerDateW / 2),
      y: px(watchW / 2 - centerDateH / 2 + 51),
      w: px(centerDateW),
      h: px(centerDateH),
      color: 0xffffff,
      text_size: 27,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text_style: ui.text_style.NONE,
      font: "fonts/nb19.ttf",
      text: allChars,
      show_level: ui.show_level.ONLY_NORMAL,
    };
    this.centerDate = ui.createWidget(ui.widget.TEXT, this.centerDateProps);

    logger.log("CenterDate widget created.");

    /**
     * Center day-of-the-week widget
     */
    const centerDayW = 200;
    const centerDayH = 30;
    this.centerDayProps = {
      x: px(watchW / 2 - centerDayW / 2),
      y: px(watchW / 2 - centerDayH / 2 - 47.5),
      w: px(centerDayW),
      h: px(centerDayH),
      color: 0xffffff,
      text_size: 27,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text_style: ui.text_style.NONE,
      font: "fonts/nb19.ttf",
      text: allChars,
      show_level: ui.show_level.ONLY_NORMAL,
    };
    this.centerDay = ui.createWidget(ui.widget.TEXT, this.centerDayProps);

    // Planet Sphere
    const planetW = 180;
    this.planet = ui.createWidget(ui.widget.IMG, {
      x: px(watchW / 2 - planetW / 2),
      y: px(watchW / 2 - planetW / 2),
      w: px(planetW),
      h: px(planetW),
      pos_x: px(0),
      pos_y: px(0),
      center_x: px(planetW / 2),
      center_y: px(planetW / 2),
      src: img("planet/1.png"),
      auto_scale: true,
      alpha: 0,
      show_level: ui.show_level.ONLY_NORMAL,
    });

    const planetLabelW = 79;
    const planetLabelH = 29;
    this.planetLabel = ui.createWidget(ui.widget.IMG, {
      x: px(watchW / 2 - planetLabelW / 2),
      y: px(watchW / 2 + planetW / 2 - 1),
      w: px(planetLabelW),
      h: px(planetLabelH),
      pos_x: px(0),
      pos_y: px(0),
      src: img("earth.png"),
      auto_scale: false,
      alpha: 0,
      show_level: ui.show_level.ONLY_NORMAL,
    });

    this.planet.addEventListener(ui.event.CLICK_DOWN, () => {
      this.planetView = !this.planetView;
      const p = this.planetView;
      this.planet.setProperty(ui.prop.ALPHA, p ? 255 : 0);
      this.planetLabel.setProperty(ui.prop.ALPHA, p ? 255 : 0);
      this.centerDay.setProperty(ui.prop.COLOR, p ? 0x000000 : 0xffffff);
      this.centerDate.setProperty(ui.prop.COLOR, p ? 0x000000 : 0xffffff);
      this.centerTime.setProperty(ui.prop.COLOR, p ? 0x000000 : 0xffffff);
    });

    // Callback registrations

    this.updateTime();
    this.updateDate();

    time.onPerMinute(() => this.updateTime());
    time.onPerDay(() => this.updateDate());

    logger.log("CenterDay widget created.");

    heartRate.onLastChange(() => this.updateGauges());
    this.updateGauges();

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
    const heartRateReadings = heartRate.getLast();
    const pastHeartRates = heartRate.getToday();

    let o2 = mapO2(pastHeartRates);
    let co2 = mapCo2(heartRateReadings);

    // Debug
    // co2 = 24;

    o2 = Math.min(24 - co2, o2); // The sum of o2 and co2 cannot be greater than 24

    // logger.debug("Current heartrate: ", heartRateReadings, ", Readings today: ", pastHeartRates);

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

    const hours = time.getHours();
    const minutes = time.getMinutes();

    const planetIndex = parseInt(hours * 2 + minutes / 30 + 1);
    const planetImage = img(`planet/${planetIndex}.png`);
    this.planet.setProperty(ui.prop.SRC, planetImage);

    this.centerTime.setProperty(ui.prop.TEXT, getFormatTime(hours, minutes));
    this.aodCenterTime.setProperty(ui.prop.TEXT, getFormatTime(hours, minutes));

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

    heartRate.offLastChange();

    // When not needed for use
    if (this.compass) {
      this.compass.offChange();
      this.compass.stop();
      this.campass = null;
    }
  },
});
