import robot, { moveMouseSmooth } from "robotjs";
import { windowManager } from "node-window-manager";

import { readFile } from "fs/promises";

export const random = (n: number, d: number) => {
  return n - d / 2 + Math.random() * d;
};

export const sleep = async (SLEEP_MS: number = 2_400, dev?: number) => {
  const TIMEOUT_IN_MS = Math.max(167, random(SLEEP_MS, dev ?? 600));
  return new Promise((resolve) => {
    setTimeout(resolve, TIMEOUT_IN_MS);
  });
};

const config = {
  // { x: 27, y: 203 }
  // { x: 44, y: 214 }
  contractSearchZone: [
    { x: 27, y: 203 },
    { x: 44, y: 214 },
  ],
  // { x: 91, y: 352 }
  // { x: 343, y: 403 }
  contactSelectZone: [
    { x: 91, y: 352 },
    { x: 343, y: 403 },
  ],
  // { x: 461, y: 838 }
  // { x: 478, y: 860 }
  // inputAttachments: [
  //   { x: 461, y: 838 },
  //   { x: 478, y: 860 },
  // ],
  // { x: 474, y: 614 }
  // { x: 614, y: 637 }
  // selectAttachmentType: [
  //   { x: 474, y: 614 },
  //   { x: 614, y: 637 },
  // ],
  // { x: 698, y: 343 }
  // { x: 525, y: 334 }
  attachmentPositions: [
    [
      { x: 1400, y: 322 },
      // { x: 698, y: 343 },
      // { x: 525, y: 334 },
    ],
    [
      // { x: 513, y: 356 },
      // { x: 650, y: 366 },
    ],
  ],

  // { x: 1363, y: 58 }
  // { x: 1422, y: 112 }
  // dragzones: [
  //   { x: 1363, y: 58 },
  //   { x: 1422, y: 112 },
  // ],
  //     { x: 488, y: 190 }
  // { x: 1200, y: 814 }
  // dropzones: [
  //   { x: 488, y: 190 },
  //   { x: 1200, y: 814 },
  // ],
};

export function selectRandomPointInBoundaryArea(
  boundaryPoints: { x: number; y: number }[]
) {
  const xMin = Math.min(boundaryPoints[0].x, boundaryPoints[1].x);
  const yMin = Math.min(boundaryPoints[0].y, boundaryPoints[1].y);
  const xMax = Math.max(boundaryPoints[0].x, boundaryPoints[1].x);
  const yMax = Math.max(boundaryPoints[0].y, boundaryPoints[1].y);
  const x = Math.floor(Math.random() * (xMax - xMin + 1)) + xMin;
  const y = Math.floor(Math.random() * (yMax - yMin + 1)) + yMin;
  return { x, y };
}

export function clickBoundary(boundaryPoints: { x: number; y: number }[]) {
  const { x, y } = selectRandomPointInBoundaryArea(boundaryPoints);
  robot.moveMouseSmooth(x, y);
  robot.mouseClick();
}

function action_focusWindow(targetPath: string) {
  const windows = windowManager.getWindows();

  // focus window
  let targetWindow = null;
  for (const window of windows) {
    if (window.path.includes(targetPath)) {
      targetWindow = window;
      const bounds = window.getBounds();
      window.setBounds({ ...bounds, x: 0, y: 0 });
      window.bringToTop();
      break;
    }
  }
  if (!targetWindow) {
    throw new Error("Window not found");
  }
  return targetWindow;
}

async function main() {
  const { execa } = await import("execa");

  const lang = await readFile("./wa-config/lang.txt", "utf-8");
  console.log(`Using language: ${lang}`);

  const content = await readFile(`./wa-config/message-${lang}.txt`, "utf-8");
  const contactRaw = await readFile(`./wa-config/contact-${lang}.txt`, "utf-8");
  const contacts = contactRaw.split("\n").filter((d) => !!d.trim());

  const targetWindow = action_focusWindow("Google Chrome.app");

  async function action_copyText(text: string) {
    console.log(`Copying ${text} to clipboard...`);
    const pbcopy = execa("pbcopy");
    pbcopy.stdin.write(text);
    pbcopy.stdin.end();
  }

  async function action_findAndSelectContact(contact: string) {
    clickBoundary(config.contractSearchZone);
    await sleep(500);

    action_copyText(contact);
    await sleep(500);
    robot.keyTap("v", "command");
    await sleep(1_500, 200);

    // { x: 82, y: 313, color: '377e6a' }
    const isContactFound = robot.getPixelColor(82, 313) === "377e6a";
    // { x: 98, y: 314, color: '377e6a' }
    const isContactValid = robot.getPixelColor(98, 314) !== "377e6a";

    if (!isContactFound || !isContactValid) {
      throw new Error("Did not find contact");
    }

    // Click to select contact
    // clickBoundary(config.contactSelectZone);

    // Enter to select contact
    robot.keyTap("enter");

    await sleep(500);
  }

  async function action_findAndSelectContact_v2(contact: string) {
    robot.keyTap("k", "command");
    await sleep(1_500);

    action_copyText(contact);
    await sleep(500);
    robot.keyTap("v", "command");
    await sleep(2_000, 200);

    // TODO check if contact is valid
    // not { x: 590, y: 368, color: '0d141a' }
    // not { x: 606, y: 370, color: '377e6a' }
    // is { x: 517, y: 402, color: '2d3941' } Optional
    // is { x: 576, y: 370, color: '377e6a' }

    const isContactValid =
      robot.getPixelColor(576, 370) === "377e6a" &&
      robot.getPixelColor(590, 368) !== "0d141a" &&
      robot.getPixelColor(606, 370) !== "0d141a" &&
      robot.getPixelColor(606, 370) !== "377e6a";

    if (!isContactValid) {
      console.log("Did not find contact");
      robot.keyTap("escape");
      return false;
      // throw new Error("Did not find contact");
    }

    robot.keyTap("enter");

    return true;
  }

  // Input attachments
  async function action_inputAttachments() {
    // Select files (Finder)
    action_focusWindow("Finder.app");
    await sleep(400);

    // Select files (Manually)
    // robot.moveMouse(
    //   config.attachmentPositions[0][0].x,
    //   config.attachmentPositions[0][0].y
    // );
    // robot.mouseClick();
    // await sleep(100);

    // Copy files
    robot.keyTap("c", "command");

    // Focus chat window
    targetWindow.bringToTop();
    await sleep(100);

    // Paste files
    robot.keyTap("v", "command");
    await sleep(1_000);
  }

  // Input text
  async function action_inputText() {
    action_copyText(content);

    await sleep(500);
    // Paste text
    robot.keyTap("v", "command");
    await sleep(300);

    // Send message
    // robot.keyTap("enter");
    await sleep(500);
    robot.keyTap("escape");
    await sleep(500);

    // { x: 580, y: 397, color: '242e34' }
    console.log(robot.getPixelColor(580, 397));
    let isExited = robot.getPixelColor(580, 397) === "242e34";
    if (!isExited) {
      throw new Error("Did not exit chat");
    }
  }

  if (!contacts.length) {
    console.log("No contacts to send message to.");
    return;
  }

  // Start sending
  for (const i in contacts) {
    await sleep(1_000);
    const contact = contacts[i];
    console.log(`[${i}/${contacts.length}] Sending message to ${contact}...`);
    const isContactValid = await action_findAndSelectContact_v2(contact);
    if (!isContactValid) {
      continue;
    }
    await sleep(200);
    await action_inputAttachments();
    await sleep(200);
    await action_inputText();
  }
  console.log("Done!");
}
main();
