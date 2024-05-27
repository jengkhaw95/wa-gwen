import robot from "robotjs";

setInterval(() => {
  const pos = robot.getMousePos();
  const color = robot.getPixelColor(pos.x, pos.y);
  console.log({ ...pos, color });
}, 1000);
