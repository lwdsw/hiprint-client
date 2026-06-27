/*
 * @Description: pdf打印
 * @Author: ArcoStudio
 * @Github: https://github.com/lwdsw
 * @Date: 2023-04-21 16:35:07
 * @LastEditors: JZT.吴健
 * @LastEditTime: 2025-09-26 14:10:48
 */
const pdfPrint1 = require("pdf-to-printer");
const pdfPrint2 = require("unix-print");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { store } = require("../tools/utils");
const dayjs = require("dayjs");
const { v7: uuidv7 } = require("uuid");

const printPdfFunction =
  process.platform === "win32" ? pdfPrint1.print : pdfPrint2.print;

const normalizeMediaName = (pageSize) => {
  if (typeof pageSize !== "string") return "";
  const value = pageSize.trim().toLowerCase();
  if (value === "a4") return "A4";
  if (value === "letter") return "Letter";
  return "";
};

const getUnixPrintOptions = (data = {}) => {
  const options = Array.isArray(data.unixPrintOptions)
    ? [...data.unixPrintOptions]
    : [];
  const hasMediaOption = options.some((option) =>
    /(^|\s)(media|PageSize)=/i.test(option),
  );
  const media = normalizeMediaName(data.pageSize) || "A4";
  if (!hasMediaOption && media) {
    options.push(`-o media=${media}`);
  }
  return options;
};

const realPrint = (pdfPath, printer, data, resolve, reject) => {
  if (!fs.existsSync(pdfPath)) {
    reject({ path: pdfPath, msg: "file not found" });
    return;
  }

  if (process.platform === "win32") {
    data = Object.assign({}, data);
    data.printer = printer;
    console.log("print pdf:" + pdfPath + JSON.stringify(data));
    const pdfOptions = Object.assign(data, { paperSize: data.paperName });
    printPdfFunction(pdfPath, pdfOptions)
      .then(resolve)
      .catch(reject);
  } else {
    printPdfFunction(pdfPath, printer, getUnixPrintOptions(data))
      .then(resolve)
      .catch(reject);
  }
};

const normalizePdfBlobToBuffer = (pdfBlob) => {
  if (!pdfBlob) return null;
  if (Buffer.isBuffer(pdfBlob)) return pdfBlob;
  if (pdfBlob instanceof Uint8Array) {
    return Buffer.from(pdfBlob.buffer, pdfBlob.byteOffset, pdfBlob.byteLength);
  }
  if (pdfBlob instanceof ArrayBuffer) {
    return Buffer.from(pdfBlob);
  }
  if (Array.isArray(pdfBlob)) {
    return Buffer.from(pdfBlob);
  }
  if (typeof pdfBlob === "string") {
    const base64 = pdfBlob.includes(",") ? pdfBlob.split(",").pop() : pdfBlob;
    return Buffer.from(`${base64 || ""}`.replace(/\s/g, ""), "base64");
  }
  if (pdfBlob.type === "Buffer" && Array.isArray(pdfBlob.data)) {
    return Buffer.from(pdfBlob.data);
  }
  if (pdfBlob.data && Array.isArray(pdfBlob.data)) {
    return Buffer.from(pdfBlob.data);
  }
  return null;
};

/**
 * @description: 打印Blob类型的PDF数据
 * @param {Blob|Uint8Array|Buffer|string} pdfBlob PDF的二进制数据/base64/dataUri
 * @param {string} printer 打印机名称
 * @param {object} data 打印参数
 * @return {Promise}
 */
const printPdfBlob = (pdfBlob, printer, data) => {
  return new Promise((resolve, reject) => {
    try {
      const buffer = normalizePdfBlobToBuffer(pdfBlob);
      if (!buffer || buffer.length === 0) {
        reject(new Error("pdfBlob must be a Uint8Array, Buffer, ArrayBuffer or base64 string"));
        return;
      }

      const toSavePath = path.join(
        store.get("pdfPath") || os.tmpdir(),
        "blob_pdf",
        dayjs().format(`YYYY_MM_DD HH_mm_ss_`) + `${uuidv7()}.pdf`,
      );

      fs.mkdirSync(path.dirname(toSavePath), { recursive: true });

      fs.writeFile(toSavePath, buffer, (err) => {
        if (err) {
          console.log("save blob pdf error:" + err?.message);
          reject(err);
          return;
        }

        console.log("blob pdf saved:" + toSavePath);
        realPrint(toSavePath, printer, data, resolve, reject);
      });
    } catch (error) {
      console.log("print blob error:" + error?.message);
      reject(error);
    }
  });
};

module.exports = {
  printPdfBlob,
};
