const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const SUMATRA_VERSION = "3.6.1";
const SUMATRA_FILE_NAME = `SumatraPDF-${SUMATRA_VERSION}-32.exe`;

function getSumatraPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "windows", SUMATRA_FILE_NAME)
    : path.join(__dirname, "..", "..", "vendor", "windows", SUMATRA_FILE_NAME);
}

function getPrintSettings(data) {
  const paperName =
    typeof data.paperName === "string" ? data.paperName.trim() : "";
  return [
    "disable-auto-rotation",
    "noscale",
    `paper=${paperName || "auto"}`,
    `${data.copies}x`,
  ];
}

function printWindowsPdf(pdfPath, printer, data) {
  const sumatraPath = getSumatraPath();
  if (!fs.existsSync(sumatraPath)) {
    return Promise.reject(
      new Error(`SumatraPDF ${SUMATRA_VERSION} not found: ${sumatraPath}`),
    );
  }

  const args = [
    "-print-to",
    printer,
    "-print-settings",
    getPrintSettings(data).join(","),
    "-silent",
    pdfPath,
  ];

  console.log(
    "windows print command:" +
      JSON.stringify({
        executable: sumatraPath,
        args,
        templateId: data.templateId,
      }),
  );

  return new Promise((resolve, reject) => {
    childProcess.execFile(
      sumatraPath,
      args,
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const detail = `${stderr || stdout || error.message}`.trim();
          reject(new Error(`SumatraPDF print failed: ${detail}`));
          return;
        }
        resolve();
      },
    );
  });
}

module.exports = {
  printWindowsPdf,
};
