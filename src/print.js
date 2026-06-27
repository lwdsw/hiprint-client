"use strict";

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { printPdf, printPdfBlob } = require("./pdf-print");
const { store, getCurrentPrintStatusByName } = require("../tools/utils");
const db = require("../tools/database");

/**
 * @description: 创建打印窗口
 * @return {BrowserWindow} PRINT_WINDOW 打印窗口
 */
async function createPrintWindow() {
  const windowOptions = {
    width: 100, // 窗口宽度
    height: 100, // 窗口高度
    show: false, // 不显示
    webPreferences: {
      contextIsolation: false, // 设置此项为false后，才可在渲染进程中使用electron api
      nodeIntegration: true,
    },
    // 为窗口设置背景色可能优化字体模糊问题
    // https://www.electronjs.org/zh/docs/latest/faq#文字看起来很模糊这是什么原因造成的怎么解决这个问题呢
    backgroundColor: "#fff",
  };

  // 创建打印窗口
  PRINT_WINDOW = new BrowserWindow(windowOptions);

  // 加载打印渲染进程页面
  let printHtml = path.join("file://", app.getAppPath(), "/assets/print.html");
  PRINT_WINDOW.webContents.loadURL(printHtml);

  // 未打包时打开开发者工具
  // if (!app.isPackaged) {
  //   PRINT_WINDOW.webContents.openDevTools();
  // }

  // 绑定窗口事件
  initPrintEvent();

  return PRINT_WINDOW;
}

/**
 * @description: 执行打印任务（主进程直接调用或渲染窗口 IPC 调用）
 * @return {Promise<void>}
 */
async function handlePrintData(data = {}) {
  const socket =
    data.clientType === "local"
      ? SOCKET_SERVER.sockets.sockets.get(data.socketId)
      : SOCKET_CLIENT;

  const printers = await PRINT_WINDOW.webContents.getPrintersAsync();
  let defaultPrinter = data.printer || store.get("defaultPrinter", "");
  const ENABLE_STATUS = process.platform === "win32" ? [0, 512, 1024] : [3];
  let printerError = false;

  printers.forEach((element) => {
    if (element.isDefault && (defaultPrinter === "" || defaultPrinter == null)) {
      defaultPrinter = element.name;
    }
    if (element.name === defaultPrinter && !ENABLE_STATUS.includes(element.status)) {
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
      `INSERT INTO print_logs (socketId, clientType, printer, templateId, data, pageNum, status, rePrintAble, errorMessage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        socket?.id,
        data.clientType,
        deviceName,
        data.templateId,
        JSON.stringify(data),
        data.pageNum,
        status,
        data.rePrintAble ?? 1,
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

  if (data.pdfGenerateError) {
    fail("HTML_BLOB_PDF", data.pdfGenerateError);
    return;
  }

  const type = `${data.type || ""}`.toLowerCase();

  if (type === "blob_pdf") {
    const pdfBlob = data.pdf_blob;
    delete data.pdf_blob;
    const printType = data.pdfGeneratedBy === "html" ? "HTML_BLOB_PDF" : "BLOB_PDF";

    if (!pdfBlob) {
      fail(printType, "blob_pdf类型打印缺少pdf_blob参数");
      return;
    }

    try {
      await printPdfBlob(pdfBlob, deviceName, data);
      console.log(
        `${data.replyId ? "中转服务" : "插件端"} ${socket?.id} 模板 【${
          data.templateId
        }】 打印成功，打印类型 ${printType}，打印机：${deviceName}，页数：${
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
        }】 打印失败，打印类型 ${printType}，打印机：${deviceName}，原因：${message}`,
      );
      emitError(message);
    } finally {
      donePrintTask();
    }
    return;
  }

  if (type === "url_pdf") {
    const pdfPath = data.pdf_path;
    if (!pdfPath) {
      fail("URL_PDF", "url_pdf类型打印缺少pdf_path参数");
      return;
    }

    try {
      await printPdf(pdfPath, deviceName, data);
      console.log(
        `${data.replyId ? "中转服务" : "插件端"} ${socket?.id} 模板 【${
          data.templateId
        }】 打印成功，打印类型：URL_PDF，打印机：${deviceName}，页数：${
          data.pageNum
        }`,
      );
      logPrintResult("success");
      checkPrinterStatus(deviceName, emitSuccess);
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      console.log(
        `${data.replyId ? "中转服务" : "插件端"} ${socket?.id} 模板 【${
          data.templateId
        }】 打印失败，打印类型：URL_PDF，打印机：${deviceName}，原因：${message}`,
      );
      logPrintResult("failed", message);
      emitError(`打印失败: ${message}`);
    } finally {
      donePrintTask();
    }
    return;
  }

  fail(
    "HTML_BLOB_PDF",
    "客户端已禁用 Chromium PDF 排版，请先在隐藏打印窗口中用 jsPDF 生成 blob_pdf",
  );
}

/**
 * @description: 绑定打印窗口事件
 * @return {Void}
 */
function initPrintEvent() {
  global.PRINT_DIRECT_HANDLER = handlePrintData;
  ipcMain.on("do", async (event, data) => {
    await handlePrintData(data);
  });
}

function checkPrinterStatus(deviceName, callback) {
  const intervalId = setInterval(() => {
    PRINT_WINDOW.webContents
      .getPrintersAsync()
      .then((printers) => {
        const printer = printers.find((printer) => printer.name === deviceName);
        console.log(`current printer: ${JSON.stringify(printer)}`);
        // todo: 打印机状态对照表，根据打印机状态判断是否支持打印
        // win32: https://learn.microsoft.com/en-us/windows/win32/printdocs/printer-info-2
        // cups: https://www.cups.org/doc/cupspm.html#ipp_status_e
        const ENABLE_STATUS =
          process.platform === "win32" ? [0, 512, 1024] : [3];
        if (printer && ENABLE_STATUS.includes(printer.status)) {
          callback && callback();
          clearInterval(intervalId); // Stop polling when status is 0
          console.log(
            `Printer ${deviceName} is now ready (status: ${printer.status})`,
          );
          // You can add any additional logic here for when the printer is ready
        }
      })
      .catch((error) => {
        clearInterval(intervalId); // Also clear interval on error
        console.log(`Error checking printer status: ${error}`);
      });
  }, 1000); // Check every 1 second (adjust interval as needed)

  return intervalId; // Return the interval ID in case you need to cancel it externally
}

module.exports = async () => {
  // 创建打印窗口
  await createPrintWindow();
};
