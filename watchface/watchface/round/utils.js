import { assets } from "@zos/utils";

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

const getFormatTime = (hours, minutes) => {
  const hh = hours.toString().padStart(2, "0");
  const mm = minutes.toString().padStart(2, "0");
  return `${hh}:${mm}`;
};

const img = assets("images");

// Image for o2 and co2 indicators
const gaugeImage = (type, value) => {
  return img(`${type}/${value}.png`);
};

// Map O2 levels to past heart rate readings
const mapO2 = (value) => {
  value = value.filter((v) => v > 0); // Remove 0 values
  if (value.length == 0) return 24;

  value = value.slice(-5); // Only use the last 5 readings
  value = value.reduce((a, b) => a + b, 0) / value.length;

  const heartRateMin = 80;
  const heartRateMax = 150;

  if (value > heartRateMax) return 0;
  if (value < heartRateMin) return 24;

  const percentage = (heartRateMax - value) / (heartRateMax - heartRateMin);

  return parseInt(24 * percentage);
};

const mapCo2 = (value) => {
  if (value == 0) return 0;

  const heartRateMin = 100;
  const heartRateMax = 200;

  if (value > heartRateMax) return 24;
  if (value < heartRateMin) return 0;

  const percentage = (value - heartRateMin) / (heartRateMax - heartRateMin);

  return parseInt(24 * percentage);
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

export {
  getFormatDate,
  getFormatDay,
  getFormatTime,
  mapO2,
  mapCo2,
  img,
  gaugeImage,
  normalizeAngle,
  shortestAnglePath,
};
