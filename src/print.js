"use strict";

const { ipcMain } = require("electron");
const { printPdfBlob } = require("./pdf-print");
const { store, getCurrentPrintStatusByName } = require("../tools/utils");
const db = require("../tools/database");

/**
 * @description: 初始化打印事件。当前版本仅保留 blob_pdf，不再创建隐藏 HTML 打印窗口。
 * @return {void}
 */
function setupPrintService() {
  initPrintEvent();
}

/**
 * @description: 执行 blob_pdf 打印任务（Socket 队列或 IPC 调用）
 * @return {Promise<void>}
 */
async function handlePrintData(data = {}) {
  const socket =
    data.clientType === "local"
      ? SOCKET_SERVER.sockets.sockets.get(data.socketId)
      : SOCKET_CLIENT;

  const printers = await MAIN_WINDOW.webContents.getPrintersAsync();
  let defaultPrinter = data.printer || store.get("defaultPrinter", "");
  const ENABLE_STATUS = [0, 512, 1024];
  let printerError = false;

  printers.forEach((element) => {
    if (element.isDefault && (defaultPrinter === "" || defaultPrinter == null)) {
      defaultPrinter = element.name;
    }
    if (
      process.platform === "win32" &&
      element.name === defaultPrinter &&
      !ENABLE_STATUS.includes(element.status)
    ) {
      printerError = true;
    }
  });

  const deviceName = defaultPrinter;
  const donePrintTask = () => {
    if (data.taskId && PRINT_RUNNER_DONE[data.taskId]) {
      PRINT_RUNNER_DONE[data.taskId]();
      delete PRINT_RUNNER_DONE[data.taskId];
    }
    MAIN_WINDOW?.webContents?.send("printTask", PRINT_RUNNER.isBusy());
  };

  const logPrintResult = (status, errorMessage = "") => {
    db.run(
      `INSERT INTO print_logs (socketId, clientType, printer, templateId, data, pageNum, status, errorMessage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        socket?.id,
        data.clientType,
        deviceName,
        data.templateId,
        JSON.stringify(data),
        data.pageNum,
        status,
        errorMessage,
      ],
      (err) => {
        if (err) console.error("Failed to log print result", err);
      },
    );
  };

  const emitError = (message) => {
    socket?.emit("error", {
      msg: message,
      templateId: data.templateId,
      replyId: data.replyId,
    });
  };

  const emitSuccess = () => {
    const result = {
      msg: "打印成功",
      templateId: data.templateId,
      replyId: data.replyId,
    };
    socket?.emit("successs", result);
    socket?.emit("success", result);
  };

  const fail = (printType, message) => {
    console.log(
      `${data.replyId ? "中转服务" : "插件端"} ${socket?.id} 模板 【${
        data.templateId
      }】 打印失败，打印类型 ${printType}，打印机：${deviceName}，原因：${message}`,
    );
    logPrintResult("failed", message);
    emitError(message);
    donePrintTask();
  };

  if (printerError) {
    const { StatusMsg } = getCurrentPrintStatusByName(defaultPrinter);
    fail("UNKNOWN", `${data.printer || defaultPrinter}打印机异常：${StatusMsg}`);
    return;
  }

  const type = `${data.type || ""}`.toLowerCase();

  if (type !== "blob_pdf") {
    fail("BLOB_PDF", "客户端仅支持 blob_pdf 打印方式");
    return;
  }

  const pdfBlob =
    data.pdf_blob ||
    data.pdfBlob ||
    data.pdf_base64 ||
    data.pdfBase64 ||
    data.pdfDataUri;
  delete data.pdf_blob;
  delete data.pdfBlob;
  delete data.pdf_base64;
  delete data.pdfBase64;
  delete data.pdfDataUri;

  if (!pdfBlob) {
    fail("BLOB_PDF", "blob_pdf类型打印缺少pdf_blob参数");
    return;
  }

  try {
    await printPdfBlob(pdfBlob, deviceName, data);
    console.log(
      `${data.replyId ? "中转服务" : "插件端"} ${socket?.id} 模板 【${
        data.templateId
      }】 打印成功，打印类型 BLOB_PDF，打印机：${deviceName}，页数：${
        data.pageNum
      }`,
    );
    logPrintResult("success");
    emitSuccess();
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    logPrintResult("failed", message);
    console.log(
      `${data.replyId ? "中转服务" : "插件端"} ${socket?.id} 模板 【${
        data.templateId
      }】 打印失败，打印类型 BLOB_PDF，打印机：${deviceName}，原因：${message}`,
    );
    emitError(message);
  } finally {
    donePrintTask();
  }
}


/**
 * @description: 绑定打印事件
 * @return {Void}
 */
function initPrintEvent() {
  global.PRINT_DIRECT_HANDLER = handlePrintData;
  ipcMain.on("do", async (event, data) => {
    await handlePrintData(data);
  });
}

module.exports = async () => {
  setupPrintService();
};
