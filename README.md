# ArcoPrint

<div align="center">

![logo](./build/icons/100x100.png)

</div>

ArcoPrint 是一个本地静默打印客户端。它在本机启动 socket.io 服务，供网页或业务系统连接后下发 HTML、PDF、模板数据等打印任务。

## 功能

- 本地打印服务，默认端口 `17521`
- 支持 HTML、PDF、图片渲染与打印任务
- 支持默认打印机、端口、TOKEN、中转服务、日志路径等设置
- 支持 Windows、macOS、Linux 打包
- 支持通过 `hiprint://` 协议唤起客户端

## 本地调试

```shell
git clone https://github.com/lwdsw/arcoprint.git
cd arcoprint
npm install
npm run start
```

## 打包

```shell
# Windows x64
npm run build-w-64

# macOS universal
npm run build-m-universal

# Linux x64
npm run build-l
```

构建产物会输出到 `out/` 目录。

## 连接客户端

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:17521", {
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("ArcoPrint connected");
});

socket.on("clientInfo", (info) => {
  console.log(info);
});

socket.on("printerList", (printers) => {
  console.log(printers);
});
```

## 发送打印任务

```js
socket.emit("news", {
  html: "<html><body>hello ArcoPrint</body></html>",
  templateId: "demo",
  printer: "",
  pageSize: "A4",
});
```

## 常用事件

| 事件名 | 方向 | 说明 |
| --- | --- | --- |
| `clientInfo` | 客户端 -> 网页 | 返回客户端版本、设备、地址等信息 |
| `printerList` | 客户端 -> 网页 | 返回可用打印机列表 |
| `getClientInfo` | 网页 -> 客户端 | 主动获取客户端信息 |
| `refreshPrinterList` | 网页 -> 客户端 | 主动刷新打印机列表 |
| `news` | 网页 -> 客户端 | 下发打印任务 |
| `success` | 客户端 -> 网页 | 打印任务成功 |
| `error` | 客户端 -> 网页 | 打印任务失败 |

## 配置

ArcoPrint 使用本地配置保存运行参数。常见字段包括：

| 字段名 | 说明 |
| --- | --- |
| `mainTitle` | 主窗口标题，默认 `ArcoPrint` |
| `nickName` | 设备别名 |
| `openAtLogin` | 系统登录时启动 |
| `openAsHidden` | 启动时隐藏窗口 |
| `connectTransit` | 是否连接中转服务 |
| `port` | 本地服务端口，默认 `17521` |
| `token` | 身份验证令牌 |
| `transitUrl` | 中转服务地址 |
| `transitToken` | 中转服务令牌 |
| `closeType` | 主窗口关闭行为，`tray` 或 `quit` |
| `logPath` | 日志路径 |
| `pdfPath` | 临时 PDF 路径 |
| `defaultPrinter` | 默认打印机 |
| `disabledGpu` | 是否禁用 GPU |
| `rePrint` | 是否允许重打 |

## 协议唤起

安装后可通过浏览器打开协议地址唤起客户端：

```js
window.open("hiprint://");
```

协议名暂时保留为 `hiprint://`，用于兼容已有网页集成。
