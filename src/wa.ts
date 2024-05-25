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
  // { x: 11, y: 348 }
  // { x: 356, y: 412 }
  contactSelectZone: [
    { x: 11, y: 348 },
    { x: 356, y: 412 },
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

  const content = await readFile("./wa-config/message.txt", "utf-8");
  const contactRaw = await readFile("./wa-config/contact.txt", "utf-8");
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

    clickBoundary(config.contactSelectZone);
    await sleep(500);
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
    robot.keyTap("enter");
    await sleep(500);
    robot.keyTap("escape");
    await sleep(500);
  }

  if (!contacts.length) {
    console.log("No contacts to send message to.");
    return;
  }

  // Start sending
  for (const i in contacts) {
    const contact = contacts[i];
    console.log(`[${i}/${contacts.length}] Sending message to ${contact}...`);
    await action_findAndSelectContact(contact);
    await sleep(200);
    await action_inputAttachments();
    await sleep(200);
    await action_inputText();
    await sleep(500);
  }
  console.log("Done!");
}
main();
