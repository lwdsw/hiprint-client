var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function(exports) {
  "use strict";
  function getJQuery$1() {
    const jq = typeof window !== "undefined" ? window.$ ?? window.jQuery : void 0;
    if (!jq) throw new Error("运行时依赖缺失：jQuery global `$` is required by hinnn.form.serialize");
    return jq;
  }
  function underscoreNow() {
    const underscore = typeof globalThis !== "undefined" ? globalThis._ : void 0;
    if (!underscore) throw new Error("运行时依赖缺失：global `_` with now() is required by hinnn.throttle/debounce");
    return underscore.now();
  }
  const RMB_DIGITS = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
  const RMB_UNITS = ["", "拾", "佰", "仟"];
  const RMB_SECTION_UNITS = ["", "万", "亿", "兆"];
  function normalizeDateValue(value) {
    if (value == null || value === "") return void 0;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? void 0 : value;
    if (typeof value === "number") {
      const date2 = new Date(value);
      return Number.isNaN(date2.getTime()) ? void 0 : date2;
    }
    const text = value.trim();
    const dateTimeMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/);
    if (dateTimeMatch) {
      const [, year, month, day, hour = "0", minute = "0", second = "0"] = dateTimeMatch;
      const date2 = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
      return Number.isNaN(date2.getTime()) ? void 0 : date2;
    }
    const timeMatch = text.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (timeMatch) {
      const [, hour, minute, second = "0"] = timeMatch;
      const date2 = new Date(1970, 0, 1, Number(hour), Number(minute), Number(second));
      return Number.isNaN(date2.getTime()) ? void 0 : date2;
    }
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? void 0 : date;
  }
  function addOneToIntegerString(value) {
    const digits = value.split("");
    let carry = 1;
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      const next = Number(digits[index]) + carry;
      digits[index] = String(next % 10);
      carry = next >= 10 ? 1 : 0;
      if (!carry) break;
    }
    if (carry) digits.unshift("1");
    return digits.join("");
  }
  function normalizeRmbAmount(value) {
    if (value == null || value === "") return void 0;
    const raw = String(value).trim().replace(/[￥¥,\s]/g, "").replace(/整$/, "").replace(/[元圆]$/, "");
    const match = raw.match(/^([+-])?(\d+)(?:\.(\d*))?$/);
    if (!match) return void 0;
    const negative = match[1] === "-";
    let integer = match[2].replace(/^0+(?=\d)/, "") || "0";
    const decimal = match[3] || "";
    let cents = Number((decimal + "00").slice(0, 2));
    if (Number((decimal + "000")[2]) >= 5) cents += 1;
    if (cents >= 100) {
      integer = addOneToIntegerString(integer);
      cents -= 100;
    }
    return { negative, integer, cents };
  }
  function sectionToChinese(section) {
    const number = Number(section);
    if (!number) return "";
    let result = "";
    let zeroPending = false;
    let rest = number;
    for (let unitIndex = 0; rest > 0; unitIndex += 1) {
      const digit = rest % 10;
      if (digit === 0) {
        if (result) zeroPending = true;
      } else {
        result = `${RMB_DIGITS[digit]}${RMB_UNITS[unitIndex]}${zeroPending ? "零" : ""}${result}`;
        zeroPending = false;
      }
      rest = Math.floor(rest / 10);
    }
    return result;
  }
  function integerToChinese(integer) {
    if (!integer || /^0+$/.test(integer)) return RMB_DIGITS[0];
    const sections = [];
    for (let index = integer.length; index > 0; index -= 4) {
      sections.unshift(integer.slice(Math.max(0, index - 4), index));
    }
    let result = "";
    let zeroPending = false;
    sections.forEach((section, index) => {
      const sectionNumber = Number(section);
      const unitIndex = sections.length - index - 1;
      if (!sectionNumber) {
        if (result) zeroPending = true;
        return;
      }
      const needsInnerZero = result && sectionNumber < 1e3;
      const prefix = zeroPending || needsInnerZero ? RMB_DIGITS[0] : "";
      result += `${prefix}${sectionToChinese(section)}${RMB_SECTION_UNITS[unitIndex] || ""}`;
      zeroPending = false;
    });
    return result || RMB_DIGITS[0];
  }
  function createEventBus() {
    const listeners = {};
    return {
      id: 0,
      on(name, listener) {
        listeners[name] || (listeners[name] = []);
        listeners[name].push(listener);
      },
      off(name, listener) {
        const bucket = listeners[name];
        if (!bucket) return;
        let index = -1;
        for (let i = 0; i < bucket.length; i += 1) {
          if (bucket[i] === listener) {
            index = i;
            break;
          }
        }
        if (index >= 0) listeners[name].splice(index, 1);
      },
      trigger(name, ...args) {
        const bucket = listeners[name];
        if (!(bucket == null ? void 0 : bucket.length)) return;
        for (let i = 0; i < bucket.length; i += 1) bucket[i].apply(this, args);
      },
      clear(name) {
        listeners[name] = [];
      },
      getId() {
        this.id += 1;
        return this.id;
      },
      getNameWithId(name) {
        return `${name}-${this.getId()}`;
      }
    };
  }
  function createDpiProbe() {
    return {
      dpi: 0,
      getDpi() {
        if (!this.dpi) {
          const probe = document.createElement("DIV");
          probe.style.cssText = "width:1in;height:1in;position:absolute;left:0px;top:0px;z-index:99;visibility:hidden";
          document.body.appendChild(probe);
          this.dpi = probe.offsetHeight;
        }
        return this.dpi;
      }
    };
  }
  const ptProbe = createDpiProbe();
  const pxProbe = createDpiProbe();
  const hinnn = {
    event: createEventBus(),
    /**
     * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    form: {
      serialize(target) {
        const $2 = getJQuery$1();
        const serialized = $2(target).serializeArray();
        const result = {};
        $2.each(serialized, function eachSerializedField() {
          const existing = result[this.name];
          if (existing) {
            if (Object.prototype.toString.call(existing) === "[object Array]") existing.push(this.value);
            else result[this.name] = [existing, this.value];
          } else {
            result[this.name] = this.value;
          }
        });
        return result;
      }
    },
    /**
     * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    pt: {
      get dpi() {
        return ptProbe.dpi;
      },
      set dpi(value) {
        ptProbe.dpi = value;
      },
      toPx(value) {
        return value * (this.getDpi() / 72);
      },
      getDpi() {
        return ptProbe.getDpi();
      }
    },
    /**
     * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    px: {
      get dpi() {
        return pxProbe.dpi;
      },
      set dpi(value) {
        pxProbe.dpi = value;
      },
      toPt(value) {
        return value * (72 / this.getDpi());
      },
      getDpi() {
        return pxProbe.getDpi();
      }
    },
    /**
     * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    mm: {
      toPt(value) {
        return 72 / 25.4 * value;
      },
      toPx(value) {
        return hinnn.pt.toPx(hinnn.mm.toPt(value));
      }
    },
    /**
     * 中文说明：创建节流函数，限制拖拽、缩放等高频交互回调的执行频率。
     */
    throttle(fn, wait, options2 = {}) {
      let context;
      let args;
      let result;
      let timeout = null;
      let previous = 0;
      const later = () => {
        previous = options2.leading === false ? 0 : underscoreNow();
        timeout = null;
        result = fn.apply(context, args ?? []);
        if (!timeout) {
          context = null;
          args = void 0;
        }
      };
      return function throttled(...nextArgs) {
        const now = underscoreNow();
        if (!previous && options2.leading === false) previous = now;
        const remaining = wait - (now - previous);
        context = this;
        args = nextArgs;
        if (remaining <= 0 || remaining > wait) {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
          previous = now;
          result = fn.apply(context, args);
          if (!timeout) {
            context = null;
            args = void 0;
          }
        } else if (!timeout && options2.trailing !== false) {
          timeout = setTimeout(later, remaining);
        }
        return result;
      };
    },
    /**
     * 中文说明：创建防抖函数，合并连续触发的设计器或工具回调。
     */
    debounce(fn, wait, immediate) {
      let timeout;
      let args;
      let context;
      let timestamp = 0;
      let result;
      const later = () => {
        const last = underscoreNow() - timestamp;
        if (last < wait && last >= 0) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) {
            result = fn.apply(context, args ?? []);
            if (!timeout) {
              context = null;
              args = void 0;
            }
          }
        }
      };
      return function debounced(...nextArgs) {
        context = this;
        args = nextArgs;
        timestamp = underscoreNow();
        const callNow = immediate && !timeout;
        if (!timeout) timeout = setTimeout(later, wait);
        if (callNow) {
          result = fn.apply(context, args);
          context = null;
          args = void 0;
        }
        return result;
      };
    },
    /**
     * 中文说明：把字符串编码为 UTF-8 字节序列，支撑二维码或条码内容编码。
     */
    toUtf8(value) {
      let output = "";
      for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        if (code >= 1 && code <= 127) output += value.charAt(index);
        else if (code > 2047) {
          output += String.fromCharCode(224 | code >> 12 & 15);
          output += String.fromCharCode(128 | code >> 6 & 63);
          output += String.fromCharCode(128 | code >> 0 & 63);
        } else {
          output += String.fromCharCode(192 | code >> 6 & 31);
          output += String.fromCharCode(128 | code >> 0 & 63);
        }
      }
      return output;
    },
    /**
     * 中文说明：按字段对数组分组，供打印数据整理和表格分组渲染使用。
     */
    groupBy(rows, fields, keyFn) {
      const groups = {};
      rows.forEach((row) => {
        const key = JSON.stringify(keyFn(row));
        if (!groups[key]) {
          groups[key] = { rows: [] };
          fields.forEach((field) => {
            groups[key][field] = row[field];
          });
        }
        groups[key].rows.push(row);
      });
      return Object.keys(groups).map((key) => groups[key]);
    },
    /**
     * 中文说明：按指定字段排序数组，辅助打印数据在渲染前保持稳定顺序。
     */
    orderBy(rows, getter) {
      if (rows.length <= 1) return rows;
      const middle = Math.floor(rows.length / 2);
      const pivot = rows.splice(middle, 1)[0];
      const left = [];
      const right = [];
      for (const row of rows) {
        if (getter(row) < getter(pivot)) left.push(row);
        else right.push(row);
      }
      return this.orderBy(left, getter).concat([pivot], this.orderBy(right, getter));
    },
    /**
     * 中文说明：按格式化模板输出日期字符串，供文本和表格字段显示使用。
     */
    dateFormat(value, format) {
      const date = normalizeDateValue(value);
      if (!date) return "";
      try {
        const parts = {
          "M+": date.getMonth() + 1,
          "d+": date.getDate(),
          "H+": date.getHours(),
          "m+": date.getMinutes(),
          "s+": date.getSeconds(),
          "q+": Math.floor((date.getMonth() + 3) / 3),
          S: date.getMilliseconds()
        };
        if (/(y+)/.test(format)) format = format.replace(RegExp.$1, `${date.getFullYear()}`.substr(4 - RegExp.$1.length));
        for (const key in parts) {
          if (new RegExp(`(${key})`).test(format)) {
            const text = `${parts[key]}`;
            format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? parts[key].toString() : `00${text}`.substr(text.length));
          }
        }
        return format;
      } catch (error) {
        console.log(error);
        return "";
      }
    },
    rmbUppercase(value) {
      const amount = normalizeRmbAmount(value);
      if (!amount) return "";
      const integerText = `${integerToChinese(amount.integer)}元`;
      const jiao = Math.floor(amount.cents / 10);
      const fen = amount.cents % 10;
      let decimalText = "";
      if (jiao) decimalText += `${RMB_DIGITS[jiao]}角`;
      if (fen) decimalText += `${jiao ? "" : RMB_DIGITS[0]}${RMB_DIGITS[fen]}分`;
      return `${amount.negative ? "负" : ""}${integerText}${decimalText || "整"}`;
    }
  };
  if (typeof window !== "undefined") {
    window.hinnn = hinnn;
  }
  class Rect {
    constructor(rect) {
      __publicField(this, "x");
      __publicField(this, "y");
      __publicField(this, "height");
      __publicField(this, "width");
      this.x = rect.x;
      this.y = rect.y;
      this.height = rect.height;
      this.width = rect.width;
    }
  }
  class SelectionRect {
    constructor(rect) {
      __publicField(this, "rect");
      __publicField(this, "changed");
      this.rect = rect;
    }
  }
  class SelectedCell {
    constructor(rowIndex, cell) {
      __publicField(this, "rowIndex");
      __publicField(this, "cell");
      this.rowIndex = rowIndex;
      this.cell = cell;
    }
  }
  function mergeRect(first, second) {
    const x = Math.min(first.x, second.x);
    const y = Math.min(first.y, second.y);
    return new Rect({
      x,
      y,
      height: Math.max(first.y + first.height, second.y + second.height) - y,
      width: Math.max(first.x + first.width, second.x + second.width) - x
    });
  }
  class TableCellSelector {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(rows, tableTatget) {
      __publicField(this, "selectedCells");
      __publicField(this, "rows");
      __publicField(this, "tableTatget");
      __publicField(this, "startCell");
      this.selectedCells = [];
      this.rows = rows;
      this.tableTatget = tableTatget;
    }
    /**
     * 中文说明：清空表格单元格选择状态，并移除设计器中的选中样式。
     */
    clear() {
      this.tableTatget.find("td").removeClass("selected");
    }
    /**
     * 中文说明：设置single select，同步表格设计器配置并影响后续显示或打印结果。
     */
    setSingleSelect(cell) {
      this.startCell = cell;
      this.selectedCells = [];
    }
    /**
     * 中文说明：读取single select，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getSingleSelect() {
      if (this.selectedCells.length) {
        if (this.selectedCells.length === 1) return this.selectedCells[0].length === 1 ? this.selectedCells[0][0] : void 0;
        if (this.selectedCells.length > 1) return void 0;
      }
      return this.startCell;
    }
    /**
     * 中文说明：根据鼠标坐标定位并单选表格单元格。
     */
    singleSelectByXY(x, y) {
      const cell = this.getCellByXY(x, y);
      if (cell) {
        this.clear();
        cell.cell.select();
        this.startCell = cell;
        this.selectedCells = [];
      }
    }
    /**
     * 中文说明：根据鼠标拖拽坐标扩展表格单元格多选区域。
     */
    multipleSelectByXY(x, y) {
      this.clear();
      const selectedCells = [];
      if (this.startCell) {
        const cell = this.getCellByXY(x, y);
        if (cell) {
          const rect = mergeRect(this.startCell.cell.getTableRect(), cell.cell.getTableRect());
          this.selectByRect(new SelectionRect(rect), selectedCells);
        }
      }
      this.selectedCells = selectedCells;
    }
    /**
     * 中文说明：按矩形区域选择被框选的表格单元格。
     */
    selectByRect(rectState, selectedCells) {
      this.rows.forEach((row, rowIndex) => {
        const rowSelectedCells = [];
        row.columns.forEach((cell) => {
          if (cell.isInRect(rectState)) {
            rowSelectedCells.push(new SelectedCell(rowIndex, cell));
            cell.select();
          }
        });
        if (rowSelectedCells.length) selectedCells.push(rowSelectedCells);
      });
      if (rectState.changed) {
        rectState.changed = false;
        selectedCells.splice(0, selectedCells.length);
        this.selectByRect(rectState, selectedCells);
      }
    }
    /**
     * 中文说明：读取selected cells，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getSelectedCells() {
      return this.selectedCells;
    }
    /**
     * 中文说明：读取cell by xy，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getCellByXY(x, y) {
      let selectedCell;
      this.rows.forEach((row, rowIndex) => {
        const cells = row.columns.filter((cell) => cell.isXYinCell(x, y));
        if (cells.length) selectedCell = new SelectedCell(rowIndex, cells[0]);
      });
      return selectedCell;
    }
  }
  class Geometry {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
    }
    /**
     * 中文说明：合并rect，把当前选区转换为单个表格单元格结构。
     */
    static mergeRect(first, second) {
      const x = Math.min(first.x, second.x);
      const y = Math.min(first.y, second.y);
      return new Rect({
        x,
        y,
        height: Math.max(first.y + first.height, second.y + second.height) - y,
        width: Math.max(first.x + first.width, second.x + second.width) - x
      });
    }
    /**
     * 中文说明：创建矩形几何对象，用于表格或元素选区的碰撞与包含判断。
     */
    static Rect(x1, y1, x2, y2) {
      return {
        minX: x1 < x2 ? x1 : x2,
        minY: y1 < y2 ? y1 : y2,
        maxX: x1 < x2 ? x2 : x1,
        maxY: y1 < y2 ? y2 : y1
      };
    }
  }
  class TableIdGenerator {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
    }
    /**
     * 中文说明：创建id，供表格设计器在设计器或打印渲染流程中使用。
     */
    static createId() {
      this.id += 1;
      return this.id;
    }
  }
  /**
   * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
   */
  __publicField(TableIdGenerator, "id", 1);
  const TableTextEditor = function TableTextEditor2() {
  };
  TableTextEditor.prototype.init = function init2(cell) {
    this.target = $('<input type="text" class="hitable-editor-text" value="" />');
    cell.getTarget().append(this.target);
    this.target.focus();
  };
  TableTextEditor.prototype.getValue = function getValue() {
    return this.target.val();
  };
  TableTextEditor.prototype.setValue = function setValue(value) {
    this.target.val(value);
  };
  TableTextEditor.prototype.destroy = function destroy() {
    this.target.remove();
  };
  class TableEditorRegistry {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
      __publicField(this, "text");
      this.text = new TableTextEditor();
    }
  }
  __publicField(TableEditorRegistry, "_instance");
  Object.defineProperty(TableEditorRegistry, "Instance", {
    /**
     * 中文说明：读取get，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    get: function get() {
      return TableEditorRegistry._instance || (TableEditorRegistry._instance = new TableEditorRegistry()), TableEditorRegistry._instance;
    },
    enumerable: true,
    configurable: true
  });
  class TableEditorFactory {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
    }
    /**
     * 中文说明：创建editor，供表格设计器在设计器或打印渲染流程中使用。
     */
    createEditor(editorName) {
      return $.extend({}, TableEditorRegistry.Instance[editorName]);
    }
  }
  __publicField(TableEditorFactory, "_instance");
  Object.defineProperty(TableEditorFactory, "Instance", {
    /**
     * 中文说明：读取表格编辑器工厂单例，首次访问时创建。
     */
    get: function get2() {
      return TableEditorRegistry._instance || (TableEditorFactory._instance = new TableEditorFactory()), TableEditorFactory._instance;
    },
    enumerable: true,
    configurable: true
  });
  class HeaderCellInnerEditor {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
    }
    /**
     * 中文说明：初始化表格设计器实例，绑定默认配置、DOM 结构和必要的交互事件。
     */
    init(cell, tableOptions) {
      this.tableOptions = tableOptions;
      this.title = cell.title;
      this.field = cell.field;
      cell.getTarget().unbind("dblclick.hitable");
    }
    /**
     * 中文说明：读取display html，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getDisplayHtml() {
      return this.title;
    }
    /**
     * 中文说明：进入表格单元格编辑状态，把单元格内容交给内联编辑器处理。
     */
    beginEdit(cell) {
      const self = this;
      this.editor = TableEditorFactory.Instance.createEditor("text");
      cell.getTarget().html("");
      this.editor.init(cell);
      if (this.title || this.field) {
        this.editor.setValue(this.title || "");
      }
      $(this.editor.target).keydown(
        /** 中文说明：监听回车键并结束当前单元格编辑，把输入内容写回表格。 */
        function(event) {
          if (event.keyCode == 13) self.endEdit(cell);
        }
      );
      $(this.editor.target).blur(
        /** 中文说明：编辑器失焦时结束编辑并写回单元格内容。 */
        function(_event) {
          self.endEdit(cell);
        }
      );
      if (this.tableOptions.editingCell && this.tableOptions.editingCell.id != cell.id) {
        this.tableOptions.editingCell.innerElement.endEdit(this.tableOptions.editingCell);
      }
      this.tableOptions.editingCell = cell;
    }
    /**
     * 中文说明：结束表格单元格编辑，把编辑器内容写回单元格并同步 DOM。
     */
    endEdit(cell) {
      const value = this.editor.getValue();
      if (value) {
        cell.title = this.title = value;
      } else {
        cell.title = this.title = "";
      }
      this.editor.destroy();
      cell.getTarget().html(this.title);
    }
  }
  const ADJACENT_BORDER_OVERLAP_TOLERANCE = 2;
  function getOverlapSize(first, second) {
    return {
      width: Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x),
      height: Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y)
    };
  }
  class TableCellEntity {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(cell) {
      this.title = cell.title;
      this.field = cell.field;
      this.dataBinding = cell.dataBinding;
      this.dataType = cell.dataType;
      this.format = cell.format;
      this.textType = cell.textType;
      this.summaryAggregate = cell.summaryAggregate;
      this.summaryValueType = cell.summaryValueType;
      this.summaryLabel = cell.summaryLabel;
      this.barcodeMode = cell.barcodeMode;
      this.renderWidth = cell.renderWidth;
      this.renderHeight = cell.renderHeight;
      this.paddingTop = cell.paddingTop;
      this.paddingLeft = cell.paddingLeft;
      this.paddingRight = cell.paddingRight;
      this.paddingBottom = cell.paddingBottom;
      this.width = cell.width;
      this.align = cell.align;
      this.halign = cell.halign;
      this.vAlign = cell.vAlign;
      this.colspan = cell.colspan;
      this.rowspan = cell.rowspan;
      this.checked = cell.checked;
      this.formatter2 = cell.formatter2;
      this.styler2 = cell.styler2;
    }
  }
  class TableCell {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
      this.id = TableIdGenerator.createId();
    }
    /**
     * 中文说明：初始化表格设计器实例，绑定默认配置、DOM 结构和必要的交互事件。
     */
    init(target, tableOptions, rowId, isHead) {
      this.isHead = isHead;
      this.rowId = rowId;
      this.isEditing = false;
      const numericPattern = /^[0-9]*$/;
      this.target = target;
      this.tableOptions = tableOptions;
      const colspan = this.target.attr("colspan");
      this.colspan = numericPattern.test(colspan) ? parseInt(colspan) : 1;
      const rowspan = this.target.attr("rowspan");
      this.rowspan = numericPattern.test(rowspan) ? parseInt(rowspan) : 1;
      this.initEvent();
      if (this.isHead) this.initInnerEelement();
    }
    /**
     * 中文说明：进入表格单元格编辑状态，把单元格内容交给内联编辑器处理。
     */
    beginEdit() {
      if (!this.isEditing && this.tableOptions.isEnableEdit && this.tableOptions.onBeforEdit(this)) {
        const value = this.getValue();
        this.editor = TableEditorFactory.Instance.createEditor("text");
        this.isEditing = true;
        this.tableOptions.editingCell = this;
        this.target.html("");
        this.editor.init(this);
        this.editor.setValue(value);
      }
    }
    /**
     * 中文说明：结束表格单元格编辑，把编辑器内容写回单元格并同步 DOM。
     */
    endEdit() {
      this.isEditing = false;
      const value = this.editor.getValue();
      this.editor.destroy();
      this.target.html(value);
    }
    /**
     * 中文说明：读取target，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getTarget() {
      return this.target;
    }
    /**
     * 中文说明：读取value，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getValue() {
      return this.target.html();
    }
    /**
     * 中文说明：设置value，同步表格设计器配置并影响后续显示或打印结果。
     */
    setValue(_value) {
    }
    /**
     * 中文说明：初始化inner eelement，为表格设计器后续渲染和设计操作准备状态。
     */
    initInnerEelement() {
      this.innerElement = new HeaderCellInnerEditor();
      this.innerElement.init(this, this.tableOptions);
    }
    /**
     * 中文说明：初始化event，为表格设计器后续渲染和设计操作准备状态。
     */
    initEvent() {
    }
    /**
     * 中文说明：判断xyin cell，用于控制表格设计器分支逻辑和交互可用性。
     */
    isXYinCell(x, y) {
      const pointRect = new Rect({
        x,
        y,
        height: 0,
        width: 0
      });
      return this.isOverlap(pointRect);
    }
    /**
     * 中文说明：读取table rect，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getTableRect() {
      return new Rect({
        x: this.target.offset().left,
        y: this.target.offset().top,
        height: this.target[0].offsetHeight,
        width: this.target[0].offsetWidth
      });
    }
    /**
     * 中文说明：判断overlap，用于控制表格设计器分支逻辑和交互可用性。
     */
    isOverlap(rect) {
      const tableRect = this.getTableRect();
      return rect.x + rect.width > tableRect.x && tableRect.x + tableRect.width > rect.x && rect.y + rect.height > tableRect.y && tableRect.y + tableRect.height > rect.y;
    }
    /**
     * 中文说明：判断in rect，用于控制表格设计器分支逻辑和交互可用性。
     */
    isInRect(selection) {
      const rect = selection.rect;
      const tableRect = this.getTableRect();
      const overlap = getOverlapSize(rect, tableRect);
      if (overlap.width > ADJACENT_BORDER_OVERLAP_TOLERANCE && overlap.height > ADJACENT_BORDER_OVERLAP_TOLERANCE) {
        const mergedRect = Geometry.mergeRect(rect, tableRect);
        return JSON.stringify(rect) == JSON.stringify(mergedRect) || (selection.changed = true, selection.rect = mergedRect, true);
      }
      return false;
    }
    /**
     * 中文说明：判断selected，用于控制表格设计器分支逻辑和交互可用性。
     */
    isSelected() {
      return this.target.hasClass("selected");
    }
    /**
     * 中文说明：选中表格单元格并更新选区样式，供后续合并、拆分或编辑使用。
     */
    select() {
      this.target.addClass("selected");
    }
    /**
     * 中文说明：判断header，用于控制表格设计器分支逻辑和交互可用性。
     */
    isHeader() {
      return false;
    }
    /**
     * 中文说明：设置align，同步表格设计器配置并影响后续显示或打印结果。
     */
    setAlign(align) {
      this.align = align;
      align ? this.target.css("text-align", align) : this.target[0].style.textAlign = "";
    }
    /**
     * 中文说明：设置valign，同步表格设计器配置并影响后续显示或打印结果。
     */
    setVAlign(vAlign) {
      this.vAlign = vAlign;
      vAlign ? this.target.css("vertical-align", vAlign) : this.target[0].style.verticalAlign = "";
    }
    /**
     * 中文说明：读取entity，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getEntity() {
      return new TableCellEntity(this);
    }
  }
  class TableColumn extends TableCell {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(column2) {
      const normalizedColumn = column2 || {};
      super();
      this.width = normalizedColumn.width ? parseFloat(normalizedColumn.width.toString()) : 100;
      this.title = normalizedColumn.title;
      this.descTitle = normalizedColumn.descTitle;
      this.field = normalizedColumn.field;
      this.dataBinding = normalizedColumn.dataBinding;
      this.dataType = normalizedColumn.dataType;
      this.format = normalizedColumn.format;
      this.textType = normalizedColumn.textType;
      this.summaryAggregate = normalizedColumn.summaryAggregate;
      this.summaryValueType = normalizedColumn.summaryValueType;
      this.summaryLabel = normalizedColumn.summaryLabel;
      this.barcodeMode = normalizedColumn.barcodeMode;
      this.renderWidth = normalizedColumn.renderWidth;
      this.renderHeight = normalizedColumn.renderHeight;
      this.paddingTop = normalizedColumn.paddingTop;
      this.paddingLeft = normalizedColumn.paddingLeft;
      this.paddingRight = normalizedColumn.paddingRight;
      this.paddingBottom = normalizedColumn.paddingBottom;
      this.fixed = normalizedColumn.fixed;
      this.rowspan = normalizedColumn.rowspan ? parseInt(normalizedColumn.rowspan) : 1;
      this.colspan = normalizedColumn.colspan ? parseInt(normalizedColumn.colspan) : 1;
      this.align = normalizedColumn.align;
      this.halign = normalizedColumn.halign;
      this.vAlign = normalizedColumn.vAlign;
      this.formatter = normalizedColumn.formatter;
      this.styler = normalizedColumn.styler;
      this.formatter2 = normalizedColumn.formatter2;
      this.styler2 = normalizedColumn.styler2;
      this.checkbox = normalizedColumn.checkbox;
      this.checked = normalizedColumn.checked != 0;
    }
    /**
     * 中文说明：应用 CSS 相关配置，保持表格设计器元素在设计器和打印页面中的样式一致。
     */
    css(_value) {
    }
  }
  class DragingPrintElement {
    /**
     * 中文说明：初始化渲染核心对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(printElement) {
      this.printElement = printElement;
    }
    /**
     * 中文说明：更新position，让渲染核心的 DOM、尺寸或交互状态保持一致。
     */
    updatePosition(left, top) {
      this.left = left;
      this.top = top;
    }
  }
  class HiPrintlib {
    /**
     * 中文说明：初始化渲染核心对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
      this.printTemplateContainer = {};
      this.A1 = { width: 841, height: 594 };
      this.A2 = { width: 420, height: 594 };
      this.A3 = { width: 420, height: 297 };
      this.A4 = { width: 210, height: 297 };
      this.A5 = { width: 210, height: 148 };
      this.A6 = { width: 105, height: 148 };
      this.A7 = { width: 105, height: 74 };
      this.A8 = { width: 52, height: 74 };
      this.B1 = { width: 1e3, height: 707 };
      this.B2 = { width: 500, height: 707 };
      this.B3 = { width: 500, height: 353 };
      this.B4 = { width: 250, height: 353 };
      this.B5 = { width: 250, height: 176 };
      this.B6 = { width: 125, height: 176 };
      this.B7 = { width: 125, height: 88 };
      this.B8 = { width: 62, height: 88 };
      this.dragLengthCNum = (value, step) => {
        const scaled = 0.75 * value;
        if (step) step = step;
        return Math.round(scaled / step) * step;
      };
    }
    /**
     * 中文说明：返回 HiPrintLib 单例，作为模板渲染时共享的工具入口。
     */
    static get instance() {
      if (!this._instance) this._instance = new HiPrintlib();
      return this._instance;
    }
    /**
     * 中文说明：读取draging print element，为渲染核心的布局计算、序列化或渲染提供数据。
     */
    getDragingPrintElement() {
      return HiPrintlib.instance.dragingPrintElement;
    }
    /**
     * 中文说明：设置draging print element，同步渲染核心配置并影响后续显示或打印结果。
     */
    setDragingPrintElement(printElement) {
      HiPrintlib.instance.dragingPrintElement = new DragingPrintElement(printElement);
    }
    /**
     * 中文说明：生成随机 GUID，用作打印元素、表格单元格等对象的临时唯一标识。
     */
    guid() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (placeholder) => {
        const value = 16 * Math.random() | 0;
        return (placeholder === "x" ? value : 3 & value | 8).toString(16);
      });
    }
    /**
     * 中文说明：把图片地址转换为 base64 数据，便于打印预览和客户端打印时内联图片资源。
     */
    imageToBase64(target) {
      if ($(target).attr("src").indexOf("base64") === -1) {
        try {
          const canvas = document.createElement("canvas");
          const image = new Image();
          image.src = target.attr("src");
          canvas.width = image.width;
          canvas.height = image.height;
          canvas.getContext("2d").drawImage(image, 0, 0);
          target.attr("src", canvas.toDataURL("image/png"));
        } catch (_error) {
          try {
            this.xhrLoadImage(target);
          } catch (error) {
            console.log(error);
          }
        }
      }
    }
    /**
     * 中文说明：通过 XHR 拉取图片 Blob，为跨域图片转 base64 提供底层加载能力。
     */
    xhrLoadImage(_target) {
    }
    /**
     * 中文说明：遍历 DOM 中的图片并替换为 base64，避免打印输出时丢失远程图片。
     */
    transformImg(targets) {
      const self = this;
      targets.map((_index, element) => {
        self.imageToBase64($(element));
      });
    }
    /**
     * 中文说明：读取print template by id，为渲染核心的布局计算、序列化或渲染提供数据。
     */
    getPrintTemplateById(id) {
      return HiPrintlib.instance.printTemplateContainer[id];
    }
    /**
     * 中文说明：设置print template by id，同步渲染核心配置并影响后续显示或打印结果。
     */
    setPrintTemplateById(id, template) {
      return HiPrintlib.instance.printTemplateContainer[id] = template;
    }
  }
  function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  function readPathPart(target, part) {
    if (isRecord(target)) return target[part];
    if (Array.isArray(target)) return target[part];
    return void 0;
  }
  function toJsonValue(value) {
    if (value === void 0) return void 0;
    return cloneJsonValue(value);
  }
  function cloneJsonValue(value) {
    if (value === void 0) return value;
    return JSON.parse(JSON.stringify(value));
  }
  function inferScalarKind(name, value) {
    if (value === null) return "string";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    if (typeof value !== "string") return "string";
    const trimmed = value.trim();
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed)) return "date";
    return "string";
  }
  function normalizeFieldKind(kind) {
    return kind === "object" || kind === "array" || kind === "number" || kind === "boolean" || kind === "date" ? kind : "string";
  }
  function normalizeDataField(value) {
    var _a;
    if (!isRecord(value)) return void 0;
    const rawName = value.name == null || value.name === "" ? void 0 : value.name.toString();
    const path = value.path == null || value.path === "" ? rawName : value.path.toString();
    if (!path) return void 0;
    const name = rawName || ((_a = path.split(".").pop()) == null ? void 0 : _a.replace(/\[\]$/, "")) || path;
    const kind = normalizeFieldKind(value.kind);
    const field = {
      name,
      label: value.label == null || value.label === "" ? name : value.label.toString(),
      path,
      kind
    };
    const sample = toJsonValue(value.sample);
    if (sample !== void 0) field.sample = sample;
    if (Array.isArray(value.children)) {
      const children = value.children.map(normalizeDataField).filter(Boolean);
      if (children.length) field.children = children;
    }
    const item = normalizeDataField(value.item);
    if (item) field.item = item;
    return field;
  }
  function normalizeDataSource(value) {
    if (!isRecord(value)) return void 0;
    const id = value.id == null || value.id === "" ? void 0 : value.id.toString();
    if (!id) return void 0;
    const schema = Array.isArray(value.schema) ? value.schema.map(normalizeDataField).filter(Boolean) : [];
    return {
      id,
      name: value.name == null || value.name === "" ? id : value.name.toString(),
      schema
    };
  }
  function buildField(name, path, value) {
    if (Array.isArray(value)) {
      const mergedItem = mergeArrayItems(value);
      const item = buildField(name, `${path}[]`, mergedItem);
      return { name, label: name, path, kind: "array", sample: toJsonValue(value), item };
    }
    if (isRecord(value)) {
      return {
        name,
        label: name,
        path,
        kind: "object",
        sample: toJsonValue(value),
        children: inferDataFields(value, path)
      };
    }
    return { name, label: name, path, kind: inferScalarKind(name, value), sample: toJsonValue(value) };
  }
  function mergeArrayItems(items) {
    const objects = items.filter(isRecord).slice(0, 20);
    if (!objects.length) return items.find((item) => item !== void 0) ?? {};
    return objects.reduce((merged, item) => {
      Object.keys(item).forEach((key) => {
        if (merged[key] === void 0 || merged[key] === null) merged[key] = item[key];
      });
      return merged;
    }, {});
  }
  function inferDataFields(sample, parentPath = "") {
    if (!isRecord(sample)) return [];
    return Object.keys(sample).map((name) => {
      const path = parentPath ? `${parentPath}.${name}` : name;
      return buildField(name, path, sample[name]);
    });
  }
  function normalizeDataBinding(value) {
    if (!isRecord(value)) return void 0;
    const sourceId = value.sourceId == null || value.sourceId === "" ? void 0 : value.sourceId.toString();
    const path = value.path == null || value.path === "" ? void 0 : value.path.toString();
    if (!sourceId && !path) return void 0;
    const binding = {};
    if (sourceId) binding.sourceId = sourceId;
    if (path) binding.path = path;
    if (Object.prototype.hasOwnProperty.call(value, "fallback")) binding.fallback = toJsonValue(value.fallback);
    return binding;
  }
  function normalizeDataSources(value) {
    const rawSources = Array.isArray(value) ? value : isRecord(value) && Array.isArray(value.dataSources) ? value.dataSources : [];
    return rawSources.map(normalizeDataSource).filter(Boolean);
  }
  function getValueByPath(data, path) {
    if (!path) return data;
    if (isRecord(data) && Object.prototype.hasOwnProperty.call(data, path)) return data[path];
    const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
    let current = data;
    for (const part of parts) {
      if (current == null) return void 0;
      current = readPathPart(current, part);
    }
    return current;
  }
  function getRuntimeSourceData(sourceId, printData, dataSources) {
    if (!sourceId) return printData;
    if (isRecord(printData)) {
      const runtimeDataSources = printData.dataSources;
      if (isRecord(runtimeDataSources) && Object.prototype.hasOwnProperty.call(runtimeDataSources, sourceId)) return runtimeDataSources[sourceId];
      if (Object.prototype.hasOwnProperty.call(printData, sourceId)) return printData[sourceId];
    }
    dataSources == null ? void 0 : dataSources.find((item) => item.id === sourceId);
    if ((dataSources == null ? void 0 : dataSources.length) === 1 && dataSources[0].id === sourceId && !isRecord(printData == null ? void 0 : printData.dataSources)) return printData;
    return void 0;
  }
  function resolveDataBindingValue(bindingValue, printData, dataSources, contextData) {
    const binding = normalizeDataBinding(bindingValue);
    if (!binding) return { found: false, value: void 0 };
    const root = contextData !== void 0 && !binding.sourceId ? contextData : getRuntimeSourceData(binding.sourceId, printData, dataSources);
    const value = getValueByPath(root, binding.path);
    if (value === void 0 && Object.prototype.hasOwnProperty.call(binding, "fallback")) return { found: true, value: binding.fallback, binding };
    return { found: value !== void 0, value, binding };
  }
  function cloneRows(value) {
    if (!Array.isArray(value)) return [];
    return cloneJsonValue(value);
  }
  function flattenFields(fields, prefix = "") {
    const result = [];
    (fields || []).forEach((field) => {
      var _a;
      const displayLabel = prefix ? `${prefix} / ${field.label || field.name}` : field.label || field.name;
      result.push({ ...field, displayLabel });
      if (field.children) result.push(...flattenFields(field.children, displayLabel));
      if ((_a = field.item) == null ? void 0 : _a.children) result.push(...flattenFields(field.item.children, `${displayLabel}[]`));
    });
    return result;
  }
  function isSelectableBindingField(field, mode) {
    if (mode === "array") return field.kind === "array";
    if (mode === "value") return field.kind !== "object" && field.kind !== "array";
    return true;
  }
  function normalizeBindingFieldQuery(query) {
    return (query || "").trim().toLowerCase();
  }
  function fieldMatchesQuery(field, normalizedQuery) {
    if (!normalizedQuery) return true;
    return [field.label, field.name, field.path, field.kind].filter(Boolean).some((value) => value.toString().toLowerCase().includes(normalizedQuery));
  }
  function bindingFieldSearchItemMatches(item, normalizedQuery) {
    if (!normalizedQuery) return true;
    return [item.label, item.name, item.path, item.kind, item.field, item.detail, item.displayLabel].filter(Boolean).some((value) => value.toString().toLowerCase().includes(normalizedQuery));
  }
  function filterBindingFieldCandidates(candidates, options2 = {}) {
    const normalizedQuery = normalizeBindingFieldQuery(options2.query);
    const limit = typeof options2.limit === "number" && options2.limit > 0 ? options2.limit : void 0;
    const matched = candidates.filter((candidate) => !options2.sourceId || candidate.sourceId === options2.sourceId).filter((candidate) => bindingFieldSearchItemMatches(candidate, normalizedQuery));
    return limit ? matched.slice(0, limit) : matched;
  }
  function toRowContextFields(fields, arrayPath) {
    const prefix = `${arrayPath}[].`;
    return fields == null ? void 0 : fields.map((field) => ({
      ...field,
      path: field.path.startsWith(prefix) ? field.path.slice(prefix.length) : field.path,
      children: toRowContextFields(field.children, arrayPath),
      item: field.item ? { ...field.item, children: toRowContextFields(field.item.children, arrayPath) } : void 0
    }));
  }
  class DataSourceStore {
    constructor(dataSources) {
      __publicField(this, "dataSources");
      __publicField(this, "sourceMap", /* @__PURE__ */ new Map());
      __publicField(this, "fieldMap", /* @__PURE__ */ new Map());
      this.dataSources = normalizeDataSources(dataSources);
      this.dataSources.forEach((source2) => {
        this.sourceMap.set(source2.id, source2);
        this.indexFields(source2, source2.schema);
      });
    }
    /**
     * 中文说明：读取标准化后的数据源列表。
     */
    getSources() {
      return this.dataSources;
    }
    /**
     * 中文说明：按数据源 id 读取数据源。
     */
    getSource(sourceId) {
      return sourceId ? this.sourceMap.get(sourceId) : void 0;
    }
    /**
     * 中文说明：按数据源 id 和字段路径查找字段，支持数组 item 下的完整路径和相对路径。
     */
    findField(sourceId, path) {
      if (!sourceId || !path) return void 0;
      return this.fieldMap.get(this.fieldKey(sourceId, path));
    }
    /**
     * 中文说明：为普通元素或表格元素生成可绑定字段候选项。
     */
    getCandidates(mode) {
      const candidates = [];
      this.dataSources.forEach((source2) => {
        this.getCandidateFields(source2.schema, mode).forEach((field) => {
          candidates.push({
            ...field,
            sourceId: source2.id,
            sourceName: source2.name || source2.id,
            displayLabel: `${source2.name || source2.id} / ${field.displayLabel}`
          });
        });
      });
      return candidates;
    }
    /**
     * 中文说明：按绑定模式、数据源和搜索词生成字段候选项，供属性面板等绑定入口直接使用。
     */
    searchCandidates(mode, options2 = {}) {
      return filterBindingFieldCandidates(this.getCandidates(mode), options2);
    }
    /**
     * 中文说明：根据表格绑定解析列绑定上下文，返回数组字段及其行字段。
     */
    getColumnContext(bindingValue) {
      var _a;
      const tableBinding = normalizeDataBinding(bindingValue);
      const source2 = this.resolveBindingSource(tableBinding);
      const arrayField = source2 ? this.findField(source2.id, tableBinding == null ? void 0 : tableBinding.path) : void 0;
      return {
        source: source2,
        tableBinding,
        arrayField,
        rowFields: toRowContextFields((_a = arrayField == null ? void 0 : arrayField.item) == null ? void 0 : _a.children, (tableBinding == null ? void 0 : tableBinding.path) || "")
      };
    }
    /**
     * 中文说明：根据表格绑定生成表格列可绑定字段候选项。
     */
    getColumnCandidates(bindingValue) {
      var _a;
      const context = this.getColumnContext(bindingValue);
      if (!context.source || !((_a = context.rowFields) == null ? void 0 : _a.length)) return [];
      return flattenFields(context.rowFields).filter((field) => isSelectableBindingField(field, "value")).map((field) => ({
        ...field,
        sourceId: context.source.id,
        sourceName: context.source.name || context.source.id
      }));
    }
    /**
     * 中文说明：根据表格绑定生成列字段候选项，并统一套用搜索过滤规则。
     */
    searchColumnCandidates(bindingValue, options2 = {}) {
      return filterBindingFieldCandidates(this.getColumnCandidates(bindingValue), options2);
    }
    /**
     * 中文说明：解析绑定对应的数据源；没有 sourceId 且只有一个数据源时默认使用唯一数据源。
     */
    resolveBindingSource(bindingValue) {
      const binding = normalizeDataBinding(bindingValue);
      if (binding == null ? void 0 : binding.sourceId) return this.getSource(binding.sourceId);
      return this.dataSources.length === 1 ? this.dataSources[0] : void 0;
    }
    getCandidateFields(fields, mode, prefix = "") {
      const result = [];
      (fields || []).forEach((field) => {
        var _a;
        const displayLabel = prefix ? `${prefix} / ${field.label || field.name}` : field.label || field.name;
        if (isSelectableBindingField(field, mode)) result.push({ ...field, displayLabel });
        if (field.children) result.push(...this.getCandidateFields(field.children, mode, displayLabel));
        if (mode === "any" && ((_a = field.item) == null ? void 0 : _a.children)) result.push(...this.getCandidateFields(field.item.children, mode, `${displayLabel}[]`));
      });
      return result;
    }
    indexFields(source2, fields) {
      (fields || []).forEach((field) => {
        var _a;
        this.fieldMap.set(this.fieldKey(source2.id, field.path), field);
        const arrayRelativePath = field.path.replace(/^.*?\[]\.?/, "");
        if (arrayRelativePath && arrayRelativePath !== field.path) this.fieldMap.set(this.fieldKey(source2.id, arrayRelativePath), field);
        this.indexFields(source2, field.children);
        this.indexFields(source2, (_a = field.item) == null ? void 0 : _a.children);
      });
    }
    fieldKey(sourceId, path) {
      return `${sourceId}:${path}`;
    }
  }
  function createDataSourceStore(dataSources) {
    return new DataSourceStore(dataSources);
  }
  const OPTION_PANEL_CLASS_NAMES = {
    panel: "hiprint-option-items",
    item: "hiprint-option-item",
    row: "hiprint-option-item-row",
    layoutBreak: "hiprint-option-layout-break",
    layoutSpacer: "hiprint-option-layout-spacer",
    label: "hiprint-option-item-label",
    title: "hiprint-option-title",
    field: "hiprint-option-item-field",
    settingButton: "hiprint-option-item-settingBtn",
    deleteButton: "hiprint-option-item-deleteBtn",
    autoSubmit: "auto-submit",
    dataBindingItem: "hiprint-option-item-data-binding",
    dataBindingField: "hiprint-data-binding-field",
    dataBindingFallback: "hiprint-data-binding-fallback",
    dataBindingClear: "hiprint-data-binding-clear",
    tableAutoFill: "hiprint-table-auto-fill",
    tableAutoFillButton: "hiprint-table-auto-fill__button",
    functionSample: "hiprint-function-sample",
    functionSampleButton: "hiprint-function-sample__button",
    imageSource: "hiprint-image-source",
    imageSourceInput: "hiprint-image-source__input",
    imageSourceUpload: "hiprint-image-source__upload",
    imageSourceFile: "hiprint-image-source__file",
    paperNumberFormat: "hiprint-paper-number-format",
    paperNumberFormatSelect: "hiprint-paper-number-format__select",
    paperNumberFormatCustom: "hiprint-paper-number-format__custom",
    tableSelectedColumns: "hiprint-option-table-selected-columns",
    tableSelectedItem: "hiprint-option-table-selected-item",
    tableColumnTitle: "column-title",
    dataType: "hiprint-option-item-datatype",
    dataTypeFormat: "hiprint-option-item-datatype-format",
    dataTypeFormatItem: "hiprint-option-item-datatype-format-item",
    dataTypeSelectFormat: "hiprint-option-item-datatype-select-format",
    dataTypeInputFormat: "hiprint-option-item-datatype-input-format",
    fieldPicker: {
      root: "hiprint-field-picker",
      trigger: "hiprint-field-picker__trigger",
      popover: "hiprint-field-picker__popover",
      sourceFilter: "hiprint-field-picker__source-filter",
      search: "hiprint-field-picker__search",
      list: "hiprint-field-picker__list",
      option: "hiprint-field-picker__option",
      optionLabel: "hiprint-field-picker__option-label",
      optionDetail: "hiprint-field-picker__option-detail",
      empty: "hiprint-field-picker__empty"
    },
    state: {
      active: "is-active",
      empty: "is-empty",
      open: "is-open"
    }
  };
  function classes(...classNames) {
    return classNames.filter(Boolean).join(" ");
  }
  function selector(className) {
    return `.${className}`;
  }
  function optionItemClasses(row, ...extraClasses) {
    return classes(OPTION_PANEL_CLASS_NAMES.item, row && OPTION_PANEL_CLASS_NAMES.row, ...extraClasses);
  }
  let fieldPickerCssInjected = false;
  let tableAutoFillCssInjected = false;
  let imageSourceCssInjected = false;
  function injectFieldPickerCss() {
    if (fieldPickerCssInjected || typeof document === "undefined") return;
    fieldPickerCssInjected = true;
    const style = document.createElement("style");
    style.setAttribute("data-hiprint-field-picker", "true");
    style.textContent = `
    .hiprint-field-picker { position: relative; width: 100%; }
    .hiprint-field-picker-row { display: flex; align-items: flex-start; gap: 6px; }
    .hiprint-field-picker-row .hiprint-field-picker { min-width: 0; flex: 1 1 auto; }
    .hiprint-field-picker__trigger { width: 100%; min-height: 28px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; color: #334155; font-size: 12px; line-height: 18px; text-align: left; cursor: pointer; }
    .hiprint-field-picker__trigger.is-empty { color: #94a3b8; }
    .hiprint-field-picker__trigger:disabled { cursor: not-allowed; background: #f8fafc; color: #94a3b8; }
    .hiprint-field-picker__popover { position: absolute; z-index: 10020; top: 32px; left: 0; right: 0; display: none; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16); }
    .hiprint-field-picker.is-open .hiprint-field-picker__popover { display: block; }
    .hiprint-field-picker__source-filter,
    .hiprint-field-picker__search { width: 100%; height: 28px; margin-bottom: 6px; padding: 0 8px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; color: #1f2937; font-size: 12px; }
    .hiprint-field-picker__source-filter { appearance: auto; }
    .hiprint-field-picker__list { max-height: 220px; overflow: auto; }
    .hiprint-field-picker__option { width: 100%; padding: 6px 7px; border: 0; border-radius: 3px; background: transparent; color: #1f2937; text-align: left; cursor: pointer; }
    .hiprint-field-picker__option:hover, .hiprint-field-picker__option.is-active { background: #eff6ff; color: #1d4ed8; }
    .hiprint-field-picker__option-label { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 600; }
    .hiprint-field-picker__option-detail { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; color: #64748b; font-size: 11px; }
    .hiprint-field-picker__empty { padding: 8px 7px; color: #64748b; font-size: 12px; }
  `;
    document.head.appendChild(style);
  }
  function injectTableAutoFillCss() {
    if (tableAutoFillCssInjected || typeof document === "undefined") return;
    tableAutoFillCssInjected = true;
    const style = document.createElement("style");
    style.setAttribute("data-hiprint-table-auto-fill", "true");
    style.textContent = `
    .hiprint-table-auto-fill { flex: 0 0 auto; }
    .hiprint-table-auto-fill__button { height: 28px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; color: #334155; font-size: 12px; font-weight: 600; line-height: 26px; cursor: pointer; }
    .hiprint-table-auto-fill__button:hover { border-color: #93c5fd; background: #eff6ff; color: #1d4ed8; }
    .hiprint-table-auto-fill__button:active { background: #dbeafe; }
    .hiprint-table-auto-fill__button:disabled { cursor: not-allowed; border-color: #cbd5e1; background: #f8fafc; color: #94a3b8; }
  `;
    document.head.appendChild(style);
  }
  function injectImageSourceCss() {
    if (imageSourceCssInjected || typeof document === "undefined") return;
    imageSourceCssInjected = true;
    const style = document.createElement("style");
    style.setAttribute("data-hiprint-image-source", "true");
    style.textContent = `
    .hiprint-image-source { display: flex; align-items: center; gap: 6px; }
    .hiprint-option-items .hiprint-option-item-field .hiprint-image-source__input { min-width: 0; flex: 1 1 auto; }
    .hiprint-image-source__upload { flex: 0 0 auto; height: 28px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; color: #334155; font-size: 12px; font-weight: 600; line-height: 26px; cursor: pointer; }
    .hiprint-image-source__upload:hover { border-color: #93c5fd; background: #eff6ff; color: #1d4ed8; }
    .hiprint-image-source__file { display: none !important; }
  `;
    document.head.appendChild(style);
  }
  const DEFAULT_OPTION = ["", "默认"];
  const DEFAULT_FONT_FAMILY_OPTIONS = [
    DEFAULT_OPTION,
    ["SimSun, Songti SC, STSong, serif", "宋体"],
    ["Microsoft YaHei, PingFang SC, Hiragino Sans GB, Noto Sans CJK SC, Arial, sans-serif", "微软雅黑"],
    ["SimHei, Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif", "黑体"],
    ["KaiTi, Kaiti SC, STKaiti, serif", "楷体"],
    ["FangSong, STFangsong, serif", "仿宋"],
    ["Arial, Helvetica, sans-serif", "Arial"],
    ["Times New Roman, Times, serif", "Times New Roman"],
    ["Menlo, Consolas, Courier New, monospace", "等宽字体"]
  ];
  const COMMON_PT_6_TO_36 = [
    ["6", "6pt"],
    ["6.75", "6.75pt"],
    ["7.5", "7.5pt"],
    ["8.25", "8.25pt"],
    ["9", "9pt"],
    ["9.75", "9.75pt"],
    ["10.5", "10.5pt"],
    ["11.25", "11.25pt"],
    ["12", "12pt"],
    ["12.75", "12.75pt"],
    ["13.5", "13.5pt"],
    ["14.25", "14.25pt"],
    ["15", "15pt"],
    ["15.75", "15.75pt"],
    ["16.5", "16.5pt"],
    ["17.25", "17.25pt"],
    ["18", "18pt"],
    ["18.75", "18.75pt"],
    ["19.5", "19.5pt"],
    ["20.25", "20.25pt"],
    ["21", "21pt"],
    ["21.75", "21.75pt"],
    ["22.5", "22.5pt"],
    ["23.25", "23.25pt"],
    ["24", "24pt"],
    ["24.75", "24.75pt"],
    ["25.5", "25.5pt"],
    ["26.25", "26.25pt"],
    ["27", "27pt"],
    ["27.75", "27.75pt"],
    ["28.5", "28.5pt"],
    ["29.25", "29.25pt"],
    ["30", "30pt"],
    ["30.75", "30.75pt"],
    ["31.5", "31.5pt"],
    ["32.25", "32.25pt"],
    ["33", "33pt"],
    ["33.75", "33.75pt"],
    ["34.5", "34.5pt"],
    ["35.25", "35.25pt"],
    ["36", "36pt"]
  ];
  const LINE_HEIGHT_PT_6_TO_36 = COMMON_PT_6_TO_36.map(([value, title]) => [value, value === "13.5" ? "13pt" : title]);
  const COMMON_PT_6_TO_21_75 = COMMON_PT_6_TO_36.slice(0, 22);
  const COMMON_PADDING_PT = [["0.75", "0.75pt"], ["1.5", "1.5pt"], ["2.25", "2.25pt"], ["3", "3pt"], ["3.75", "3.75pt"], ["4.5", "4.5pt"], ["5.25", "5.25pt"], ...COMMON_PT_6_TO_21_75];
  const RENDER_SIZE_OPTIONS = [
    DEFAULT_OPTION,
    ["12", "12pt"],
    ["18", "18pt"],
    ["24", "24pt"],
    ["30", "30pt"],
    ["36", "36pt"],
    ["48", "48pt"],
    ["60", "60pt"],
    ["72", "72pt"],
    ["90", "90pt"],
    ["120", "120pt"],
    ["150", "150pt"],
    ["180", "180pt"]
  ];
  const BORDER_SWITCH_OPTIONS = [DEFAULT_OPTION, ["border", "有边框"], ["noBorder", "无边框"]];
  const ROW_BORDER_OPTIONS = [...BORDER_SWITCH_OPTIONS, ["topBorder", "上边框"], ["bottomBorder", "下边框"], ["topBottomBorder", "上下边框"]];
  const BORDER_SIDE_OPTIONS = [["", "否"], ["solid", "实线"], ["dotted", "虚线"]];
  const FONT_WEIGHT_OPTIONS = [DEFAULT_OPTION, ["lighter", "更细"], ["bold", "粗体"], ["bolder", "粗体+"], ["100", "100"], ["200", "200"], ["300", "300"], ["400", "400"], ["500", "500"], ["600", "600"], ["700", "700"], ["800", "800"], ["900", "900"]];
  const TEXT_ALIGN_OPTIONS = [DEFAULT_OPTION, ["", "居左"], ["center", "居中"], ["right", "居右"], ["justify", "两端对齐"]];
  const CELL_ALIGN_OPTIONS = [DEFAULT_OPTION, ["left", "居左"], ["center", "居中"], ["right", "居右"], ["justify", "两端对齐"]];
  const TITLE_SEPARATOR_OPTIONS = [DEFAULT_OPTION, ["：", "冒号"], ["-", "中划线"], [" ", "空格"]];
  const PAPER_NUMBER_FORMAT_CUSTOM_VALUE = "__custom";
  const PAPER_NUMBER_FORMAT_OPTIONS = [
    DEFAULT_OPTION,
    ["paperNo/paperCount", "paperNo/paperCount"],
    ["paperNo-paperCount", "paperNo-paperCount"],
    [PAPER_NUMBER_FORMAT_CUSTOM_VALUE, "自定义输出"]
  ];
  const FORMATTER_SAMPLE = `function(title, data, options, templateData, target) {
  // title: 当前元素标题
  // data: 当前元素绑定字段的值
  // options: 当前元素配置
  // templateData: 当前打印数据
  // target: 当前元素 DOM
  return data == null ? '' : data;
}`;
  const STYLER_SAMPLE = `function(title, data, options, templateData, target) {
  // title: 当前元素标题
  // data: 当前元素绑定字段的值
  // options: 当前元素配置
  // templateData: 当前打印数据
  // target: 当前元素 DOM
  return {
    color: '#1f2937'
  };
}`;
  const FOOTER_FORMATTER_SAMPLE = `function(options, rows, data) {
  // options: 当前表格配置
  // rows: 当前参与渲染的行数据
  // data: 当前打印数据
  return '<tr><td colspan="1">合计</td></tr>';
}`;
  const GRID_COLUMNS_FOOTER_FORMATTER_SAMPLE = `function(options, rows, data) {
  // options: 当前表格配置
  // rows: 当前参与渲染的行数据
  // data: 当前打印数据
  return '';
}`;
  const ROW_STYLER_SAMPLE = `function(row, options) {
  // row: 当前表格行的完整数据
  // options: 当前表格配置
  return {
    color: '#1f2937'
  };
}`;
  const FORMATTER2_SAMPLE = `function(value, row, index, options) {
  // value: 当前单元格绑定字段的值
  // row: 当前表格行的完整数据
  // index: 当前列序号，从 0 开始
  // options: 当前表格配置
  return value == null ? '' : value;
}`;
  const STYLER2_SAMPLE = `function(value, row, index, options) {
  // value: 当前单元格绑定字段的原始值
  // row: 当前表格行的完整数据
  // index: 当前列序号，从 0 开始
  // options: 当前表格配置
  return {
    textAlign: 'center',
    verticalAlign: 'middle',
    padding: '4pt'
  };
}`;
  let functionSampleCssInjected = false;
  function normalizeFontFamilyOptions(options2) {
    const nextOptions = options2 && options2.length ? options2 : DEFAULT_FONT_FAMILY_OPTIONS;
    return nextOptions.some(([value]) => value === "") ? nextOptions : [DEFAULT_OPTION, ...nextOptions];
  }
  function setFontFamilyOptions(options2) {
    optionConfigs.fontFamily.options = normalizeFontFamilyOptions(options2);
  }
  function optionHtml(value, title) {
    return `<option value="${value}" >${title}</option>`;
  }
  function selectItemHtml(config) {
    const autoClass = config.autoSubmit === false ? "" : ` class="${OPTION_PANEL_CLASS_NAMES.autoSubmit}"`;
    return ` <div class="${optionItemClasses(config.row, ...config.extraClasses || [])}">
        <div class="${OPTION_PANEL_CLASS_NAMES.label}">
        ${config.label}
        </div>
        <div class="${OPTION_PANEL_CLASS_NAMES.field}">
        <select${autoClass}>
        ${(config.options || [DEFAULT_OPTION]).map(([value, title]) => optionHtml(value, title)).join("\n        ")}
        </select>
        </div>
    </div>`;
  }
  function inputItemHtml(config) {
    const autoClass = config.autoSubmit === false ? "" : ` class="${OPTION_PANEL_CLASS_NAMES.autoSubmit}"`;
    const placeholder = config.placeholder ? ` placeholder="${config.placeholder}"` : "";
    return ` <div class="${optionItemClasses(config.row, ...config.extraClasses || [])}">
        <div class="${OPTION_PANEL_CLASS_NAMES.label}">
        ${config.label}
        </div>
        <div class="${OPTION_PANEL_CLASS_NAMES.field}">
        <input type="text"${placeholder}${autoClass}>
        </div>
    </div>`;
  }
  function textareaItemHtml(config, owner) {
    const placeholder = (owner == null ? void 0 : owner.placeholder) ?? config.placeholder ?? "";
    return ` <div class="${optionItemClasses(true, ...config.extraClasses || [])}">
        <div class="${OPTION_PANEL_CLASS_NAMES.label}">
        ${config.label}
        </div>
        <div class="${OPTION_PANEL_CLASS_NAMES.field}">
        <textarea style="height:${config.name === "title" ? "50px" : "80px"};" placeholder="${placeholder}" class="${OPTION_PANEL_CLASS_NAMES.autoSubmit}"></textarea>
        </div>
    </div>`;
  }
  function injectFunctionSampleCss() {
    if (functionSampleCssInjected || typeof document === "undefined") return;
    functionSampleCssInjected = true;
    const style = document.createElement("style");
    style.setAttribute("data-hiprint-function-sample", "true");
    style.textContent = `
    .hiprint-function-sample { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .hiprint-function-sample__button { height: 26px; padding: 0 9px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; color: #334155; font-size: 12px; line-height: 24px; cursor: pointer; }
    .hiprint-function-sample__button:hover { border-color: #93c5fd; background: #eff6ff; color: #1d4ed8; }
  `;
    document.head.appendChild(style);
  }
  function parseEditorValue(raw, valueKind) {
    if (valueKind === "none") return void 0;
    if (valueKind === "booleanTrue") return raw === "true" ? true : void 0;
    if (valueKind === "booleanFalse") return raw === "false" ? false : void 0;
    if (!raw) return void 0;
    if (valueKind === "number") return parseFloat(raw.toString());
    if (valueKind === "string") return raw.toString();
    return raw;
  }
  function setEditorValue(target, config, value) {
    const selector2 = config.selector || (config.editor === "textarea" ? "textarea" : config.editor);
    const input = target.find(selector2);
    if (config.prependUnknownOption && value) {
      const option2 = target.find(`option[value="${value}"]`);
      if (!option2.length) target.find("select").prepend(`<option value="${value}" >${value}</option>`);
    }
    const nextValue = config.setNullishToEmptyString ? (value == null ? "" : value).toString() : value;
    input.val(nextValue);
    if (config.colorPicker && input.minicolors) {
      input.minicolors({ defaultValue: nextValue || "", theme: "bootstrap" });
      input.minicolors("value", nextValue || "");
    }
  }
  function clearStyleForEach(collection, styleNames) {
    collection.map((_index, element) => {
      styleNames.forEach((styleName) => {
        element.style[styleName] = "";
      });
    });
  }
  function applyCssByOptionName(name, target, value) {
    const first = target && target.length ? target[0] : void 0;
    const setSimple = (cssName, styleName, suffix = "", returnName = cssName) => {
      if (target && target.length) {
        if (value) {
          target.css(cssName, `${value}${suffix}`);
          return `${returnName}:${value}${suffix}`;
        }
        if (first) first.style[styleName] = "";
      }
      return null;
    };
    const setRowBorder = (selector2) => {
      const rows = target.find(selector2);
      if (rows.length) {
        if (value === "border") {
          rows.css("border", "1px solid");
          return "border:1pt solid";
        }
        if (value === "noBorder") rows.css("border", "0px solid");
        else if (value === "topBorder") rows.css("border", "0px solid").css("border-top", "1px solid");
        else if (value === "bottomBorder") rows.css("border", "0px solid").css("border-bottom", "1px solid");
        else if (value === "topBottomBorder") rows.css("border", "0px solid").css("border-top", "1px solid").css("border-bottom", "1px solid");
        else clearStyleForEach(rows, ["border"]);
      }
      return null;
    };
    const setCellBorder = (selector2) => {
      const cells = target.find(selector2);
      if (cells.length) {
        if (value === "border") {
          cells.css("border", "1px solid");
          return "border:1px solid";
        }
        if (value === "noBorder") cells.css("border", "0px solid");
        else clearStyleForEach(cells, ["border"]);
      }
      return null;
    };
    const setRowHeight = (allSelector, writableSelector) => {
      const cells = target.find(allSelector);
      if (cells.length) {
        if (value) {
          target.find(writableSelector).css("height", `${value}pt`);
          return `height:${value}pt`;
        }
        clearStyleForEach(cells, ["height"]);
      }
      return null;
    };
    const setContentPadding = (cssName, styleName) => {
      const content = target.find(".hiprint-printElement-content");
      if (content && content.length) {
        if (value) {
          content.css(cssName, `${value}pt`);
          return cssName;
        }
        if (content[0]) content[0].style[styleName] = "";
      }
      return null;
    };
    switch (name) {
      case "lineHeight":
        return setSimple("line-height", "lineHeight", "pt");
      case "fontFamily":
        return setSimple("font-family", "fontFamily");
      case "fontSize":
        return setSimple("font-size", "fontSize", "pt");
      case "fontWeight":
        return setSimple("font-weight", "fontWeight");
      case "letterSpacing":
        return setSimple("letter-spacing", "letterSpacing", "pt");
      case "textAlign":
        if (target && target.length) {
          if (value) {
            target.css("text-align", value);
            if (value === "justify") target.css("text-align-last", "justify").css("text-justify", "distribute-all-lines");
            else if (first) first.style.textAlignLast = first.style.textJustify = "";
            return `text-align:${value}`;
          }
          if (first) first.style.textAlign = first.style.textAlignLast = first.style.textJustify = "";
        }
        return null;
      case "tableBorder": {
        const table = target.find("table");
        if (table.length) {
          if (value === "border") {
            table.css("border", "1px solid");
            return "border:1px solid";
          }
          if (value === "noBorder") table.css("border", "0px solid");
          else if (table[0]) table[0].style.border = "";
        }
        return null;
      }
      case "tableHeaderBorder":
        return setRowBorder("thead tr");
      case "tableHeaderCellBorder":
        return setCellBorder("thead tr td");
      case "tableHeaderRowHeight":
        return setRowHeight("thead tr td", "thead tr td:not([rowspan])");
      case "tableHeaderFontSize": {
        const thead = target.find("thead");
        if (thead.length) {
          if (value) {
            thead.css("font-size", `${value}pt`);
            return `font-size:${value}pt`;
          }
          clearStyleForEach(thead, ["fontSize"]);
        }
        return null;
      }
      case "tableHeaderFontWeight": {
        const thead = target.find("thead");
        const cells = target.find("thead tr td");
        if (thead.length) {
          if (value) {
            cells.css("font-weight", value);
            return `font-weight:${value}`;
          }
          clearStyleForEach(cells, ["fontWeight"]);
        }
        return null;
      }
      case "tableBodyCellBorder":
        return setCellBorder("tbody tr td");
      case "tableBodyRowHeight":
        return setRowHeight("tbody tr td", "tbody tr td:not([rowspan])");
      case "tableHeaderBackground": {
        const thead = target.find("thead");
        if (thead.length) {
          if (value) {
            thead.css("background", value);
            return `background:${value}`;
          }
          clearStyleForEach(thead, ["background"]);
        }
        return null;
      }
      case "borderWidth":
        return setSimple("border-width", "borderWidth", "pt");
      case "color":
        return setSimple("color", "color");
      case "textDecoration":
        return setSimple("text-decoration", "textDecoration");
      case "borderColor":
        return setSimple("border-color", "borderColor");
      case "longTextIndent":
        return null;
      case "tableBodyRowBorder":
        return setRowBorder("tbody tr");
      case "transform": {
        const content = target.find([
          ".hiprint-printElement-content",
          ".hiprint-printElement-image-content",
          ".hiprint-printElement-table-content"
        ].join(","));
        if (target && target.length) {
          if (value) {
            const rotate = `rotate(${value}deg)`;
            content.css("transform", rotate).css("-ms-transform", rotate).css("-moz-transform", rotate).css("-webkit-transform", rotate).css("-o-transform", rotate);
            return `transform:rotate(${value}deg)`;
          }
          for (let index = 0; index < (content.length || 0); index += 1) {
            const element = content[index];
            if (!element) continue;
            element.style.transform = "";
            element.style.removeProperty("-ms-transform");
            element.style.removeProperty("-moz-transform");
            element.style.removeProperty("-webkit-transform");
            element.style.removeProperty("-o-transform");
          }
        }
        return null;
      }
      case "borderTop":
        if (target && target.length) {
          if (value) {
            target.css("border-top-style", value);
            return "border-top:1px";
          }
          if (first) first.style.borderTopStyle = first.style.borderTopWidth = "";
        }
        return null;
      case "borderLeft":
        if (target && target.length) {
          if (value) {
            target.css("border-left-style", value);
            return "border-left:1px";
          }
          if (first) first.style.borderLeftStyle = first.style.borderLeftWidth = "";
        }
        return null;
      case "borderRight":
        if (target && target.length) {
          if (value) {
            target.css("border-right-style", value);
            return "border-right:1px";
          }
          if (first) first.style.borderRightStyle = first.style.borderRightWidth = "";
        }
        return null;
      case "borderBottom":
        if (target && target.length) {
          if (value) {
            target.css("border-bottom-style", value);
            return "border-bottom-style:1px solid";
          }
          if (first) first.style.borderBottomStyle = first.style.borderBottomWidth = "";
        }
        return null;
      case "contentPaddingLeft":
        return setContentPadding("padding-left", "paddingLeft");
      case "contentPaddingTop":
        return setContentPadding("padding-top", "paddingTop");
      case "contentPaddingRight":
        return setContentPadding("padding-right", "paddingRight");
      case "contentPaddingBottom":
        return setContentPadding("padding-bottom", "paddingBottom");
      case "borderStyle":
        if (target && target.length) {
          if (value) {
            target.css("border-style", value);
            return "border-style:1px";
          }
          if (first) first.style.borderStyle = "";
        }
        return null;
      case "backgroundColor":
        return setSimple("background-color", "backgroundColor");
      case "textContentVerticalAlign":
        if (target && target.length) {
          if (value) {
            if (value === "middle") target.addClass("hiprint-text-content-middle");
            if (value === "bottom") target.addClass("hiprint-text-content-bottom");
            return "";
          }
          target.removeClass("hiprint-text-content-middle").removeClass("hiprint-text-content-bottom");
        }
        return null;
      case "gridColumnsGutter":
        if (target && target.length) {
          if (value) {
            target.find(".table-grid-row").css("margin-left", `-${value}pt`).css("margin-right", `-${value}pt`);
            target.find(".tableGridColumnsGutterRow").css("padding-left", `${value}pt`).css("padding-right", `${value}pt`);
            return null;
          }
          clearStyleForEach(target.find(".table-grid-row"), ["marginLeft", "marginRight"]);
          clearStyleForEach(target.find(".tableGridColumnsGutterRow"), ["paddingLeft", "paddingRight"]);
        }
        return null;
      case "paddingLeft":
        if (target && target.length) {
          if (value) {
            target.css("padding-left", `${value}pt`);
            return "padding-left";
          }
          if (first) first.style.paddingLeft = "";
        }
        return null;
      case "paddingRight":
        if (target && target.length) {
          if (value) {
            target.css("padding-right", `${value}pt`);
            return "padding-right";
          }
          if (first) first.style.paddingRight = "";
        }
        return null;
      default:
        return null;
    }
  }
  class SimpleOptionItem {
    /**
     * 中文说明：初始化属性面板对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(config) {
      __publicField(this, "name");
      __publicField(this, "target");
      __publicField(this, "placeholder");
      __publicField(this, "submit");
      this.config = config;
      this.name = config.name;
      this.placeholder = config.placeholder;
    }
    /**
     * 中文说明：创建target，供属性面板在设计器或打印渲染流程中使用。
     */
    createTarget() {
      if (this.config.html) this.target = $(this.config.html);
      else if (this.config.editor === "select") this.target = $(selectItemHtml(this.config));
      else if (this.config.editor === "input") this.target = $(inputItemHtml(this.config));
      else if (this.config.editor === "textarea") this.target = $(textareaItemHtml(this.config, this));
      else this.target = $(` <div class="${optionItemClasses(true, ...this.config.extraClasses || [])}"><div class="${OPTION_PANEL_CLASS_NAMES.label}">${this.config.label}</div></div>`);
      return this.target;
    }
    /**
     * 中文说明：读取value，为属性面板的布局计算、序列化或渲染提供数据。
     */
    getValue() {
      if (this.config.valueKind === "none") return void 0;
      const selector2 = this.config.selector || (this.config.editor === "textarea" ? "textarea" : this.config.editor);
      return parseEditorValue(this.target.find(selector2).val(), this.config.valueKind);
    }
    /**
     * 中文说明：设置value，同步属性面板配置并影响后续显示或打印结果。
     */
    setValue(value) {
      if (this.config.valueKind === "none") return;
      setEditorValue(this.target, this.config, value);
    }
    /**
     * 中文说明：销毁属性面板控件引用，释放当前属性项绑定的 DOM 状态。
     */
    destroy() {
      var _a, _b;
      (_b = (_a = this.target) == null ? void 0 : _a.remove) == null ? void 0 : _b.call(_a);
    }
    /**
     * 中文说明：应用 CSS 相关配置，保持属性面板元素在设计器和打印页面中的样式一致。
     */
    css(target, value) {
      return applyCssByOptionName(this.name, target, value);
    }
    visibleWhen(values) {
      return this.config.visibleWhen ? this.config.visibleWhen(values) : true;
    }
    disabledWhen(values) {
      return this.config.disabledWhen ? this.config.disabledWhen(values) : false;
    }
  }
  class LayoutBreakOptionItem {
    constructor(name = "__layoutBreak") {
      __publicField(this, "name");
      __publicField(this, "target");
      __publicField(this, "submit");
      this.name = name;
    }
    createTarget() {
      this.target = $(`<div class="${classes(OPTION_PANEL_CLASS_NAMES.layoutBreak, OPTION_PANEL_CLASS_NAMES.row)}" style="flex-basis:100%;width:100%;height:0;margin:0;padding:0;"></div>`);
      return this.target;
    }
    getValue() {
      return void 0;
    }
    setValue(_value) {
    }
    destroy() {
      var _a, _b;
      (_b = (_a = this.target) == null ? void 0 : _a.remove) == null ? void 0 : _b.call(_a);
    }
  }
  class LayoutSpacerOptionItem extends LayoutBreakOptionItem {
    constructor(name = "__layoutSpacer") {
      super(name);
    }
    createTarget() {
      this.target = $(`<div class="${classes(OPTION_PANEL_CLASS_NAMES.layoutBreak, OPTION_PANEL_CLASS_NAMES.layoutSpacer, OPTION_PANEL_CLASS_NAMES.row)}" style="flex-basis:100%;width:100%;height:8px;margin:0;padding:0;"></div>`);
      return this.target;
    }
  }
  const optionConfigs = {
    fontFamily: { name: "fontFamily", label: "字体", editor: "select", options: DEFAULT_FONT_FAMILY_OPTIONS, valueKind: "string", prependUnknownOption: true },
    fontSize: { name: "fontSize", label: "字体大小", editor: "select", options: [DEFAULT_OPTION, ...COMMON_PT_6_TO_21_75], valueKind: "number", prependUnknownOption: true },
    fontWeight: { name: "fontWeight", label: "字体粗细", editor: "select", options: FONT_WEIGHT_OPTIONS, valueKind: "string", prependUnknownOption: true },
    letterSpacing: { name: "letterSpacing", label: "字间距", editor: "select", options: [DEFAULT_OPTION, ["0.75", "0.75pt"], ["1.5", "1.5pt"], ["2.25", "2.25pt"], ["3", "3pt"], ["3.75", "3.75pt"], ["4.5", "4.5pt"], ["5.25", "5.25pt"], ["6", "6pt"], ["6.75", "6.75pt"], ["7.5", "7.5pt"], ["8.25", "8.25pt"], ["9", "9pt"], ["9.75", "9.75pt"], ["10.5", "10.5pt"], ["11.25", "11.25pt"], ["12", "12pt"]], valueKind: "number", prependUnknownOption: true },
    lineHeight: { name: "lineHeight", label: "字体行高", editor: "select", options: [DEFAULT_OPTION, ...LINE_HEIGHT_PT_6_TO_36], valueKind: "number", prependUnknownOption: true },
    textAlign: { name: "textAlign", label: "左右对齐", editor: "select", options: TEXT_ALIGN_OPTIONS, valueKind: "string" },
    hideTitle: { name: "hideTitle", label: "标题显示隐藏", editor: "select", options: [DEFAULT_OPTION, ["false", "显示"], ["true", "隐藏"]], valueKind: "booleanTrue", setNullishToEmptyString: true },
    titleSeparator: { name: "titleSeparator", label: "标题分隔符", editor: "select", options: TITLE_SEPARATOR_OPTIONS, valueKind: "raw", setNullishToEmptyString: true, visibleWhen: (values) => values.hideTitle !== true },
    textType: { name: "textType", label: "打印类型", editor: "select", options: [DEFAULT_OPTION, ["", "文本"], ["image", "图片"], ["barcode", "条形码"], ["qrcode", "二维码"]], valueKind: "raw" },
    summaryAggregate: { name: "summaryAggregate", label: "汇总方式", editor: "select", options: [DEFAULT_OPTION, ["", "不汇总"], ["sum", "求和"], ["avg", "平均值"]], valueKind: "raw", setNullishToEmptyString: true },
    summaryValueType: { name: "summaryValueType", label: "汇总格式", editor: "select", options: [DEFAULT_OPTION, ["number", "数字"], ["rmbUppercase", "金额大写"]], valueKind: "raw", setNullishToEmptyString: true, visibleWhen: (values) => values.summaryAggregate === "sum" || values.summaryAggregate === "avg" },
    summaryLabel: { name: "summaryLabel", label: "汇总标题", editor: "input", row: true, placeholder: "例如：合计", valueKind: "string", visibleWhen: (values) => values.summaryAggregate === "sum" || values.summaryAggregate === "avg" },
    tableBorder: { name: "tableBorder", label: "表格边框", editor: "select", options: BORDER_SWITCH_OPTIONS, valueKind: "string" },
    tableHeaderBorder: { name: "tableHeaderBorder", label: "表头边框", editor: "select", options: ROW_BORDER_OPTIONS, valueKind: "string" },
    tableHeaderCellBorder: { name: "tableHeaderCellBorder", label: "表头单元格边框", editor: "select", options: BORDER_SWITCH_OPTIONS, valueKind: "string" },
    tableHeaderRowHeight: { name: "tableHeaderRowHeight", label: "表头行高", editor: "select", options: [DEFAULT_OPTION, ...COMMON_PT_6_TO_36], valueKind: "number", prependUnknownOption: true },
    tableHeaderFontSize: { name: "tableHeaderFontSize", label: "表头字体大小", editor: "select", options: [DEFAULT_OPTION, ...COMMON_PT_6_TO_21_75], valueKind: "number", prependUnknownOption: true },
    tableHeaderFontWeight: { name: "tableHeaderFontWeight", label: "表头字体粗细", editor: "select", options: FONT_WEIGHT_OPTIONS, valueKind: "raw", prependUnknownOption: true },
    tableBodyCellBorder: { name: "tableBodyCellBorder", label: "表体单元格", editor: "select", options: BORDER_SWITCH_OPTIONS, valueKind: "string" },
    tableBodyRowHeight: { name: "tableBodyRowHeight", label: "表体行高", editor: "select", options: [DEFAULT_OPTION, ...COMMON_PT_6_TO_36], valueKind: "number", prependUnknownOption: true },
    tableHeaderBackground: { name: "tableHeaderBackground", label: "表头背景", editor: "input", valueKind: "string", colorPicker: true },
    borderWidth: { name: "borderWidth", label: "边框大小", editor: "select", options: [DEFAULT_OPTION, ["0.75", "0.75pt"], ["1.5", "1.5pt"], ["2.25", "2.25pt"], ["3", "3pt"], ["3.75", "3.75pt"], ["4.5", "4.5pt"], ["5.25", "5.25pt"], ["6", "6pt"], ["6.75", "6.75pt"]], valueKind: "string", prependUnknownOption: true },
    barcodeMode: { name: "barcodeMode", label: "条形码格式", editor: "select", options: [DEFAULT_OPTION, ["CODE128A", "CODE128A"], ["CODE128B", "CODE128B"], ["CODE128C", "CODE128C"], ["CODE39", "CODE39"], ["EAN-13", "EAN-13"], ["EAN-8", "EAN-8"], ["EAN-5", "EAN-5"], ["EAN-2", "EAN-2"], ["UPC（A）", "UPC（A）"], ["ITF", "ITF"], ["ITF-14", "ITF-14"], ["MSI", "MSI"], ["MSI10", "MSI10"], ["MSI11", "MSI11"], ["MSI1010", "MSI1010"], ["MSI1110", "MSI1110"], ["Pharmacode", "Pharmacode"]], valueKind: "raw", visibleWhen: (values) => values.textType === "barcode" },
    renderWidth: { name: "renderWidth", label: "渲染宽度", editor: "select", options: RENDER_SIZE_OPTIONS, valueKind: "number", prependUnknownOption: true, visibleWhen: (values) => values.textType === "image" || values.textType === "barcode" || values.textType === "qrcode" },
    renderHeight: { name: "renderHeight", label: "渲染高度", editor: "select", options: RENDER_SIZE_OPTIONS, valueKind: "number", prependUnknownOption: true, visibleWhen: (values) => values.textType === "image" || values.textType === "barcode" || values.textType === "qrcode" },
    color: { name: "color", label: "字体颜色", editor: "input", valueKind: "string", colorPicker: true },
    textDecoration: { name: "textDecoration", label: "文本修饰", editor: "select", options: [DEFAULT_OPTION, ["underline", "下划线"], ["overline", "上划线"], ["line-through", "穿梭线"]], valueKind: "string", prependUnknownOption: true },
    title: { name: "title", label: "标题", editor: "textarea", placeholder: "请输入标题", valueKind: "raw" },
    testData: { name: "testData", label: "测试数据", editor: "input", row: true, placeholder: "仅字段名称存在时有效", valueKind: "string" },
    src: { name: "src", label: "图片地址", editor: "input", row: true, placeholder: "请输入图片地址", valueKind: "string" },
    borderColor: { name: "borderColor", label: "边框颜色", editor: "input", valueKind: "string", colorPicker: true },
    paperNumberFormat: { name: "paperNumberFormat", label: "页码格式", editor: "none", row: true, valueKind: "raw", visibleWhen: (values) => values.paperNumberDisabled !== true },
    paperNumberDisabled: { name: "paperNumberDisabled", label: "启用/禁用", editor: "select", options: [DEFAULT_OPTION, ["false", "启用"], ["true", "禁用"]], valueKind: "booleanTrue" },
    longTextIndent: { name: "longTextIndent", label: "每行缩进", editor: "select", options: [DEFAULT_OPTION, ...LINE_HEIGHT_PT_6_TO_36], valueKind: "number", prependUnknownOption: true },
    showInPage: { name: "showInPage", label: "显示规则", editor: "select", options: [DEFAULT_OPTION, ["first", "首页"], ["odd", "奇数页"], ["even", "偶数页"], ["last", "尾页"]], valueKind: "string" },
    panelPaperRule: { name: "panelPaperRule", label: "打印规则", editor: "select", options: [DEFAULT_OPTION, ["odd", "保持奇数"], ["even", "保持偶数"]], valueKind: "string" },
    leftSpaceRemoved: { name: "leftSpaceRemoved", label: "移除段落左侧空白", editor: "select", options: [DEFAULT_OPTION, ["true", "移除"], ["false", "不移除"]], valueKind: "booleanFalse", setNullishToEmptyString: true },
    firstPaperFooter: { name: "firstPaperFooter", label: "首页页尾", editor: "input", row: true, placeholder: "首页页尾", valueKind: "number" },
    lastPaperFooter: { name: "lastPaperFooter", label: "尾页页尾", editor: "input", row: true, placeholder: "尾页页尾", valueKind: "number" },
    evenPaperFooter: { name: "evenPaperFooter", label: "偶数页页尾", editor: "input", row: true, placeholder: "偶数页页尾", valueKind: "number" },
    oddPaperFooter: { name: "oddPaperFooter", label: "奇数页页尾", editor: "input", row: true, placeholder: "奇数页页尾", valueKind: "number" },
    fixed: { name: "fixed", label: "位置固定", editor: "select", options: [DEFAULT_OPTION, ["false", "否"], ["true", "是"]], valueKind: "booleanTrue", setNullishToEmptyString: true },
    axis: { name: "axis", label: "拖动方向", editor: "select", options: [DEFAULT_OPTION, ["v", "横向"], ["h", "竖向"]], valueKind: "raw" },
    topOffset: { name: "topOffset", label: "顶部偏移", editor: "input", row: true, placeholder: "偏移量pt", valueKind: "number" },
    leftOffset: { name: "leftOffset", label: "左偏移", editor: "input", row: true, placeholder: "偏移量pt", valueKind: "number" },
    lHeight: { name: "lHeight", label: "最低高度", editor: "input", row: true, placeholder: "文本过短或为空时的高度", valueKind: "number" },
    unShowInPage: { name: "unShowInPage", label: "隐藏规则", editor: "select", options: [DEFAULT_OPTION, ["first", "首页"], ["last", "尾页"]], valueKind: "raw" },
    tableBodyRowBorder: { name: "tableBodyRowBorder", label: "表体行边框", editor: "select", options: ROW_BORDER_OPTIONS, valueKind: "string" },
    transform: { name: "transform", label: "旋转角度", editor: "input", valueKind: "number" },
    optionsGroup: { name: "optionsGroup", label: "边框设置", editor: "none", valueKind: "none", html: ` <div class="${optionItemClasses(true)}">
        <div class="${OPTION_PANEL_CLASS_NAMES.label}">
        边框设置
        </div>
       
    </div>` },
    borderTop: { name: "borderTop", label: "上边框", editor: "select", options: BORDER_SIDE_OPTIONS, valueKind: "raw" },
    borderLeft: { name: "borderLeft", label: "左边框", editor: "select", options: BORDER_SIDE_OPTIONS, valueKind: "raw" },
    borderRight: { name: "borderRight", label: "右边框", editor: "select", options: BORDER_SIDE_OPTIONS, valueKind: "raw" },
    borderBottom: { name: "borderBottom", label: "下边框", editor: "select", options: BORDER_SIDE_OPTIONS, valueKind: "raw" },
    contentPaddingTop: { name: "contentPaddingTop", label: "上内边距", editor: "select", options: [DEFAULT_OPTION, ...COMMON_PADDING_PT], valueKind: "number", prependUnknownOption: true },
    contentPaddingLeft: { name: "contentPaddingLeft", label: "左内边距", editor: "select", options: [DEFAULT_OPTION, ...COMMON_PADDING_PT], valueKind: "number", prependUnknownOption: true },
    contentPaddingRight: { name: "contentPaddingRight", label: "右内边距", editor: "select", options: [DEFAULT_OPTION, ...COMMON_PADDING_PT], valueKind: "number", prependUnknownOption: true },
    contentPaddingBottom: { name: "contentPaddingBottom", label: "下内边距", editor: "select", options: [DEFAULT_OPTION, ...COMMON_PADDING_PT], valueKind: "number", prependUnknownOption: true },
    borderStyle: { name: "borderStyle", label: "边框样式", editor: "select", options: [DEFAULT_OPTION, ["solid", "实线"], ["dotted", "虚线"]], valueKind: "raw" },
    backgroundColor: { name: "backgroundColor", label: "背景颜色", editor: "input", valueKind: "string", colorPicker: true },
    orient: { name: "orient", label: "纸张方向(仅自定义)", editor: "select", options: [DEFAULT_OPTION, ["1", "纵向"], ["2", "横向"]], valueKind: "number" },
    textContentVerticalAlign: { name: "textContentVerticalAlign", label: "上下对齐", editor: "select", options: [DEFAULT_OPTION, ["middle", "垂直居中"], ["bottom", "底部"]], valueKind: "string" },
    gridColumns: { name: "gridColumns", label: "一行多组", editor: "select", options: [DEFAULT_OPTION, ["2", "一行二列"], ["3", "一行三列"], ["4", "一行四列"]], valueKind: "number", prependUnknownOption: true },
    gridColumnsGutter: { name: "gridColumnsGutter", label: "一行多组间隔", editor: "select", options: [DEFAULT_OPTION, ["1.5", "1.5pt"], ["2.25", "2.25pt"], ["3", "3pt"], ["3.75", "3.75pt"], ["4.5", "4.5pt"], ["5.25", "5.25pt"], ["6", "6pt"], ["6.75", "6.75pt"], ["7.25", "7.25pt"], ["8.5", "8.5pt"], ["9", "9pt"]], valueKind: "number", prependUnknownOption: true, disabledWhen: (values) => !(typeof values.gridColumns === "number" && values.gridColumns > 1) },
    paddingTop: { name: "paddingTop", label: "上内边距", editor: "select", options: [DEFAULT_OPTION, ...COMMON_PADDING_PT], valueKind: "number", prependUnknownOption: true },
    paddingLeft: { name: "paddingLeft", label: "左内边距", editor: "select", options: [DEFAULT_OPTION, ...COMMON_PADDING_PT], valueKind: "number", prependUnknownOption: true },
    paddingRight: { name: "paddingRight", label: "右内边距", editor: "select", options: [DEFAULT_OPTION, ...COMMON_PADDING_PT], valueKind: "number", prependUnknownOption: true },
    paddingBottom: { name: "paddingBottom", label: "下内边距", editor: "select", options: [DEFAULT_OPTION, ...COMMON_PADDING_PT], valueKind: "number", prependUnknownOption: true },
    formatter: { name: "formatter", label: "格式化函数", editor: "textarea", placeholder: "", valueKind: "raw" },
    styler: { name: "styler", label: "样式函数", editor: "textarea", placeholder: "function(value, options, target,templateData){}", valueKind: "raw" },
    footerFormatter: { name: "footerFormatter", label: "表格脚函数", editor: "textarea", placeholder: "function(options,rows,data){ return '<tr></tr>' }; }", valueKind: "raw" },
    gridColumnsFooterFormatter: { name: "gridColumnsFooterFormatter", label: "多组表格脚函数", editor: "textarea", placeholder: "function(options,rows,data){ return '' }; }", valueKind: "raw" },
    rowStyler: { name: "rowStyler", label: "行样式函数", editor: "textarea", placeholder: "请输入标题", valueKind: "raw" },
    halign: { name: "halign", label: "表头单元格左右对齐", editor: "select", options: CELL_ALIGN_OPTIONS, valueKind: "string" },
    align: { name: "align", label: "单元格左右对齐", editor: "select", options: CELL_ALIGN_OPTIONS, valueKind: "string" },
    vAlign: { name: "vAlign", label: "单元格上下对齐", editor: "select", options: [DEFAULT_OPTION, ["top", "上"], ["middle", "中"], ["bottom", "居右"]], valueKind: "string" },
    styler2: { name: "styler2", label: "单元格样式函数", editor: "textarea", placeholder: "function(value,row,index,options){ return {color:'red' }; }", valueKind: "raw" },
    formatter2: { name: "formatter2", label: "单元格格式化函数", editor: "textarea", placeholder: "function(value,row,index,options){ return ''; }", valueKind: "raw" },
    autoCompletion: { name: "autoCompletion", label: "自动补全", editor: "select", options: [DEFAULT_OPTION, ["true", "是"], ["false", "否"]], valueKind: "booleanTrue", setNullishToEmptyString: true },
    tableFooterRepeat: { name: "tableFooterRepeat", label: "表格脚显示", editor: "select", options: [DEFAULT_OPTION, ["no", "不显示"], ["page", "每页显示"], ["last", "最后显示"]], valueKind: "string" }
  };
  class FieldOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化属性面板对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
      super({ name: "field", label: "字段名", editor: "input", row: true, valueKind: "raw" });
      __publicField(this, "isSelect", false);
      __publicField(this, "usesDataBinding", false);
      __publicField(this, "dataSources", []);
      __publicField(this, "printElement");
      __publicField(this, "options");
      __publicField(this, "mode", "value");
      __publicField(this, "pickerOptions", []);
      __publicField(this, "selectedPickerValue", "");
    }
    /**
     * 中文说明：处理属性面板的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    createTarget(printElement, options2, printElementType) {
      var _a, _b, _c, _d, _e;
      this.printElement = printElement;
      this.options = options2 || {};
      this.dataSources = getTemplateDataSources(printElement);
      this.mode = this.resolveMode(printElement, options2);
      if (this.dataSources.length) {
        injectFieldPickerCss();
        const canAutoFill = isTablePrintElement(printElement) && !this.isColumnOptions(options2);
        if (canAutoFill) injectTableAutoFillCss();
        const autoFillDisabled = canAutoFill && !hasTableBindingField(printElement);
        const fieldPickerClassNames = OPTION_PANEL_CLASS_NAMES.fieldPicker;
        this.usesDataBinding = true;
        this.isSelect = true;
        this.target = $(`
        <div class="${optionItemClasses(true, OPTION_PANEL_CLASS_NAMES.dataBindingItem)}">
          <div class="${OPTION_PANEL_CLASS_NAMES.label}">字段</div>
          <div class="${OPTION_PANEL_CLASS_NAMES.field} ${canAutoFill ? "hiprint-field-picker-row" : ""}">
            <div class="${fieldPickerClassNames.root}">
              <button type="button" class="${classes(fieldPickerClassNames.trigger, OPTION_PANEL_CLASS_NAMES.state.empty)}">不绑定</button>
              <input type="hidden" class="${classes(OPTION_PANEL_CLASS_NAMES.dataBindingField, OPTION_PANEL_CLASS_NAMES.autoSubmit)}">
              <div class="${fieldPickerClassNames.popover}">
                <select class="${fieldPickerClassNames.sourceFilter}"></select>
                <input type="text" class="${fieldPickerClassNames.search}" placeholder="搜索字段名或路径" autocomplete="off">
                <div class="${fieldPickerClassNames.list}"></div>
              </div>
            </div>
            ${canAutoFill ? `<button type="button" class="${OPTION_PANEL_CLASS_NAMES.tableAutoFillButton} ${OPTION_PANEL_CLASS_NAMES.tableAutoFill}" title="一键填充列" ${autoFillDisabled ? "disabled" : ""}>一键填充列</button>` : ""}
          </div>
        </div>
      `);
        this.pickerOptions = this.createFieldPickerOptions();
        this.bindFieldPickerEvents();
        if (canAutoFill) (_b = (_a = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.tableAutoFillButton))).on) == null ? void 0 : _b.call(_a, "click", () => this.applyAutoFillColumns());
        this.renderFieldPickerOptions("");
        return this.target;
      }
      const fields = ((_c = printElementType == null ? void 0 : printElementType.getFields) == null ? void 0 : _c.call(printElementType)) || ((_e = (_d = printElement == null ? void 0 : printElement.printElementType) == null ? void 0 : _d.getFields) == null ? void 0 : _e.call(_d));
      if (fields) {
        this.usesDataBinding = false;
        this.isSelect = true;
        const html = ` <div class="${optionItemClasses(true)}">
            <div class="${OPTION_PANEL_CLASS_NAMES.label}">
            字段
            </div>
            <div class="${OPTION_PANEL_CLASS_NAMES.field}">
            <select class="${OPTION_PANEL_CLASS_NAMES.autoSubmit}">
                <option value="" >请选择字段</option>${fields.map((field) => ` <option value="${field.field || ""}" >${field.text || ""}</option>`).join("")}
             </select>
            </div>
        </div>`;
        this.target = $(html);
      } else {
        this.usesDataBinding = false;
        this.isSelect = true;
        this.target = $(` <div class="${optionItemClasses(true)}">
            <div class="${OPTION_PANEL_CLASS_NAMES.label}">
            字段
            </div>
            <div class="${OPTION_PANEL_CLASS_NAMES.field}">
            <select class="${OPTION_PANEL_CLASS_NAMES.autoSubmit}" disabled>
                <option value="" >请先配置数据源</option>
             </select>
            </div>
        </div>`);
      }
      return this.target;
    }
    /**
     * 中文说明：处理属性面板的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getValue() {
      if (!this.usesDataBinding) return (this.isSelect ? this.target.find("select").val() : this.target.find("input").val()) || void 0;
      const raw = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataBindingField)).val();
      if (!raw) return { field: void 0, dataBinding: void 0 };
      const [sourceId, ...pathParts] = raw.toString().split("|");
      const path = pathParts.join("|") || void 0;
      return {
        field: path,
        dataBinding: normalizeDataBinding({
          sourceId: sourceId || void 0,
          path
        })
      };
    }
    /**
     * 中文说明：处理属性面板的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    setValue(value, options2) {
      var _a;
      if (this.usesDataBinding) {
        const binding = normalizeDataBinding((options2 == null ? void 0 : options2.dataBinding) || ((_a = this.options) == null ? void 0 : _a.dataBinding));
        const field = value == null || value === "" ? void 0 : value.toString();
        this.setPickerValue(this.resolveSelectedBindingValue(binding, field), false);
        return;
      }
      if (this.isSelect) {
        if (value) {
          const option2 = this.target.find(`option[value="${value}"]`);
          if (!option2.length) this.target.find("select").prepend(`<option value="${value}" >${value}</option>`);
          this.target.find("select").val(value);
        }
      } else this.target.find("input").val(value);
    }
    createFieldPickerOptions() {
      var _a, _b;
      const store = createDataSourceStore(this.dataSources);
      if (this.isColumnOptions(this.options)) {
        return store.searchColumnCandidates((_b = (_a = this.printElement) == null ? void 0 : _a.options) == null ? void 0 : _b.dataBinding).map((field) => ({
          value: `|${field.path}`,
          sourceId: "",
          field: field.path,
          label: field.displayLabel,
          detail: field.path
        }));
      }
      return store.searchCandidates(this.mode).map((field) => ({
        value: `${field.sourceId}|${field.path}`,
        sourceId: field.sourceId,
        field: field.path,
        label: field.displayLabel,
        detail: field.path
      }));
    }
    bindFieldPickerEvents() {
      var _a, _b, _c, _d, _e, _f;
      const fieldPickerClassNames = OPTION_PANEL_CLASS_NAMES.fieldPicker;
      const picker = this.target.find(selector(fieldPickerClassNames.root));
      const sourceFilter = this.target.find(selector(fieldPickerClassNames.sourceFilter));
      const search = this.target.find(selector(fieldPickerClassNames.search));
      (_b = (_a = this.target.find(selector(fieldPickerClassNames.trigger))).on) == null ? void 0 : _b.call(_a, "click", () => {
        picker.addClass(OPTION_PANEL_CLASS_NAMES.state.open);
        search.val("");
        this.renderFieldPickerOptions("");
      });
      (_c = sourceFilter.on) == null ? void 0 : _c.call(sourceFilter, "change", () => this.renderFieldPickerOptions((search.val() || "").toString()));
      (_d = search.on) == null ? void 0 : _d.call(search, "input", () => this.renderFieldPickerOptions((search.val() || "").toString()));
      (_f = (_e = this.target.find(selector(fieldPickerClassNames.list))).on) == null ? void 0 : _f.call(_e, "click", (event) => {
        var _a2, _b2, _c2;
        let element = event == null ? void 0 : event.target;
        while (element && !((_a2 = element.classList) == null ? void 0 : _a2.contains(fieldPickerClassNames.option))) element = element.parentElement || void 0;
        if (!element) return;
        const value = (_c2 = (_b2 = $(element)).attr) == null ? void 0 : _c2.call(_b2, "data-value");
        if (value == null) return;
        this.setPickerValue(value, true);
        picker.removeClass(OPTION_PANEL_CLASS_NAMES.state.open);
      });
    }
    renderFieldPickerOptions(query) {
      this.renderSourceFilter();
      const selectedSourceId = (this.target.find(selector(OPTION_PANEL_CLASS_NAMES.fieldPicker.sourceFilter)).val() || "").toString();
      const matched = filterBindingFieldCandidates(this.pickerOptions, { query, sourceId: selectedSourceId, limit: 80 });
      const fieldPickerClassNames = OPTION_PANEL_CLASS_NAMES.fieldPicker;
      const html = [this.renderFieldPickerOption({ value: "", sourceId: "", field: "", label: "不绑定", detail: "不使用数据源字段" })];
      matched.forEach((option2) => html.push(this.renderFieldPickerOption(option2)));
      if (!matched.length && query.trim()) html.push(`<div class="${fieldPickerClassNames.empty}">没有匹配字段</div>`);
      if (!this.pickerOptions.length) html.push(`<div class="${fieldPickerClassNames.empty}">暂无可选字段，请先配置数据源</div>`);
      this.target.find(selector(fieldPickerClassNames.list)).html(html.join(""));
    }
    renderSourceFilter() {
      const target = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.fieldPicker.sourceFilter));
      if (!target.length) return;
      const current = (target.val() || "").toString();
      const sourceIds = new Set(this.pickerOptions.map((option2) => option2.sourceId).filter(Boolean));
      const sources = this.dataSources.filter((source2) => sourceIds.has(source2.id));
      const options2 = ['<option value="">全部数据源</option>'].concat(sources.map((source2) => `<option value="${escapeHtml$1(source2.id)}">${escapeHtml$1(source2.name || source2.id)}</option>`));
      target.html(options2.join(""));
      if (current && sourceIds.has(current)) target.val(current);
    }
    renderFieldPickerOption(option2) {
      const fieldPickerClassNames = OPTION_PANEL_CLASS_NAMES.fieldPicker;
      const className = classes(fieldPickerClassNames.option, option2.value === this.selectedPickerValue && OPTION_PANEL_CLASS_NAMES.state.active);
      return `<button type="button" class="${className}" data-value="${escapeHtml$1(option2.value)}">
      <span class="${fieldPickerClassNames.optionLabel}">${escapeHtml$1(option2.label)}</span>
      ${option2.detail ? `<span class="${fieldPickerClassNames.optionDetail}">${escapeHtml$1(option2.detail)}</span>` : ""}
    </button>`;
    }
    setPickerValue(value, shouldSubmit) {
      var _a, _b, _c, _d;
      this.selectedPickerValue = value || "";
      this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataBindingField)).val(this.selectedPickerValue);
      const selected = this.pickerOptions.find((option2) => option2.value === this.selectedPickerValue);
      const label = (selected == null ? void 0 : selected.label) || "不绑定";
      if (shouldSubmit && this.isColumnOptions(this.options) && (selected == null ? void 0 : selected.label)) {
        const panel = (_b = (_a = this.target[0]) == null ? void 0 : _a.closest) == null ? void 0 : _b.call(_a, `.${OPTION_PANEL_CLASS_NAMES.panel}`);
        const titleInput = (_c = panel == null ? void 0 : panel.querySelector) == null ? void 0 : _c.call(panel, "textarea");
        if (titleInput) {
          titleInput.value = selected.label;
        }
      }
      this.target.find(selector(OPTION_PANEL_CLASS_NAMES.fieldPicker.trigger)).html(escapeHtml$1(label))[this.selectedPickerValue ? "removeClass" : "addClass"](OPTION_PANEL_CLASS_NAMES.state.empty);
      this.renderFieldPickerOptions((this.target.find(selector(OPTION_PANEL_CLASS_NAMES.fieldPicker.search)).val() || "").toString());
      if (shouldSubmit) (_d = this.submit) == null ? void 0 : _d.call(this, this.getValue());
      this.updateAutoFillButtonState(!!this.selectedPickerValue);
    }
    updateAutoFillButtonState(enabled) {
      var _a;
      const button = (_a = this.target) == null ? void 0 : _a.find(selector(OPTION_PANEL_CLASS_NAMES.tableAutoFillButton));
      if ((button == null ? void 0 : button.length) && button[0]) button[0].disabled = !enabled;
    }
    resolveMode(printElement, options2) {
      var _a;
      if (this.isColumnOptions(options2)) return "value";
      if (options2 && options2.columns) return "array";
      const type = (_a = printElement == null ? void 0 : printElement.printElementType) == null ? void 0 : _a.type;
      return type === "tableCustom" ? "array" : "value";
    }
    getColumnContextFields() {
      var _a, _b;
      if (!this.isColumnOptions(this.options)) return void 0;
      return createDataSourceStore(this.dataSources).getColumnContext((_b = (_a = this.printElement) == null ? void 0 : _a.options) == null ? void 0 : _b.dataBinding).rowFields;
    }
    isColumnOptions(options2) {
      return (options2 == null ? void 0 : options2.__bindingContext) === "tableColumn";
    }
    resolveSelectedBindingValue(binding, field) {
      if (binding) return `${binding.sourceId || ""}|${binding.path || ""}`;
      if (!field) return "";
      if (this.getColumnContextFields()) return `|${field}`;
      if (this.dataSources.length === 1) {
        const source2 = this.dataSources[0];
        const matched = createDataSourceStore([source2]).searchCandidates(this.mode).some((item) => item.path === field);
        if (matched) return `${source2.id}|${field}`;
      }
      return `|${field}`;
    }
    applyAutoFillColumns() {
      var _a, _b, _c, _d;
      const printElement = this.printElement;
      const fields = getAutoFillFields(printElement);
      const rows = getTableRows(printElement);
      if (!fields.length || !rows.length) return;
      const row = rows[0];
      if (!row.columns) row.columns = [];
      const baseColumn = row.columns[row.columns.length - 1];
      while (row.columns.length < fields.length) {
        row.columns.push(new TableColumn(cloneColumnStyle(baseColumn)));
      }
      const width = parseFloat((((_b = (_a = printElement == null ? void 0 : printElement.options) == null ? void 0 : _a.getWidth) == null ? void 0 : _b.call(_a)) ?? ((_c = printElement == null ? void 0 : printElement.options) == null ? void 0 : _c.width) ?? 0).toString());
      const nextColumnWidth = width && row.columns.length ? width / row.columns.length : void 0;
      fields.forEach((field, index) => {
        const column2 = row.columns[index];
        if (!column2) return;
        column2.title = field.displayLabel || field.label || field.name;
        column2.field = field.path;
        column2.dataBinding = normalizeDataBinding({ path: field.path });
        column2.checked = true;
        if (nextColumnWidth) column2.width = nextColumnWidth;
      });
      (_d = printElement == null ? void 0 : printElement.updateDesignViewFromOptions) == null ? void 0 : _d.call(printElement);
      if (printElement == null ? void 0 : printElement.templateId) hinnn.event.trigger(`hiprintTemplateDataChanged_${printElement.templateId}`);
    }
  }
  function escapeHtml$1(value) {
    return (value == null ? "" : value.toString()).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function getTemplateDataSources(printElement) {
    var _a;
    if (!(printElement == null ? void 0 : printElement.templateId)) return [];
    const template = HiPrintlib.instance.getPrintTemplateById(printElement.templateId);
    return ((_a = template == null ? void 0 : template.getDataSources) == null ? void 0 : _a.call(template)) || [];
  }
  function isTablePrintElement(printElement) {
    var _a;
    const type = (_a = printElement == null ? void 0 : printElement.printElementType) == null ? void 0 : _a.type;
    return type === "tableCustom";
  }
  function getTableRows(printElement) {
    var _a, _b;
    return ((_a = printElement == null ? void 0 : printElement.getColumns) == null ? void 0 : _a.call(printElement)) || (printElement == null ? void 0 : printElement.columns) || ((_b = printElement == null ? void 0 : printElement.options) == null ? void 0 : _b.columns) || [];
  }
  function cloneColumnStyle(column2) {
    return {
      width: column2 == null ? void 0 : column2.width,
      align: column2 == null ? void 0 : column2.align,
      halign: column2 == null ? void 0 : column2.halign,
      vAlign: column2 == null ? void 0 : column2.vAlign,
      formatter2: column2 == null ? void 0 : column2.formatter2,
      styler2: column2 == null ? void 0 : column2.styler2,
      textType: column2 == null ? void 0 : column2.textType,
      barcodeMode: column2 == null ? void 0 : column2.barcodeMode,
      renderWidth: column2 == null ? void 0 : column2.renderWidth,
      renderHeight: column2 == null ? void 0 : column2.renderHeight,
      paddingTop: column2 == null ? void 0 : column2.paddingTop,
      paddingLeft: column2 == null ? void 0 : column2.paddingLeft,
      paddingRight: column2 == null ? void 0 : column2.paddingRight,
      paddingBottom: column2 == null ? void 0 : column2.paddingBottom,
      rowspan: 1,
      colspan: 1,
      checked: true
    };
  }
  function getAutoFillFields(printElement) {
    var _a;
    return createDataSourceStore(getTemplateDataSources(printElement)).searchColumnCandidates((_a = printElement == null ? void 0 : printElement.options) == null ? void 0 : _a.dataBinding);
  }
  function hasTableBindingField(printElement) {
    var _a, _b;
    return !!((_b = normalizeDataBinding((_a = printElement == null ? void 0 : printElement.options) == null ? void 0 : _a.dataBinding)) == null ? void 0 : _b.path);
  }
  class DataBindingOptionItem {
    constructor() {
      __publicField(this, "name", "dataBinding");
      __publicField(this, "target");
      __publicField(this, "dataSources", []);
      __publicField(this, "pickerOptions", []);
      __publicField(this, "selectedPickerValue", "");
      __publicField(this, "printElement");
      __publicField(this, "mode", "value");
      __publicField(this, "submit");
    }
    createTarget(printElement, options2) {
      var _a, _b;
      this.printElement = printElement;
      this.dataSources = getTemplateDataSources(printElement);
      this.mode = this.resolveMode(printElement, options2);
      injectFieldPickerCss();
      const fieldPickerClassNames = OPTION_PANEL_CLASS_NAMES.fieldPicker;
      this.target = $(`
      <div class="${optionItemClasses(true, OPTION_PANEL_CLASS_NAMES.dataBindingItem)}">
        <div class="${OPTION_PANEL_CLASS_NAMES.label}">数据绑定</div>
        <div class="${OPTION_PANEL_CLASS_NAMES.field}">
          <div class="${fieldPickerClassNames.root}">
            <button type="button" class="${classes(fieldPickerClassNames.trigger, OPTION_PANEL_CLASS_NAMES.state.empty)}">不绑定</button>
            <input type="hidden" class="${classes(OPTION_PANEL_CLASS_NAMES.dataBindingField, OPTION_PANEL_CLASS_NAMES.autoSubmit)}">
            <div class="${fieldPickerClassNames.popover}">
              <select class="${fieldPickerClassNames.sourceFilter}"></select>
              <input type="text" class="${fieldPickerClassNames.search}" placeholder="搜索字段名或路径" autocomplete="off">
              <div class="${fieldPickerClassNames.list}"></div>
            </div>
          </div>
          <input class="${classes(OPTION_PANEL_CLASS_NAMES.dataBindingFallback, OPTION_PANEL_CLASS_NAMES.autoSubmit)}" type="text" placeholder="默认值">
          <button type="button" class="${OPTION_PANEL_CLASS_NAMES.dataBindingClear}">清除绑定</button>
        </div>
      </div>
    `);
      this.pickerOptions = this.createPickerOptions();
      this.bindPickerEvents();
      this.renderPickerOptions("");
      (_b = (_a = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataBindingClear))).on) == null ? void 0 : _b.call(_a, "click", () => {
        var _a2;
        this.setPickerValue("", false);
        this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataBindingFallback)).val("");
        (_a2 = this.submit) == null ? void 0 : _a2.call(this, this.getValue());
      });
      return this.target;
    }
    getValue() {
      const raw = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataBindingField)).val();
      const fallback = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataBindingFallback)).val();
      if (!raw) return void 0;
      const [sourceId, ...pathParts] = raw.toString().split("|");
      return normalizeDataBinding({
        sourceId: sourceId || void 0,
        path: pathParts.join("|") || void 0,
        fallback: fallback || void 0
      });
    }
    setValue(value) {
      const binding = normalizeDataBinding(value);
      this.setPickerValue(binding ? `${binding.sourceId || ""}|${binding.path || ""}` : "", false);
      this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataBindingFallback)).val((binding == null ? void 0 : binding.fallback) == null ? "" : binding.fallback);
    }
    destroy() {
      var _a, _b;
      (_b = (_a = this.target) == null ? void 0 : _a.remove) == null ? void 0 : _b.call(_a);
    }
    resolveMode(printElement, options2) {
      var _a;
      if (options2 && !options2.columns && (options2.field || options2.title)) return "value";
      if (options2 && options2.columns) return "array";
      const type = (_a = printElement == null ? void 0 : printElement.printElementType) == null ? void 0 : _a.type;
      return type === "tableCustom" ? "array" : "value";
    }
    createPickerOptions() {
      var _a, _b;
      const store = createDataSourceStore(this.dataSources);
      if (this.mode === "value" && isTablePrintElement(this.printElement)) {
        return store.searchColumnCandidates((_b = (_a = this.printElement) == null ? void 0 : _a.options) == null ? void 0 : _b.dataBinding).map((field) => ({
          value: `|${field.path}`,
          sourceId: "",
          field: field.path,
          label: field.displayLabel,
          detail: field.path
        }));
      }
      return store.searchCandidates(this.mode).map((field) => ({
        value: `${field.sourceId}|${field.path}`,
        sourceId: field.sourceId,
        field: field.path,
        label: field.displayLabel,
        detail: field.path
      }));
    }
    bindPickerEvents() {
      var _a, _b, _c, _d, _e, _f;
      const fieldPickerClassNames = OPTION_PANEL_CLASS_NAMES.fieldPicker;
      const picker = this.target.find(selector(fieldPickerClassNames.root));
      const sourceFilter = this.target.find(selector(fieldPickerClassNames.sourceFilter));
      const search = this.target.find(selector(fieldPickerClassNames.search));
      (_b = (_a = this.target.find(selector(fieldPickerClassNames.trigger))).on) == null ? void 0 : _b.call(_a, "click", () => {
        picker.addClass(OPTION_PANEL_CLASS_NAMES.state.open);
        search.val("");
        this.renderPickerOptions("");
      });
      (_c = sourceFilter.on) == null ? void 0 : _c.call(sourceFilter, "change", () => this.renderPickerOptions((search.val() || "").toString()));
      (_d = search.on) == null ? void 0 : _d.call(search, "input", () => this.renderPickerOptions((search.val() || "").toString()));
      (_f = (_e = this.target.find(selector(fieldPickerClassNames.list))).on) == null ? void 0 : _f.call(_e, "click", (event) => {
        var _a2, _b2, _c2;
        let element = event == null ? void 0 : event.target;
        while (element && !((_a2 = element.classList) == null ? void 0 : _a2.contains(fieldPickerClassNames.option))) element = element.parentElement || void 0;
        if (!element) return;
        const value = (_c2 = (_b2 = $(element)).attr) == null ? void 0 : _c2.call(_b2, "data-value");
        if (value == null) return;
        this.setPickerValue(value, true);
        picker.removeClass(OPTION_PANEL_CLASS_NAMES.state.open);
      });
    }
    renderPickerOptions(query) {
      this.renderSourceFilter();
      const selectedSourceId = (this.target.find(selector(OPTION_PANEL_CLASS_NAMES.fieldPicker.sourceFilter)).val() || "").toString();
      const matched = filterBindingFieldCandidates(this.pickerOptions, { query, sourceId: selectedSourceId, limit: 80 });
      const fieldPickerClassNames = OPTION_PANEL_CLASS_NAMES.fieldPicker;
      const html = [this.renderPickerOption({ value: "", sourceId: "", field: "", label: "不绑定", detail: "不使用数据源字段" })];
      matched.forEach((option2) => html.push(this.renderPickerOption(option2)));
      if (!matched.length && query.trim()) html.push(`<div class="${fieldPickerClassNames.empty}">没有匹配字段</div>`);
      if (!this.pickerOptions.length) html.push(`<div class="${fieldPickerClassNames.empty}">暂无可选字段，请先配置数据源</div>`);
      this.target.find(selector(fieldPickerClassNames.list)).html(html.join(""));
    }
    renderSourceFilter() {
      const target = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.fieldPicker.sourceFilter));
      if (!target.length) return;
      const current = (target.val() || "").toString();
      const sourceIds = new Set(this.pickerOptions.map((option2) => option2.sourceId).filter(Boolean));
      const sources = this.dataSources.filter((source2) => sourceIds.has(source2.id));
      const options2 = ['<option value="">全部数据源</option>'].concat(sources.map((source2) => `<option value="${escapeHtml$1(source2.id)}">${escapeHtml$1(source2.name || source2.id)}</option>`));
      target.html(options2.join(""));
      if (current && sourceIds.has(current)) target.val(current);
    }
    renderPickerOption(option2) {
      const fieldPickerClassNames = OPTION_PANEL_CLASS_NAMES.fieldPicker;
      const className = classes(fieldPickerClassNames.option, option2.value === this.selectedPickerValue && OPTION_PANEL_CLASS_NAMES.state.active);
      return `<button type="button" class="${className}" data-value="${escapeHtml$1(option2.value)}">
      <span class="${fieldPickerClassNames.optionLabel}">${escapeHtml$1(option2.label)}</span>
      ${option2.detail ? `<span class="${fieldPickerClassNames.optionDetail}">${escapeHtml$1(option2.detail)}</span>` : ""}
    </button>`;
    }
    setPickerValue(value, shouldSubmit) {
      var _a;
      this.selectedPickerValue = value || "";
      this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataBindingField)).val(this.selectedPickerValue);
      const selected = this.pickerOptions.find((option2) => option2.value === this.selectedPickerValue);
      const label = (selected == null ? void 0 : selected.label) || "不绑定";
      this.target.find(selector(OPTION_PANEL_CLASS_NAMES.fieldPicker.trigger)).html(escapeHtml$1(label))[this.selectedPickerValue ? "removeClass" : "addClass"](OPTION_PANEL_CLASS_NAMES.state.empty);
      this.renderPickerOptions((this.target.find(selector(OPTION_PANEL_CLASS_NAMES.fieldPicker.search)).val() || "").toString());
      if (shouldSubmit) (_a = this.submit) == null ? void 0 : _a.call(this, this.getValue());
    }
  }
  function isSameTableColumn(first, second) {
    if (first === second) return true;
    return !!first && !!second && first.field === second.field && first.title === second.title && first.descTitle === second.descTitle;
  }
  class ColumnsOptionItem {
    /**
     * 中文说明：初始化属性面板对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
      __publicField(this, "name", "columns");
      __publicField(this, "target");
      __publicField(this, "value");
      __publicField(this, "printElementType");
      __publicField(this, "allColumns", []);
      __publicField(this, "submit");
    }
    /**
     * 中文说明：创建target，供属性面板在设计器或打印渲染流程中使用。
     */
    createTarget() {
      $('<div class="indicator"></div>').appendTo("body");
      this.target = $(` <div class="${optionItemClasses(true)}">
       <div>
            <ul class="${OPTION_PANEL_CLASS_NAMES.tableSelectedColumns}"> </ul>
       </div>
    </div>`);
      return this.target;
    }
    /**
     * 中文说明：读取value，为属性面板的布局计算、序列化或渲染提供数据。
     */
    getValue() {
      return this.buildData();
    }
    /**
     * 中文说明：设置value，同步属性面板配置并影响后续显示或打印结果。
     */
    setValue(value, _options, printElementType) {
      var _a, _b, _c, _d, _e;
      this.value = value;
      this.printElementType = printElementType;
      const selectedColumns = ((_a = value[0]) == null ? void 0 : _a.columns) || [];
      const missingColumns = (printElementType.columns[0] || []).filter((column2) => selectedColumns.filter((selected) => isSameTableColumn(column2, selected)).length === 0).map((column2) => {
        const entity = new TableColumn(column2);
        entity.checked = false;
        return entity;
      });
      this.allColumns = selectedColumns.concat(missingColumns);
      if (value && value.length === 1) {
        this.target.find("ul").html(this.allColumns.map((column2, index) => `<li  class="${OPTION_PANEL_CLASS_NAMES.tableSelectedItem}"> <div class="hi-pretty p-default">
                ${column2.checked ? `<input type="checkbox"   checked data-column-index="${index}" />` : `<input type="checkbox"  data-column-index="${index}" />`}
                <div class="state">
                    <label></label>
                </div>
            </div><span class="${OPTION_PANEL_CLASS_NAMES.tableColumnTitle}">${column2.title || column2.descTitle || ""}</span></li>`).join(""));
        this.target.find("input").change(() => {
          var _a2;
          (_a2 = this.submit) == null ? void 0 : _a2.call(this);
        });
        if (this.printElementType.columnDisplayIndexEditable) {
          const owner = this;
          (_e = (_c = (_b = this.target.find("li")).hidraggable) == null ? void 0 : (_d = _c.call(_b, { revert: true, handle: selector(OPTION_PANEL_CLASS_NAMES.tableColumnTitle), moveUnit: "pt", deltaX: 0, deltaY: 0 })).hidroppable) == null ? void 0 : _e.call(_d, {
            onDragOver() {
              $(this).css("border-bottom-color", "red");
            },
            onDragLeave() {
              $(this).css("border-bottom-color", "");
            },
            onDrop(drag2, element) {
              var _a2, _b2, _c2;
              (_b2 = (_a2 = $(element)).insertAfter) == null ? void 0 : _b2.call(_a2, this);
              $(this).css("border-bottom-color", "");
              (_c2 = owner.submit) == null ? void 0 : _c2.call(owner);
            }
          });
        }
      }
    }
    /**
     * 中文说明：组装data，把模板配置转换为属性面板可用的结构。
     */
    buildData() {
      const columns = [];
      this.allColumns.filter((column2) => {
        column2.checked = false;
        return false;
      });
      (this.printElementType.columnDisplayEditable ? this.target.find("input:checked") : this.target.find("input")).map((_index, element) => {
        const columnIndex = parseInt(($(element).attr("data-column-index") || "").toString(), 10);
        const column2 = Number.isNaN(columnIndex) ? void 0 : this.allColumns[columnIndex];
        if (!column2) return;
        column2.checked = true;
        columns.push(column2);
      });
      this.value[0].columns = columns;
      return this.value;
    }
    /**
     * 中文说明：销毁属性面板控件引用，释放当前属性项绑定的 DOM 状态。
     */
    destroy() {
      var _a, _b;
      (_b = (_a = this.target) == null ? void 0 : _a.remove) == null ? void 0 : _b.call(_a);
    }
  }
  class DataTypeOptionItem {
    /**
     * 中文说明：初始化属性面板对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
      __publicField(this, "name", "dataType");
      __publicField(this, "target");
      __publicField(this, "submit");
    }
    /**
     * 中文说明：创建target，供属性面板在设计器或打印渲染流程中使用。
     */
    createTarget() {
      this.target = $(`
        <div class="${OPTION_PANEL_CLASS_NAMES.row}">
        <div class="${OPTION_PANEL_CLASS_NAMES.item}">
        <div class="${OPTION_PANEL_CLASS_NAMES.label}">
        数据类型
        </div>
        <div class="${OPTION_PANEL_CLASS_NAMES.field}">
        <select class="${OPTION_PANEL_CLASS_NAMES.dataType}">
        <option value="" >默认</option>
        <option value="rmbUppercase" >金额大写</option>
        <option value="datetime" >日期时间</option>
        <option value="boolean" >布尔</option>
        </select>
        </div>
    </div>
    <div class="${classes(OPTION_PANEL_CLASS_NAMES.item, OPTION_PANEL_CLASS_NAMES.dataTypeFormatItem)}">
        <div class="${OPTION_PANEL_CLASS_NAMES.label} ">
        格式
        </div>
        <div class="${OPTION_PANEL_CLASS_NAMES.field}">
        <select  class="${classes(OPTION_PANEL_CLASS_NAMES.autoSubmit, OPTION_PANEL_CLASS_NAMES.dataTypeSelectFormat)}">
        <option value="" >默认</option>
        
        </select>
        <input class="${classes(OPTION_PANEL_CLASS_NAMES.autoSubmit, OPTION_PANEL_CLASS_NAMES.dataTypeInputFormat)}" type="text" data-type="boolean" placeholder="true:false">
        </div>
    </div>
        </div>
        `);
      this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataType)).change(() => {
        var _a;
        const dataType = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataType)).val();
        this.loadFormatSelectByDataType(dataType);
        (_a = this.submit) == null ? void 0 : _a.call(this, this.getValue());
      });
      return this.target;
    }
    /**
     * 中文说明：读取value，为属性面板的布局计算、序列化或渲染提供数据。
     */
    getValue() {
      const dataType = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataType)).val();
      if (dataType) {
        const format = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataTypeFormat)).val();
        return { dataType: dataType.toString(), format: format ? format.toString() : void 0 };
      }
      return { dataType: void 0, format: void 0 };
    }
    /**
     * 中文说明：设置value，同步属性面板配置并影响后续显示或打印结果。
     */
    setValue(_value, optionValue) {
      this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataType)).val(optionValue.dataType || "");
      this.loadFormatSelectByDataType(optionValue.dataType);
      this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataTypeFormat)).val(optionValue.format || "");
    }
    /**
     * 中文说明：销毁属性面板控件引用，释放当前属性项绑定的 DOM 状态。
     */
    destroy() {
      var _a, _b;
      (_b = (_a = this.target) == null ? void 0 : _a.remove) == null ? void 0 : _b.call(_a);
    }
    /**
     * 中文说明：处理数据映射，把业务数据转换为属性面板渲染或打印所需的值。
     */
    loadFormatSelectByDataType(dataType) {
      const formatItem = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataTypeFormatItem));
      const selectFormat = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataTypeSelectFormat));
      const inputFormat = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.dataTypeInputFormat));
      if (dataType === "boolean") {
        formatItem.show();
        selectFormat.removeClass(OPTION_PANEL_CLASS_NAMES.dataTypeFormat).hide().val("");
        inputFormat.addClass(OPTION_PANEL_CLASS_NAMES.dataTypeFormat).show();
      } else if (dataType === "datetime") {
        formatItem.show();
        selectFormat.addClass(OPTION_PANEL_CLASS_NAMES.dataTypeFormat).show();
        inputFormat.removeClass(OPTION_PANEL_CLASS_NAMES.dataTypeFormat).hide().val("");
        selectFormat.html(`
            <option value="" >默认</option>
            <option value="M/d" >M/d</option><option value="MM/dd" >MM/dd</option><option value="yy/M/d" >yy/M/d</option><option value="yy/MM/dd" >yy/MM/dd</option><option value="yyyy/M/d" >yyyy/M/d</option><option value="yyyy/MM/dd" >yyyy/MM/dd</option>
            <option value="yy/M/d H:m" >yy/M/d H:m</option><option value="yy/M/d H:m:s" >yy/M/d H:m:s</option><option value="yy/M/d HH:mm" >yy/M/d HH:mm</option><option value="yy/M/d HH:mm:ss" >yy/M/d HH:mm:ss</option>
            <option value="yy/MM/dd H:m" >yy/MM/dd H:m</option><option value="yy/MM/dd H:m:s" >yy/MM/dd H:m:s</option><option value="yy/MM/dd HH:mm" >yy/MM/dd HH:mm</option><option value="yy/MM/dd HH:mm:ss" >yy/MM/dd HH:mm:ss</option>
            <option value="yyyy/M/d H:m" >yyyy/M/dd H:m</option><option value="yyyy/M/d H:m:s" >yyyy/M/d H:m:s</option><option value="yyyy/M/d HH:mm" >yyyy/M/d HH:mm</option><option value="yyyy/M/d HH:mm:ss" >yyyy/M/d HH:mm:ss</option>
            <option value="yyyy/MM/dd H:m" >yyyy/MM/dd H:m</option><option value="yyyy/MM/dd H:m:s" >yyyy/MM/dd H:m:s</option><option value="yyyy/MM/dd HH:mm" >yyyy/MM/dd HH:mm</option><option value="yyyy/MM/dd HH:mm:ss" >yyyy/MM/dd HH:mm:ss</option>
            <option value="M-d" >M-d</option><option value="MM-dd" >MM-dd</option><option value="yy-M-d" >yy-M-d</option><option value="yy-MM-dd" >yy-MM-dd</option><option value="yyyy-M-d" >yyyy-M-d</option><option value="yyyy-MM-dd" >yyyy-MM-dd</option>
            <option value="yy-M-d H:m" >yy-M-d H:m</option><option value="yy-M-d H:m:s" >yy-M-d H:m:s</option><option value="yy-M-d HH:mm" >yy-M-d HH:mm</option><option value="yy-M-d HH:mm:ss" >yy-M-d HH:mm:ss</option>
            <option value="yy-MM-dd H:m" >yy-MM-dd H:m</option><option value="yy-MM-dd H:m:s" >yy-MM-dd H:m:s</option><option value="yy-MM-dd HH:mm" >yy-MM-dd HH:mm</option><option value="yy-MM-dd HH:mm:ss" >yy-MM-dd HH:mm:ss</option>
            <option value="yyyy-M-d H:m" >yyyy-M-d H:m</option><option value="yyyy-M-d H:m:s" >yyyy-M-d H:m:s</option><option value="yyyy-M-d HH:mm" >yyyy-M-d HH:mm</option><option value="yyyy-M-d HH:mm:ss" >yyyy-M-d HH:mm:ss</option>
            <option value="yyyy-MM-dd H:m" >yyyy-MM-dd H:m</option><option value="yyyy-MM-dd H:m:s" >yyyy-MM-dd H:m:s</option><option value="yyyy-MM-dd HH:mm" >yyyy-MM-dd HH:mm</option><option value="yyyy-MM-dd HH:mm:ss" >yyyy-MM-dd HH:mm:ss</option>
        `);
      } else if (dataType === "rmbUppercase" || dataType === "rmb" || dataType === "amountUppercase") {
        formatItem.hide();
        selectFormat.removeClass(OPTION_PANEL_CLASS_NAMES.dataTypeFormat).hide().val("");
        inputFormat.removeClass(OPTION_PANEL_CLASS_NAMES.dataTypeFormat).hide().val("");
      } else {
        formatItem.hide();
        selectFormat.removeClass(OPTION_PANEL_CLASS_NAMES.dataTypeFormat).hide().val("").html('\n            <option value="" >默认</option>\n        ');
        inputFormat.removeClass(OPTION_PANEL_CLASS_NAMES.dataTypeFormat).hide().val("");
      }
    }
  }
  class FontFamilyOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Font Family 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.fontFamily);
    }
  }
  class FontSizeOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Font Size 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.fontSize);
    }
  }
  class FontWeightOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Font Weight 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.fontWeight);
    }
  }
  class LetterSpacingOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Letter Spacing 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.letterSpacing);
    }
  }
  class LineHeightOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Line Height 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.lineHeight);
    }
  }
  class TextAlignOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Text Align 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.textAlign);
    }
  }
  class HideTitleOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Hide Title 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.hideTitle);
    }
  }
  class TitleSeparatorOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Title Separator 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.titleSeparator);
    }
  }
  class TextTypeOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Text Type 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.textType);
    }
  }
  class SummaryAggregateOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Summary Aggregate 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.summaryAggregate);
    }
  }
  class SummaryValueTypeOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Summary Value Type 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.summaryValueType);
    }
  }
  class SummaryLabelOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Summary Label 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.summaryLabel);
    }
    createTarget() {
      var _a, _b;
      const target = super.createTarget();
      (_b = (_a = target.find("input")).on) == null ? void 0 : _b.call(_a, "input", () => {
        var _a2;
        (_a2 = this.submit) == null ? void 0 : _a2.call(this, this.getValue());
      });
      return target;
    }
  }
  class TableBorderOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Table Border 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.tableBorder);
    }
  }
  class TableHeaderBorderOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Table Header Border 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.tableHeaderBorder);
    }
  }
  class TableHeaderCellBorderOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Table Header Cell Border 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.tableHeaderCellBorder);
    }
  }
  class TableHeaderRowHeightOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Table Header Row Height 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.tableHeaderRowHeight);
    }
  }
  class TableHeaderFontSizeOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Table Header Font Size 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.tableHeaderFontSize);
    }
  }
  class TableHeaderFontWeightOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Table Header Font Weight 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.tableHeaderFontWeight);
    }
  }
  class TableBodyCellBorderOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Table Body Cell Border 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.tableBodyCellBorder);
    }
  }
  class TableBodyRowHeightOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Table Body Row Height 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.tableBodyRowHeight);
    }
  }
  class TableHeaderBackgroundOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Table Header Background 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.tableHeaderBackground);
    }
  }
  class BorderWidthOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Border Width 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.borderWidth);
    }
  }
  class BarcodeModeOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Barcode Mode 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.barcodeMode);
    }
  }
  class RenderWidthOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Render Width 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.renderWidth);
    }
  }
  class RenderHeightOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Render Height 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.renderHeight);
    }
  }
  class ColorOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Color 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.color);
    }
  }
  class TextDecorationOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Text Decoration 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.textDecoration);
    }
  }
  class TitleOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Title 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.title);
    }
  }
  class TestDataOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Test Data 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.testData);
    }
  }
  class SrcOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Src 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.src);
    }
    createTarget() {
      var _a, _b, _c;
      injectImageSourceCss();
      this.target = $(`
      <div class="${optionItemClasses(true)}">
        <div class="${OPTION_PANEL_CLASS_NAMES.label}">图片来源</div>
        <div class="${OPTION_PANEL_CLASS_NAMES.field}">
          <div class="${OPTION_PANEL_CLASS_NAMES.imageSource}">
            <input type="text" class="${classes(OPTION_PANEL_CLASS_NAMES.autoSubmit, OPTION_PANEL_CLASS_NAMES.imageSourceInput)}" placeholder="本地路径 / URL / base64">
            <button type="button" class="${OPTION_PANEL_CLASS_NAMES.imageSourceUpload}">上传</button>
            <input type="file" class="${OPTION_PANEL_CLASS_NAMES.imageSourceFile}" accept="image/*">
          </div>
        </div>
      </div>
    `);
      const fileInput = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.imageSourceFile));
      (_b = (_a = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.imageSourceUpload))).on) == null ? void 0 : _b.call(_a, "click", () => {
        var _a2, _b2;
        (_b2 = (_a2 = fileInput[0]) == null ? void 0 : _a2.click) == null ? void 0 : _b2.call(_a2);
      });
      (_c = fileInput.on) == null ? void 0 : _c.call(fileInput, "change", (event) => {
        var _a2, _b2;
        const file = (_b2 = (_a2 = event == null ? void 0 : event.target) == null ? void 0 : _a2.files) == null ? void 0 : _b2[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          var _a3;
          const value = (reader.result || "").toString();
          this.target.find(selector(OPTION_PANEL_CLASS_NAMES.imageSourceInput)).val(value);
          (_a3 = this.submit) == null ? void 0 : _a3.call(this, value);
        };
        reader.readAsDataURL(file);
      });
      return this.target;
    }
    getValue() {
      return parseEditorValue(this.target.find(selector(OPTION_PANEL_CLASS_NAMES.imageSourceInput)).val(), "string");
    }
    setValue(value) {
      this.target.find(selector(OPTION_PANEL_CLASS_NAMES.imageSourceInput)).val(value == null ? "" : value.toString());
    }
  }
  class BorderColorOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Border Color 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.borderColor);
    }
  }
  class PaperNumberFormatOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Paper Number Format 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.paperNumberFormat);
    }
    createTarget() {
      this.target = $(` <div class="${optionItemClasses(true)}">
        <div class="${OPTION_PANEL_CLASS_NAMES.label}">
        页码格式
        </div>
        <div class="${OPTION_PANEL_CLASS_NAMES.field}">
          <div class="${OPTION_PANEL_CLASS_NAMES.paperNumberFormat}">
            <select class="${classes(OPTION_PANEL_CLASS_NAMES.paperNumberFormatSelect, OPTION_PANEL_CLASS_NAMES.autoSubmit)}">
              ${PAPER_NUMBER_FORMAT_OPTIONS.map(([value, title]) => optionHtml(value, title)).join("\n              ")}
            </select>
            <input class="${classes(OPTION_PANEL_CLASS_NAMES.paperNumberFormatCustom, OPTION_PANEL_CLASS_NAMES.autoSubmit)}" type="text" placeholder="例如：第 paperNo 页 / 共 paperCount 页" style="display:none;margin-top:6px;">
          </div>
        </div>
    </div>`);
      this.target.find(selector(OPTION_PANEL_CLASS_NAMES.paperNumberFormatSelect)).change(() => {
        this.updateCustomInputVisible();
      });
      return this.target;
    }
    getValue() {
      const selected = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.paperNumberFormatSelect)).val();
      if (!selected) return void 0;
      if (selected !== PAPER_NUMBER_FORMAT_CUSTOM_VALUE) return selected;
      const customValue = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.paperNumberFormatCustom)).val();
      return customValue ? customValue.toString() : void 0;
    }
    setValue(value) {
      const nextValue = value == null ? "" : value.toString();
      const select = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.paperNumberFormatSelect));
      const presetValues = PAPER_NUMBER_FORMAT_OPTIONS.map(([optionValue]) => optionValue);
      if (!nextValue || presetValues.includes(nextValue)) {
        select.val(nextValue);
        this.target.find(selector(OPTION_PANEL_CLASS_NAMES.paperNumberFormatCustom)).val("");
      } else {
        select.val(PAPER_NUMBER_FORMAT_CUSTOM_VALUE);
        this.target.find(selector(OPTION_PANEL_CLASS_NAMES.paperNumberFormatCustom)).val(nextValue);
      }
      this.updateCustomInputVisible();
    }
    updateCustomInputVisible() {
      const selected = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.paperNumberFormatSelect)).val();
      const customInput = this.target.find(selector(OPTION_PANEL_CLASS_NAMES.paperNumberFormatCustom));
      if (selected === PAPER_NUMBER_FORMAT_CUSTOM_VALUE) customInput.show();
      else customInput.hide();
    }
  }
  class PaperNumberDisabledOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Paper Number Disabled 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.paperNumberDisabled);
    }
  }
  class LongTextIndentOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Long Text Indent 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.longTextIndent);
    }
  }
  class ShowInPageOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Show In Page 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.showInPage);
    }
  }
  class PanelPaperRuleOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Panel Paper Rule 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.panelPaperRule);
    }
  }
  class LeftSpaceRemovedOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Left Space Removed 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.leftSpaceRemoved);
    }
  }
  class FirstPaperFooterOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 First Paper Footer 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.firstPaperFooter);
    }
  }
  class LastPaperFooterOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Last Paper Footer 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.lastPaperFooter);
    }
  }
  class EvenPaperFooterOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Even Paper Footer 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.evenPaperFooter);
    }
  }
  class OddPaperFooterOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Odd Paper Footer 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.oddPaperFooter);
    }
  }
  class FixedOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Fixed 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.fixed);
    }
  }
  class AxisOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Axis 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.axis);
    }
  }
  class TopOffsetOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Top Offset 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.topOffset);
    }
  }
  class LeftOffsetOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Left Offset 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.leftOffset);
    }
  }
  class LHeightOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 L Height 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.lHeight);
    }
  }
  class UnShowInPageOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Un Show In Page 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.unShowInPage);
    }
  }
  class TableBodyRowBorderOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Table Body Row Border 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.tableBodyRowBorder);
    }
  }
  class TransformOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Transform 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.transform);
    }
  }
  class OptionsGroupOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Options Group 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.optionsGroup);
    }
  }
  class BorderTopOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Border Top 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.borderTop);
    }
  }
  class BorderLeftOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Border Left 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.borderLeft);
    }
  }
  class BorderRightOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Border Right 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.borderRight);
    }
  }
  class BorderBottomOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Border Bottom 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.borderBottom);
    }
  }
  class ContentPaddingTopOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Content Padding Top 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.contentPaddingTop);
    }
  }
  class ContentPaddingLeftOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Content Padding Left 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.contentPaddingLeft);
    }
  }
  class ContentPaddingRightOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Content Padding Right 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.contentPaddingRight);
    }
  }
  class ContentPaddingBottomOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Content Padding Bottom 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.contentPaddingBottom);
    }
  }
  class BorderStyleOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Border Style 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.borderStyle);
    }
  }
  class BackgroundColorOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Background Color 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.backgroundColor);
    }
  }
  class OrientOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Orient 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.orient);
    }
  }
  class TextContentVerticalAlignOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Text Content Vertical Align 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.textContentVerticalAlign);
    }
  }
  class GridColumnsOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Grid Columns 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.gridColumns);
    }
  }
  class GridColumnsGutterOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Grid Columns Gutter 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.gridColumnsGutter);
    }
  }
  class PaddingTopOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Padding Top 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.paddingTop);
    }
  }
  class PaddingLeftOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Padding Left 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.paddingLeft);
    }
  }
  class PaddingRightOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Padding Right 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.paddingRight);
    }
  }
  class PaddingBottomOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Padding Bottom 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.paddingBottom);
    }
  }
  class FunctionSampleOptionItem extends SimpleOptionItem {
    constructor(config, samples) {
      super(config);
      this.samples = samples;
    }
    createTarget() {
      var _a, _b;
      const target = super.createTarget();
      injectFunctionSampleCss();
      const buttons = this.samples.map((sample, index) => `<button type="button" class="${OPTION_PANEL_CLASS_NAMES.functionSampleButton}" data-sample-index="${index}">${sample.label}</button>`).join("");
      target.find(selector(OPTION_PANEL_CLASS_NAMES.field)).append(`<div class="${OPTION_PANEL_CLASS_NAMES.functionSample}">${buttons}</div>`);
      (_b = (_a = target.find(selector(OPTION_PANEL_CLASS_NAMES.functionSampleButton))).on) == null ? void 0 : _b.call(_a, "click", (event) => {
        var _a2;
        const element = event == null ? void 0 : event.target;
        const index = parseInt((element == null ? void 0 : element.getAttribute("data-sample-index")) || "0", 10);
        const sample = this.samples[Number.isFinite(index) ? index : 0];
        if (!sample) return;
        this.target.find("textarea").val(sample.value);
        (_a2 = this.submit) == null ? void 0 : _a2.call(this, this.getValue());
      });
      return target;
    }
  }
  class FormatterOptionItem extends FunctionSampleOptionItem {
    /**
     * 中文说明：初始化 Formatter 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.formatter, [
        { label: "填充示例", value: FORMATTER_SAMPLE }
      ]);
    }
  }
  class StylerOptionItem extends FunctionSampleOptionItem {
    /**
     * 中文说明：初始化 Styler 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.styler, [
        { label: "填充示例", value: STYLER_SAMPLE }
      ]);
    }
  }
  class FooterFormatterOptionItem extends FunctionSampleOptionItem {
    /**
     * 中文说明：初始化 Footer Formatter 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.footerFormatter, [
        { label: "填充示例", value: FOOTER_FORMATTER_SAMPLE }
      ]);
    }
  }
  class GridColumnsFooterFormatterOptionItem extends FunctionSampleOptionItem {
    /**
     * 中文说明：初始化 Grid Columns Footer Formatter 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.gridColumnsFooterFormatter, [
        { label: "填充示例", value: GRID_COLUMNS_FOOTER_FORMATTER_SAMPLE }
      ]);
    }
  }
  class RowStylerOptionItem extends FunctionSampleOptionItem {
    /**
     * 中文说明：初始化 Row Styler 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.rowStyler, [
        { label: "填充示例", value: ROW_STYLER_SAMPLE }
      ]);
    }
  }
  class AlignOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Align 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.align);
    }
  }
  class HAlignOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Halign 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.halign);
    }
  }
  class VAlignOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 V Align 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.vAlign);
    }
  }
  class Styler2OptionItem extends FunctionSampleOptionItem {
    /**
     * 中文说明：初始化 Styler2 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.styler2, [
        { label: "填充示例", value: STYLER2_SAMPLE }
      ]);
    }
  }
  class Formatter2OptionItem extends FunctionSampleOptionItem {
    /**
     * 中文说明：初始化 Formatter2 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.formatter2, [
        { label: "填充示例", value: FORMATTER2_SAMPLE }
      ]);
    }
  }
  class AutoCompletionOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Auto Completion 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.autoCompletion);
    }
  }
  class TableFooterRepeatOptionItem extends SimpleOptionItem {
    /**
     * 中文说明：初始化 Table Footer Repeat 属性项，复用通用配置生成编辑器。
     */
    constructor() {
      super(optionConfigs.tableFooterRepeat);
    }
  }
  class PrintElementOptionItemManager {
    /**
     * 中文说明：初始化属性面板实例，绑定默认配置、DOM 结构和必要的交互事件。
     */
    static init() {
      if (!this.printElementOptionItems) {
        this.printElementOptionItems = {};
        this._printElementOptionItems.forEach((item) => {
          this.printElementOptionItems[item.name] = item;
        });
      }
    }
    /**
     * 中文说明：注册属性项实例，供打印元素属性面板按名称创建对应编辑器。
     */
    static registerItem(item) {
      if (!item.name) throw new Error("styleItem must have name");
      this.init();
      this.printElementOptionItems[item.name] = item;
    }
    /**
     * 中文说明：读取item，为属性面板的布局计算、序列化或渲染提供数据。
     */
    static getItem(name) {
      this.init();
      if (name === "__layoutBreak") return new LayoutBreakOptionItem();
      if (name === "__layoutSpacer") return new LayoutSpacerOptionItem();
      const item = this.printElementOptionItems[name];
      if (!item) return void 0;
      const Constructor = item.constructor;
      if (Constructor && Constructor !== Object) {
        try {
          return new Constructor();
        } catch (_error) {
          return item;
        }
      }
      return item;
    }
  }
  __publicField(PrintElementOptionItemManager, "printElementOptionItems");
  /**
   * 中文说明：处理属性面板的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
   */
  __publicField(PrintElementOptionItemManager, "_printElementOptionItems", [
    new FontFamilyOptionItem(),
    new FontSizeOptionItem(),
    new FontWeightOptionItem(),
    new LetterSpacingOptionItem(),
    new LineHeightOptionItem(),
    new TextAlignOptionItem(),
    new HideTitleOptionItem(),
    new TitleSeparatorOptionItem(),
    new TextTypeOptionItem(),
    new SummaryAggregateOptionItem(),
    new SummaryValueTypeOptionItem(),
    new SummaryLabelOptionItem(),
    new TableBorderOptionItem(),
    new TableHeaderBorderOptionItem(),
    new TableHeaderCellBorderOptionItem(),
    new TableHeaderRowHeightOptionItem(),
    new TableHeaderFontSizeOptionItem(),
    new TableHeaderFontWeightOptionItem(),
    new TableBodyCellBorderOptionItem(),
    new TableBodyRowHeightOptionItem(),
    new TableHeaderBackgroundOptionItem(),
    new BorderWidthOptionItem(),
    new BarcodeModeOptionItem(),
    new RenderWidthOptionItem(),
    new RenderHeightOptionItem(),
    new ColorOptionItem(),
    new TextDecorationOptionItem(),
    new FieldOptionItem(),
    new DataBindingOptionItem(),
    new TitleOptionItem(),
    new TestDataOptionItem(),
    new SrcOptionItem(),
    new BorderColorOptionItem(),
    new PaperNumberFormatOptionItem(),
    new PaperNumberDisabledOptionItem(),
    new LongTextIndentOptionItem(),
    new ShowInPageOptionItem(),
    new PanelPaperRuleOptionItem(),
    new LeftSpaceRemovedOptionItem(),
    new FirstPaperFooterOptionItem(),
    new LastPaperFooterOptionItem(),
    new EvenPaperFooterOptionItem(),
    new OddPaperFooterOptionItem(),
    new FixedOptionItem(),
    new AxisOptionItem(),
    new TopOffsetOptionItem(),
    new LeftOffsetOptionItem(),
    new LHeightOptionItem(),
    new UnShowInPageOptionItem(),
    new TableBodyRowBorderOptionItem(),
    new TransformOptionItem(),
    new OptionsGroupOptionItem(),
    new BorderTopOptionItem(),
    new BorderLeftOptionItem(),
    new BorderRightOptionItem(),
    new BorderBottomOptionItem(),
    new ContentPaddingTopOptionItem(),
    new ContentPaddingLeftOptionItem(),
    new ContentPaddingRightOptionItem(),
    new ContentPaddingBottomOptionItem(),
    new BorderStyleOptionItem(),
    new BackgroundColorOptionItem(),
    new OrientOptionItem(),
    new TextContentVerticalAlignOptionItem(),
    new ColumnsOptionItem(),
    new GridColumnsOptionItem(),
    new GridColumnsGutterOptionItem(),
    new PaddingTopOptionItem(),
    new PaddingLeftOptionItem(),
    new PaddingRightOptionItem(),
    new PaddingBottomOptionItem(),
    new DataTypeOptionItem(),
    new FormatterOptionItem(),
    new StylerOptionItem(),
    new FooterFormatterOptionItem(),
    new GridColumnsFooterFormatterOptionItem(),
    new RowStylerOptionItem(),
    new AlignOptionItem(),
    new HAlignOptionItem(),
    new VAlignOptionItem(),
    new Styler2OptionItem(),
    new Formatter2OptionItem(),
    new AutoCompletionOptionItem(),
    new TableFooterRepeatOptionItem()
  ]);
  function getJQueryExtend$1() {
    const candidate = typeof globalThis !== "undefined" ? globalThis.$ ?? globalThis.jQuery : void 0;
    if (!(candidate == null ? void 0 : candidate.extend)) {
      throw new Error("运行时依赖缺失：jQuery global `$.extend` is required by HiPrintConfig");
    }
    return candidate;
  }
  function extendConfig(target, source2) {
    return getJQueryExtend$1().extend(target, source2);
  }
  function option(name, extra) {
    return extra ? { name, hidden: false, ...extra } : { name, hidden: false };
  }
  function optionLayoutBreak() {
    return option("__layoutBreak");
  }
  function optionLayoutSpacer() {
    return option("__layoutSpacer");
  }
  function registerOptionItemFromModule9(item) {
    PrintElementOptionItemManager.registerItem(item);
  }
  const _HiPrintConfig = class _HiPrintConfig {
    /**
     * 中文说明：初始化打印系统对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
      /**
       * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "providers", []);
      /**
       * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "movingDistance", 1.5);
      /**
       * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "paperHeightTrim", 1);
      /**
       * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "optionItems");
      __publicField(this, "fontFamilies");
      /**
       * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "text", {
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        supportOptions: [
          option("title", { title: "" }),
          option("field"),
          option("testData"),
          option("dataType"),
          option("fontFamily"),
          option("fontSize"),
          option("fontWeight"),
          option("letterSpacing"),
          option("color"),
          option("textDecoration"),
          option("textAlign"),
          option("textContentVerticalAlign"),
          option("lineHeight"),
          option("textType"),
          option("barcodeMode"),
          option("hideTitle"),
          option("titleSeparator"),
          option("showInPage"),
          option("unShowInPage"),
          option("fixed"),
          option("axis"),
          option("transform"),
          option("optionsGroup"),
          option("borderLeft"),
          option("borderTop"),
          option("borderRight"),
          option("borderBottom"),
          option("borderWidth"),
          option("borderColor"),
          option("contentPaddingLeft"),
          option("contentPaddingTop"),
          option("contentPaddingRight"),
          option("contentPaddingBottom"),
          option("backgroundColor"),
          option("formatter"),
          option("styler"),
          optionLayoutSpacer()
        ],
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        default: {
          fontFamily: void 0,
          fontSize: void 0,
          fontWeight: "",
          letterSpacing: void 0,
          textAlign: void 0,
          textType: "text",
          hideTitle: false,
          titleSeparator: "：",
          height: 9.75,
          lineHeight: void 0,
          width: 120
        }
      });
      /**
       * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "image", {
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        supportOptions: [
          option("field"),
          option("src"),
          option("showInPage"),
          option("fixed"),
          option("axis"),
          option("transform"),
          option("formatter"),
          option("styler"),
          optionLayoutSpacer()
        ],
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        default: {}
      });
      /**
       * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "longText", {
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        supportOptions: [
          option("title"),
          option("field"),
          option("testData"),
          option("fontFamily"),
          option("fontSize"),
          option("fontWeight"),
          option("letterSpacing"),
          option("textAlign"),
          option("lineHeight"),
          option("color"),
          option("hideTitle"),
          option("titleSeparator"),
          option("longTextIndent"),
          option("leftSpaceRemoved"),
          option("showInPage"),
          option("unShowInPage"),
          option("fixed"),
          option("axis"),
          option("lHeight"),
          option("transform"),
          option("optionsGroup"),
          option("borderLeft"),
          option("borderTop"),
          option("borderRight"),
          option("borderBottom"),
          option("borderWidth"),
          option("borderColor"),
          option("contentPaddingLeft"),
          option("contentPaddingTop"),
          option("contentPaddingRight"),
          option("contentPaddingBottom"),
          option("backgroundColor"),
          option("formatter"),
          option("styler"),
          optionLayoutSpacer()
        ],
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        default: {
          fontFamily: void 0,
          fontSize: void 0,
          fontWeight: "",
          letterSpacing: void 0,
          textAlign: void 0,
          hideTitle: false,
          titleSeparator: "：",
          height: 42,
          lineHeight: void 0,
          width: 550
        }
      });
      /**
       * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "table", {
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        supportOptions: [
          option("field"),
          option("fontFamily"),
          option("fontSize"),
          option("lineHeight"),
          option("textAlign"),
          option("gridColumns"),
          option("gridColumnsGutter"),
          option("tableBorder"),
          option("tableHeaderBorder"),
          option("tableHeaderCellBorder"),
          option("tableHeaderRowHeight"),
          option("tableHeaderBackground"),
          option("tableHeaderFontSize"),
          option("tableHeaderFontWeight"),
          option("tableBodyRowHeight"),
          option("tableBodyRowBorder"),
          option("tableBodyCellBorder"),
          option("axis"),
          option("lHeight"),
          option("autoCompletion"),
          option("columns"),
          option("styler"),
          option("rowStyler"),
          option("tableFooterRepeat"),
          option("footerFormatter"),
          option("gridColumnsFooterFormatter"),
          optionLayoutSpacer()
        ],
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        default: {
          fontFamily: void 0,
          fontSize: void 0,
          fontWeight: "",
          textAlign: void 0,
          tableBorder: void 0,
          tableHeaderBorder: void 0,
          tableHeaderCellBorder: void 0,
          tableHeaderBackground: void 0,
          tableHeaderRowHeight: void 0,
          tableHeaderFontWeight: void 0,
          tableBodyCellBorder: void 0,
          tableBodyRowHeight: void 0,
          letterSpacing: "",
          lineHeight: void 0,
          width: 550
        }
      });
      /**
       * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "tableCustom", {
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        supportOptions: [
          option("field"),
          option("fontFamily"),
          option("fontSize"),
          option("textAlign"),
          option("tableBorder"),
          option("tableHeaderBorder"),
          option("tableHeaderCellBorder"),
          option("tableHeaderRowHeight"),
          option("tableHeaderFontSize"),
          option("tableHeaderFontWeight"),
          option("tableHeaderBackground"),
          option("tableBodyRowHeight"),
          option("tableBodyRowBorder"),
          option("tableBodyCellBorder"),
          option("axis"),
          option("lHeight"),
          option("autoCompletion"),
          option("tableFooterRepeat"),
          optionLayoutSpacer()
        ],
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        default: {
          fontFamily: void 0,
          fontSize: void 0,
          fontWeight: "",
          textAlign: void 0,
          tableBorder: void 0,
          tableHeaderBorder: void 0,
          tableHeaderCellBorder: void 0,
          tableHeaderBackground: void 0,
          tableHeaderRowHeight: void 0,
          tableHeaderFontWeight: void 0,
          tableBodyCellBorder: void 0,
          tableBodyRowHeight: void 0,
          letterSpacing: "",
          lineHeight: void 0,
          width: 550
        }
      });
      /**
       * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "hline", {
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        supportOptions: [
          option("borderColor"),
          option("borderWidth"),
          option("showInPage"),
          option("fixed"),
          option("axis"),
          option("transform"),
          option("borderStyle"),
          optionLayoutSpacer()
        ],
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        default: {
          borderWidth: 0.75,
          height: 9,
          width: 90
        }
      });
      /**
       * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "vline", {
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        supportOptions: [
          option("borderColor"),
          option("borderWidth"),
          option("showInPage"),
          option("fixed"),
          option("axis"),
          option("transform"),
          option("borderStyle"),
          optionLayoutSpacer()
        ],
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        default: {
          borderWidth: void 0,
          height: 90,
          width: 9
        }
      });
      /**
       * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "rect", {
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        supportOptions: [
          option("borderColor"),
          option("borderWidth"),
          option("showInPage"),
          option("fixed"),
          option("axis"),
          option("transform"),
          option("borderStyle"),
          optionLayoutSpacer()
        ],
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        default: {
          borderWidth: void 0,
          height: 90,
          width: 90
        }
      });
      /**
       * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "oval", {
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        supportOptions: [
          option("borderColor"),
          option("borderWidth"),
          option("showInPage"),
          option("fixed"),
          option("axis"),
          option("transform"),
          option("borderStyle"),
          optionLayoutSpacer()
        ],
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        default: {
          borderWidth: void 0,
          height: 90,
          width: 90
        }
      });
      __publicField(this, "custom", {
        supportOptions: [
          option("title"),
          option("field"),
          option("fontFamily"),
          option("fontSize"),
          option("fontWeight"),
          option("color"),
          option("textAlign"),
          option("showInPage"),
          option("unShowInPage"),
          option("fixed"),
          option("axis"),
          option("transform"),
          option("optionsGroup"),
          option("borderLeft"),
          option("borderTop"),
          option("borderRight"),
          option("borderBottom"),
          option("borderWidth"),
          option("borderColor"),
          option("contentPaddingLeft"),
          option("contentPaddingTop"),
          option("contentPaddingRight"),
          option("contentPaddingBottom"),
          option("backgroundColor"),
          option("styler"),
          optionLayoutSpacer()
        ],
        default: {
          fontFamily: void 0,
          fontSize: void 0,
          fontWeight: "",
          textAlign: void 0,
          height: 54,
          width: 180
        }
      });
      /**
       * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "tableColumn", {
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        supportOptions: [
          option("title"),
          option("field"),
          option("dataType"),
          option("textType"),
          optionLayoutBreak(),
          option("summaryAggregate"),
          option("summaryValueType"),
          option("summaryLabel"),
          option("barcodeMode"),
          option("renderWidth"),
          option("renderHeight"),
          option("halign"),
          optionLayoutBreak(),
          option("align"),
          option("vAlign"),
          option("paddingTop"),
          option("paddingBottom"),
          option("paddingLeft"),
          option("paddingRight"),
          option("formatter2"),
          option("styler2"),
          optionLayoutSpacer()
        ],
        /**
         * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        default: {
          height: 90,
          width: 90
        }
      });
    }
    /**
     * 中文说明：初始化打印系统实例，绑定默认配置、DOM 结构和必要的交互事件。
     */
    init(options2) {
      if (options2) extendConfig(this, options2);
      setFontFamilyOptions(this.fontFamilies);
    }
    /**
     * 中文说明：返回全局配置单例，集中管理设计器和打印运行时配置。
     */
    static get instance() {
      if (!_HiPrintConfig._instance) {
        _HiPrintConfig._instance = new _HiPrintConfig();
        if (window.HIPRINT_CONFIG) extendConfig(_HiPrintConfig._instance, window.HIPRINT_CONFIG);
        setFontFamilyOptions(_HiPrintConfig._instance.fontFamilies);
        if (_HiPrintConfig._instance.optionItems) {
          _HiPrintConfig._instance.optionItems.forEach((item) => {
            registerOptionItemFromModule9(item);
          });
        }
      }
      return _HiPrintConfig._instance;
    }
  };
  /**
   * 中文说明：处理打印系统的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
   */
  __publicField(_HiPrintConfig, "_instance");
  let HiPrintConfig = _HiPrintConfig;
  let installedJQuery$1;
  function resolveJQuery$4(jquery) {
    const candidate = jquery ?? installedJQuery$1 ?? globalThis.jQuery;
    if (!candidate) throw new Error("运行时依赖缺失：jQuery global is required by hidraggable");
    return candidate;
  }
  function calculateDragPosition($2, event) {
    const state = $2.data(event.data.target, "hidraggable");
    const options2 = state.options;
    const proxy = state.proxy;
    const data = event.data;
    let left = data.startLeft + event.pageX - data.startX;
    let top = data.startTop + event.pageY - data.startY;
    if (proxy) {
      if (proxy.parent()[0] == document.body) {
        left = options2.deltaX != null && options2.deltaX != null ? event.pageX + options2.deltaX : event.pageX - event.data.offsetWidth;
        top = options2.deltaY != null && options2.deltaY != null ? event.pageY + options2.deltaY : event.pageY - event.data.offsetHeight;
      } else {
        if (options2.deltaX != null && options2.deltaX != null) left += event.data.offsetWidth + options2.deltaX;
        if (options2.deltaY != null && options2.deltaY != null) top += event.data.offsetHeight + options2.deltaY;
      }
    }
    if (event.data.parent != document.body) {
      left += $2(event.data.parent).scrollLeft();
      top += $2(event.data.parent).scrollTop();
    }
    if (options2.axis == "h") data.left = left;
    else if (options2.axis == "v") data.top = top;
    else {
      data.left = left;
      data.top = top;
    }
  }
  function applyProxyPosition($2, event) {
    const state = $2.data(event.data.target, "hidraggable");
    const options2 = state.options;
    let proxy = state.proxy;
    if (!proxy) proxy = $2(event.data.target);
    proxy.css({
      left: $2.fn.dragLengthC(event.data.left, options2),
      top: $2.fn.dragLengthC(event.data.top, options2)
    });
    $2("body").css("cursor", options2.cursor);
  }
  function startDrag($2, event) {
    $2.fn.hidraggable.isDragging = true;
    const state = $2.data(event.data.target, "hidraggable");
    const options2 = state.options;
    const hidroppables = $2(".hidroppable").filter(
      /**
       * 中文说明：过滤当前拖拽源自身，避免把元素放置到自己上。
       */
      function filterSelf() {
        return event.data.target != this;
      }
    ).filter(
      /**
       * 中文说明：按 droppable 接收规则筛选可用放置目标。
       */
      function filterAccepted() {
        const accept = $2.data(this, "hidroppable").options.accept;
        return !accept || $2(accept).filter(
          /**
           * 中文说明：检查候选放置目标是否接受当前拖拽元素。
           */
          function filterAcceptTarget() {
            return this == event.data.target;
          }
        ).length > 0;
      }
    );
    state.hidroppables = hidroppables;
    let proxy = state.proxy;
    if (!proxy) {
      if (options2.proxy) {
        proxy = options2.proxy == "clone" ? $2(event.data.target).clone().insertAfter(event.data.target) : options2.proxy.call(event.data.target, event.data.target);
        state.proxy = proxy;
      } else {
        proxy = $2(event.data.target);
      }
    }
    proxy.css("position", "absolute");
    calculateDragPosition($2, event);
    applyProxyPosition($2, event);
    options2.onStartDrag.call(event.data.target, event);
    return false;
  }
  function drag($2, event) {
    const state = $2.data(event.data.target, "hidraggable");
    calculateDragPosition($2, event);
    if (state.options.onDrag.call(event.data.target, event, $2.fn.dragLengthCNum(event.data.left, state.options), $2.fn.dragLengthCNum(event.data.top, state.options)) != 0) {
      applyProxyPosition($2, event);
    }
    const target = event.data.target;
    state.hidroppables.each(
      /**
       * 中文说明：遍历可放置目标并更新拖拽进入、离开和悬停状态。
       */
      function eachDroppable() {
        const droppable = $2(this);
        if (!droppable.hidroppable("options").disabled) {
          const offset = droppable.offset();
          if (event.pageX > offset.left && event.pageX < offset.left + droppable.outerWidth() && event.pageY > offset.top && event.pageY < offset.top + droppable.outerHeight()) {
            if (!this.entered) {
              $2(this).trigger("_dragenter", [target]);
              this.entered = true;
            }
            $2(this).trigger("_dragover", [target]);
          } else if (this.entered) {
            $2(this).trigger("_dragleave", [target]);
            this.entered = false;
          }
        }
      }
    );
    return false;
  }
  function stopDrag($2, event) {
    $2.fn.hidraggable.isDragging = false;
    drag($2, event);
    const state = $2.data(event.data.target, "hidraggable");
    const proxy = state.proxy;
    const options2 = state.options;
    let left;
    let top;
    function removeProxy() {
      if (proxy) proxy.remove();
      state.proxy = null;
    }
    function tryDrop() {
      let dropped = false;
      state.hidroppables.each(
        /**
         * 中文说明：遍历候选放置区域，找到当前鼠标位置命中的目标。
         */
        function eachDropCandidate() {
          const droppable = $2(this);
          if (!droppable.hidroppable("options").disabled) {
            const offset = droppable.offset();
            if (event.pageX > offset.left && event.pageX < offset.left + droppable.outerWidth() && event.pageY > offset.top && event.pageY < offset.top + droppable.outerHeight()) {
              if (options2.revert) {
                $2(event.data.target).css({
                  position: event.data.startPosition,
                  left: event.data.startLeft,
                  top: event.data.startTop
                });
              }
              $2(this).trigger("_drop", [event.data.target]);
              removeProxy();
              dropped = true;
              this.entered = false;
              return false;
            }
          }
          return void 0;
        }
      );
      if (!dropped && !options2.revert) removeProxy();
      return dropped;
    }
    if (options2.revert) {
      if (tryDrop() == true) {
        $2(event.data.target).css({
          position: event.data.startPosition,
          left: event.data.startLeft,
          top: event.data.startTop
        });
      } else if (proxy) {
        if (proxy.parent()[0] == document.body) {
          left = event.data.startX - event.data.offsetWidth;
          top = event.data.startY - event.data.offsetHeight;
        } else {
          left = event.data.startLeft;
          top = event.data.startTop;
        }
        proxy.animate(
          { left, top },
          /**
           * 中文说明：处理proxy revert complete事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
           */
          function onProxyRevertComplete() {
            removeProxy();
          }
        );
      } else {
        $2(event.data.target).animate(
          {
            left: event.data.startLeft,
            top: event.data.startTop
          },
          /**
           * 中文说明：处理target revert complete事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
           */
          function onTargetRevertComplete() {
            $2(event.data.target).css("position", event.data.startPosition);
          }
        );
      }
    } else {
      $2(event.data.target).css({
        position: "absolute",
        left: $2.fn.dragLengthC(event.data.left, options2),
        top: $2.fn.dragLengthC(event.data.top, options2)
      });
      tryDrop();
    }
    options2.onStopDrag.call(event.data.target, event);
    $2(document).unbind(".hidraggable");
    setTimeout(
      /**
       * 中文说明：恢复 body 鼠标样式，清理拖拽过程中设置的全局光标。
       */
      function resetBodyCursor() {
        $2("body").css("cursor", "");
      },
      100
    );
    return false;
  }
  const hidraggableMethods = {
    /**
     * 中文说明：处理属性配置项，连接jQuery 交互插件配置面板与模板元素属性。
     */
    options(elements) {
      return resolveJQuery$4().data(elements[0], "hidraggable").options;
    },
    /**
     * 中文说明：创建或返回拖拽代理元素，用于设计器拖动时显示临时位置。
     */
    proxy(elements) {
      return resolveJQuery$4().data(elements[0], "hidraggable").proxy;
    },
    /**
     * 中文说明：启用当前元素的拖拽或放置插件状态，并绑定必要事件。
     */
    enable(elements) {
      return elements.each(
        /**
         * 中文说明：遍历 jQuery 集合并逐个启用插件交互状态。
         */
        function eachEnable() {
          resolveJQuery$4()(this).hidraggable({ disabled: false });
        }
      );
    },
    /**
     * 中文说明：处理jQuery 交互插件的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    disable(elements) {
      return elements.each(
        /**
         * 中文说明：处理jQuery 交互插件的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        function eachDisable() {
          resolveJQuery$4()(this).hidraggable({ disabled: true });
        }
      );
    }
  };
  function parseHidraggableOptions($2, element) {
    const wrapped = $2(element);
    return $2.extend({}, $2.hiprintparser.parseOptions(element, ["cursor", "handle", "axis", {
      revert: "boolean",
      deltaX: "number",
      deltaY: "number",
      edge: "number"
    }]), {
      disabled: !!wrapped.attr("disabled") || void 0
    });
  }
  const hidraggableDefaults = {
    proxy: null,
    revert: false,
    cursor: "move",
    deltaX: null,
    deltaY: null,
    handle: null,
    disabled: false,
    edge: 0,
    axis: null,
    /**
     * 中文说明：在jQuery 交互插件操作开始前执行校验，必要时阻止后续交互。
     */
    onBeforeDrag(_event) {
    },
    /**
     * 中文说明：处理start drag事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
     */
    onStartDrag(_event) {
    },
    /**
     * 中文说明：处理drag事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
     */
    onDrag(_event, _left, _top) {
    },
    /**
     * 中文说明：处理stop drag事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
     */
    onStopDrag(_event) {
    }
  };
  function createHidraggablePlugin($2) {
    installedJQuery$1 = $2;
    const plugin = function hidraggablePlugin(option2, param) {
      if (typeof option2 == "string") return plugin.methods[option2](this, param);
      return this.each(
        /**
         * 中文说明：遍历 jQuery 集合并为每个元素初始化可拖拽能力。
         */
        function eachHidraggable() {
          let options2;
          const state = $2.data(this, "hidraggable");
          if (state) {
            state.handle.unbind(".hidraggable");
            options2 = $2.extend(state.options, option2);
          } else {
            options2 = $2.extend({}, plugin.defaults, plugin.parseOptions(this), option2 || {});
          }
          const handle = options2.handle ? typeof options2.handle == "string" ? $2(options2.handle, this) : options2.handle : $2(this);
          function isOutsideEdge(event) {
            const draggableState = $2.data(event.data.target, "hidraggable");
            const draggableHandle = draggableState.handle;
            const offset = $2(draggableHandle).offset();
            const width = $2(draggableHandle).outerWidth();
            const height = $2(draggableHandle).outerHeight();
            const topDistance = event.pageY - offset.top;
            const rightDistance = offset.left + width - event.pageX;
            const bottomDistance = offset.top + height - event.pageY;
            const leftDistance = event.pageX - offset.left;
            return Math.min(topDistance, rightDistance, bottomDistance, leftDistance) > draggableState.options.edge;
          }
          $2.data(this, "hidraggable", {
            options: options2,
            handle
          });
          if (options2.disabled) {
            $2(this).css("cursor", "");
          } else {
            handle.unbind(".hidraggable").bind(
              "mousemove.hidraggable",
              { target: this },
              /**
               * 中文说明：处理handle mouse move事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
               */
              function onHandleMouseMove(event) {
                if (!$2.fn.hidraggable.isDragging) {
                  const currentOptions = $2.data(event.data.target, "hidraggable").options;
                  if (isOutsideEdge(event)) $2(this).css("cursor", currentOptions.cursor);
                  else $2(this).css("cursor", "");
                }
              }
            ).bind(
              "mouseleave.hidraggable",
              { target: this },
              /**
               * 中文说明：处理handle mouse leave事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
               */
              function onHandleMouseLeave(_event) {
                $2(this).css("cursor", "");
              }
            ).bind(
              "mousedown.hidraggable",
              { target: this },
              /**
               * 中文说明：处理handle mouse down事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
               */
              function onHandleMouseDown(event) {
                if (isOutsideEdge(event) != false) {
                  $2(this).css("cursor", "");
                  const position = $2(event.data.target).position();
                  const offset = $2(event.data.target).offset();
                  const dragData = {
                    startPosition: $2(event.data.target).css("position"),
                    startLeft: position.left,
                    startTop: position.top,
                    left: position.left,
                    top: position.top,
                    startX: event.pageX,
                    startY: event.pageY,
                    offsetWidth: event.pageX - offset.left,
                    offsetHeight: event.pageY - offset.top,
                    target: event.data.target,
                    parent: $2(event.data.target).parent()[0]
                  };
                  $2.extend(event.data, dragData);
                  if ($2.data(event.data.target, "hidraggable").options.onBeforeDrag.call(event.data.target, event) != 0) {
                    $2(document).bind(
                      "mousedown.hidraggable",
                      event.data,
                      /**
                       * 中文说明：处理document mouse down事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
                       */
                      function onDocumentMouseDown(documentEvent) {
                        return startDrag($2, documentEvent);
                      }
                    );
                    $2(document).bind(
                      "mousemove.hidraggable",
                      event.data,
                      /**
                       * 中文说明：处理document mouse move事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
                       */
                      function onDocumentMouseMove(documentEvent) {
                        return drag($2, documentEvent);
                      }
                    );
                    $2(document).bind(
                      "mouseup.hidraggable",
                      event.data,
                      /**
                       * 中文说明：处理document mouse up事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
                       */
                      function onDocumentMouseUp(documentEvent) {
                        return stopDrag($2, documentEvent);
                      }
                    );
                  }
                }
              }
            );
          }
        }
      );
    };
    plugin.methods = hidraggableMethods;
    plugin.parseOptions = function parseOptions(element) {
      return parseHidraggableOptions($2, element);
    };
    plugin.defaults = hidraggableDefaults;
    plugin.isDragging = false;
    return plugin;
  }
  function installHidraggable(jquery) {
    const $2 = resolveJQuery$4(jquery);
    installedJQuery$1 = $2;
    $2.fn.hidraggable = createHidraggablePlugin($2);
    return $2;
  }
  let installedJQuery;
  function resolveJQuery$3(jquery) {
    const candidate = jquery ?? installedJQuery ?? globalThis.jQuery;
    if (!candidate) throw new Error("运行时依赖缺失：jQuery global is required by hidroppable");
    return candidate;
  }
  const hidroppableMethods = {
    /**
     * 中文说明：处理属性配置项，连接jQuery 交互插件配置面板与模板元素属性。
     */
    options(elements) {
      return resolveJQuery$3().data(elements[0], "hidroppable").options;
    },
    /**
     * 中文说明：启用当前元素的拖拽或放置插件状态，并绑定必要事件。
     */
    enable(elements) {
      return elements.each(
        /**
         * 中文说明：遍历 jQuery 集合并逐个启用插件交互状态。
         */
        function eachEnable() {
          resolveJQuery$3()(this).hidroppable({ disabled: false });
        }
      );
    },
    /**
     * 中文说明：处理jQuery 交互插件的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    disable(elements) {
      return elements.each(
        /**
         * 中文说明：处理jQuery 交互插件的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
         */
        function eachDisable() {
          resolveJQuery$3()(this).hidroppable({ disabled: true });
        }
      );
    }
  };
  function parseHidroppableOptions($2, element) {
    const wrapped = $2(element);
    return $2.extend({}, $2.hiprintparser.parseOptions(element, ["accept"]), {
      disabled: !!wrapped.attr("disabled") || void 0
    });
  }
  const hidroppableDefaults = {
    accept: null,
    disabled: false,
    /**
     * 中文说明：处理drag enter事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
     */
    onDragEnter(_event, _source) {
    },
    /**
     * 中文说明：处理drag over事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
     */
    onDragOver(_event, _source) {
    },
    /**
     * 中文说明：处理drag leave事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
     */
    onDragLeave(_event, _source) {
    },
    /**
     * 中文说明：处理drop事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
     */
    onDrop(_event, _source) {
    }
  };
  function createHidroppablePlugin($2) {
    installedJQuery = $2;
    const plugin = function hidroppablePlugin(option2, param) {
      if (typeof option2 == "string") return plugin.methods[option2](this, param);
      const incomingOptions = option2 || {};
      return this.each(
        /**
         * 中文说明：遍历 jQuery 集合并为每个元素初始化可放置区域。
         */
        function eachHidroppable() {
          let element;
          const state = $2.data(this, "hidroppable");
          if (state) {
            $2.extend(state.options, incomingOptions);
          } else {
            $2(element = this).addClass("hidroppable");
            $2(element).bind(
              "_dragenter",
              /**
               * 中文说明：处理drag enter事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
               */
              function onDragEnter(event, source2) {
                $2.data(element, "hidroppable").options.onDragEnter.apply(element, [event, source2]);
              }
            );
            $2(element).bind(
              "_dragleave",
              /**
               * 中文说明：处理drag leave事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
               */
              function onDragLeave(event, source2) {
                $2.data(element, "hidroppable").options.onDragLeave.apply(element, [event, source2]);
              }
            );
            $2(element).bind(
              "_dragover",
              /**
               * 中文说明：处理drag over事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
               */
              function onDragOver(event, source2) {
                $2.data(element, "hidroppable").options.onDragOver.apply(element, [event, source2]);
              }
            );
            $2(element).bind(
              "_drop",
              /**
               * 中文说明：处理drop事件，驱动jQuery 交互插件中的拖拽、编辑或菜单行为。
               */
              function onDrop(event, source2) {
                $2.data(element, "hidroppable").options.onDrop.apply(element, [event, source2]);
              }
            );
            $2.data(this, "hidroppable", {
              options: $2.extend({}, plugin.defaults, plugin.parseOptions(this), incomingOptions)
            });
          }
        }
      );
    };
    plugin.methods = hidroppableMethods;
    plugin.parseOptions = function parseOptions(element) {
      return parseHidroppableOptions($2, element);
    };
    plugin.defaults = hidroppableDefaults;
    return plugin;
  }
  function installHidroppable(jquery) {
    const $2 = resolveJQuery$3(jquery);
    installedJQuery = $2;
    $2.fn.hidroppable = createHidroppablePlugin($2);
    return $2;
  }
  function resolveJQuery$2(jquery) {
    const candidate = jquery ?? globalThis.jQuery;
    if (!candidate) throw new Error("运行时依赖缺失：jQuery global is required by hiprintparser");
    return candidate;
  }
  function parseOptionsFactory($2) {
    return {
      /**
       * 中文说明：处理属性配置项，连接jQuery 交互插件配置面板与模板元素属性。
       */
      parseOptions(target, descriptors) {
        const wrapped = $2(target);
        let options2 = {};
        let raw = $2.trim(wrapped.attr("data-options"));
        if (raw) {
          if (raw.substring(0, 1) !== "{") raw = `{${raw}}`;
          options2 = new Function(`return ${raw}`)();
        }
        if (descriptors) {
          const attrs = {};
          for (let index = 0; index < descriptors.length; index += 1) {
            const descriptor = descriptors[index];
            if (typeof descriptor === "string") {
              attrs[descriptor] = descriptor === "width" || descriptor === "height" || descriptor === "left" || descriptor === "top" ? parseInt(target.style[descriptor]) || void 0 : wrapped.attr(descriptor);
            } else {
              for (const name in descriptor) {
                const type = descriptor[name];
                if (type === "boolean") attrs[name] = wrapped.attr(name) ? wrapped.attr(name) === "true" : void 0;
                else if (type === "number") attrs[name] = wrapped.attr(name) === "0" ? 0 : parseFloat(wrapped.attr(name)) || void 0;
              }
            }
          }
          $2.extend(options2, attrs);
        }
        return options2;
      }
    };
  }
  function dragLengthCNum(length, options2) {
    let step = 3;
    let converted;
    if (options2.moveUnit === "pt") {
      converted = 0.75 * length;
      if (options2.minMove) step = options2.minMove;
      return Math.round(converted / step) * step;
    }
    return Math.round(converted / step) * step;
  }
  function dragLengthC(length, options2) {
    return options2.moveUnit === "pt" ? `${dragLengthCNum(length, options2)}pt` : dragLengthCNum(length, options2);
  }
  function installHiprintParser(jquery) {
    const $2 = resolveJQuery$2(jquery);
    $2.hiprintparser = parseOptionsFactory($2);
    $2.fn.dragLengthC = dragLengthC;
    $2.fn.dragLengthCNum = dragLengthCNum;
    return $2;
  }
  function resolveJQuery$1(jquery) {
    const candidate = jquery ?? globalThis.jQuery ?? globalThis.$;
    if (!candidate) throw new Error("运行时依赖缺失：jQuery global is required by hireizeable");
    return candidate;
  }
  const moduleState = {
    /**
     * 中文说明：处理jQuery 交互插件的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    maxPanelIndex: 0
  };
  class HireizeableRuntime {
    /**
     * 中文说明：初始化jQuery 交互插件对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(payload, $2 = resolveJQuery$1()) {
      __publicField(this, "options");
      this.$ = $2;
      this.options = this.$.data(payload.target, "hireizeable").options;
      this.init(payload.target);
    }
    /**
     * 中文说明：处理jQuery 交互插件的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    numHandlerText(value) {
      return `${this.numHandler(value)}pt`;
    }
    /**
     * 中文说明：处理jQuery 交互插件的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    numHandler(value) {
      let step = 1.5;
      const converted = 0.75 * value;
      if (this.options.minResize) step = this.options.minResize;
      return Math.round(converted / step) * step;
    }
    /**
     * 中文说明：初始化jQuery 交互插件实例，绑定默认配置、DOM 结构和必要的交互事件。
     */
    init(target) {
      this.initResizeBox(target);
    }
    /**
     * 中文说明：初始化resize box，为jQuery 交互插件后续渲染和设计操作准备状态。
     */
    initResizeBox(target) {
      const runtime = this;
      this.$(target).each(function eachTarget() {
        let panel;
        moduleState.maxPanelIndex += 1;
        if (runtime.options.noContainer) panel = runtime.$(target);
        else {
          panel = runtime.$(`<div panelIndex=${moduleState.maxPanelIndex} class="resize-panel"></div>`).css({
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
            position: "absolute",
            "background-color": "rgba(37, 99, 235, 0.04)",
            border: "1px solid #2563eb",
            "box-shadow": "0 0 0 1px rgba(37, 99, 235, 0.18)",
            "border-radius": "2px",
            outline: "none",
            cursor: "move",
            display: "none"
          });
        }
        runtime.appendHandler(panel, runtime.$(this));
        const north = { name: "n", target: runtime.$('<div class="n resizebtn" style="cursor: n-resize;top: -12px;margin-left: -4px;left: 50%;"></div>') };
        const south = { name: "s", target: runtime.$('<div class="s resizebtn" style="cursor: s-resize;bottom: -12px;margin-left: -4px;left: 50%;"></div>') };
        const west = { name: "w", target: runtime.$('<div class="w resizebtn" style="cursor: w-resize;left: -12px;margin-top: -4px;top: 50%;"></div>') };
        const east = { name: "e", target: runtime.$('<div class="e resizebtn" style="cursor: e-resize; top: 50%; margin-top:-4px;right: -12px;"></div>') };
        const northEast = { name: "ne", target: runtime.$('<div class="ne resizebtn" style="cursor: ne-resize;top: -12px;right: -12px;"></div>') };
        const northWest = { name: "nw", target: runtime.$('<div class="nw resizebtn" style=" cursor: nw-resize;top: -12px;left:-12px;"></div>') };
        const southEast = { name: "se", target: runtime.$('<div class="se resizebtn" style="cursor: se-resize;bottom:-12px;right: -12px;"></div>') };
        const southWest = { name: "sw", target: runtime.$('<div class="sw resizebtn" style="cursor: sw-resize;bottom: -12px;left: -12px;"></div>') };
        const visibleHandlers = () => {
          const handlers = [];
          const showPoints = runtime.options.showPoints;
          runtime.$.each([north, south, west, east, northEast, northWest, southEast, southWest], (_index, item) => {
            if (runtime.$.inArray(item.name, showPoints) > -1) handlers.push(item.target);
          });
          return handlers;
        };
        runtime.addHandlerCss(visibleHandlers());
        runtime.appendHandler(visibleHandlers(), panel);
        runtime.bindResizeEvent(panel, runtime.$(this));
        const currentTarget = runtime.$(this);
        runtime.$(panel).on("mousedown", ".resizebtn", () => {
          currentTarget.addClass("resizeing");
        });
        runtime.$(".easyui-droppable").on("mouseup", () => {
          currentTarget.removeClass("resizeing");
        });
        runtime.bindTrigger(runtime.$(this));
      });
      this.bindHidePanel();
    }
    /**
     * 中文说明：添加handler css，扩展jQuery 交互插件的元素、样式或交互能力。
     */
    addHandlerCss(targets) {
      for (let index = 0; index < targets.length; index += 1) targets[index].css({
        position: "absolute",
        width: "6px",
        height: "6px",
        background: "#fff",
        border: "1.5px solid #2563eb",
        "box-shadow": "none",
        "border-radius": "50%",
        outline: "none"
      });
    }
    /**
     * 中文说明：处理jQuery 交互插件的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    appendHandler(targets, target) {
      if (Array.isArray(targets)) for (let index = 0; index < targets.length; index += 1) target.append(targets[index]);
      else target.append(targets);
    }
    /**
     * 中文说明：触发缩放回调并同步目标元素尺寸，用于设计器元素大小调整。
     */
    triggerResize(target) {
      target.siblings().children("div[panelindex]").css({ display: "none" });
      target.children("div[panelindex]").css({ display: "block" });
    }
    /**
     * 中文说明：绑定缩放手柄事件，驱动元素在设计器中的宽高调整。
     */
    bindResizeEvent(panel, element) {
      const runtime = this;
      let pageX = 0;
      let pageY = 0;
      let width = panel.width();
      let height = panel.height();
      let left = panel.offset().left;
      let top = panel.offset().top;
      const container = runtime.options.noContainer ? this.$(element) : panel.parent();
      let east = false;
      panel.on("mousedown", ".e", (event) => {
        pageX = event.pageX;
        width = panel.width();
        east = true;
      });
      let south = false;
      panel.on("mousedown", ".s", (event) => {
        pageY = event.pageY;
        height = panel.height();
        south = true;
      });
      let west = false;
      panel.on("mousedown", ".w", (event) => {
        pageX = event.pageX;
        width = panel.width();
        west = true;
        left = container.offset().left;
      });
      let north = false;
      panel.on("mousedown", ".n", (event) => {
        pageY = event.pageY;
        height = panel.height();
        north = true;
        top = container.offset().top;
      });
      let northEast = false;
      panel.on("mousedown", ".ne", (event) => {
        pageX = event.pageX;
        pageY = event.pageY;
        width = panel.width();
        height = panel.height();
        northEast = true;
        top = container.offset().top;
      });
      let northWest = false;
      panel.on("mousedown", ".nw", (event) => {
        pageX = event.pageX;
        pageY = event.pageY;
        width = panel.width();
        height = panel.height();
        top = container.offset().top;
        left = container.offset().left;
        northWest = true;
      });
      let southEast = false;
      panel.on("mousedown", ".se", (event) => {
        pageX = event.pageX;
        pageY = event.pageY;
        width = panel.width();
        height = panel.height();
        southEast = true;
      });
      let southWest = false;
      panel.on("mousedown", ".sw", (event) => {
        pageX = event.pageX;
        pageY = event.pageY;
        width = panel.width();
        height = panel.height();
        southWest = true;
        left = container.offset().left;
      });
      let moving = false;
      panel.on("mousedown", (event) => {
        runtime.options.onBeforeResize();
        pageX = event.pageX;
        pageY = event.pageY;
        top = container.offset().top;
        left = container.offset().left;
        moving = false;
      });
      this.$(runtime.options.stage).on("mousemove", (event) => {
        let deltaX;
        let deltaY;
        if (east) {
          deltaX = event.pageX - pageX;
          panel.css({ width: "100%" });
          container.css({ width: runtime.numHandlerText(width + deltaX) });
          runtime.options.onResize(event, void 0, runtime.numHandler(width + deltaX), void 0, void 0);
        } else if (south) {
          deltaY = event.pageY - pageY;
          panel.css({ height: "100%" });
          container.css({ height: runtime.numHandlerText(height + deltaY) });
          runtime.options.onResize(event, runtime.numHandler(height + deltaY), void 0, void 0, void 0);
        } else if (west) {
          deltaX = event.pageX - pageX;
          panel.css({ width: "100%" });
          container.css({ width: runtime.numHandlerText(width - deltaX), left: runtime.numHandlerText(runtime.options.noDrag ? void 0 : runtime.numHandler(left + deltaX)) });
          runtime.options.onResize(event, void 0, runtime.numHandler(width - deltaX), void 0, runtime.options.noDrag ? void 0 : runtime.numHandler(left + deltaX));
        } else if (north) {
          deltaY = event.pageY - pageY;
          panel.css({ height: "100%" });
          container.css({ height: runtime.numHandlerText(height - deltaY), top: runtime.numHandlerText(runtime.options.noDrag ? void 0 : top + deltaY) });
          runtime.options.onResize(event, runtime.numHandler(height - deltaY), void 0, runtime.options.noDrag ? void 0 : runtime.numHandler(top + deltaY), void 0);
        } else if (northEast) {
          deltaX = event.pageX - pageX;
          deltaY = event.pageY - pageY;
          panel.css({ height: "100%", width: "100%" });
          container.css({ height: runtime.numHandlerText(height - deltaY), top: runtime.numHandlerText(runtime.options.noDrag ? void 0 : top + deltaY), width: runtime.numHandlerText(width + deltaX) });
          runtime.options.onResize(event, runtime.numHandler(height - deltaY), runtime.numHandler(width + deltaX), runtime.options.noDrag ? void 0 : runtime.numHandler(top + deltaY), void 0);
        } else if (northWest) {
          deltaX = event.pageX - pageX;
          deltaY = event.pageY - pageY;
          panel.css({ height: "100%", width: "100%" });
          container.css({ height: runtime.numHandlerText(height - deltaY), top: runtime.numHandlerText(runtime.options.noDrag ? void 0 : top + deltaY), width: runtime.numHandlerText(width - deltaX), left: runtime.numHandlerText(runtime.options.noDrag ? void 0 : left + deltaX) });
          runtime.options.onResize(event, runtime.numHandler(height - deltaY), runtime.numHandler(width - deltaX), runtime.options.noDrag ? void 0 : runtime.numHandler(top + deltaY), runtime.options.noDrag ? void 0 : runtime.numHandler(left + deltaX));
        } else if (southEast) {
          deltaX = event.pageX - pageX;
          deltaY = event.pageY - pageY;
          panel.css({ width: "100%", height: "100%" });
          container.css({ width: runtime.numHandlerText(width + deltaX), height: runtime.numHandlerText(height + deltaY) });
          runtime.options.onResize(event, runtime.numHandler(height + deltaY), runtime.numHandler(width + deltaX), void 0, void 0);
        } else if (southWest) {
          deltaX = event.pageX - pageX;
          deltaY = event.pageY - pageY;
          panel.css({ width: "100%", height: "100%" });
          container.css({ width: runtime.numHandlerText(width - deltaX), left: runtime.numHandlerText(runtime.options.noDrag ? void 0 : left + deltaX), height: runtime.numHandlerText(height + deltaY) });
          runtime.options.onResize(event, runtime.numHandler(height + deltaY), runtime.numHandler(width - deltaX), void 0, runtime.options.noDrag ? void 0 : runtime.numHandler(left + deltaX));
        } else if (moving) {
          deltaX = event.pageX - pageX;
          deltaY = event.pageY - pageY;
          container.css({ left: runtime.numHandlerText(runtime.options.noDrag ? void 0 : left + deltaX), top: runtime.numHandlerText(runtime.options.noDrag ? void 0 : top + deltaY) });
          runtime.options.onResize(event, void 0, void 0, runtime.options.noDrag ? void 0 : runtime.numHandler(top + deltaY), runtime.options.noDrag ? void 0 : runtime.numHandler(left + deltaX));
        }
      }).on("mouseup", () => {
        east = false;
        south = false;
        west = false;
        north = false;
        northEast = false;
        northWest = false;
        southWest = false;
        southEast = false;
        moving = false;
        runtime.options.onStopResize();
      });
    }
    /**
     * 中文说明：绑定触发缩放面板显示的事件，控制元素选中后的缩放入口。
     */
    bindTrigger(target) {
      target.on("click", (event) => {
        event.stopPropagation();
        this.triggerResize(target);
      });
    }
    /**
     * 中文说明：绑定隐藏缩放面板的事件，避免未选中元素残留缩放控件。
     */
    bindHidePanel(_target) {
      if (moduleState.maxPanelIndex < 2) {
        const stage = this.options.stage;
        this.$(stage).bind("click", (event) => {
          event.stopPropagation();
          this.$("div[panelindex]").css({ display: "none" });
        });
      }
    }
  }
  const hireizeableDefaults = {
    stage: typeof document !== "undefined" ? document : void 0,
    reizeUnit: "pt",
    minResize: 1.5,
    showPoints: ["s", "e"],
    noContainer: false,
    onBeforeResize(_event, _height, _width, _top, _left) {
    },
    onResize(_event, _height, _width, _top, _left) {
    },
    onStopResize(_event, _height, _width, _top, _left) {
    },
    noDrag: false
  };
  function installHireizeable(jquery) {
    const $2 = resolveJQuery$1(jquery);
    $2.fn.extend({
      /**
       * 中文说明：初始化单个元素的缩放插件实例，接管其尺寸调整交互。
       */
      hireizeable(options2) {
        return this.each(function each() {
          var _a;
          const existing = $2.data(this, "hireizeable");
          const merged = existing ? $2.extend(existing.options, options2) : $2.extend({}, ((_a = $2.fn.hireizeable) == null ? void 0 : _a.defaults) || hireizeableDefaults, options2 || {});
          $2.data(this, "hireizeable", { options: merged });
          new HireizeableRuntime({ target: this }, $2);
        });
      }
    });
    $2.fn.hireizeable.defaults = hireizeableDefaults;
    return $2;
  }
  let runtimeMessageHandler;
  function setMessageHandler(handler) {
    runtimeMessageHandler = handler;
  }
  function getMessageHandler() {
    return runtimeMessageHandler;
  }
  function emitRuntimeMessage(payload) {
    if (runtimeMessageHandler) {
      runtimeMessageHandler(payload);
      return;
    }
    if (payload.type === "error") {
      throw new Error(payload.message);
    }
    console[payload.type === "warning" ? "warn" : "log"](payload.message);
  }
  const CONNECTED_STATE = "connected";
  const RECONNECTING_STATE = "reconnecting";
  const DEFAULT_CLIENT_PRINT_ENDPOINT = "http://localhost:17521";
  const CLIENT_TOKEN_ERROR_CODE = "CLIENT_PRINT_TOKEN_INVALID";
  const CLIENT_CONNECT_ERROR_CODE = "CLIENT_PRINT_CONNECT_ERROR";
  const CLIENT_AUTH_ERROR_EVENT = "authError";
  function stringifyConnectionError(error) {
    if (!error) return "";
    if (typeof error === "string") return error;
    if (error instanceof Error) return [error.name, error.message].filter(Boolean).join(" ");
    try {
      return JSON.stringify(error, (key, value) => {
        if (["token", "authorization", "auth"].includes(key.toLowerCase())) return "[redacted]";
        return value;
      });
    } catch (_stringifyError) {
      return String(error);
    }
  }
  function createConnectionErrorDetail(error) {
    if (!error || typeof error !== "object") return { message: stringifyConnectionError(error) };
    const errorLike = error;
    return {
      name: errorLike.name,
      message: errorLike.message,
      description: errorLike.description,
      code: errorLike.code,
      type: errorLike.type,
      status: errorLike.status,
      data: typeof errorLike.data === "object" ? "[object]" : errorLike.data
    };
  }
  function isTokenConnectionError(error) {
    const text = stringifyConnectionError(error).toLowerCase();
    return text.includes("token") || text.includes("auth") || text.includes("authentication") || text.includes("credential") || text.includes("not authorized") || text.includes("unauthorized") || text.includes("forbidden") || text.includes("invalid auth") || text.includes("invalid credential") || text.includes("jwt") || text.includes("401") || text.includes("403");
  }
  function emitConnectionError(runtime, error) {
    runtime.opened = false;
    const tokenError = isTokenConnectionError(error);
    emitRuntimeMessage({
      type: "error",
      code: tokenError ? CLIENT_TOKEN_ERROR_CODE : CLIENT_CONNECT_ERROR_CODE,
      message: tokenError ? "客户端 Token 校验失败，请检查 Arco Print 设置中的客户端 Token。" : "连接本地打印客户端失败，请确认客户端已启动并检查客户端地址。",
      endpoint: runtime.endpoint,
      detail: createConnectionErrorDetail(error)
    });
  }
  function emitTokenAuthError(runtime, payload) {
    runtime.opened = false;
    emitRuntimeMessage({
      type: "error",
      code: CLIENT_TOKEN_ERROR_CODE,
      message: "客户端 Token 校验失败，请检查 Arco Print 设置中的客户端 Token。",
      endpoint: runtime.endpoint,
      detail: createConnectionErrorDetail(payload)
    });
  }
  const hiwebSocket = {
    /**
     * 现代集成中需要避免未使用客户端打印时刷控制台错误，因此默认不自动连接。
     */
    enabled: false,
    /** 中文说明：标记本地打印客户端连接是否已打开。 */
    opened: false,
    /** 中文说明：本地打印客户端连接地址。 */
    endpoint: DEFAULT_CLIENT_PRINT_ENDPOINT,
    /** 中文说明：本地打印客户端 Socket.IO auth token。 */
    token: "",
    /** 中文说明：本地打印客户端通信通道名称。 */
    name: "webSockets",
    /** 中文说明：客户端重连最长等待时间。 */
    reconnectTimeout: 6e4,
    /** 中文说明：客户端重连定时器句柄。 */
    reconnectWindowSetTimeout: null,
    /** 中文说明：客户端重连间隔。 */
    reconnectDelay: 2e3,
    /**
     * 中文说明：检测当前浏览器是否支持 keepalive 请求，决定客户端通信保活策略。
     */
    supportsKeepAlive() {
      return true;
    },
    /**
     * 中文说明：判断是否包含io，辅助客户端打印通信布局和配置校验。
     */
    hasIo(_target) {
      return typeof window !== "undefined" ? window.io : void 0;
    },
    /**
     * 中文说明：通过 WebSocket 向本地打印客户端发送模板打印指令或状态消息。
     */
    send(payload, eventName = "news") {
      var _a;
      try {
        (_a = this.socket) == null ? void 0 : _a.emit(eventName, payload);
      } catch (error) {
        console.log(`send data error:${payload || ""}${JSON.stringify(error)}`);
      }
    },
    /**
     * 中文说明：读取printer list，为客户端打印通信的布局计算、序列化或渲染提供数据。
     */
    getPrinterList() {
      return this.printerList;
    },
    /**
     * 中文说明：主动请求本地客户端重新推送打印机列表，避免连接瞬间的首包被页面监听时序错过。
     */
    refreshPrinterList() {
      var _a;
      try {
        (_a = this.socket) == null ? void 0 : _a.emit("refreshPrinterList", {});
      } catch (error) {
        console.log(`refresh printer list error:${JSON.stringify(error)}`);
      }
    },
    /**
     * 中文说明：设置是否启用本地客户端打印；启用时才允许连接本地打印客户端。
     */
    setEnabled(enabled) {
      this.enabled = !!enabled;
      if (!this.enabled) {
        this.stop();
        this.opened = false;
        this.printerList = void 0;
        this.state = void 0;
        return;
      }
      this.start();
    },
    /**
     * 中文说明：读取本地客户端打印开关状态，供业务页面决定是否展示客户端打印入口。
     * 中文说明：扩展：modern rebuild API.
     */
    isEnabled() {
      return this.enabled;
    },
    /**
     * 中文说明：设置本地打印客户端连接地址，默认 http://localhost:17521。
     */
    setEndpoint(endpoint) {
      const nextEndpoint = (endpoint || DEFAULT_CLIENT_PRINT_ENDPOINT).trim() || DEFAULT_CLIENT_PRINT_ENDPOINT;
      if (this.endpoint === nextEndpoint) return;
      this.endpoint = nextEndpoint;
      if (this.socket) {
        this.stop();
      }
      if (this.enabled) {
        this.start();
      }
    },
    /**
     * 中文说明：读取当前本地打印客户端连接地址。
     */
    getEndpoint() {
      return this.endpoint;
    },
    /**
     * 中文说明：设置本地打印客户端连接 token，通过 Socket.IO auth.token 传给客户端。
     */
    setToken(token) {
      const nextToken = (token || "").trim();
      if (this.token === nextToken) return;
      this.token = nextToken;
      if (this.socket) {
        this.stop();
      }
      if (this.enabled) {
        this.start();
      }
    },
    /**
     * 中文说明：读取当前本地打印客户端连接 token。
     */
    getToken() {
      return this.token;
    },
    /**
     * 中文说明：启动与本地打印客户端的 WebSocket 连接并绑定连接生命周期事件。
     */
    start() {
      if (!this.enabled) return;
      const runtime = this;
      if (window.WebSocket) {
        if (!this.socket) {
          const ioFactory = globalThis.io;
          if (!ioFactory) throw new Error("运行时依赖缺失：global `io` is required by hiwebSocket.start");
          const endpoint = this.endpoint || DEFAULT_CLIENT_PRINT_ENDPOINT;
          const socketOptions = {
            transports: ["websocket", "polling"],
            reconnectionAttempts: 5,
            autoConnect: false,
            auth: {
              token: this.token
            }
          };
          this.socket = ioFactory(endpoint, socketOptions);
          this.socket.on("printerList", (payload) => {
            runtime.printerList = Array.isArray(payload) ? payload : void 0;
          });
          this.socket.on(CLIENT_AUTH_ERROR_EVENT, (payload) => {
            var _a;
            emitTokenAuthError(runtime, payload);
            (_a = runtime.socket) == null ? void 0 : _a.close();
            runtime.socket = null;
          });
          this.socket.on("success", (payload) => {
            if (!(payload == null ? void 0 : payload.templateId)) return;
            const eventBus = globalThis.hinnn;
            eventBus == null ? void 0 : eventBus.event.trigger(`printSuccess_${payload.templateId}`, payload);
          });
          this.socket.on("render-print-success", (payload) => {
            if (!(payload == null ? void 0 : payload.templateId)) return;
            const eventBus = globalThis.hinnn;
            eventBus == null ? void 0 : eventBus.event.trigger(`printSuccess_${payload.templateId}`, payload);
          });
          this.socket.on("error", (payload) => {
            if (!(payload == null ? void 0 : payload.templateId)) {
              emitConnectionError(runtime, payload);
              return;
            }
            const eventBus = globalThis.hinnn;
            eventBus == null ? void 0 : eventBus.event.trigger(`printError_${payload.templateId}`, payload);
          });
          this.socket.on("render-print-error", (payload) => {
            if (!(payload == null ? void 0 : payload.templateId)) return;
            const eventBus = globalThis.hinnn;
            eventBus == null ? void 0 : eventBus.event.trigger(`printError_${payload.templateId}`, payload);
          });
          this.socket.on("connect", () => {
            runtime.opened = true;
            console.log("Websocket opened.");
            runtime.refreshPrinterList();
            runtime.state = CONNECTED_STATE;
          });
          this.socket.on("connect_error", (error) => {
            emitConnectionError(runtime, error);
          });
          this.socket.on("connect_timeout", (error) => {
            emitConnectionError(runtime, error || "connect timeout");
          });
          this.socket.on("reconnect_error", (error) => {
            emitConnectionError(runtime, error);
          });
          this.socket.on("disconnect", () => {
            runtime.opened = false;
          });
          if (this.socket.connect) this.socket.connect();
          else if (this.socket.open) this.socket.open();
        }
      } else {
        console.log("WebSocket start fail");
      }
    },
    /**
     * 中文说明：在连接异常时安排重连，恢复与本地打印客户端的通信。
     */
    reconnect() {
      if (this.state === CONNECTED_STATE || this.state === RECONNECTING_STATE) {
        this.stop();
        if (this.ensureReconnectingState()) {
          console.log("Websocket reconnecting.");
          this.start();
        }
      }
    },
    /**
     * 中文说明：主动关闭客户端 WebSocket 连接并停止后续重连。
     */
    stop() {
      if (this.socket) {
        console.log("Closing the Websocket.");
        this.socket.close();
        this.socket = null;
      }
    },
    /**
     * 中文说明：标记并维护重连状态，避免客户端通信重复创建重连任务。
     */
    ensureReconnectingState() {
      this.state = RECONNECTING_STATE;
      return this.state === RECONNECTING_STATE;
    }
  };
  function installHiWebSocket(targetWindow = window) {
    targetWindow.hiwebSocket = hiwebSocket;
    return hiwebSocket;
  }
  function createHiLocalStorage(storage = typeof window !== "undefined" ? window.localStorage || null : null) {
    const localStorageRef = storage;
    return {
      /**
       * 中文说明：处理数据映射，把业务数据转换为打印系统渲染或打印所需的值。
       */
      saveLocalData(key, value) {
        return !(!localStorageRef || !value || (localStorageRef.setItem(key, value), 0));
      },
      /**
       * 中文说明：读取local data，为打印系统的布局计算、序列化或渲染提供数据。
       */
      getLocalData(key) {
        return localStorageRef ? localStorageRef.getItem(key) : null;
      },
      /**
       * 中文说明：移除item，清理打印系统中不再需要的 DOM、样式或状态。
       */
      removeItem(key) {
        if (localStorageRef) localStorageRef.removeItem(key);
      }
    };
  }
  function installHiLocalStorage(targetWindow = window) {
    const api = createHiLocalStorage(targetWindow.localStorage || null);
    targetWindow.hiLocalStorage = api;
    return api;
  }
  const hiLocalStorage = createHiLocalStorage();
  function resolveJQuery(jquery) {
    const candidate = jquery ?? globalThis.jQuery ?? globalThis.$;
    if (!candidate) throw new Error("运行时依赖缺失：jQuery global is required by hicontextMenu");
    return candidate;
  }
  class HiContextMenu {
    constructor(target, options2, $2 = resolveJQuery()) {
      __publicField(this, "ele");
      __publicField(this, "defaults");
      __publicField(this, "opts");
      __publicField(this, "random");
      this.$ = $2;
      this.init(target, options2);
    }
    /**
     * 中文说明：初始化jQuery 交互插件实例，绑定默认配置、DOM 结构和必要的交互事件。
     */
    init(target, options2) {
      this.ele = target;
      this.defaults = {
        menu: [{ text: "text", menus: [{}, {}], callback() {
        } }],
        target(_target) {
        },
        width: 100,
        itemHeight: 28,
        bgColor: "#fff",
        color: "#333",
        fontSize: 14,
        hoverBgColor: "#f5f5f5"
      };
      this.opts = this.$.extend(true, {}, this.defaults, options2);
      this.random = (/* @__PURE__ */ new Date()).getTime() + parseInt(String(1e3 * Math.random()));
      this.eventBind();
    }
    /**
     * 中文说明：渲染menu，生成打印或设计阶段需要的 DOM 内容。
     */
    renderMenu(items, parent) {
      let root = parent;
      if (items && items.length) {
        const menu = this.$('<ul class="hicontextmenu" ></ul>');
        if (!root) root = menu.addClass("hicontextmenuroot");
        this.$.each(items, (_index, item) => {
          const disabled = !!item.disable && item.disable();
          const li = this.$(`<li class="hicontextmenuitem"><a href="javascript:void(0);"><span>${item.text || ""}</span></a></li>`);
          if (disabled) li.addClass("disable");
          if (item.borderBottom) li.addClass("borderBottom");
          if (item.menus) {
            li.addClass("hicontextsubmenu");
            this.renderMenu(item.menus, li);
          }
          if (item.callback) {
            li.click((event) => {
              var _a;
              if (this.$(li).hasClass("disable")) event.stopPropagation();
              else {
                this.$(".hicontextmenuroot").remove();
                (_a = item.callback) == null ? void 0 : _a.call(item);
                event.stopPropagation();
              }
            });
          }
          menu.append(li);
        });
        if (parent) parent.append(menu);
      }
      if (!parent) this.$("body").append(root).find(".hicontextmenuroot").hide();
    }
    /**
     * 中文说明：设置position，同步jQuery 交互插件配置并影响后续显示或打印结果。
     */
    setPosition(event) {
      this.$(".hicontextmenuroot").css({ left: event.pageX + 2, top: event.pageY + 2 }).show();
    }
    /**
     * 中文说明：绑定上下文菜单事件，控制右键菜单的显示、隐藏和点击回调。
     */
    eventBind() {
      this.ele.on("contextmenu", (event) => {
        this.$(".hicontextmenuroot").remove();
        event.preventDefault();
        this.renderMenu(this.opts.menus);
        this.setPosition(event);
        if (this.opts.target && typeof this.opts.target === "function") this.opts.target(this.$(event.currentTarget ?? event.target));
      });
      this.$("body").on("click", () => {
        this.$(".hicontextmenuroot").remove();
      });
    }
  }
  function installHiContextMenu(jquery) {
    const $2 = resolveJQuery(jquery);
    $2.fn.hicontextMenu = function hicontextMenu(options2) {
      new HiContextMenu(this, options2, $2);
      return this;
    };
    return $2;
  }
  class PaperHtmlResult {
    /**
     * 中文说明：初始化打印系统对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(source2) {
      this.printLine = source2.printLine;
      this.target = source2.target;
      this.referenceElement = source2.referenceElement;
    }
  }
  class PrintReferenceElement {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(source2) {
      this.top = source2.top;
      this.left = source2.left;
      this.height = source2.height;
      this.width = source2.width;
      this.bottomInLastPaper = source2.bottomInLastPaper;
      this.beginPrintPaperIndex = source2.beginPrintPaperIndex;
      this.printTopInPaper = source2.printTopInPaper;
      this.endPrintPaperIndex = source2.endPrintPaperIndex;
    }
    /**
     * 中文说明：判断position left or right，用于控制打印元素分支逻辑和交互可用性。
     */
    isPositionLeftOrRight(position) {
      return this.top <= position && this.top + this.height > position;
    }
  }
  class PrintElementOptionEntity {
    /**
     * 中文说明：初始化模板配置实体对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
    }
  }
  function isPrimitiveEntityValue(value) {
    return typeof value === "number" || typeof value === "string" || typeof value === "boolean";
  }
  function isStyleEntityValue(value) {
    return typeof value === "number" || typeof value === "string";
  }
  class PrintElementOptions {
    /**
     * 中文说明：初始化模板配置实体对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(options2) {
      const normalizedOptions = options2 || {};
      this.left = normalizedOptions.left;
      this.top = normalizedOptions.top;
      this.topInDesign = this.top;
      this.height = normalizedOptions.height;
      this.width = normalizedOptions.width;
      this.init(normalizedOptions);
    }
    /**
     * 中文说明：设置default，同步模板配置实体配置并影响后续显示或打印结果。
     */
    setDefault(defaultOptions) {
      this.defaultOptions = defaultOptions;
      this.initSize();
    }
    /**
     * 中文说明：初始化size，为模板配置实体后续渲染和设计操作准备状态。
     */
    initSize() {
      if (!this.width) this.setWidth(this.defaultOptions.width);
      if (!this.height) this.setHeight(this.defaultOptions.height);
    }
    /**
     * 中文说明：初始化size by html，为模板配置实体后续渲染和设计操作准备状态。
     */
    initSizeByHtml(width, height) {
      if (!this.width) this.setWidth(width);
      if (!this.height) this.setHeight(height);
    }
    /**
     * 中文说明：读取left，为模板配置实体的布局计算、序列化或渲染提供数据。
     */
    getLeft() {
      return this.left;
    }
    /**
     * 中文说明：格式化显示left，把内部数值转成设计器可直接使用的 CSS 值。
     */
    displayLeft() {
      return this.left + "pt";
    }
    /**
     * 中文说明：设置left，同步模板配置实体配置并影响后续显示或打印结果。
     */
    setLeft(left) {
      if (left != null) this.left = left;
    }
    /**
     * 中文说明：读取top，为模板配置实体的布局计算、序列化或渲染提供数据。
     */
    getTop() {
      return this.top;
    }
    /**
     * 中文说明：读取top in design，为模板配置实体的布局计算、序列化或渲染提供数据。
     */
    getTopInDesign() {
      return this.topInDesign;
    }
    /**
     * 中文说明：格式化显示top，把内部数值转成设计器可直接使用的 CSS 值。
     */
    displayTop() {
      return this.top + "pt";
    }
    /**
     * 中文说明：设置top，同步模板配置实体配置并影响后续显示或打印结果。
     */
    setTop(top) {
      if (top != null) this.top = top;
    }
    /**
     * 中文说明：复制design top from top，保持设计坐标或模板配置的一致性。
     */
    copyDesignTopFromTop() {
      this.topInDesign = this.top;
    }
    /**
     * 中文说明：读取height，为模板配置实体的布局计算、序列化或渲染提供数据。
     */
    getHeight() {
      return this.height;
    }
    /**
     * 中文说明：格式化显示height，把内部数值转成设计器可直接使用的 CSS 值。
     */
    displayHeight() {
      return this.height + "pt";
    }
    /**
     * 中文说明：设置height，同步模板配置实体配置并影响后续显示或打印结果。
     */
    setHeight(height) {
      if (height != null) this.height = height;
    }
    /**
     * 中文说明：读取width，为模板配置实体的布局计算、序列化或渲染提供数据。
     */
    getWidth() {
      return this.width;
    }
    /**
     * 中文说明：格式化显示width，把内部数值转成设计器可直接使用的 CSS 值。
     */
    displayWidth() {
      return this.width + "pt";
    }
    /**
     * 中文说明：设置width，同步模板配置实体配置并影响后续显示或打印结果。
     */
    setWidth(width) {
      if (width != null) this.width = width;
    }
    /**
     * 中文说明：读取value from options or default，为模板配置实体的布局计算、序列化或渲染提供数据。
     */
    getValueFromOptionsOrDefault(name) {
      return this[name] == null ? this.defaultOptions[name] : this[name];
    }
    /**
     * 中文说明：读取print element option entity，为模板配置实体的布局计算、序列化或渲染提供数据。
     */
    getPrintElementOptionEntity() {
      const entity = new PrintElementOptionEntity();
      const self = this;
      Object.keys(this).filter((name) => name !== "topInDesign").forEach((name) => {
        if (isPrimitiveEntityValue(self[name])) entity[name] = self[name];
        if (name === "dataBinding") {
          const dataBinding = normalizeDataBinding(self[name]);
          if (dataBinding) entity.dataBinding = dataBinding;
        }
        if (name === "style") {
          entity.style = {};
          const style = self[name];
          if (style) {
            Object.keys(style).forEach((styleName) => {
              if (isStyleEntityValue(style[styleName])) {
                entity.style[styleName] = style[styleName];
              }
            });
          }
        }
      });
      return entity;
    }
    /**
     * 中文说明：初始化模板配置实体实例，绑定默认配置、DOM 结构和必要的交互事件。
     */
    init(options2) {
      if (options2) {
        Object.keys(options2).forEach((name) => {
          this[name] = options2[name];
        });
      }
    }
  }
  function createModule5TableCell$1(entity) {
    return new TableColumn(entity);
  }
  class TableRow {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
      __publicField(this, "id");
      __publicField(this, "isHead");
      __publicField(this, "target");
      __publicField(this, "tableOptions");
      __publicField(this, "columns");
      this.id = TableIdGenerator.createId();
    }
    /**
     * 中文说明：初始化表格设计器实例，绑定默认配置、DOM 结构和必要的交互事件。
     */
    init(tableOptions, target, isHead) {
      this.isHead = isHead;
      this.target = target || $("<tr></tr>");
      this.tableOptions = tableOptions;
      this.initCells(this.columns);
    }
    /**
     * 中文说明：读取target，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getTarget() {
      return this.target;
    }
    /**
     * 中文说明：初始化cells，为表格设计器后续渲染和设计操作准备状态。
     */
    initCells(cells) {
      const row = this;
      cells ? cells.forEach((cell, index) => {
        cell.init(row.target.find("td:eq(" + index + ")"), row.tableOptions, row.id, row.isHead);
      }) : (this.columns = [], this.target.find("td").map((index, element) => {
        const cell = createModule5TableCell$1();
        cell.init($(element), row.tableOptions, row.id, row.isHead);
        row.columns.push(cell);
      }));
    }
    /**
     * 中文说明：移除cell，清理表格设计器中不再需要的 DOM、样式或状态。
     */
    removeCell(cell) {
      const index = this.columns.indexOf(cell);
      this.columns[index].getTarget().remove();
      this.columns.splice(index, 1);
    }
    /**
     * 中文说明：创建table cell，供表格设计器在设计器或打印渲染流程中使用。
     */
    createTableCell(rowspan, colspan) {
      const cell = createModule5TableCell$1();
      cell.init($("<td></td>"), this.tableOptions, this.id, this.isHead);
      if (rowspan > 1) {
        cell.getTarget().attr("rowspan", rowspan);
        cell.rowspan = rowspan;
      }
      if (colspan > 1) {
        cell.getTarget().attr("colspan", colspan);
        cell.colspan = colspan;
      }
      return cell;
    }
    /**
     * 中文说明：插入to target cell left，维护表格设计器的行列结构与合并单元格关系。
     */
    insertToTargetCellLeft(targetCell, cell) {
      const index = this.columns.indexOf(targetCell);
      targetCell.getTarget().before(cell.getTarget());
      this.columns.splice(index, 0, cell);
    }
    /**
     * 中文说明：插入to target cell right，维护表格设计器的行列结构与合并单元格关系。
     */
    insertToTargetCellRight(targetCell, cell) {
      const index = this.columns.indexOf(targetCell);
      this.columns[index].getTarget().after(cell.getTarget());
      this.columns.splice(index + 1, 0, cell);
    }
    /**
     * 中文说明：插入cell to first，维护表格设计器的行列结构与合并单元格关系。
     */
    insertCellToFirst(cell) {
      this.target.prepend(cell.getTarget());
      this.columns.splice(0, 0, cell);
    }
    /**
     * 中文说明：插入cell to last，维护表格设计器的行列结构与合并单元格关系。
     */
    insertCellToLast(cell) {
      this.columns.push(cell);
      this.target.append(cell.getTarget());
    }
    /**
     * 中文说明：读取print element option entity，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getPrintElementOptionEntity() {
      const entities = [];
      this.columns.forEach((cell) => {
        entities.push(cell.getEntity());
      });
      return entities;
    }
  }
  function createModule5TableCell(entity) {
    return new TableColumn(entity);
  }
  class TableRowEntity extends TableRow {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(entity) {
      super();
      const source2 = entity;
      (this.columns = [], source2 && source2.constructor === Array) ? (source2 || []).forEach((columnEntity) => {
        this.columns.push(createModule5TableCell(columnEntity));
      }) : source2.columns && (source2.columns || []).forEach((columnEntity) => {
        this.columns.push(createModule5TableCell(columnEntity));
      });
    }
    /**
     * 中文说明：读取print element option entity，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getPrintElementOptionEntity() {
      const entities = [];
      this.columns.forEach((cell) => {
        entities.push(cell.getEntity());
      });
      return entities;
    }
  }
  function getJQueryExtend() {
    const globalWithDollar = globalThis;
    const dollar = globalWithDollar.$;
    if (!(dollar == null ? void 0 : dollar.extend)) {
      throw new Error("运行时依赖缺失：global `$.extend` is required by TablePrintElementOptions");
    }
    return dollar;
  }
  function extendExistingColumn(target, source2) {
    return getJQueryExtend().extend(target, source2);
  }
  class SerializedTableColumnOptions {
    /**
     * 中文说明：初始化模板配置实体对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(column2) {
      this.width = column2.width;
      this.title = column2.title;
      this.field = column2.field;
      this.dataBinding = normalizeDataBinding(column2.dataBinding);
      this.dataType = column2.dataType;
      this.format = column2.format;
      this.summaryAggregate = column2.summaryAggregate;
      this.summaryValueType = column2.summaryValueType;
      this.summaryLabel = column2.summaryLabel;
      this.fixed = false;
      this.rowspan = column2.rowspan || 1;
      this.colspan = column2.colspan || 1;
      this.align = column2.align;
      this.halign = column2.halign;
      this.vAlign = column2.vAlign;
      this.formatter2 = column2.formatter2;
      this.styler2 = column2.styler2;
    }
  }
  class TablePrintElementOptions extends PrintElementOptions {
    /**
     * 中文说明：初始化模板配置实体对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(options2, printElementType) {
      const normalizedOptions = options2 || {};
      super(normalizedOptions);
      this.lHeight = normalizedOptions.lHeight;
      this.autoCompletion = normalizedOptions.autoCompletion;
      this.tableFooterRepeat = normalizedOptions.tableFooterRepeat;
      if (printElementType) {
        this.columns = [];
        if (printElementType.editable && normalizedOptions.columns && normalizedOptions.columns.length) {
          normalizedOptions.columns.forEach((row, rowIndex) => {
            const rowColumns = [];
            row.forEach((column2, columnIndex) => {
              var _a;
              const columnEntity = new SerializedTableColumnOptions(column2);
              const existingColumn = (_a = printElementType.columns[rowIndex]) == null ? void 0 : _a[columnIndex];
              const mergedColumn = existingColumn ? extendExistingColumn(existingColumn, columnEntity) : new TableColumn(columnEntity);
              mergedColumn.checked = true;
              rowColumns.push(mergedColumn);
            });
            this.columns.push(new TableRowEntity(rowColumns));
          });
        } else {
          printElementType.columns.forEach((row) => {
            this.columns.push(new TableRowEntity(row.filter((column2) => column2.checked)));
          });
        }
      }
    }
    /**
     * 中文说明：读取grid columns，为模板配置实体的布局计算、序列化或渲染提供数据。
     */
    getGridColumns() {
      return this.gridColumns || 1;
    }
    /**
     * 中文说明：处理模板配置实体的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getPrintElementOptionEntity() {
      const entity = super.getPrintElementOptionEntity();
      if (this.columns) {
        entity.columns = [];
        this.columns.forEach((row) => {
          var _a;
          const columns = row.getPrintElementOptionEntity().filter((column2) => column2.checked).map((column2) => new SerializedTableColumnOptions(column2));
          (_a = entity.columns) == null ? void 0 : _a.push(columns);
        });
      }
      return entity;
    }
  }
  class ReconsitutionTableColumns {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
      this.rowColumns = [];
    }
  }
  let svgIdSeed = 0;
  function scopeSvgIds(root, prefix = "hiprint-svg") {
    var _a;
    if (!(root == null ? void 0 : root.querySelectorAll)) return;
    const svgs = ((_a = root.matches) == null ? void 0 : _a.call(root, "svg")) ? [root] : Array.from(root.querySelectorAll("svg"));
    svgs.forEach((svg) => {
      const elementsWithId = Array.from(svg.querySelectorAll("[id]"));
      elementsWithId.forEach((element) => {
        const oldId = element.getAttribute("id");
        if (!oldId) return;
        const nextId = `${prefix}-${++svgIdSeed}`;
        element.setAttribute("id", nextId);
        Array.from(svg.querySelectorAll("use")).forEach((useElement) => {
          if (useElement.getAttribute("href") === `#${oldId}`) {
            useElement.setAttribute("href", `#${nextId}`);
          }
          if (useElement.getAttribute("xlink:href") === `#${oldId}`) {
            useElement.setAttribute("xlink:href", `#${nextId}`);
          }
          if (useElement.getAttributeNS("http://www.w3.org/1999/xlink", "href") === `#${oldId}`) {
            useElement.setAttributeNS("http://www.w3.org/1999/xlink", "href", `#${nextId}`);
          }
        });
      });
    });
  }
  function isRenderableImageSource(value) {
    if (typeof value !== "string") return false;
    const source2 = value.trim();
    if (!source2) return false;
    if (source2 === "false" || source2 === "null" || source2 === "undefined") return false;
    return true;
  }
  class TableExcelHelper {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
    }
    /**
     * 中文说明：创建table head，供表格设计器在设计器或打印渲染流程中使用。
     */
    static createTableHead(tableColumns, width) {
      const columnTree = TableExcelHelper.reconsitutionTableColumnTree(tableColumns);
      const thead = $("<thead></thead>");
      const widths = TableExcelHelper.getColumnsWidth(columnTree, width);
      const appendLayer = function appendLayer2(layerIndex) {
        const tr = $("<tr></tr>");
        columnTree[layerIndex].forEach((column2, columnIndexInLayer) => {
          const td = $("<td></td>");
          const columnIndex = columnTree.rowColumns.indexOf(column2);
          if (column2.id) td.attr("id", column2.id);
          td.attr("data-header-row-index", layerIndex);
          td.attr("data-header-cell-index", columnIndexInLayer);
          if (columnIndex >= 0) td.attr("data-column-index", columnIndex);
          if (column2.align || column2.halign) td.css("text-align", column2.halign || column2.align);
          if (column2.vAlign) td.css("vertical-align", column2.vAlign);
          if (column2.colspan > 1) td.attr("colspan", column2.colspan);
          if (column2.rowspan > 1) td.attr("rowspan", column2.rowspan);
          td.html(column2.title);
          if (widths[column2.id]) {
            column2.hasWidth = true;
            column2.targetWidth = widths[column2.id];
            td.attr("haswidth", "haswidth");
            td.css("width", `${widths[column2.id]}pt`);
          } else {
            column2.hasWidth = false;
          }
          tr.append(td);
        });
        thead.append(tr);
      };
      for (let layerIndex = 0; layerIndex < columnTree.totalLayer; layerIndex += 1) {
        appendLayer(layerIndex);
      }
      TableExcelHelper.syncTargetWidthToOption(tableColumns);
      return thead;
    }
    /**
     * 中文说明：创建table footer，供表格设计器在设计器或打印渲染流程中使用。
     */
    static createTableFooter(target, data, options2, tablePrintElementType2, extra1, extra2) {
      const tfoot = $("<tfoot></tfoot>");
      const formatter2 = this.getFooterFormatter(options2, tablePrintElementType2);
      if (formatter2) tfoot.append(formatter2(options2, data, extra1, extra2));
      TableExcelHelper.normalizeTableFooter(tfoot, target);
      return tfoot;
    }
    /**
     * 中文说明：补齐自定义表格脚缺失的单元格，避免 footerFormatter 只返回部分 td 时丢失列边框。
     */
    static normalizeTableFooter(tfoot, tableColumns) {
      const rows = tfoot.find("tr");
      rows.addClass("hiprint-table-footer-row");
      if (!Array.isArray(tableColumns) || tableColumns.length === 0) return;
      const rowColumns = TableExcelHelper.reconsitutionTableColumnTree(tableColumns).rowColumns || [];
      const columnCount = rowColumns.length;
      if (!columnCount) return;
      rows.each((_index, row) => {
        const tr = $(row);
        let usedColumns = 0;
        tr.children("td,th").each((_cellIndex, cell) => {
          const colspan = Number($(cell).attr("colspan"));
          usedColumns += Number.isFinite(colspan) && colspan > 0 ? colspan : 1;
        });
        for (let appendIndex = usedColumns; appendIndex < columnCount; appendIndex += 1) {
          tr.append("<td></td>");
        }
      });
    }
    /**
     * 中文说明：创建table row，供表格设计器在设计器或打印渲染流程中使用。
     */
    static createTableRow(tableColumns, data, options2, tablePrintElementType2) {
      const columnTree = TableExcelHelper.reconsitutionTableColumnTree(tableColumns);
      const tbody = $("<tbody></tbody>");
      if (!data) data = [];
      if (tablePrintElementType2.groupFields.length) {
        hinnn.groupBy(data, tablePrintElementType2.groupFields, (row) => {
          const groupKey = {};
          tablePrintElementType2.groupFields.forEach((field) => {
            groupKey[field] = row[field];
          });
          return groupKey;
        }).forEach((group) => {
          if (tablePrintElementType2.groupFormatter) {
            const tr = $(`<tr><td colspan=${columnTree.colspan}></td></tr>`);
            tr.find("td").append(tablePrintElementType2.groupFormatter(group, options2));
            tbody.append(tr);
          }
          group.rows.forEach((row) => {
            const tr = TableExcelHelper.createRowTarget(columnTree, row, options2, tablePrintElementType2);
            tbody.append(tr);
          });
          if (tablePrintElementType2.groupFooterFormatter) {
            const tr = $(`<tr><td colspan=${columnTree.colspan}></td></tr>`);
            tr.find("td").append(tablePrintElementType2.groupFooterFormatter(group, options2));
            tbody.append(tr);
          }
        });
      } else {
        data.forEach((row) => {
          const tr = TableExcelHelper.createRowTarget(columnTree, row, options2, tablePrintElementType2);
          tbody.append(tr);
        });
      }
      return tbody;
    }
    /**
     * 中文说明：创建row target，供表格设计器在设计器或打印渲染流程中使用。
     */
    static createRowTarget(columnTree, row, options2, tablePrintElementType2) {
      const tr = $("<tr></tr>");
      tr.data("rowData", row);
      columnTree.rowColumns.forEach((column2, index) => {
        const td = $("<td></td>");
        if (column2.field) td.attr("field", column2.field);
        if (column2.align) td.css("text-align", column2.align);
        if (column2.vAlign) td.css("vertical-align", column2.vAlign);
        TableExcelHelper.applyCellPadding(td, column2);
        const formatter2 = TableExcelHelper.getColumnFormatter(column2);
        const rawValue = TableExcelHelper.getColumnValue(column2, row);
        const formattedValue = TableExcelHelper.formatColumnValue(column2, rawValue);
        const value = formatter2 ? formatter2(formattedValue, row, index, options2) : formattedValue;
        TableExcelHelper.renderColumnValue(td, column2, value, options2);
        const styler2 = TableExcelHelper.getColumnStyler(column2);
        if (styler2) {
          const styles = styler2(rawValue, row, index, options2);
          if (styles) Object.keys(styles).forEach((styleName) => {
            td.css(styleName, styles[styleName]);
          });
        }
        tr.append(td);
      });
      const rowStyler2 = TableExcelHelper.getRowStyler(options2, tablePrintElementType2);
      if (rowStyler2) {
        const styles = rowStyler2(row, options2);
        if (styles) Object.keys(styles).forEach((styleName) => {
          tr.css(styleName, styles[styleName]);
        });
      }
      return tr;
    }
    static formatColumnValue(column2, value) {
      const dataType = column2.dataType;
      const format = column2.format;
      if (dataType === "rmbUppercase" || dataType === "rmb" || dataType === "amountUppercase") return hinnn.rmbUppercase(value) || value;
      if (dataType === "datetime" && format) return hinnn.dateFormat(value, format);
      if ((dataType === "boolean" || dataType === "boolen") && format) {
        const parts = format.toString().split(":");
        if (parts.length > 0) return value === true || value === "true" ? parts[0] : parts[1];
      }
      return value;
    }
    static createSummaryFooterFormatter(tableColumns) {
      return (_options, rows) => {
        const columnTree = TableExcelHelper.reconsitutionTableColumnTree(tableColumns);
        const rowColumns = columnTree.rowColumns;
        if (!TableExcelHelper.hasSummaryFooter(rowColumns)) return "";
        const tr = $("<tr></tr>");
        rowColumns.forEach((column2) => {
          var _a;
          const td = $("<td></td>");
          const summaryAggregate = TableExcelHelper.normalizeSummaryAggregate(column2.summaryAggregate);
          if (column2.align) td.css("text-align", column2.align);
          if (column2.vAlign) td.css("vertical-align", column2.vAlign);
          TableExcelHelper.applyCellPadding(td, column2);
          if (summaryAggregate) {
            const summaryValue = TableExcelHelper.calculateSummaryColumnValue(column2, rows, {
              field: ((_a = column2.dataBinding) == null ? void 0 : _a.path) || column2.field || "",
              aggregate: summaryAggregate,
              valueType: column2.summaryValueType === "rmbUppercase" ? "rmbUppercase" : "number"
            });
            td.html(column2.summaryLabel ? `${column2.summaryLabel} ${summaryValue}` : summaryValue);
          } else if (column2.summaryLabel) {
            td.html(column2.summaryLabel);
          } else {
            td.html("");
          }
          tr.append(td);
        });
        return tr;
      };
    }
    static calculateSummaryColumnValue(column2, rows, summaryColumn) {
      const values = rows.map((row) => TableExcelHelper.parseSummaryNumber(TableExcelHelper.getColumnValue(column2, row)));
      const sum = values.reduce((total, value) => total + value, 0);
      const result = summaryColumn.aggregate === "avg" ? values.length ? sum / values.length : 0 : sum;
      return summaryColumn.valueType === "rmbUppercase" ? hinnn.rmbUppercase(result) : TableExcelHelper.formatSummaryNumber(result);
    }
    static hasSummaryFooter(rowColumns) {
      return rowColumns.some((column2) => TableExcelHelper.normalizeSummaryAggregate(column2.summaryAggregate));
    }
    static normalizeSummaryAggregate(value) {
      return value === "sum" || value === "avg" ? value : void 0;
    }
    static parseSummaryNumber(value) {
      if (value == null || value === "") return 0;
      const normalized = String(value).replace(/[￥¥,\s]/g, "").replace(/整$/, "").replace(/[元圆]$/, "").replace(/[^\d.+-]/g, "");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    static formatSummaryNumber(value) {
      if (!Number.isFinite(value)) return "";
      return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, "");
    }
    static renderColumnValue(td, column2, value, options2) {
      var _a;
      const textType = column2.textType || "text";
      const text = value == null ? "" : value.toString();
      if (!text) {
        td.html("");
        return;
      }
      if (textType === "image") {
        if (!isRenderableImageSource(value)) {
          td.html("");
          return;
        }
        const box = TableExcelHelper.createRenderBox(column2);
        const image = $("<img>");
        image.css("display", "block");
        TableExcelHelper.applyRenderSize(image, column2);
        (_a = image.on) == null ? void 0 : _a.call(image, "error", () => {
          td.text(text);
        });
        image.attr("src", text);
        box.append(image);
        td.html("");
        td.append(box);
        return;
      }
      if (textType === "qrcode") {
        td.html("");
        try {
          const renderWidth = TableExcelHelper.renderSizeToPt(column2.renderWidth, 48) || 48;
          const renderHeight = TableExcelHelper.renderSizeToPt(column2.renderHeight, 48) || 48;
          const size = Math.max(1, Math.min(renderWidth, renderHeight));
          const box = $("<div></div>");
          box.css("display", "inline-block");
          box.css("vertical-align", "middle");
          box.css("width", `${size}pt`);
          box.css("height", `${size}pt`);
          td.append(box);
          const sizePx = Math.max(1, Math.floor(hinnn.pt.toPx(size)));
          new QRCode(box[0], { width: sizePx, height: sizePx, colorDark: "#000000", useSVG: true }).makeCode(text);
          scopeSvgIds(box[0], "hiprint-table-qrcode");
          box.find("svg,img").css("width", "100%").css("height", "100%");
        } catch (error) {
          console.log(error);
          td.html("二维码生成失败");
        }
        return;
      }
      if (textType === "barcode") {
        const box = TableExcelHelper.createRenderBox(column2, 120, 32);
        box.html('<svg width="100%" display="block" height="100%" class="hibarcode_imgcode" preserveAspectRatio="none slice"></svg>');
        td.html("");
        td.append(box);
        try {
          JsBarcode(box.find(".hibarcode_imgcode")[0], text, {
            format: column2.barcodeMode || "CODE128",
            width: 1,
            textMargin: -1,
            lineColor: "#000000",
            margin: 0,
            height: Math.max(1, Math.floor(TableExcelHelper.renderSizeToPx(column2.renderHeight, 32))),
            displayValue: false
          });
          box.find(".hibarcode_imgcode").attr("height", "100%");
          box.find(".hibarcode_imgcode").attr("width", "100%");
        } catch (error) {
          console.log(error);
          td.html("此格式不支持该文本");
        }
        return;
      }
      td.html(value == null ? "" : value);
      TableExcelHelper.normalizeEmbeddedImages(td, column2, options2);
    }
    static normalizeEmbeddedImages(td, column2, options2) {
      td.find("img").each((_index, element) => {
        var _a, _b, _c;
        const image = $(element);
        const source2 = image.attr("src");
        if (!isRenderableImageSource(source2)) {
          image.remove();
          return;
        }
        const hasWidth = Boolean(image.attr("width") || ((_a = element.style) == null ? void 0 : _a.width));
        const hasHeight = Boolean(image.attr("height") || ((_b = element.style) == null ? void 0 : _b.height));
        const width = TableExcelHelper.renderSizeToPt(column2.renderWidth);
        const height = TableExcelHelper.renderSizeToPt(column2.renderHeight) || TableExcelHelper.renderSizeToPt(options2 == null ? void 0 : options2.tableBodyRowHeight) || 48;
        image.css("display", "block");
        image.css("object-fit", "contain");
        image.css("max-width", "100%");
        if (!hasWidth && width) image.css("width", `${width}pt`);
        if (!hasHeight) {
          image.css("height", `${height}pt`);
          image.css("max-height", `${height}pt`);
        }
        (_c = image.on) == null ? void 0 : _c.call(image, "error", () => image.remove());
      });
    }
    static createRenderBox(column2, defaultWidthPt, defaultHeightPt) {
      const box = $("<div></div>");
      box.css("display", "inline-block");
      box.css("vertical-align", "middle");
      TableExcelHelper.applyRenderSize(box, column2, defaultWidthPt, defaultHeightPt);
      return box;
    }
    static applyRenderSize(target, column2, defaultWidthPt, defaultHeightPt) {
      const width = TableExcelHelper.renderSizeToPt(column2.renderWidth, defaultWidthPt);
      const height = TableExcelHelper.renderSizeToPt(column2.renderHeight, defaultHeightPt);
      if (width) target.css("width", `${width}pt`);
      else target.css("max-width", "100%");
      if (height) target.css("height", `${height}pt`);
      else target.css("height", "100%");
    }
    static applyCellPadding(td, column2) {
      const paddingTop = TableExcelHelper.renderSizeToPt(column2.paddingTop);
      const paddingLeft = TableExcelHelper.renderSizeToPt(column2.paddingLeft);
      const paddingRight = TableExcelHelper.renderSizeToPt(column2.paddingRight);
      const paddingBottom = TableExcelHelper.renderSizeToPt(column2.paddingBottom);
      if (paddingTop) td.css("padding-top", `${paddingTop}pt`);
      if (paddingLeft) td.css("padding-left", `${paddingLeft}pt`);
      if (paddingRight) td.css("padding-right", `${paddingRight}pt`);
      if (paddingBottom) td.css("padding-bottom", `${paddingBottom}pt`);
    }
    static renderSizeToPt(value, fallback) {
      const parsed = typeof value === "number" ? value : value ? parseFloat(value.toString()) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }
    static renderSizeToPx(value, fallbackPt) {
      return hinnn.pt.toPx(TableExcelHelper.renderSizeToPt(value, fallbackPt) || fallbackPt);
    }
    static getColumnValue(column2, row) {
      const boundValue = resolveDataBindingValue(column2.dataBinding, row, void 0, row);
      if (boundValue.found) return boundValue.value;
      return column2.field ? row[column2.field] : "";
    }
    /**
     * 中文说明：创建empty row target，供表格设计器在设计器或打印渲染流程中使用。
     */
    static createEmptyRowTarget(tableColumns) {
      const columnTree = TableExcelHelper.reconsitutionTableColumnTree(tableColumns);
      const tr = $("<tr></tr>");
      columnTree.rowColumns.forEach((column2) => {
        const td = $("<td></td>");
        if (column2.field) td.attr("field", column2.field);
        if (column2.align) td.css("text-align", column2.align);
        if (column2.vAlign) td.css("vertical-align", column2.vAlign);
        tr.append(td);
      });
      return tr;
    }
    /**
     * 中文说明：读取columns width，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    static getColumnsWidth(columnTree, width) {
      const widths = {};
      const autoWidth = TableExcelHelper.allAutoWidth(columnTree);
      const fixedWidth = TableExcelHelper.allFixedWidth(columnTree);
      columnTree.rowColumns.forEach((column2) => {
        if (column2.fixed) widths[column2.id] = column2.width;
        else {
          const remainingWidth = width - fixedWidth;
          const targetWidth = column2.width / autoWidth * (remainingWidth > 0 ? remainingWidth : 0);
          widths[column2.id] = targetWidth;
        }
      });
      return widths;
    }
    /**
     * 中文说明：处理表格单元格，维护表格设计器中的选区、布局或样式状态。
     */
    static resizeTableCellWidth(target, tableColumns, width) {
      const columnTree = TableExcelHelper.reconsitutionTableColumnTree(tableColumns);
      const widths = TableExcelHelper.getColumnsWidth(columnTree, width);
      target.find("thead tr td[haswidth]").map((_index, element) => {
        const id = $(element).attr("id");
        const targetWidth = widths[id];
        $(element).css("width", `${targetWidth}pt`);
      });
    }
    /**
     * 中文说明：将表格列宽切换为自动宽度，清理固定宽度标记。
     */
    static allAutoWidth(columnTree) {
      let width = 0;
      columnTree.rowColumns.forEach((column2) => {
        width += column2.fixed ? 0 : column2.width;
      });
      return width;
    }
    /**
     * 中文说明：将表格列宽固定为当前宽度，便于打印时保持列布局稳定。
     */
    static allFixedWidth(columnTree) {
      let width = 0;
      columnTree.rowColumns.forEach((column2) => {
        width += column2.fixed ? column2.width : 0;
      });
      return width;
    }
    /**
     * 中文说明：处理表格列，维护表格设计器的列宽、列结构或表头关系。
     */
    static reconsitutionTableColumnTree(tableColumns, existing, _unused) {
      const columnTree = existing || new ReconsitutionTableColumns();
      columnTree.colspan = 0;
      for (let layerIndex = 0; layerIndex < tableColumns.length; layerIndex += 1) {
        columnTree.totalLayer = layerIndex + 1;
        columnTree[layerIndex] = tableColumns[layerIndex].columns;
        if (layerIndex === 0) tableColumns[layerIndex].columns.forEach((column2) => {
          if (layerIndex === 0) columnTree.colspan += column2.colspan;
        });
      }
      columnTree.rowColumns = TableExcelHelper.getOrderdColumns(columnTree);
      return columnTree;
    }
    /**
     * 中文说明：处理属性配置项，连接表格设计器配置面板与模板元素属性。
     */
    static syncTargetWidthToOption(tableColumns) {
      tableColumns.forEach((layer) => {
        layer.columns.forEach((column2) => {
          if (column2.hasWidth) column2.width = column2.targetWidth;
        });
      });
    }
    /**
     * 中文说明：读取footer formatter，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    static getFooterFormatter(options, tablePrintElementType) {
      let footerFormatter;
      if (tablePrintElementType.footerFormatter) footerFormatter = tablePrintElementType.footerFormatter;
      if (options.footerFormatter) {
        try {
          const s = `footerFormatter=${options.footerFormatter}`;
          eval(s);
        } catch (error) {
          console.log(error);
        }
      }
      if (!footerFormatter && TableExcelHelper.hasSummaryFooter(TableExcelHelper.reconsitutionTableColumnTree(tablePrintElementType.columns).rowColumns)) {
        footerFormatter = TableExcelHelper.createSummaryFooterFormatter(tablePrintElementType.columns);
      }
      return footerFormatter;
    }
    /**
     * 中文说明：读取row styler，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    static getRowStyler(options, tablePrintElementType) {
      let rowStyler;
      if (tablePrintElementType.rowStyler) rowStyler = tablePrintElementType.rowStyler;
      if (options.rowStyler) {
        try {
          const s = `rowStyler=${options.rowStyler}`;
          eval(s);
        } catch (error) {
          console.log(error);
        }
      }
      return rowStyler;
    }
    /**
     * 中文说明：读取column styler，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    static getColumnStyler(column) {
      let styler;
      if (column.styler) styler = column.styler;
      if (column.styler2) {
        try {
          const s = `styler=${column.styler2}`;
          eval(s);
        } catch (error) {
          console.log(error);
        }
      }
      return styler;
    }
    /**
     * 中文说明：读取column formatter，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    static getColumnFormatter(column) {
      let formatter;
      if (column.formatter) formatter = column.formatter;
      if (column.formatter2) {
        try {
          const s = `formatter=${column.formatter2}`;
          eval(s);
        } catch (error) {
          console.log(error);
        }
      }
      return formatter;
    }
    /**
     * 中文说明：读取orderd columns，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    static getOrderdColumns(columnTree) {
      const rowMap = {};
      for (let layerIndex = 0; layerIndex < columnTree.totalLayer; layerIndex += 1) {
        columnTree[layerIndex].forEach((column2) => {
          for (let rowIndex = 0; rowIndex < column2.rowspan; rowIndex += 1) {
            rowMap[layerIndex + rowIndex] = rowMap[layerIndex + rowIndex] ? rowMap[layerIndex + rowIndex] : [];
            rowMap[layerIndex + rowIndex].push(column2);
          }
        });
      }
      return rowMap[columnTree.totalLayer - 1];
    }
  }
  class GridColumns {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(gridColumns, target) {
      this.gridColumns = gridColumns;
      this.target = target;
    }
    /**
     * 中文说明：读取by index，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getByIndex(index) {
      return this.target.find(".hi-grid-col:eq(" + index + ")");
    }
  }
  class PrintElementEntity {
    /**
     * 中文说明：初始化模板配置实体对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(tid, options2, printElementType) {
      this.tid = tid;
      this.options = options2;
      this.printElementType = printElementType;
    }
  }
  function isPlainRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  function copyValue(target, name, value) {
    if (isPlainRecord(value)) {
      Object.keys(value).forEach((key) => {
        target[key] = value[key];
      });
      return;
    }
    target[name] = value;
  }
  function buildOptionPanelState(optionItems) {
    const visibilityValues = {};
    const submitValues = {};
    const disabledNames = /* @__PURE__ */ new Set();
    optionItems.forEach((item) => {
      if (item.name.startsWith("__layout")) return;
      const value = item.getValue();
      copyValue(visibilityValues, item.name, value);
    });
    optionItems.forEach((item) => {
      var _a;
      if (item.name.startsWith("__layout")) return;
      const value = item.getValue();
      if ((_a = item.disabledWhen) == null ? void 0 : _a.call(item, visibilityValues)) disabledNames.add(item.name);
      if (item.visibleWhen && !item.visibleWhen(visibilityValues)) {
        if (isPlainRecord(value)) {
          Object.keys(value).forEach((key) => {
            submitValues[key] = void 0;
          });
        } else {
          submitValues[item.name] = void 0;
        }
        return;
      }
      copyValue(submitValues, item.name, value);
    });
    return { visibilityValues, submitValues, disabledNames };
  }
  function setTargetDisabled(item, disabled) {
    var _a;
    const target = item.target;
    if (!target) return;
    (_a = target[disabled ? "addClass" : "removeClass"]) == null ? void 0 : _a.call(target, "is-disabled");
    ["input", "select", "textarea", "button"].forEach((selector2) => {
      const fields = target.find(selector2);
      if (fields.prop) {
        fields.prop("disabled", disabled);
        return;
      }
      fields.map((_index, element) => {
        element.disabled = disabled;
      });
    });
  }
  function refreshOptionPanelVisibility(optionItems) {
    const state = buildOptionPanelState(optionItems);
    optionItems.forEach((item) => {
      var _a, _b, _c, _d;
      if (!item.target || item.name.startsWith("__layout")) return;
      const visible = item.visibleWhen ? item.visibleWhen(state.visibilityValues) : true;
      if (visible) (_b = (_a = item.target).show) == null ? void 0 : _b.call(_a);
      else (_d = (_c = item.target).hide) == null ? void 0 : _d.call(_c);
      setTargetDisabled(item, state.disabledNames.has(item.name));
    });
    return state;
  }
  function getOptionItemValues(optionItems) {
    return buildOptionPanelState(optionItems).submitValues;
  }
  class BasePrintElement {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(printElementType) {
      this.printElementType = printElementType;
      this.id = HiPrintlib.instance.guid();
    }
    /**
     * 中文说明：读取config options by name，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getConfigOptionsByName(name) {
      return HiPrintConfig.instance[name];
    }
    /**
     * 中文说明：读取proxy target，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getProxyTarget(options2) {
      if (options2) this.SetProxyTargetOption(options2);
      const data = this.getData();
      const target = this.createTarget(this.getTitle(), data);
      this.updateTargetSize(target);
      this.css(target, data);
      return target;
    }
    /**
     * 中文说明：设置proxy target option，同步打印元素配置并影响后续显示或打印结果。
     */
    SetProxyTargetOption(options2) {
      this.options.getPrintElementOptionEntity();
      $.extend(this.options, options2);
    }
    /**
     * 中文说明：根据首页、尾页、奇偶页等规则判断打印元素是否应显示在当前页。
     */
    showInPage(pageIndex, pageCount) {
      const showInPage = this.options.showInPage;
      const unShowInPage = this.options.unShowInPage;
      if (showInPage) {
        if (showInPage === "first") return pageIndex === 0;
        if (pageIndex === pageCount - 1 && unShowInPage === "last") return false;
        if (showInPage === "odd") return (pageIndex !== 0 || unShowInPage !== "first") && pageIndex % 2 === 0;
        if (showInPage === "even") return pageIndex % 2 === 1;
        if (showInPage === "last") return pageIndex === pageCount - 1;
      }
      return (pageIndex !== 0 || unShowInPage !== "first") && (pageIndex !== pageCount - 1 || unShowInPage !== "last");
    }
    /**
     * 中文说明：设置template id，同步打印元素配置并影响后续显示或打印结果。
     */
    setTemplateId(templateId) {
      this.templateId = templateId;
    }
    /**
     * 中文说明：设置panel，同步打印元素配置并影响后续显示或打印结果。
     */
    setPanel(panel) {
      this.panel = panel;
    }
    /**
     * 中文说明：读取field，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getField() {
      return this.options.field || this.printElementType.field;
    }
    /**
     * 中文说明：读取title，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getTitle() {
      return this.printElementType.title;
    }
    /**
     * 中文说明：更新size and position options，让打印元素的 DOM、尺寸或交互状态保持一致。
     */
    updateSizeAndPositionOptions(left, top, width, height) {
      this.options.setLeft(left);
      this.options.setTop(top);
      this.options.copyDesignTopFromTop();
      this.options.setWidth(width);
      this.options.setHeight(height);
      hinnn.event.trigger(`hiprintTemplateDataChanged_${this.templateId}`);
    }
    /**
     * 中文说明：初始化size by html，为打印元素后续渲染和设计操作准备状态。
     */
    initSizeByHtml(target) {
      if (target && target.length) {
        this.createTempContainer();
        const clonedTarget = target.clone();
        this.getTempContainer().append(clonedTarget);
        this.options.initSizeByHtml(parseInt(hinnn.px.toPt(clonedTarget.width()).toString()), parseInt(hinnn.px.toPt(clonedTarget.height()).toString()));
        this.removeTempContainer();
      }
    }
    /**
     * 中文说明：更新target size，让打印元素的 DOM、尺寸或交互状态保持一致。
     */
    updateTargetSize(target) {
      target.css("width", this.options.displayWidth());
      target.css("height", this.options.displayHeight());
    }
    /**
     * 中文说明：更新target width，让打印元素的 DOM、尺寸或交互状态保持一致。
     */
    updateTargetWidth(target) {
      target.css("width", this.options.displayWidth());
    }
    /**
     * 中文说明：读取design target，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getDesignTarget(paper) {
      this.designTarget = this.getHtml(paper)[0].target;
      this.designPaper = paper;
      this.designTarget.click(() => {
        hinnn.event.trigger(this.getPrintElementSelectEventKey(), {
          printElement: this,
          selectionKind: "element"
        });
      });
      return this.designTarget;
    }
    /**
     * 中文说明：读取print element select event key，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getPrintElementSelectEventKey() {
      return `PrintElementSelectEventKey_${this.templateId}`;
    }
    /**
     * 中文说明：渲染打印元素的设计态 DOM，并绑定设计器中的拖拽、选择和属性编辑能力。
     */
    design(designOptions, paper) {
      this.designTarget.hidraggable({
        axis: this.options.axis && designOptions && designOptions.axisEnabled ? this.options.axis : void 0,
        onDrag: (_event, left, top) => {
          this.updateSizeAndPositionOptions(left, top);
          this.createLineOfPosition(paper);
        },
        moveUnit: "pt",
        minMove: HiPrintConfig.instance.movingDistance,
        onBeforeDrag: (_event) => {
          HiPrintlib.instance.draging = true;
          this.designTarget.focus();
          this.createLineOfPosition(paper);
        },
        onStopDrag: (_event) => {
          HiPrintlib.instance.draging = false;
          this.removeLineOfPosition();
        }
      });
      this.designTarget.hireizeable({
        showPoints: this.getReizeableShowPoints(),
        onBeforeResize: () => {
          HiPrintlib.instance.draging = true;
        },
        onResize: (event, height, width, top, left) => {
          this.onResize(event, height, width, top, left);
          this.createLineOfPosition(paper);
        },
        onStopResize: () => {
          HiPrintlib.instance.draging = false;
          this.removeLineOfPosition();
        }
      });
      this.bingCopyEvent(this.designTarget);
      this.bingKeyboardMoveEvent(this.designTarget, paper);
    }
    /**
     * 中文说明：读取print element entity，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getPrintElementEntity(includePrintElementType) {
      return includePrintElementType ? new PrintElementEntity(void 0, this.options.getPrintElementOptionEntity(), this.printElementType.getPrintElementTypeEntity()) : new PrintElementEntity(this.printElementType.tid, this.options.getPrintElementOptionEntity());
    }
    /**
     * 中文说明：处理属性配置项，连接打印元素配置面板与模板元素属性。
     */
    submitOption() {
      const optionItems = this.getPrintElementOptionItems();
      const state = buildOptionPanelState(optionItems);
      Object.keys(state.submitValues).forEach((name) => {
        this.options[name] = state.submitValues[name];
      });
      this.updateDesignViewFromOptions();
      hinnn.event.trigger(`hiprintTemplateDataChanged_${this.templateId}`);
    }
    /**
     * 中文说明：读取reizeable show points，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getReizeableShowPoints() {
      return ["s", "e"];
    }
    /**
     * 中文说明：处理resize事件，驱动打印元素中的拖拽、编辑或菜单行为。
     */
    onResize(_event, height, width, top, left) {
      this.updateSizeAndPositionOptions(left, top, width, height);
    }
    /**
     * 中文说明：读取order index，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getOrderIndex() {
      return this.options.getTop();
    }
    /**
     * 中文说明：读取html，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getHtml(paper, templateData, renderOptions) {
      let paperIndex = 0;
      this.setCurrenttemplateData(templateData);
      const results = [];
      let beginPrintTop = this.getBeginPrintTopInPaperByReferenceElement(paper);
      let paperFooter = paper.getPaperFooter(paperIndex);
      if (!this.isHeaderOrFooter() && !this.isFixed() && beginPrintTop > paperFooter) {
        results.push(new PaperHtmlResult({
          target: void 0,
          printLine: void 0,
          referenceElement: void 0
        }));
        beginPrintTop = beginPrintTop - paperFooter + paper.paperHeader;
        paperIndex += 1;
        paperFooter = paper.getPaperFooter(paperIndex);
      }
      const data = this.getData(templateData);
      const target = this.createTarget(this.getTitle(), data, renderOptions);
      this.updateTargetSize(target);
      this.css(target, data);
      target.css("position", "absolute");
      target.css("left", this.options.displayLeft());
      target.css("top", `${beginPrintTop}pt`);
      results.push(new PaperHtmlResult({
        target,
        printLine: beginPrintTop + this.options.getHeight(),
        referenceElement: void 0
      }));
      return results;
    }
    /**
     * 中文说明：读取html2，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getHtml2(paper, templateData, _renderOptions) {
      let paperIndex = 0;
      this.setCurrenttemplateData(templateData);
      const results = [];
      let beginPrintTop = this.getBeginPrintTopInPaperByReferenceElement(paper);
      let paperFooter = paper.getPaperFooter(paperIndex);
      if (!this.isHeaderOrFooter() && !this.isFixed()) {
        if (beginPrintTop > paperFooter) {
          results.push(new PaperHtmlResult({
            target: void 0,
            printLine: void 0,
            referenceElement: void 0
          }));
          beginPrintTop = beginPrintTop - paperFooter + paper.paperHeader;
          paperIndex += 1;
          paperFooter = paper.getPaperFooter(paperIndex);
        }
        if (beginPrintTop <= paperFooter && beginPrintTop + this.options.getHeight() > paperFooter) {
          results.push(new PaperHtmlResult({
            target: void 0,
            printLine: void 0,
            referenceElement: void 0
          }));
          beginPrintTop = paper.paperHeader;
          paperIndex += 1;
          paperFooter = paper.getPaperFooter(paperIndex);
        }
      }
      const data = this.getData(templateData);
      const target = this.createTarget(this.getTitle(), data);
      this.updateTargetSize(target);
      this.css(target, data);
      target.css("position", "absolute");
      target.css("left", this.options.displayLeft());
      target.css("top", `${beginPrintTop}pt`);
      results.push(new PaperHtmlResult({
        target,
        printLine: beginPrintTop + this.options.getHeight(),
        referenceElement: new PrintReferenceElement({
          top: this.options.getTop(),
          left: this.options.getLeft(),
          height: this.options.getHeight(),
          width: this.options.getWidth(),
          beginPrintPaperIndex: paper.index,
          bottomInLastPaper: beginPrintTop + this.options.getHeight(),
          printTopInPaper: beginPrintTop,
          endPrintPaperIndex: void 0
        })
      }));
      return results;
    }
    /**
     * 中文说明：读取begin print top in paper by reference element，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getBeginPrintTopInPaperByReferenceElement(paper) {
      const top = this.options.getTop();
      return this.isHeaderOrFooter() || this.isFixed() ? top : paper.referenceElement.isPositionLeftOrRight(top) ? paper.referenceElement.printTopInPaper + (top - paper.referenceElement.top) : paper.referenceElement.bottomInLastPaper + (top - (paper.referenceElement.top + paper.referenceElement.height));
    }
    /**
     * 中文说明：应用 CSS 相关配置，保持打印元素元素在设计器和打印页面中的样式一致。
     */
    css(target, data) {
      const configOptions = this.getConfigOptions();
      if (configOptions) {
        const supportOptions = configOptions.supportOptions;
        if (supportOptions) {
          supportOptions.forEach((option2) => {
            const item = PrintElementOptionItemManager.getItem(option2.name);
            if (item && item.css) {
              item.css(target, this.options.getValueFromOptionsOrDefault(option2.name));
            }
          });
        }
      }
      this.stylerCss(target, data);
    }
    /**
     * 中文说明：处理样式规则，确保打印元素生成的 DOM 与模板配置保持一致。
     */
    stylerCss(target, data) {
      const styler2 = this.getStyler();
      if (styler2) {
        const style = styler2(data, this.options, target, this._currenttemplateData);
        if (style) {
          Object.keys(style).forEach((name) => {
            target.css(name, style[name]);
          });
        }
      }
    }
    /**
     * 中文说明：读取data，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getData(templateData) {
      const boundValue = this.getDataBindingValue(templateData);
      if (boundValue.found) return boundValue.value ?? "";
      return templateData ? templateData[this.getField()] || "" : this.printElementType.getData();
    }
    getDataBindingValue(templateData, contextData) {
      var _a;
      const template = HiPrintlib.instance.getPrintTemplateById(this.templateId);
      return resolveDataBindingValue(this.options.dataBinding, templateData, (_a = template == null ? void 0 : template.getDataSources) == null ? void 0 : _a.call(template), contextData);
    }
    /**
     * 中文说明：读取print element option items，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getPrintElementOptionItems() {
      if (this._printElementOptionItems) return this._printElementOptionItems;
      const items = [];
      const configOptions = this.getConfigOptions();
      if (configOptions) {
        const supportOptions = configOptions.supportOptions;
        if (supportOptions) {
          supportOptions.filter((option2) => !option2.hidden).forEach((option2) => {
            const item = PrintElementOptionItemManager.getItem(option2.name);
            if (item) items.push(item);
          });
        }
      }
      this._printElementOptionItems = this.filterOptionItems(items.concat());
      return this._printElementOptionItems;
    }
    /**
     * 中文说明：读取print element option items by name，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getPrintElementOptionItemsByName(name) {
      const items = [];
      const configOptions = this.getConfigOptionsByName(name);
      if (configOptions) {
        const supportOptions = configOptions.supportOptions;
        if (supportOptions) {
          supportOptions.filter((option2) => !option2.hidden).forEach((option2) => {
            const item = PrintElementOptionItemManager.getItem(option2.name);
            if (item) items.push(item);
          });
        }
      }
      return items.concat();
    }
    /**
     * 中文说明：处理属性配置项，连接打印元素配置面板与模板元素属性。
     */
    filterOptionItems(items) {
      return this.printElementType.field ? items.filter((item) => item.name !== "field") : items;
    }
    /**
     * 中文说明：创建temp container，供打印元素在设计器或打印渲染流程中使用。
     */
    createTempContainer() {
      this.removeTempContainer();
      $("body").append($('<div class="hiprint_temp_Container hiprint-printPaper" style="overflow:hidden;height: 0px;box-sizing: border-box;"></div>'));
    }
    /**
     * 中文说明：移除temp container，清理打印元素中不再需要的 DOM、样式或状态。
     */
    removeTempContainer() {
      $(".hiprint_temp_Container").remove();
    }
    /**
     * 中文说明：读取temp container，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getTempContainer() {
      return $(".hiprint_temp_Container");
    }
    /**
     * 中文说明：判断header or footer，用于控制打印元素分支逻辑和交互可用性。
     */
    isHeaderOrFooter() {
      return this.options.getTopInDesign() < this.panel.paperHeader || this.options.getTopInDesign() >= this.panel.paperFooter;
    }
    /**
     * 中文说明：删除delete，同步调整打印元素的结构和选择状态。
     */
    delete() {
      if (this.designTarget) this.designTarget.remove();
    }
    /**
     * 中文说明：设置currenttemplate data，同步打印元素配置并影响后续显示或打印结果。
     */
    setCurrenttemplateData(templateData) {
      this._currenttemplateData = templateData;
    }
    /**
     * 中文说明：判断fixed，用于控制打印元素分支逻辑和交互可用性。
     */
    isFixed() {
      return this.options.fixed;
    }
    /**
     * 中文说明：处理rendered事件，驱动打印元素中的拖拽、编辑或菜单行为。
     */
    onRendered(target, templateData) {
      if (this.printElementType && this.printElementType.onRendered) this.printElementType.onRendered(templateData, this.options, target.getTarget());
    }
    /**
     * 中文说明：创建line of position，供打印元素在设计器或打印渲染流程中使用。
     */
    createLineOfPosition(paper) {
      let topLine = $(`.toplineOfPosition${this.id}`);
      const leftLine = $(`.leftlineOfPosition${this.id}`);
      const rightLine = $(`.rightlineOfPosition${this.id}`);
      const bottomLine = $(`.bottomlineOfPosition${this.id}`);
      if (topLine.length) {
        topLine.css("top", this.options.displayTop());
      } else {
        topLine = $(`<div class="toplineOfPosition${this.id}" style="border:0;border-top:1px dashed  rgb(169, 169, 169);position: absolute; width: 100%;"></div>`);
        topLine.css("top", this.options.displayTop());
        topLine.css("width", paper.displayWidth());
        this.designTarget.parents(".hiprint-printPaper-content").append(topLine);
      }
      if (leftLine.length) {
        leftLine.css("left", this.options.displayLeft());
      } else {
        const newLeftLine = $(`<div class="leftlineOfPosition${this.id}" style="border:0;border-left:1px dashed  rgb(169, 169, 169);position: absolute;height: 100%;"></div>`);
        newLeftLine.css("left", this.options.displayLeft());
        newLeftLine.css("height", paper.displayHeight());
        this.designTarget.parents(".hiprint-printPaper-content").append(newLeftLine);
      }
      if (rightLine.length) {
        rightLine.css("left", `${this.options.getLeft() + this.options.getWidth()}pt`);
      } else {
        const newRightLine = $(`<div class="rightlineOfPosition${this.id}" style="border:0;border-left:1px dashed  rgb(169, 169, 169);position: absolute;height: 100%;"></div>`);
        newRightLine.css("left", `${this.options.getLeft() + this.options.getWidth()}pt`);
        newRightLine.css("height", paper.displayHeight());
        this.designTarget.parents(".hiprint-printPaper-content").append(newRightLine);
      }
      if (bottomLine.length) {
        bottomLine.css("top", `${this.options.getTop() + this.options.getHeight()}pt`);
      } else {
        const newBottomLine = $(`<div class="bottomlineOfPosition${this.id}" style="border:0;border-top:1px dashed  rgb(169, 169, 169);position: absolute;width: 100%;"></div>`);
        newBottomLine.css("top", `${this.options.getTop() + this.options.getHeight()}pt`);
        newBottomLine.css("width", paper.displayWidth());
        this.designTarget.parents(".hiprint-printPaper-content").append(newBottomLine);
      }
    }
    /**
     * 中文说明：移除line of position，清理打印元素中不再需要的 DOM、样式或状态。
     */
    removeLineOfPosition() {
      $(`.toplineOfPosition${this.id}`).remove();
      $(`.leftlineOfPosition${this.id}`).remove();
      $(`.rightlineOfPosition${this.id}`).remove();
      $(`.bottomlineOfPosition${this.id}`).remove();
    }
    /**
     * 中文说明：读取fields，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getFields() {
      let fields = this.printElementType.getFields();
      if (!fields) fields = HiPrintlib.instance.getPrintTemplateById(this.templateId).getFields();
      return fields;
    }
    /**
     * 中文说明：绑定复制事件，让设计器中选中的打印元素支持快捷复制。
     */
    bingCopyEvent(_target) {
    }
    /**
     * 中文说明：读取formatter，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getFormatter() {
      let formatter = void 0;
      if (this.printElementType.formatter) formatter = this.printElementType.formatter;
      if (this.options.formatter) {
        try {
          const source = `formatter=${this.options.formatter}`;
          eval(source);
        } catch (error) {
          console.log(error);
        }
      }
      return formatter;
    }
    /**
     * 中文说明：读取styler，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getStyler() {
      let fnstyler = void 0;
      if (this.printElementType.styler) fnstyler = this.printElementType.styler;
      if (this.options.styler) {
        try {
          const source = `fnstyler=${this.options.styler}`;
          eval(source);
        } catch (error) {
          console.log(error);
        }
      }
      return fnstyler;
    }
    /**
     * 中文说明：绑定键盘方向键移动事件，用于微调设计器中选中打印元素的位置。
     */
    bingKeyboardMoveEvent(target, paper) {
      let left = void 0;
      let top = void 0;
      target.attr("tabindex", "1");
      target.keydown((event) => {
        switch (event.keyCode) {
          case 37:
            left = this.options.getLeft();
            this.updateSizeAndPositionOptions(left - HiPrintConfig.instance.movingDistance);
            target.css("left", this.options.displayLeft());
            this.createLineOfPosition(paper);
            event.preventDefault();
            break;
          case 38:
            top = this.options.getTop();
            this.updateSizeAndPositionOptions(void 0, top - HiPrintConfig.instance.movingDistance);
            target.css("top", this.options.displayTop());
            this.createLineOfPosition(paper);
            event.preventDefault();
            break;
          case 39:
            left = this.options.getLeft();
            this.updateSizeAndPositionOptions(left + HiPrintConfig.instance.movingDistance);
            target.css("left", this.options.displayLeft());
            this.createLineOfPosition(paper);
            event.preventDefault();
            break;
          case 40:
            top = this.options.getTop();
            this.updateSizeAndPositionOptions(void 0, top + HiPrintConfig.instance.movingDistance);
            target.css("top", this.options.displayTop());
            this.createLineOfPosition(paper);
            event.preventDefault();
        }
      });
    }
    /**
     * 中文说明：判断打印元素是否落入选择矩形，用于框选和批量操作。
     */
    inRect(rect) {
      const left = this.designTarget.offset().left;
      const top = this.designTarget.offset().top;
      return rect.minX < left && rect.minY < top && rect.maxX > left && rect.maxY > top;
    }
    /**
     * 中文说明：把打印元素加入多选集合，并同步设计器中的选中样式。
     */
    multipleSelect(selected) {
      selected ? this.designTarget.addClass("multipleSelect") : this.designTarget.removeClass("multipleSelect");
    }
    /**
     * 中文说明：更新position by multiple select，让打印元素的 DOM、尺寸或交互状态保持一致。
     */
    updatePositionByMultipleSelect(leftDelta, topDelta) {
      this.updateSizeAndPositionOptions(leftDelta + this.options.getLeft(), topDelta + this.options.getTop());
      this.designTarget.css("left", this.options.displayLeft());
      this.designTarget.css("top", this.options.displayTop());
    }
  }
  function isEditableEventTarget(target) {
    const element = target;
    if (!element || !element.closest) return false;
    return Boolean(element.closest('input, textarea, select, [contenteditable="true"]'));
  }
  function clearNativeSelection() {
    const selection = typeof window !== "undefined" && window.getSelection ? window.getSelection() : void 0;
    if (selection && !selection.isCollapsed) selection.removeAllRanges();
  }
  class HiTaleOptions {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(options2) {
      this.table = options2.table;
      this.isEnableEdit = options2.isEnableEdit;
      this.trs = options2.trs;
      this.resizeRow = options2.resizeRow;
      this.resizeColumn = options2.resizeColumn;
      this.isEnableEditField = options2.isEnableEditField;
      this.isEnableContextMenu = options2.isEnableContextMenu;
      this.isEnableEditField = options2.isEnableEditField;
      this.isEnableInsertRow = options2.isEnableInsertRow;
      this.isEnableDeleteRow = options2.isEnableDeleteRow;
      this.isEnableInsertColumn = options2.isEnableInsertColumn;
      this.isEnableDeleteColumn = options2.isEnableDeleteColumn;
      this.isEnableMergeCell = options2.isEnableMergeCell;
      this.columnResizable = options2.columnResizable;
      this.columnAlignEditable = options2.columnAlignEditable;
    }
  }
  class HiTaleOptionsCoat {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(options2) {
      __publicField(this, "options");
      this.options = new HiTaleOptions(options2);
    }
    /**
     * 中文说明：开启表格单元格编辑能力，允许设计器内直接修改单元格内容。
     */
    enableEidt() {
      this.options.isEnableEdit;
    }
    /**
     * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    disableEdit() {
      this.options.isEnableEdit;
    }
    /**
     * 中文说明：判断enable edit，用于控制表格设计器分支逻辑和交互可用性。
     */
    isEnableEdit() {
      return this.options.isEnableEdit;
    }
  }
  class TableGridCell {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(cell) {
      this.cell = cell.cell;
      this.link = cell.link;
      this.linkType = cell.linkType;
      this.bottom = cell.bottom;
      this.rightMost = cell.rightMost;
      this.rowLevel = cell.rowLevel;
      this.columnLevel = cell.columnLevel;
      this.indexInTableGridRow = cell.indexInTableGridRow;
      this.indexInTableGridColumn = cell.indexInTableGridColumn;
    }
  }
  class TableGridHelper {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
    }
    /**
     * 中文说明：读取left table cell，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    static getLeftTableCell(row, index) {
      let cell;
      row.forEach(
        /** 中文说明：扫描当前行左侧格点，找到指定索引前最近的真实单元格。 */
        (gridCell, gridIndex) => {
          if (gridCell.cell && gridIndex < index) cell = gridCell.cell;
        }
      );
      return cell;
    }
    /**
     * 中文说明：读取index，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    static getIndex(row, id) {
      let index;
      row.forEach(
        /** 中文说明：在表格网格行中查找指定单元格 id 对应的格点索引。 */
        (gridCell, gridIndex) => {
          if (gridCell.cell && gridCell.cell.id == id) index = gridIndex;
        }
      );
      return index;
    }
  }
  class HiTaleGripContainer {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(target, grips) {
      __publicField(this, "target");
      __publicField(this, "grips");
      this.target = target;
      this.grips = grips;
    }
  }
  class HiTaleGrip {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(target) {
      __publicField(this, "target");
      this.target = target;
    }
  }
  class HiTaleColumnTree {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
      __publicField(this, "rowColumns");
      this.rowColumns = [];
    }
  }
  class HiTaleColumnWidthHelper {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
    }
    /**
     * 中文说明：读取columns width，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    static getColumnsWidth(columnTree, width) {
      const widths = {};
      const totalAutoWidth = HiTaleColumnWidthHelper.allAutoWidth(columnTree);
      columnTree.rowColumns.forEach(
        /** 中文说明：累计自动列宽并计算每列缩放后的宽度。 */
        (column2) => {
          const numericWidth = width - 0;
          const nextWidth = column2.width / totalAutoWidth * (numericWidth > 0 ? numericWidth : 0);
          widths[column2.id] = nextWidth;
        }
      );
      return widths;
    }
    /**
     * 中文说明：处理表格单元格，维护表格设计器中的选区、布局或样式状态。
     */
    static resizeTableCellWeight(rows) {
      rows.forEach(
        /** 中文说明：逐行同步表格单元格宽度，让设计器 DOM 反映列宽计算结果。 */
        (row) => {
          row.columns.forEach(
            /** 中文说明：把固定宽度单元格的宽度写入 td 样式。 */
            (column2) => {
              if (column2.hasWidth) $(column2.getTarget()).css("width", column2.width + "pt");
            }
          );
        }
      );
    }
    /**
     * 中文说明：将表格列宽切换为自动宽度，清理固定宽度标记。
     */
    static allAutoWidth(columnTree) {
      let width = 0;
      columnTree.rowColumns.forEach(
        /** 中文说明：汇总列树中各行列的宽度总和。 */
        (column2) => {
          width += column2.width;
        }
      );
      return width;
    }
    /**
     * 中文说明：处理表格列，维护表格设计器的列宽、列结构或表头关系。
     */
    static reconsitutionTableColumnTree(rows, columnTree, _unused) {
      const tree = columnTree || new HiTaleColumnTree();
      const collectLayer = (
        /** 中文说明：收集指定层级的表头列并重建列树层级信息。 */
        ((level) => {
          tree.totalLayer = level + 1;
          tree[level] = rows[level].columns;
          tree.rowColumns = tree.rowColumns.concat(tree[level].filter(
            /** 中文说明：筛选跨到表格底部的行列作为叶子列。 */
            (column2) => column2.rowspan == rows.length - level
          ));
        })
      );
      for (let index = 0; index < rows.length; index += 1) {
        collectLayer(index);
      }
      return tree;
    }
  }
  class HiTresizer {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(hitable) {
      __publicField(this, "signature");
      __publicField(this, "hitable");
      __publicField(this, "rows");
      __publicField(this, "target");
      this.signature = "HiTresizer";
      this.hitable = hitable;
      this.rows = hitable.rows;
      this.target = hitable.target;
    }
    /**
     * 中文说明：初始化表格设计器实例，绑定默认配置、DOM 结构和必要的交互事件。
     */
    init() {
      this.addResizeRowAndColumn();
      if (this.hitable.optionsCoat.options.resizeColumn) this.createColumnGrips();
      if (this.hitable.optionsCoat.options.resizeRow) this.createRowGrips();
    }
    /**
     * 中文说明：处理表格单元格，维护表格设计器中的选区、布局或样式状态。
     */
    resizeTableCellWidth() {
      HiTaleColumnWidthHelper.resizeTableCellWeight(this.rows);
    }
    /**
     * 中文说明：添加resize row and column，扩展表格设计器的元素、样式或交互能力。
     */
    addResizeRowAndColumn() {
    }
    /**
     * 中文说明：创建column grips，供表格设计器在设计器或打印渲染流程中使用。
     */
    createColumnGrips() {
      const outer = this;
      const self = this;
      const grips = [];
      const container = $('<div class="columngrips"/>');
      container.width(this.target.width());
      this.rows.forEach(
        /** 中文说明：逐行扫描可调整列宽的单元格并生成拖拽手柄。 */
        (row) => {
          row.columns.forEach(
            /** 中文说明：为带固定宽度的单元格创建列宽拖拽手柄。 */
            (cell) => {
              if (cell.getTarget().attr("haswidth")) {
                const gripTarget = $('<div class="columngrip"><div class="gripResizer"></div></div>');
                container.append(gripTarget);
                const grip = new HiTaleGrip(gripTarget);
                if (grips.length > 0) grips[grips.length - 1].nextGrip = grip;
                grips.push(grip);
                outer.syncGrips(cell, grip);
                $(gripTarget).hidraggable({
                  axis: "h",
                  /**
                   * 中文说明：处理drag事件，驱动表格设计器中的拖拽、编辑或菜单行为。
                   */
                  onDrag(_event, _left, _top) {
                  },
                  moveUnit: "pt",
                  minMove: 1,
                  /**
                   * 中文说明：在表格设计器操作开始前执行校验，必要时阻止后续交互。
                   */
                  onBeforeDrag(_event) {
                    HiPrintlib.instance.draging = true;
                    if (!grip.nextGrip) return false;
                    self.dragingGrip = grip;
                    self.dragingGrip.left = parseFloat(self.dragingGrip.target.css("left").replace("px", ""));
                    grip.target.addClass("columngripDraging");
                    return void 0;
                  },
                  /**
                   * 中文说明：处理stop drag事件，驱动表格设计器中的拖拽、编辑或菜单行为。
                   */
                  onStopDrag(_event) {
                    HiPrintlib.instance.draging = false;
                    const left = parseFloat(self.dragingGrip.target.css("left").replace("px", ""));
                    const offset = hinnn.px.toPt(left - self.dragingGrip.left);
                    grip.cell.width = grip.cell.width + offset;
                    grip.nextGrip.cell.width = grip.nextGrip.cell.width - offset;
                    outer.resizeTableCellWidth();
                    grip.target.removeClass("columngripDraging");
                    self.updateColumnGrips();
                  }
                });
              }
            }
          );
        }
      );
      this.target.before(container);
      this.cgripContariner = new HiTaleGripContainer(container, grips);
    }
    /**
     * 中文说明：更新column grips，让表格设计器的 DOM、尺寸或交互状态保持一致。
     */
    updateColumnGrips() {
      if (this.cgripContariner) {
        this.cgripContariner.target.remove();
        this.createColumnGrips();
      }
    }
    /**
     * 中文说明：更新row grips，让表格设计器的 DOM、尺寸或交互状态保持一致。
     */
    updateRowGrips() {
      if (this.rgripContariner) {
        this.rgripContariner.target.remove();
        this.createRowGrips();
      }
    }
    /**
     * 中文说明：创建row grips，供表格设计器在设计器或打印渲染流程中使用。
     */
    createRowGrips() {
      const outer = this;
      const self = this;
      const grips = [];
      const container = $('<div class="rowgrips"/>');
      this.rows.forEach(
        /** 中文说明：为每个可调整高度的表格行创建行高拖拽手柄。 */
        (_row, rowIndex) => {
          const gripTarget = $('<div class="rowgrip"><div class="gripResizer"></div></div>');
          container.append(gripTarget);
          const grip = new HiTaleGrip(gripTarget);
          grips.push(grip);
          if (rowIndex > 0 && rowIndex < outer.rows.length) {
            $(gripTarget).hidraggable({
              axis: "v",
              /**
               * 中文说明：处理drag事件，驱动表格设计器中的拖拽、编辑或菜单行为。
               */
              onDrag(_event, _left, _top) {
              },
              moveUnit: "pt",
              minMove: 1,
              /**
               * 中文说明：在表格设计器操作开始前执行校验，必要时阻止后续交互。
               */
              onBeforeDrag(_event) {
                self.dragingGrip = grip;
                self.dragingGrip.top = parseFloat(self.dragingGrip.target.css("top").replace("px", ""));
                grip.target.addClass("rowgripDraging");
              },
              /**
               * 中文说明：处理stop drag事件，驱动表格设计器中的拖拽、编辑或菜单行为。
               */
              onStopDrag(_event) {
                const top = parseFloat(self.dragingGrip.target.css("top").replace("px", ""));
                const height = hinnn.px.toPt(top - self.dragingGrip.top + self.rows[rowIndex].columns[0].getTarget().height());
                self.rows[rowIndex].columns[0].getTarget().css("height", height + "pt");
                self.syncRowGrips();
                grip.target.removeClass("rowgripDraging");
              }
            });
          }
        }
      );
      this.target.before(container);
      this.rgripContariner = new HiTaleGripContainer(container, grips);
      this.syncRowGrips();
    }
    /**
     * 中文说明：同步列宽拖拽手柄位置，确保表格列调整控件贴合单元格边界。
     */
    syncGrips(cell, grip) {
      const target = cell.getTarget();
      grip.cell = cell;
      grip.target.css({
        left: target.offset().left - this.target.offset().left + target.outerWidth(false),
        height: 30
      });
    }
    /**
     * 中文说明：处理表格行，维护表格设计器的行结构和高度计算。
     */
    syncRowGrips() {
      const self = this;
      this.rgripContariner.target.height(this.target.height());
      this.rows.forEach(
        /** 中文说明：遍历表格行并同步行高拖拽手柄的定位。 */
        (row, rowIndex) => {
          const target = row.columns[0].getTarget();
          self.rgripContariner.grips[rowIndex].target.css({
            top: target.offset().top - self.target.offset().top + target.outerHeight(false),
            width: 30
          });
        }
      );
    }
    /**
     * 中文说明：添加resizer head row，扩展表格设计器的元素、样式或交互能力。
     */
    addResizerHeadRow() {
      this.target.find("thead").prepend();
    }
  }
  class NullHiTresizer {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
    }
    /**
     * 中文说明：初始化表格设计器实例，绑定默认配置、DOM 结构和必要的交互事件。
     */
    init() {
    }
    /**
     * 中文说明：更新row grips，让表格设计器的 DOM、尺寸或交互状态保持一致。
     */
    updateRowGrips() {
    }
    /**
     * 中文说明：更新column grips，让表格设计器的 DOM、尺寸或交互状态保持一致。
     */
    updateColumnGrips() {
    }
  }
  class HiTale {
    /**
     * 中文说明：初始化表格设计器对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(options2) {
      __publicField(this, "id");
      __publicField(this, "optionsCoat");
      __publicField(this, "handle");
      __publicField(this, "target");
      __publicField(this, "rows");
      __publicField(this, "trRows");
      __publicField(this, "tableCellSelector");
      __publicField(this, "resizer");
      this.id = TableIdGenerator.createId();
      this.optionsCoat = new HiTaleOptionsCoat(options2);
      this.handle = options2.handle;
      this.target = options2.table;
      this.initRows(options2.rows);
      this.init(options2);
      this.tableCellSelector = new TableCellSelector(this.rows, this.target);
      this.resizer = this.optionsCoat.options.columnResizable ? new HiTresizer(this) : new NullHiTresizer();
      this.resizer.init();
    }
    /**
     * 中文说明：插入row，维护表格设计器的行列结构与合并单元格关系。
     */
    insertRow(direction, selectedCell, className) {
      const singleSelect = selectedCell || this.tableCellSelector.getSingleSelect();
      const cell = singleSelect.cell;
      const currentRow = this.rows[singleSelect.rowIndex];
      const rowIndex = singleSelect.rowIndex;
      const grid = this.getCellGrid();
      const row = new TableRow();
      row.init(this.optionsCoat, void 0, currentRow.isHead);
      if (className) row.getTarget().addClass(className);
      if (direction == "above") {
        grid[rowIndex].forEach(
          /** 中文说明：向上插入行时遍历目标行格点，调整跨行单元格或补新单元格。 */
          (gridCell) => {
            const linkedCell = gridCell.link ? gridCell.link : gridCell.cell;
            const width = linkedCell.width / linkedCell.colspan;
            if (gridCell.columnLevel == 0) {
              const newCell = row.createTableCell(void 0, void 0);
              newCell.width = width;
              row.insertCellToLast(newCell);
            } else {
              if (gridCell.linkType == "column") {
                const target = gridCell.link.getTarget();
                gridCell.link.rowspan += 1;
                target.attr("rowspan", gridCell.link.rowspan);
              }
              gridCell.linkType;
            }
          }
        );
        this.rows.splice(rowIndex, 0, row);
        currentRow.getTarget().before(row.getTarget());
        hinnn.event.trigger("newRow" + this.id, row);
      } else {
        const bottomRowIndex = rowIndex + cell.rowspan - 1;
        grid[bottomRowIndex].forEach(
          /** 中文说明：向下插入行时遍历底部格点，维护跨行占位和新单元格位置。 */
          (gridCell) => {
            const linkedCell = gridCell.link ? gridCell.link : gridCell.cell;
            const width = linkedCell.width / linkedCell.colspan;
            if (gridCell.bottom) {
              const newCell = row.createTableCell(void 0, void 0);
              newCell.width = width;
              row.insertCellToLast(newCell);
            } else {
              let target;
              if (gridCell.cell) {
                target = gridCell.cell.getTarget();
                gridCell.cell.rowspan += 1;
                target.attr("rowspan", gridCell.cell.rowspan);
              }
              if (gridCell.linkType == "column") {
                target = gridCell.link.getTarget();
                gridCell.link.rowspan += 1;
                target.attr("rowspan", gridCell.link.rowspan);
              }
            }
          }
        );
        this.rows.splice(bottomRowIndex + 1, 0, row);
        this.rows[bottomRowIndex].getTarget().after(row.getTarget());
        hinnn.event.trigger("newRow" + this.id, row);
      }
    }
    /**
     * 中文说明：插入column，维护表格设计器的行列结构与合并单元格关系。
     */
    insertColumn(direction, selectedCell, className, width) {
      const self = this;
      const rows = this.rows.concat(this.trRows);
      const singleSelect = selectedCell || this.tableCellSelector.getSingleSelect();
      const cell = singleSelect.cell;
      const rowIndex = singleSelect.rowIndex;
      const grid = this.getCellGrid(rows);
      const selectedSlots = grid[rowIndex].filter(
        /** 中文说明：筛出选中单元格及其合并占位，确定插入列的目标范围。 */
        (gridCell) => gridCell.cell && gridCell.cell.id == cell.id || gridCell.link && gridCell.link.id == cell.id
      );
      if (direction == "left") {
        const targetColumnIndex = selectedSlots[0].indexInTableGridRow;
        grid.forEach(
          /** 中文说明：向左插入列时逐行调整真实单元格和横向合并占位。 */
          (gridRow, gridRowIndex) => {
            const targetSlot = gridRow[targetColumnIndex];
            const rightCells = gridRow.filter(
              /** 中文说明：查找目标列右侧真实单元格，用于把新单元格插入到正确位置。 */
              (gridCell, slotIndex) => slotIndex >= targetColumnIndex && gridCell.cell
            );
            if (targetSlot.rowLevel == 0) {
              const row = rows[gridRowIndex];
              const newCell = rows[gridRowIndex].createTableCell(void 0, void 0);
              if (className) newCell.getTarget().addClass(className);
              if (width != null) newCell.width = width;
              rightCells.length ? row.insertToTargetCellLeft(rightCells[0].cell, newCell) : row.insertCellToLast(newCell);
              hinnn.event.trigger("newCell" + self.id, newCell);
            } else if (targetSlot.linkType == "row") {
              const target = targetSlot.link.getTarget();
              targetSlot.link.colspan += 1;
              target.attr("colspan", targetSlot.link.colspan);
            }
          }
        );
      } else {
        const targetColumnIndex = selectedSlots[selectedSlots.length - 1].indexInTableGridRow;
        grid.forEach(
          /** 中文说明：向右插入列时逐行调整真实单元格和横向合并占位。 */
          (gridRow, gridRowIndex) => {
            const targetSlot = gridRow[targetColumnIndex];
            const leftCells = gridRow.filter(
              /** 中文说明：查找目标列左侧真实单元格，用于向右插入时确定参照单元格。 */
              (gridCell, slotIndex) => slotIndex <= targetColumnIndex && gridCell.cell
            );
            if (targetSlot.rightMost) {
              const row = rows[gridRowIndex];
              const newCell = row.createTableCell(void 0, void 0);
              if (className) newCell.getTarget().addClass(className);
              if (width != null) newCell.width = width;
              leftCells.length ? row.insertToTargetCellRight(leftCells[leftCells.length - 1].cell, newCell) : row.insertCellToFirst(newCell);
              hinnn.event.trigger("newCell" + self.id, newCell);
            } else {
              const linkedCell = targetSlot.link || targetSlot.cell;
              if (targetSlot.linkType == "row") {
                const target = linkedCell.getTarget();
                linkedCell.colspan += 1;
                target.attr("colspan", linkedCell.colspan);
              }
              if (targetSlot.cell) {
                const target = linkedCell.getTarget();
                linkedCell.colspan += 1;
                target.attr("colspan", linkedCell.colspan);
              }
            }
          }
        );
      }
    }
    /**
     * 中文说明：删除row，同步调整表格设计器的结构和选择状态。
     */
    deleteRow() {
      const self = this;
      const singleSelect = this.tableCellSelector.getSingleSelect();
      const rowIndex = (singleSelect.cell, this.rows[singleSelect.rowIndex], singleSelect.rowIndex);
      const grid = this.getCellGrid();
      const row = this.rows[rowIndex];
      grid[rowIndex].forEach(
        /** 中文说明：遍历待删除行的格点，同步移除单元格或缩减跨行占位。 */
        (gridCell, slotIndex) => {
          if (gridCell.cell) {
            if (gridCell.cell.rowspan == 1) {
              row.removeCell(gridCell.cell);
            } else {
              row.removeCell(gridCell.cell);
              const rightCells = grid[rowIndex + 1].filter(
                /** 中文说明：删除跨行单元格后查找下一行右侧插入参照单元格。 */
                (candidate, candidateIndex) => candidate.cell && candidateIndex > slotIndex
              );
              const nextRow = self.rows[rowIndex + 1];
              const newCell = nextRow.createTableCell(gridCell.cell.rowspan - 1, gridCell.cell.colspan);
              rightCells.length ? nextRow.insertToTargetCellLeft(rightCells[0].cell, newCell) : nextRow.insertCellToLast(newCell);
            }
          } else if (gridCell.linkType == "column") {
            const linkedCell = gridCell.link;
            linkedCell.rowspan -= 1;
            linkedCell.getTarget().attr("rowspan", linkedCell.rowspan);
          }
        }
      );
      row.getTarget().remove();
      this.rows.splice(rowIndex, 1);
    }
    /**
     * 中文说明：删除colums，同步调整表格设计器的结构和选择状态。
     */
    deleteColums() {
      const rows = this.rows.concat(this.trRows);
      const singleSelect = this.tableCellSelector.getSingleSelect();
      const cell = singleSelect.cell;
      const rowIndex = singleSelect.rowIndex;
      const grid = this.getCellGrid(rows);
      const targetColumnIndex = grid[rowIndex].filter(
        /** 中文说明：定位待删除列在网格中的目标列索引。 */
        (gridCell) => gridCell.cell && gridCell.cell.id == cell.id || gridCell.link && gridCell.link.id == cell.id
      )[0].indexInTableGridRow;
      grid.forEach(
        /** 中文说明：删除列时逐行移除单元格或缩减横向合并跨度。 */
        (gridRow, gridRowIndex) => {
          const targetSlot = gridRow[targetColumnIndex];
          targetSlot.cell ? targetSlot.cell.colspan == 1 ? rows[gridRowIndex].removeCell(targetSlot.cell) : (targetSlot.cell.colspan -= 1, targetSlot.cell.getTarget().attr("colspan", targetSlot.cell.colspan)) : targetSlot.linkType == "row" && (targetSlot.link.colspan -= 1, targetSlot.link.getTarget().attr("colspan", targetSlot.link.colspan));
        }
      );
    }
    /**
     * 中文说明：合并cell，把当前选区转换为单个表格单元格结构。
     */
    mergeCell() {
      const self = this;
      const selectedCells = this.tableCellSelector.getSelectedCells();
      if (selectedCells.length != 0) {
        const cell = selectedCells[0][0].cell;
        selectedCells.forEach(
          /** 中文说明：合并单元格时逐行遍历选区并累计目标单元格跨度。 */
          (row, rowOffset) => {
            row.forEach(
              /** 中文说明：移除被合并的单元格并更新首个单元格的 colspan/rowspan。 */
              (selectedCell, cellOffset) => {
                rowOffset == 0 ? cellOffset != 0 && (cell.colspan += selectedCell.cell.colspan, self.rows[selectedCell.rowIndex].removeCell(selectedCell.cell)) : self.rows[selectedCell.rowIndex].removeCell(selectedCell.cell);
                if (cellOffset == 0 && selectedCells[0][0].rowIndex + cell.rowspan - 1 < selectedCell.rowIndex) cell.rowspan += selectedCell.cell.rowspan;
              }
            );
          }
        );
        cell.getTarget().attr("colspan", cell.colspan);
        cell.getTarget().attr("rowspan", cell.rowspan);
        this.tableCellSelector.setSingleSelect(selectedCells[0][0]);
      }
    }
    /**
     * 中文说明：拆分cell，恢复表格单元格的行列占位结构。
     */
    splitCell() {
      const singleSelect = this.tableCellSelector.getSingleSelect();
      const grid = this.getCellGrid();
      const cellIndex = TableGridHelper.getIndex(grid[singleSelect.rowIndex], singleSelect.cell.id);
      if (singleSelect) {
        for (let rowIndex = singleSelect.rowIndex; rowIndex < singleSelect.rowIndex + singleSelect.cell.rowspan; rowIndex += 1) {
          const row = this.rows[rowIndex];
          const leftCell = rowIndex == singleSelect.rowIndex ? singleSelect.cell : TableGridHelper.getLeftTableCell(grid[rowIndex], cellIndex);
          for (let columnOffset = 0; columnOffset < singleSelect.cell.colspan; columnOffset += 1) {
            if (!(rowIndex == singleSelect.rowIndex && columnOffset == 0)) {
              leftCell ? row.insertToTargetCellRight(leftCell, row.createTableCell(void 0, void 0)) : row.insertCellToFirst(row.createTableCell(void 0, void 0));
            }
          }
        }
        singleSelect.cell.rowspan = 1;
        singleSelect.cell.colspan = 1;
        singleSelect.cell.getTarget().attr("colspan", singleSelect.cell.colspan);
        singleSelect.cell.getTarget().attr("rowspan", singleSelect.cell.rowspan);
      }
    }
    /**
     * 中文说明：初始化表格设计器实例，绑定默认配置、DOM 结构和必要的交互事件。
     */
    init(options2) {
      const self = this;
      $(this.target).addClass("hitable");
      this.optionsCoat.onBeforEdit = /** 中文说明：进入单元格编辑前执行外部校验，并结束已有编辑状态。 */
      (cell) => {
        if (self.optionsCoat.options.onBeforEdit && options2.onBeforEdit(cell) === false) return false;
        if (self.optionsCoat.editingCell) self.optionsCoat.editingCell.endEdit();
        return true;
      };
      $(this.target).mousedown(
        /** 中文说明：鼠标按下时标记左键按住状态，供拖拽多选判断使用。 */
        (_event) => {
          self.optionsCoat.isLeftMouseButtonDown = true;
        }
      );
      $(this.target).mouseup(
        /** 中文说明：鼠标松开时清除左键按住状态，结束拖拽选择。 */
        (_event) => {
          self.optionsCoat.isLeftMouseButtonDown = false;
        }
      );
      this.initContext();
      this.target.on(
        "mousemove",
        /** 中文说明：鼠标拖动时按坐标扩展表格单元格多选区域。 */
        (event) => {
          if (event.buttons === 1) {
            if (!isEditableEventTarget(event.target)) event.preventDefault();
            self.tableCellSelector.multipleSelectByXY(event.pageX, event.pageY);
            clearNativeSelection();
          }
        }
      ).on(
        "mousedown",
        /** 中文说明：鼠标按下时按坐标定位并设置单选单元格。 */
        (event) => {
          if (event.buttons === 1) {
            if (!isEditableEventTarget(event.target)) event.preventDefault();
            self.tableCellSelector.singleSelectByXY(event.pageX, event.pageY);
            clearNativeSelection();
          }
        }
      );
    }
    /**
     * 中文说明：初始化rows，为表格设计器后续渲染和设计操作准备状态。
     */
    initRows(rows) {
      const self = this;
      this.trRows = [];
      if (rows) {
        this.rows = rows;
        rows.forEach(
          /** 中文说明：根据传入行数据创建 HiTale 行对象并追加到表格。 */
          (row, rowIndex) => {
            row.init(self.optionsCoat, self.target.find("tr:eq(" + rowIndex + ")"), true);
          }
        );
        const trs = this.optionsCoat.options.trs;
        if (trs) {
          this.initRowsByTrs(trs).forEach(
            /** 中文说明：把现有 tr 转换出的行对象加入 HiTale 行集合。 */
            (row) => {
              self.trRows.push(row);
            }
          );
        }
      } else {
        this.rows = this.initRowsByTrs(this.target.find("tr"));
      }
    }
    /**
     * 中文说明：初始化rows by trs，为表格设计器后续渲染和设计操作准备状态。
     */
    initRowsByTrs(trs) {
      const self = this;
      return trs.map(
        /** 中文说明：把 DOM 中的 tr 解析为 HiTale 行对象并读取单元格。 */
        (_index, element) => {
          const row = new TableRow();
          row.init(self.optionsCoat, $(element));
          return row;
        }
      ).get();
    }
    /**
     * 中文说明：开启表格单元格编辑能力，允许设计器内直接修改单元格内容。
     */
    enableEidt() {
      this.optionsCoat.enableEidt();
    }
    /**
     * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    disableEdit() {
      this.optionsCoat.disableEdit();
    }
    /**
     * 中文说明：读取cell grid，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getCellGrid(rows) {
      const targetRows = rows || this.rows;
      const columnStep = this.getColumnStep();
      const grid = new Array();
      targetRows.forEach(
        /** 中文说明：逐行展开单元格到二维网格，填充合并单元格产生的占位。 */
        (row, rowIndex) => {
          row.columns.forEach(
            /** 中文说明：把真实单元格展开成包含 rowspan/colspan 占位的网格结构。 */
            (cell) => {
              for (let rowLevel = 0; rowLevel < cell.colspan; rowLevel += 1) {
                for (let columnIndex = 0, filled = false; columnIndex < columnStep && !filled; ) {
                  if (grid[rowIndex] = grid[rowIndex] || [], grid[rowIndex][columnIndex]) ;
                  else {
                    grid[rowIndex][columnIndex] = new TableGridCell({
                      cell: rowLevel == 0 ? cell : void 0,
                      link: rowLevel != 0 ? cell : void 0,
                      linkType: rowLevel > 0 ? "row" : void 0,
                      rightMost: rowLevel == cell.colspan - 1 || void 0,
                      bottom: 0 == cell.rowspan - 1,
                      rowLevel,
                      columnLevel: 0,
                      indexInTableGridRow: columnIndex,
                      indexInTableGridColumn: rowIndex
                    });
                    for (let nextRowIndex = rowIndex + 1, columnLevel = 1; columnLevel < cell.rowspan; columnLevel += 1) {
                      grid[nextRowIndex] = grid[nextRowIndex] || [];
                      grid[nextRowIndex][columnIndex] = new TableGridCell({
                        cell: void 0,
                        link: cell,
                        linkType: rowLevel > 0 ? "rowColumn" : "column",
                        rightMost: rowLevel == cell.colspan - 1 || void 0,
                        bottom: columnLevel == cell.rowspan - 1,
                        rowLevel,
                        columnLevel,
                        indexInTableGridRow: columnIndex,
                        indexInTableGridColumn: nextRowIndex
                      });
                      nextRowIndex += 1;
                    }
                    filled = true;
                  }
                  columnIndex += 1;
                }
              }
            }
          );
        }
      );
      return grid;
    }
    /**
     * 中文说明：设置align，同步表格设计器配置并影响后续显示或打印结果。
     */
    setAlign(align) {
      const singleSelect = this.tableCellSelector.getSingleSelect();
      if (singleSelect) singleSelect.cell.setAlign(align);
    }
    /**
     * 中文说明：设置valign，同步表格设计器配置并影响后续显示或打印结果。
     */
    setVAlign(vAlign) {
      const singleSelect = this.tableCellSelector.getSingleSelect();
      if (singleSelect) singleSelect.cell.setVAlign(vAlign);
    }
    /**
     * 中文说明：读取column step，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getColumnStep(rowIndex) {
      let step = 0;
      if (this.rows.length) {
        this.rows[rowIndex || 0].columns.forEach(
          /** 中文说明：累计指定行的 colspan 得到表格网格列数。 */
          (cell) => {
            step += cell.colspan;
          }
        );
      }
      return step;
    }
    /**
     * 中文说明：初始化context，为表格设计器后续渲染和设计操作准备状态。
     */
    initContext() {
      const self = this;
      if (!this.optionsCoat.options.isEnableContextMenu) return false;
      $(this.handle).hicontextMenu({
        menus: [{
          text: "在上方插入行",
          enabled: this.optionsCoat.options.isEnableInsertRow,
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          disable() {
            return !self.tableCellSelector.getSingleSelect();
          },
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          callback() {
            self.insertRow("above");
            self.resizer.updateRowGrips();
            hinnn.event.trigger("updateTable" + self.id);
          }
        }, {
          text: "在下方插入行",
          borderBottom: true,
          enabled: this.optionsCoat.options.isEnableInsertRow,
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          disable() {
            return !self.tableCellSelector.getSingleSelect();
          },
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          callback() {
            self.insertRow("below");
            self.resizer.updateRowGrips();
            hinnn.event.trigger("updateTable" + self.id);
          }
        }, {
          text: "向左方插入列",
          enabled: this.optionsCoat.options.isEnableInsertColumn,
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          disable() {
            return !self.tableCellSelector.getSingleSelect();
          },
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          callback() {
            self.insertColumn("left");
            self.resizer.updateColumnGrips();
            hinnn.event.trigger("updateTable" + self.id);
          }
        }, {
          text: "向右方插入列",
          enabled: this.optionsCoat.options.isEnableInsertColumn,
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          disable() {
            return !self.tableCellSelector.getSingleSelect();
          },
          borderBottom: true,
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          callback() {
            self.insertColumn("right");
            self.resizer.updateColumnGrips();
            hinnn.event.trigger("updateTable" + self.id);
          }
        }, {
          text: "删除行",
          enabled: this.optionsCoat.options.isEnableDeleteRow,
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          disable() {
            return !self.tableCellSelector.getSingleSelect();
          },
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          callback() {
            self.deleteRow();
            self.resizer.updateRowGrips();
            hinnn.event.trigger("updateTable" + self.id);
          }
        }, {
          text: "删除列",
          borderBottom: true,
          enabled: this.optionsCoat.options.isEnableDeleteColumn,
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          disable() {
            return !self.tableCellSelector.getSingleSelect();
          },
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          callback() {
            self.deleteColums();
            self.resizer.updateColumnGrips();
            hinnn.event.trigger("updateTable" + self.id);
          }
        }, {
          text: "对齐",
          borderBottom: true,
          enabled: this.optionsCoat.options.columnAlignEditable,
          menus: [{
            text: "左",
            /**
             * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
             */
            callback() {
              self.setAlign("left");
            }
          }, {
            text: "左右居中",
            /**
             * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
             */
            callback() {
              self.setAlign("center");
            }
          }, {
            text: "右",
            /**
             * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
             */
            callback() {
              self.setAlign("right");
            }
          }, {
            text: "默认",
            borderBottom: true,
            /**
             * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
             */
            callback() {
              self.setAlign("");
            }
          }, {
            text: "上",
            /**
             * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
             */
            callback() {
              self.setVAlign("top");
            }
          }, {
            text: "垂直居中",
            /**
             * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
             */
            callback() {
              self.setVAlign("middle");
            }
          }, {
            text: "下",
            /**
             * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
             */
            callback() {
              self.setVAlign("bottom");
            }
          }, {
            text: "默认",
            /**
             * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
             */
            callback() {
              self.setVAlign("");
            }
          }]
        }, {
          text: "合并单元格",
          enabled: this.optionsCoat.options.isEnableMergeCell,
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          disable() {
            return self.tableCellSelector.getSingleSelect();
          },
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          callback() {
            self.mergeCell();
            hinnn.event.trigger("updateTable" + self.id);
          }
        }, {
          text: "解开单元格",
          enabled: this.optionsCoat.options.isEnableMergeCell,
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          disable() {
            const singleSelect = self.tableCellSelector.getSingleSelect();
            return !singleSelect || singleSelect.cell.rowspan == 1 && singleSelect.cell.colspan == 1;
          },
          /**
           * 中文说明：处理表格设计器的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
           */
          callback() {
            self.splitCell();
            hinnn.event.trigger("updateTable" + self.id);
          }
        }].filter(
          /** 中文说明：过滤不可用的右键菜单项，只渲染当前表格状态允许的操作。 */
          (menu) => menu.enabled
        )
      });
      return void 0;
    }
    /**
     * 中文说明：读取table width，为表格设计器的布局计算、序列化或渲染提供数据。
     */
    getTableWidth() {
      return hinnn.px.toPt(this.target.outerWidth(false));
    }
    /**
     * 中文说明：更新column grips，让表格设计器的 DOM、尺寸或交互状态保持一致。
     */
    updateColumnGrips() {
      this.resizer.updateColumnGrips();
    }
    /**
     * 中文说明：更新row grips，让表格设计器的 DOM、尺寸或交互状态保持一致。
     */
    updateRowGrips() {
      this.resizer.updateRowGrips();
    }
  }
  class TablePrintElement extends BasePrintElement {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(printElementType, options2) {
      super(printElementType);
      this.gridColumnsFooterCss = "hiprint-gridColumnsFooter";
      this.tableGridRowCss = "table-grid-row";
      this.options = new TablePrintElementOptions(options2, this.printElementType);
      this.options.setDefault(new TablePrintElementOptions(HiPrintConfig.instance.table.default).getPrintElementOptionEntity());
    }
    /**
     * 中文说明：读取columns，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getColumns() {
      return this.options.columns;
    }
    getColumnByIndex(index) {
      const numericIndex = parseInt(index, 10);
      if (Number.isNaN(numericIndex)) return void 0;
      return TableExcelHelper.reconsitutionTableColumnTree(this.getColumns()).rowColumns[numericIndex];
    }
    /**
     * 中文说明：更新design view from options，让打印元素的 DOM、尺寸或交互状态保持一致。
     */
    updateDesignViewFromOptions() {
      if (this.designTarget) {
        this.css(this.designTarget, this.getData());
        const content = this.designTarget.find(".hiprint-printElement-table-content");
        const html = this.getHtml(this.designPaper);
        content.html("");
        content.append(html[0].target.find(".table-grid-row"));
        if (this.printElementType.editable) this.setHitable();
        this.setColumnsOptions();
      }
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    css(target, data) {
      if ((this.getField() || !this.options.content) && !this.printElementType.formatter) return super.css(target, data);
      return void 0;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getDesignTarget(paper) {
      this.designTarget = this.getHtml(paper)[0].target;
      this.designPaper = paper;
      this.designTarget.click((event) => {
        if ($(event.target).closest("thead td").length) return;
        hinnn.event.trigger(this.getPrintElementSelectEventKey(), { printElement: this, selectionKind: "element" });
      });
      this.designTarget.find("td").hidroppable({
        accept: ".rn-draggable-item",
        /**
         * 中文说明：处理drop事件，驱动打印元素中的拖拽、编辑或菜单行为。
         */
        onDrop(_target, _source) {
        },
        /**
         * 中文说明：处理drag enter事件，驱动打印元素中的拖拽、编辑或菜单行为。
         */
        onDragEnter(_target, source2) {
          $(source2).removeClass("rn-draggable-item");
        },
        /**
         * 中文说明：处理drag leave事件，驱动打印元素中的拖拽、编辑或菜单行为。
         */
        onDragLeave(_target, source2) {
          $(source2).addClass("rn-draggable-item");
        }
      });
      this.setColumnsOptions();
      return this.designTarget;
    }
    /**
     * 中文说明：读取config options，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getConfigOptions() {
      return HiPrintConfig.instance.table;
    }
    /**
     * 中文说明：创建target，供打印元素在设计器或打印渲染流程中使用。
     */
    createTarget(_title, data, printData) {
      const target = $('<div class="hiprint-printElement hiprint-printElement-table" style="position: absolute;"><div class="hiprint-printElement-table-handle"></div><div class="hiprint-printElement-table-content" style="height:100%;width:100%"></span></div>');
      const gridColumns = this.createGridColumnsStructure(printData);
      for (let index = 0; index < gridColumns.gridColumns; index += 1) {
        gridColumns.getByIndex(index).append(this.getTableHtml(data, printData));
      }
      target.find(".hiprint-printElement-table-content").append(gridColumns.target);
      return target;
    }
    /**
     * 中文说明：创建grid columns structure，供打印元素在设计器或打印渲染流程中使用。
     */
    createGridColumnsStructure(printData) {
      const row = $('<div class="hi-grid-row table-grid-row"></div>');
      for (let index = 0; index < this.options.getGridColumns(); index += 1) {
        const column2 = $('<div class="tableGridColumnsGutterRow hi-grid-col" style="width:' + 100 / this.options.getGridColumns() + '%;"></div>');
        row.append(column2);
      }
      const formatter2 = this.getGridColumnsFooterFormatter();
      if (formatter2) {
        const footer = $('<div class="hiprint-gridColumnsFooter"></div>');
        footer.append(formatter2(this.options, this.getData(printData), printData, []));
        row.append(footer);
      }
      return new GridColumns(this.options.getGridColumns(), row);
    }
    /**
     * 中文说明：创建createtemp empty rows target structure，供打印元素在设计器或打印渲染流程中使用。
     */
    createtempEmptyRowsTargetStructure(printData) {
      if (this.getField()) return this.createTarget(this.printElementType.title, []);
      const target = this.createTarget(this.printElementType.title, []).clone();
      target.find(".hiprint-printElement-tableTarget tbody tr").remove();
      return target;
    }
    /**
     * 中文说明：读取table html，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getTableHtml(data, printData) {
      let container;
      let table;
      if (!this.getField() && this.options.content) {
        container = $("<div></div>");
        container.append(this.options.content);
        table = container.find("table");
        table.addClass("hiprint-printElement-tableTarget");
        return table;
      }
      if (this.printElementType.formatter) {
        container = $("<div></div>");
        container.append(this.printElementType.formatter(data));
        table = container.find("table");
        table.addClass("hiprint-printElement-tableTarget");
        return table;
      }
      table = $('<table class="hiprint-printElement-tableTarget" style="border-collapse: collapse;"></table>');
      table.append(TableExcelHelper.createTableHead(this.getColumns(), this.options.getWidth() / this.options.getGridColumns()));
      table.append(TableExcelHelper.createTableRow(this.getColumns(), data, this.options, this.printElementType));
      if (this.getFooterFormatter()) {
        if (this.options.tableFooterRepeat === "no") ;
        else if (this.options.tableFooterRepeat === "last") {
          table.find("tbody").append(TableExcelHelper.createTableFooter(this.printElementType.columns, data, this.options, this.printElementType, printData, data).html());
        } else {
          table.append(TableExcelHelper.createTableFooter(this.printElementType.columns, data, this.options, this.printElementType, printData, []));
        }
      }
      return table;
    }
    /**
     * 中文说明：读取empty row target，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getEmptyRowTarget() {
      return TableExcelHelper.createEmptyRowTarget(this.getColumns());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getHtml(paper, printData) {
      this.createTempContainer();
      const result = this.getPaperHtmlResult(paper, printData);
      this.removeTempContainer();
      return result;
    }
    /**
     * 中文说明：读取paper html result，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getPaperHtmlResult(paper, printData) {
      const results = [];
      const data = this.getData(printData);
      const table = this.getTableHtml(data, printData);
      const emptyRowsTarget = this.createtempEmptyRowsTargetStructure(printData);
      if (printData) this.updateTargetWidth(emptyRowsTarget);
      else this.updateTargetSize(emptyRowsTarget);
      this.css(emptyRowsTarget, data);
      this.css(table, data);
      this.getTempContainer().html("");
      this.getTempContainer().append(emptyRowsTarget);
      let printTopInPaper;
      let beginTop = this.getBeginPrintTopInPaperByReferenceElement(paper);
      let paperIndex = 0;
      let isEnd = false;
      while (!isEnd) {
        let remainingFirstPageHeight = 0;
        let paperFooter = paper.getPaperFooter(paperIndex);
        if (paperIndex === 0 && beginTop > paperFooter) {
          beginTop = beginTop - paperFooter + paper.paperHeader;
          results.push(new PaperHtmlResult({
            target: void 0,
            printLine: void 0
          }));
          remainingFirstPageHeight = paper.getContentHeight(paperIndex) - (beginTop - paper.paperHeader);
          paperIndex += 1;
          paperFooter = paper.getPaperFooter(paperIndex);
        }
        const previousTarget = results.length > 0 ? results[results.length - 1].target : void 0;
        const rows = this.getRowsInSpecificHeight(printData, remainingFirstPageHeight > 0 ? remainingFirstPageHeight : paperIndex === 0 ? paperFooter - beginTop : paper.getContentHeight(paperIndex), emptyRowsTarget, table, paperIndex, previousTarget);
        isEnd = rows.isEnd;
        let printLine = void 0;
        if (rows.target) {
          rows.target.css("left", this.options.displayLeft());
          rows.target[0].height = "";
        }
        if (paperIndex === 0 || remainingFirstPageHeight > 0) {
          if (rows.target) {
            printTopInPaper = beginTop;
            rows.target.css("top", beginTop + "pt");
          }
          printLine = isEnd && this.options.lHeight != null ? beginTop + (rows.height > this.options.lHeight ? rows.height : this.options.lHeight) : beginTop + rows.height;
        } else {
          if (rows.target) {
            printTopInPaper = paper.paperHeader;
            rows.target.css("top", paper.paperHeader + "pt");
          }
          printLine = paper.paperHeader + rows.height;
        }
        results.push(new PaperHtmlResult({
          target: rows.target,
          printLine,
          referenceElement: new PrintReferenceElement({
            top: this.options.getTop(),
            left: this.options.getLeft(),
            height: this.options.getHeight(),
            width: this.options.getWidth(),
            beginPrintPaperIndex: paper.index,
            bottomInLastPaper: printLine,
            printTopInPaper
          })
        }));
        paperIndex += 1;
      }
      return results;
    }
    /**
     * 中文说明：读取rows in specific height，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getRowsInSpecificHeight(printData, height, emptyRowsTarget, table, _paperIndex, previousTarget) {
      const tbody = table.find("tbody");
      const heightPx = hinnn.pt.toPx(height);
      emptyRowsTarget.find(".hiprint-printElement-tableTarget tbody").html("");
      let outerHeight = emptyRowsTarget.outerHeight();
      if (outerHeight > heightPx) {
        return {
          target: void 0,
          length: 0,
          height: 0,
          isEnd: false
        };
      }
      const allRows = [];
      for (let columnIndex = 0; columnIndex < this.options.getGridColumns(); columnIndex += 1) {
        const tableColumnTarget = emptyRowsTarget.find(".hiprint-printElement-tableTarget:eq(" + columnIndex + ")");
        let currentResult = void 0;
        const columnRows = [];
        for (; ; ) {
          if (outerHeight <= heightPx) {
            if (tbody.find("tr").length === 0) {
              currentResult = {
                height: hinnn.px.toPt(outerHeight),
                isEnd: true
              };
              if (printData && this.options.autoCompletion) {
                this.autoCompletion(heightPx, tableColumnTarget);
                outerHeight = emptyRowsTarget.outerHeight();
              }
            } else {
              const row = tbody.find("tr:lt(1)");
              tableColumnTarget.find("tbody").append(row);
              const rowData = row.data("rowData");
              allRows.push(rowData);
              columnRows.push(rowData);
              outerHeight = emptyRowsTarget.outerHeight();
              if (outerHeight > heightPx) {
                tbody.prepend(row);
                allRows.pop();
                columnRows.pop();
                outerHeight = emptyRowsTarget.outerHeight();
                currentResult = {
                  height: hinnn.px.toPt(outerHeight),
                  isEnd: false
                };
              }
            }
          }
          if (currentResult) {
            if (this.getFooterFormatter()) {
              if (tableColumnTarget.find("tfoot").length) {
                tableColumnTarget.find("tfoot").html(TableExcelHelper.createTableFooter(this.printElementType.columns, this.getData(printData), this.options, this.printElementType, printData, columnRows).html());
              }
            }
            break;
          }
        }
      }
      const renderedRowCount = emptyRowsTarget.find(".hiprint-printElement-tableTarget tbody tr").length;
      const gridColumnsFooterFormatter2 = this.getGridColumnsFooterFormatter();
      if (gridColumnsFooterFormatter2) emptyRowsTarget.find(this.gridColumnsFooterCss).html(gridColumnsFooterFormatter2(this.options, this.getData(printData), printData, allRows));
      if (tbody.find("tr").length === 0) {
        return renderedRowCount === 0 && previousTarget ? {
          target: void 0,
          length: 0,
          height: 0,
          isEnd: true
        } : {
          target: emptyRowsTarget.clone(),
          length: renderedRowCount,
          height: hinnn.px.toPt(outerHeight),
          isEnd: true
        };
      }
      return {
        target: emptyRowsTarget.clone(),
        length: renderedRowCount,
        height: hinnn.px.toPt(outerHeight),
        isEnd: false
      };
    }
    /**
     * 中文说明：按表格配置自动补齐行或列，保证打印表格数据不足时仍保持模板结构。
     */
    autoCompletion(heightPx, target) {
      let row;
      const emptyRowTarget = this.getEmptyRowTarget();
      let outerHeight = target.outerHeight();
      while (heightPx > outerHeight) {
        row = emptyRowTarget.clone();
        target.find("tbody").append(row);
        outerHeight = target.outerHeight();
      }
      if (row) row.remove();
    }
    /**
     * 中文说明：读取data，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getData(printData) {
      if (!printData) return [{}];
      const boundValue = this.getDataBindingValue(printData);
      const value = boundValue.found ? boundValue.value : printData[this.getField()];
      return cloneRows(value);
    }
    /**
     * 中文说明：处理resize事件，驱动打印元素中的拖拽、编辑或菜单行为。
     */
    onResize(_target, height, width, top, left) {
      super.updateSizeAndPositionOptions(left, top, width, height);
      TableExcelHelper.resizeTableCellWidth(this.designTarget, this.getColumns(), this.options.getWidth());
    }
    /**
     * 中文说明：读取reizeable show points，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getReizeableShowPoints() {
      return ["s", "e"];
    }
    /**
     * 中文说明：渲染打印元素的设计态 DOM，并绑定设计器中的拖拽、选择和属性编辑能力。
     */
    design(designOptions, paper) {
      const self = this;
      this.designTarget.hidraggable({
        handle: this.designTarget.find(".hiprint-printElement-table-handle"),
        axis: self.options.axis && designOptions && designOptions.axisEnabled ? self.options.axis : void 0,
        /**
         * 中文说明：处理drag事件，驱动打印元素中的拖拽、编辑或菜单行为。
         */
        onDrag(_event, left, top) {
          self.updateSizeAndPositionOptions(left, top);
          self.createLineOfPosition(paper);
        },
        moveUnit: "pt",
        minMove: HiPrintConfig.instance.movingDistance,
        /**
         * 中文说明：在打印元素操作开始前执行校验，必要时阻止后续交互。
         */
        onBeforeDrag(_event) {
          HiPrintlib.instance.draging = true;
          self.createLineOfPosition(paper);
        },
        /**
         * 中文说明：处理stop drag事件，驱动打印元素中的拖拽、编辑或菜单行为。
         */
        onStopDrag(_event) {
          HiPrintlib.instance.draging = false;
          self.removeLineOfPosition();
        }
      });
      if (this.printElementType.editable) this.setHitable();
      this.setColumnsOptions();
      this.designTarget.hireizeable({
        showPoints: self.getReizeableShowPoints(),
        noContainer: true,
        /**
         * 中文说明：在打印元素操作开始前执行校验，必要时阻止后续交互。
         */
        onBeforeResize() {
          HiPrintlib.instance.draging = true;
        },
        /**
         * 中文说明：处理resize事件，驱动打印元素中的拖拽、编辑或菜单行为。
         */
        onResize(event, height, width, top, left) {
          self.onResize(event, height, width, top, left);
          if (self.hitable) self.hitable.updateColumnGrips();
          self.createLineOfPosition(paper);
        },
        /**
         * 中文说明：处理stop resize事件，驱动打印元素中的拖拽、编辑或菜单行为。
         */
        onStopResize() {
          HiPrintlib.instance.draging = false;
          self.removeLineOfPosition();
        }
      });
      this.bingKeyboardMoveEvent(this.designTarget, paper);
    }
    /**
     * 中文说明：设置hitable，同步打印元素配置并影响后续显示或打印结果。
     */
    setHitable() {
      const self = this;
      this.hitable = new HiTale({
        table: this.designTarget.find(".hiprint-printElement-tableTarget:eq(0)"),
        rows: this.getColumns(),
        resizeRow: false,
        resizeColumn: true,
        trs: this.designTarget.find(".hiprint-printElement-tableTarget:eq(0)").find("tbody tr"),
        handle: this.designTarget.find(".hiprint-printElement-tableTarget:eq(0)").find("thead"),
        isEnableEdit: this.printElementType.editable,
        columnDisplayEditable: this.printElementType.columnDisplayEditable,
        columnDisplayIndexEditable: this.printElementType.columnDisplayIndexEditable,
        columnResizable: this.printElementType.columnResizable,
        columnAlignEditable: this.printElementType.columnAlignEditable,
        isEnableEditText: this.printElementType.columnTitleEditable,
        isEnableEditField: false,
        isEnableContextMenu: true,
        isEnableInsertRow: false,
        isEnableDeleteRow: false,
        isEnableInsertColumn: false,
        isEnableDeleteColumn: false,
        isEnableMergeCell: false
      });
      hinnn.event.on(
        "updateTable" + this.hitable.id,
        /** 中文说明：监听表格更新事件并重新调整表格设计态尺寸。 */
        function updateTableListener() {
          self.updateDesignViewFromOptions();
        }
      );
    }
    /**
     * 中文说明：设置columns options，同步打印元素配置并影响后续显示或打印结果。
     */
    setColumnsOptions() {
      const self = this;
      const headerCells = this.designTarget.find(".hiprint-printElement-tableTarget:eq(0)").find("thead td");
      headerCells.unbind("click.hiprint").bind(
        "click.hiprint",
        /** 中文说明：处理表头单元格点击，打开列属性面板并同步列配置。 */
        function onHeaderCellClick(event) {
          event.preventDefault();
          event.stopPropagation();
          const targetCell = $(event.currentTarget);
          const columnIndex = targetCell.attr("data-column-index");
          const column2 = self.getColumnByIndex(columnIndex);
          if (column2) {
            hinnn.event.trigger(self.getPrintElementSelectEventKey(), {
              printElement: self,
              selectionKind: "tableColumn",
              selectedColumn: column2,
              customOptionsInput: [{
                title: `${column2.title || column2.field || "列"}-列属性`,
                optionItems: self.getPrintElementOptionItemsByName("tableColumn"),
                options: column2,
                printElement: self,
                bindingContext: "tableColumn",
                callback(nextOptions) {
                  Object.keys(nextOptions || {}).forEach((name) => {
                    if (name !== "__bindingContext") column2[name] = nextOptions[name];
                  });
                  self.updateDesignViewFromOptions();
                  hinnn.event.trigger(`hiprintTemplateDataChanged_${self.templateId}`);
                }
              }]
            });
          } else {
            hinnn.event.trigger(self.getPrintElementSelectEventKey(), {
              printElement: self,
              selectionKind: "element"
            });
          }
        }
      );
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    filterOptionItems(optionItems) {
      const filtered = super.filterOptionItems(optionItems);
      return this.printElementType.editable && this.options.columns.length === 1 ? filtered : optionItems.filter(
        /** 中文说明：过滤 columns 属性项，避免非可编辑表格重复暴露列配置入口。 */
        (optionItem) => optionItem.name !== "columns"
      );
    }
    /**
     * 中文说明：读取footer formatter，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getFooterFormatter() {
      return TableExcelHelper.getFooterFormatter(this.options, this.printElementType);
    }
    /**
     * 中文说明：读取grid columns footer formatter，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getGridColumnsFooterFormatter() {
      let gridColumnsFooterFormatter = void 0;
      if (this.printElementType.gridColumnsFooterFormatter) gridColumnsFooterFormatter = this.printElementType.gridColumnsFooterFormatter;
      if (this.options.gridColumnsFooterFormatter) {
        try {
          const source = "gridColumnsFooterFormatter=" + this.options.gridColumnsFooterFormatter;
          eval(source);
        } catch (error) {
          console.log(error);
        }
      }
      return gridColumnsFooterFormatter;
    }
  }
  function normalizeImageSource(value) {
    if (typeof value !== "string") return "";
    const source2 = value.trim();
    if (!source2 || source2 === "false" || source2 === "null" || source2 === "undefined") return "";
    return source2;
  }
  class ImagePrintElement extends BasePrintElement {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(printElementType, options2) {
      super(printElementType);
      this.options = new PrintElementOptions(options2);
      this.options.setDefault(new PrintElementOptions(HiPrintConfig.instance.image.default).getPrintElementOptionEntity());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getReizeableShowPoints() {
      return ["se"];
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getData(templateData) {
      let value = "";
      const boundValue = this.getDataBindingValue(templateData);
      if (boundValue.found) value = boundValue.value ?? "";
      else if (templateData) value = this.getField() ? templateData[this.getField()] || "" : this.options.src || this.printElementType.getData();
      else value = this.options.src || this.printElementType.getData();
      const formatter2 = this.getFormatter();
      if (formatter2) value = formatter2(value, this.options, this._currenttemplateData);
      return value || "";
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    createTarget(title, data) {
      const target = $('<div  class="hiprint-printElement hiprint-printElement-image" style="position: absolute;"><div class="hiprint-printElement-image-content" style="height:100%;width:100%"></div></div>');
      this.updateTargetImage(target, title, data);
      return target;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    initSizeByHtml(target) {
      super.initSizeByHtml(target);
      this.css(target, this.getData());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getConfigOptions() {
      return HiPrintConfig.instance.image;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    updateDesignViewFromOptions() {
      if (this.designTarget) {
        this.css(this.designTarget, this.getData());
        this.updateTargetImage(this.designTarget, this.getTitle(), this.getData());
      }
    }
    /**
     * 中文说明：更新target image，让打印元素的 DOM、尺寸或交互状态保持一致。
     */
    updateTargetImage(target, _title, data) {
      var _a;
      const content = target.find(".hiprint-printElement-image-content");
      const source2 = normalizeImageSource(data);
      if (!source2) {
        content.html("");
        return;
      }
      let image = content.find("img");
      if (!image.length) {
        content.html('<img style="width:100%;height:100%;">');
        image = content.find("img");
      }
      (_a = image.on) == null ? void 0 : _a.call(image, "error", () => image.remove());
      image.attr("src", source2);
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getHtml(paper, templateData, renderOptions) {
      return this.getHtml2(paper, templateData, renderOptions);
    }
  }
  class TextStringReplacer {
    /**
     * 中文说明：把文本中的换行符转换为 HTML 换行，保持打印文本排版。
     */
    static replaceEnterAndNewline(value, replacement) {
      return value.replace(new RegExp("\r|\n|/g", "g"), replacement);
    }
    /**
     * 中文说明：把制表符转换为空格占位，避免打印文本中的缩进丢失。
     */
    static replaceTab(value, replacement) {
      return value.replace(new RegExp("	/g", "g"), replacement);
    }
    /**
     * 中文说明：同时处理换行和制表符，让普通文本可安全渲染为打印 HTML。
     */
    static replaceEnterAndNewlineAndTab(value, replacement) {
      return value.replace(new RegExp("\r|\n|	|/g", "g"), replacement);
    }
  }
  class TextPrintElementOptions extends PrintElementOptions {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(options2) {
      super(options2 || {});
      if (this.title) this.title = TextStringReplacer.replaceEnterAndNewlineAndTab(this.title, "");
    }
    /**
     * 中文说明：读取hide title，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getHideTitle() {
      return this.hideTitle == null ? this.defaultOptions.hideTitle : this.hideTitle;
    }
    getTitleSeparator() {
      return this.titleSeparator == null ? this.defaultOptions.titleSeparator : this.titleSeparator.toString();
    }
    /**
     * 中文说明：读取text type，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getTextType() {
      return (this.textType == null ? this.defaultOptions.textType : this.textType) || "text";
    }
    /**
     * 中文说明：读取font size，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getFontSize() {
      return (this.fontSize == null ? this.defaultOptions.fontSize : this.fontSize) || 9;
    }
    /**
     * 中文说明：读取getbarcode mode，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getbarcodeMode() {
      return (this.barcodeMode == null ? this.defaultOptions.barcodeMode : this.barcodeMode) || "CODE128";
    }
  }
  class TextPrintElement extends BasePrintElement {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(printElementType, options2) {
      super(printElementType);
      this.options = new TextPrintElementOptions(options2);
      this.options.setDefault(new TextPrintElementOptions(HiPrintConfig.instance.text.default).getPrintElementOptionEntity());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getDesignTarget(paper) {
      return super.getDesignTarget(paper);
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getProxyTarget(options2) {
      if (options2) this.SetProxyTargetOption(options2);
      const data = this.getData();
      const target = this.createTarget(this.printElementType.getText(true), data);
      this.updateTargetSize(target);
      this.css(target, data);
      return target;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    updateDesignViewFromOptions() {
      if (this.designTarget) {
        const data = this.getData();
        this.css(this.designTarget, data);
        this.updateTargetText(this.designTarget, this.getTitle(), data);
      }
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getConfigOptions() {
      return HiPrintConfig.instance.text;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getTitle() {
      let title = this.options.title || this.printElementType.title || "";
      if (title) title = TextStringReplacer.replaceEnterAndNewlineAndTab(title, "");
      return title;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getData(templateData) {
      const boundValue = this.getDataBindingValue(templateData);
      let value = boundValue.found ? boundValue.value ?? "" : templateData ? templateData[this.getField()] || "" : this.options.testData || this.printElementType.getData() || "";
      const dataType = this.options.dataType;
      const format = this.options.format;
      if (dataType === "rmbUppercase" || dataType === "rmb" || dataType === "amountUppercase") return hinnn.rmbUppercase(value) || value;
      if (dataType === "datetime" && format) return hinnn.dateFormat(value, format);
      if ((dataType === "boolean" || dataType === "boolen") && format) {
        const parts = format.split(":");
        if (parts.length > 0) return value === true || value === "true" ? parts[0] : parts[1];
      }
      return value;
    }
    /**
     * 中文说明：更新target text，让打印元素的 DOM、尺寸或交互状态保持一致。
     */
    updateTargetText(target, title, data, _unused) {
      const formatter2 = this.getFormatter();
      const content = target.find(".hiprint-printElement-text-content");
      let html = "";
      html = this.getField() ? (this.options.getHideTitle() ? "" : title ? title + this.options.getTitleSeparator() : "") + (formatter2 ? formatter2(title, data, this.options, this._currenttemplateData, target) : data) : data = formatter2 ? formatter2(title, title, this.options, this._currenttemplateData, target) : title;
      const textType = this.options.getTextType();
      if (textType === "text") content.html(html);
      else {
        if (textType === "image") {
          content.html("");
          if (data) {
            const image = $("<img>");
            image.attr("src", data);
            image.css("display", "block");
            image.css("width", "100%");
            image.css("height", "100%");
            content.append(image);
          }
        }
        if (textType === "barcode") {
          content.html('<svg width="100%" display="block" height="100%" class="hibarcode_imgcode" preserveAspectRatio="none slice"></svg ><div class="hibarcode_displayValue"></div>');
          try {
            if (data) {
              JsBarcode(content.find(".hibarcode_imgcode")[0], data, {
                format: this.options.getbarcodeMode(),
                width: 1,
                textMargin: -1,
                lineColor: this.options.color || "#000000",
                margin: 0,
                height: parseInt(hinnn.pt.toPx(this.options.getHeight() || 10).toString()),
                displayValue: false
              });
              content.find(".hibarcode_imgcode").attr("height", "100%");
              content.find(".hibarcode_imgcode").attr("width", "100%");
              if (!this.options.hideTitle) content.find(".hibarcode_displayValue").html(data);
            } else content.html("");
          } catch (error) {
            console.log(error);
            content.html("此格式不支持该文本");
          }
        }
        if (textType === "qrcode") {
          content.html("");
          try {
            if (data) {
              const widthPt = Number(this.options.getWidth() || 20);
              const heightPt = Number(this.options.getHeight() || 20);
              const sizePt = Math.max(1, Math.min(widthPt, heightPt));
              const box = $("<div></div>");
              target.css("line-height", 0);
              content.css("text-align", "center");
              box.css({
                width: `${sizePt}pt`,
                height: `${sizePt}pt`,
                display: "inline-block"
              });
              new QRCode(box[0], { width: "100%", height: "100%", colorDark: this.options.color || "#000000", useSVG: true }).makeCode(data);
              scopeSvgIds(box[0], "hiprint-qrcode");
              content.html(box);
            }
          } catch (error) {
            console.log(error);
            content.html("二维码生成失败");
          }
        }
      }
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    onResize(event, height, width, top, left) {
      super.onResize(event, height, width, top, left);
      if (this.options.getTextType() === "barcode" || this.options.getTextType() === "qrcode") this.updateTargetText(this.designTarget, this.getTitle(), this.getData());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    createTarget(title, data, renderOptions) {
      const target = $('<div tabindex="1" class="hiprint-printElement hiprint-printElement-text" style="position: absolute;"><div class="hiprint-printElement-text-content hiprint-printElement-content" style="height:100%;width:100%"></div></div>');
      this.updateTargetText(target, title, data, renderOptions);
      return target;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getHtml(paper, templateData, renderOptions) {
      return this.getHtml2(paper, templateData, renderOptions);
    }
  }
  class LongTextPrintElementOptions extends PrintElementOptions {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(options2) {
      const normalizedOptions = options2 || {};
      super(normalizedOptions);
      this.leftSpaceRemoved = normalizedOptions.leftSpaceRemoved;
    }
    /**
     * 中文说明：读取hide title，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getHideTitle() {
      return this.hideTitle == null ? this.defaultOptions.hideTitle : this.hideTitle;
    }
    getTitleSeparator() {
      return this.titleSeparator == null ? this.defaultOptions.titleSeparator : this.titleSeparator.toString();
    }
  }
  class LongTextPrintElement extends BasePrintElement {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(printElementType, options2) {
      super(printElementType);
      this.options = new LongTextPrintElementOptions(options2);
      this.options.setDefault(new LongTextPrintElementOptions(HiPrintConfig.instance.longText.default).getPrintElementOptionEntity());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getDesignTarget(paper) {
      const target = super.getDesignTarget(paper);
      target.find(".hiprint-printElement-longText-content").css("border", "1px dashed #cebcbc");
      return target;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getProxyTarget(options2) {
      if (options2) this.SetProxyTargetOption(options2);
      const data = this.getData();
      const target = this.createTarget(this.printElementType.getText(true), data);
      this.updateTargetSize(target);
      this.css(target, data);
      return target;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    updateDesignViewFromOptions() {
      if (this.designTarget) {
        const data = this.getData();
        const target = this.getHtml(this.designPaper)[0].target;
        this.designTarget.find(".hiprint-printElement-longText-content").html(target.find(".hiprint-printElement-longText-content").html());
        this.css(this.designTarget, data);
      }
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getConfigOptions() {
      return HiPrintConfig.instance.longText;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getTitle() {
      return this.options.title || this.printElementType.title;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getData(templateData) {
      const boundValue = this.getDataBindingValue(templateData);
      return boundValue.found ? boundValue.value ?? "" : templateData ? templateData[this.getField()] || "" : this.options.testData || this.printElementType.getData() || "";
    }
    /**
     * 中文说明：更新target text，让打印元素的 DOM、尺寸或交互状态保持一致。
     */
    updateTargetText(target, title, data) {
      const content = target.find(".hiprint-printElement-longText-content");
      const text = this.getText(title, data);
      content.html(text);
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    createTarget(title, data) {
      const target = $('<div  class="hiprint-printElement hiprint-printElement-longText" style="position: absolute;"><div class="hiprint-printElement-longText-content hiprint-printElement-content" style="height:100%;width:100%"></div></div>');
      this.updateTargetText(target, title, data);
      return target;
    }
    /**
     * 中文说明：读取text，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getText(title, data) {
      const formatter2 = this.getFormatter();
      if (data) data = this.options.leftSpaceRemoved != 0 ? data.toString().replace(/^\s*/, "") : data;
      return (this.getField() ? (this.options.getHideTitle() ? "" : title ? title + this.options.getTitleSeparator() : "") + (formatter2 ? formatter2(title, data, this.options, this._currenttemplateData) : data) : formatter2 ? formatter2(title, title, this.options, this._currenttemplateData) : title || "") || "";
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getHtml(paper, templateData) {
      this.setCurrenttemplateData(templateData);
      this.createTempContainer();
      const result = this.getPaperHtmlResult(paper, templateData);
      this.removeTempContainer();
      return result;
    }
    /**
     * 中文说明：读取height by data，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getHeightByData(data) {
      this.createTempContainer();
      const result = this.getPaperHtmlResult(new LongTextMeasurePaper("", 1e3, 1e3, 0, 25e3, 0, 0, true, void 0, 0, void 0), {}, data);
      this.removeTempContainer();
      return result[0].referenceElement.bottomInLastPaper - result[0].referenceElement.printTopInPaper;
    }
    /**
     * 中文说明：读取long text indent，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getLongTextIndent() {
      return this.options.longTextIndent ? '<span class="long-text-indent" style="margin-left:' + this.options.longTextIndent + 'pt"></span>' : '<span class="long-text-indent"></span>';
    }
    /**
     * 中文说明：读取paper html result，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getPaperHtmlResult(paper, templateData, measureData) {
      const results = [];
      let paperIndex = 0;
      const data = measureData || this.getData(templateData);
      const text = this.getText(this.getTitle(), data);
      const target = this.createTarget(this.getTitle(), this.options.testData || "");
      this.css(target, data);
      templateData ? this.updateTargetWidth(target) : this.updateTargetSize(target);
      this.getTempContainer().html("");
      this.getTempContainer().append(target);
      let pieces = [this.getLongTextIndent()];
      const lines = text.split(new RegExp("\r|\n", "g"));
      lines.forEach((line, index) => {
        const normalizedLine = this.options.leftSpaceRemoved != 0 ? (line || "").toString().replace(/^\s*/, "") : line;
        pieces = pieces.concat(normalizedLine.split(""));
        if (index < lines.length - 1) pieces.push("<br/>" + this.getLongTextIndent());
      });
      if (pieces.length === 0) pieces = [""];
      if (this.isHeaderOrFooter() || this.isFixed() || !templateData) {
        const fixedResult = this.getStringBySpecificHeight(pieces, 25e3, target);
        fixedResult.target.css("left", this.options.displayLeft());
        fixedResult.target.css("top", this.options.displayTop());
        fixedResult.target[0].height = "";
        results.push(new PaperHtmlResult({
          target: fixedResult.target,
          printLine: this.options.displayTop() + fixedResult.height,
          referenceElement: new PrintReferenceElement({
            top: this.options.getTop(),
            left: this.options.getLeft(),
            height: this.options.getHeight(),
            width: this.options.getWidth(),
            beginPrintPaperIndex: paper.index,
            bottomInLastPaper: this.options.getTop() + fixedResult.height,
            printTopInPaper: this.options.getTop(),
            endPrintPaperIndex: void 0
          })
        }));
        return results;
      }
      let beginTop = this.getBeginPrintTopInPaperByReferenceElement(paper);
      while (pieces.length > 0) {
        let remainingFirstPageHeight = 0;
        let paperFooter = paper.getPaperFooter(paperIndex);
        if (paperIndex === 0 && beginTop > paperFooter) {
          beginTop = beginTop - paperFooter + paper.paperHeader;
          results.push(new PaperHtmlResult({ target: void 0, printLine: void 0, referenceElement: void 0 }));
          paperIndex += 1;
          remainingFirstPageHeight = paper.getContentHeight(paperIndex) - (beginTop - paper.paperHeader);
          paperFooter = paper.getPaperFooter(paperIndex);
        }
        const pageResult = this.getStringBySpecificHeight(pieces, remainingFirstPageHeight > 0 ? remainingFirstPageHeight : paperIndex === 0 ? paperFooter - beginTop : paper.getContentHeight(paperIndex), target);
        pieces.splice(0, pageResult.length);
        let printLine = void 0;
        let printTopInPaper = void 0;
        pageResult.target.css("left", this.options.displayLeft());
        pageResult.target[0].height = "";
        if (paperIndex === 0 || remainingFirstPageHeight > 0) {
          printTopInPaper = beginTop;
          pageResult.target.css("top", printTopInPaper + "pt");
          printLine = pieces.length > 0 ? beginTop + pageResult.height : this.options.lHeight != null ? beginTop + (pageResult.height > this.options.lHeight ? pageResult.height : this.options.lHeight) : beginTop + pageResult.height;
        } else {
          printTopInPaper = paper.paperHeader;
          pageResult.target.css("top", printTopInPaper + "pt");
          printLine = printTopInPaper + pageResult.height;
        }
        results.push(new PaperHtmlResult({
          target: pageResult.target,
          printLine,
          referenceElement: new PrintReferenceElement({
            top: this.options.getTop(),
            left: this.options.getLeft(),
            height: this.options.getHeight(),
            width: this.options.getWidth(),
            beginPrintPaperIndex: paper.index,
            bottomInLastPaper: printLine,
            printTopInPaper,
            endPrintPaperIndex: void 0
          })
        }));
        paperIndex += 1;
      }
      return results;
    }
    /**
     * 中文说明：读取string by specific height，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getStringBySpecificHeight(pieces, height, target) {
      const heightPx = hinnn.pt.toPx(height);
      const lastIndexResult = this.IsPaginationIndex(pieces, pieces.length - 1, heightPx, target);
      return lastIndexResult.IsPagination ? lastIndexResult : this.BinarySearch(pieces, 0, pieces.length - 1, heightPx, target);
    }
    /**
     * 中文说明：用二分查找计算长文本分页截断位置，避免文字溢出打印区域。
     */
    BinarySearch(pieces, left, right, heightPx, target) {
      const middle = Math.floor((left + right) / 2);
      if (left > right) {
        target.find(".hiprint-printElement-longText-content").html("");
        return { IsPagination: true, height: 0, length: 0, target: target.clone() };
      }
      const result = this.IsPaginationIndex(pieces, middle, heightPx, target);
      return result.IsPagination ? result : result.move === "l" ? this.BinarySearch(pieces, left, middle - 1, heightPx, target) : this.BinarySearch(pieces, middle + 1, right, heightPx, target);
    }
    /**
     * 中文说明：判断pagination index，用于控制打印元素分支逻辑和交互可用性。
     */
    IsPaginationIndex(pieces, index, heightPx, target) {
      target.find(".hiprint-printElement-longText-content").html(pieces.slice(0, index + 2).join(""));
      const nextHeight = target.height();
      target.find(".hiprint-printElement-longText-content").html(pieces.slice(0, index + 1).join(""));
      const currentHeight = target.height();
      return index >= pieces.length - 1 && currentHeight < heightPx ? {
        IsPagination: true,
        height: hinnn.px.toPt(currentHeight),
        length: pieces.length,
        target: target.clone()
      } : currentHeight <= heightPx && nextHeight >= heightPx ? {
        IsPagination: true,
        height: currentHeight,
        length: index + 1,
        target: target.clone()
      } : currentHeight >= heightPx ? {
        IsPagination: false,
        move: "l"
      } : nextHeight <= heightPx ? {
        IsPagination: false,
        move: "r"
      } : {
        IsPagination: true,
        result: 1
      };
    }
  }
  class LongTextMeasurePaper {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(templateId, widthMm, heightMm, paperHeader, paperFooter, _paperNumberLeft, _paperNumberTop, _paperNumberDisabled, _paperNumberFormat, index, referenceElement) {
      this.templateId = templateId;
      this.width = hinnn.mm.toPt(widthMm);
      this.height = hinnn.mm.toPt(heightMm);
      this.mmwidth = widthMm;
      this.mmheight = heightMm;
      this.paperHeader = paperHeader;
      this.paperFooter = paperFooter;
      this.contentHeight = paperFooter - paperHeader;
      this.index = index;
      this.referenceElement = referenceElement ? $.extend({}, referenceElement) : new PrintReferenceElement({ top: 0, left: 0, height: 0, width: 0, bottomInLastPaper: 0, beginPrintPaperIndex: 0, printTopInPaper: 0, endPrintPaperIndex: 0 });
    }
    /**
     * 中文说明：读取paper footer，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getPaperFooter(_index) {
      return this.paperFooter;
    }
    /**
     * 中文说明：读取content height，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getContentHeight(index) {
      return this.getPaperFooter(index) - this.paperHeader;
    }
  }
  class CustomPrintElementOptions extends PrintElementOptions {
    /**
     * 中文说明：初始化自定义元素配置，并继承基础打印元素的位置、尺寸和绑定能力。
     */
    constructor(options2) {
      super(options2 || {});
    }
  }
  class CustomPrintElement extends BasePrintElement {
    /**
     * 中文说明：创建自定义打印元素实例，并应用 custom 默认配置。
     */
    constructor(printElementType, options2) {
      super(printElementType);
      __publicField(this, "renderMode", "print");
      __publicField(this, "currentRenderOptions");
      this.options = new CustomPrintElementOptions(options2);
      this.options.setDefault(new CustomPrintElementOptions(HiPrintConfig.instance.custom.default).getPrintElementOptionEntity());
    }
    /**
     * 中文说明：生成设计态 DOM，并临时切换为 design 渲染模式。
     */
    getDesignTarget(paper) {
      this.renderMode = "design";
      try {
        return super.getDesignTarget(paper);
      } finally {
        this.renderMode = "print";
      }
    }
    /**
     * 中文说明：参数变化后重新渲染设计态内容，保证自定义元素即时刷新。
     */
    updateDesignViewFromOptions() {
      if (!this.designTarget) return;
      const data = this.getData();
      this.css(this.designTarget, data);
      this.renderCustomContent(this.designTarget, this.getTitle(), data, "design", void 0);
    }
    /**
     * 中文说明：读取自定义元素的配置项定义。
     */
    getConfigOptions() {
      return HiPrintConfig.instance.custom;
    }
    /**
     * 中文说明：创建自定义元素 DOM 容器，并把业务 render 结果挂载到内容区域。
     */
    createTarget(title, data, renderOptions) {
      const target = $('<div tabindex="1" class="hiprint-printElement hiprint-printElement-custom" style="position:absolute;"><div class="hiprint-printElement-custom-content hiprint-printElement-content" style="height:100%;width:100%;box-sizing:border-box;"></div></div>');
      this.renderCustomContent(target, title, data, this.renderMode, renderOptions);
      return target;
    }
    /**
     * 中文说明：生成打印态 HTML，向自定义 render 回调传递打印数据和渲染参数。
     */
    getHtml(paper, templateData, renderOptions) {
      const mode = this.renderMode === "design" ? "design" : "print";
      this.renderMode = mode;
      this.currentRenderOptions = renderOptions;
      try {
        return this.getHtml2(paper, templateData, renderOptions);
      } finally {
        this.currentRenderOptions = void 0;
        if (mode !== "design") this.renderMode = "print";
      }
    }
    /**
     * 中文说明：执行宿主自定义 render 回调，并把返回内容写入自定义元素内容容器。
     */
    renderCustomContent(target, title, data, mode, renderOptions) {
      const contentTarget = target.find(".hiprint-printElement-custom-content");
      contentTarget.html("");
      const render = mode === "design" && this.printElementType.renderDesign ? this.printElementType.renderDesign : this.printElementType.render;
      const context = {
        mode,
        title,
        value: data,
        data,
        options: this.options,
        templateData: this._currenttemplateData,
        renderOptions: renderOptions ?? this.currentRenderOptions,
        target,
        contentTarget,
        printElement: this,
        printElementType: this.printElementType
      };
      try {
        const result = render ? render(context) : this.renderFallback(context);
        if (result != null) contentTarget.append(result);
      } catch (error) {
        console.error("[hiprint custom element render failed]", error);
        contentTarget.html(mode === "design" ? "自定义元素渲染失败" : "");
      }
    }
    renderFallback(context) {
      const value = context.value == null || context.value === "" ? context.title : context.value;
      return value == null ? "" : value.toString();
    }
  }
  class VLinePrintElement extends BasePrintElement {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(printElementType, options2) {
      super(printElementType);
      this.options = new PrintElementOptions(options2);
      this.options.setDefault(new PrintElementOptions(HiPrintConfig.instance.vline.default).getPrintElementOptionEntity());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    updateDesignViewFromOptions() {
      if (this.designTarget) this.css(this.designTarget, this.getData());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getConfigOptions() {
      return HiPrintConfig.instance.hline;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    createTarget(_title, _data) {
      return $('<div class="hiprint-printElement hiprint-printElement-vline" style="border-left:1px solid;position: absolute;"></div>');
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getReizeableShowPoints() {
      return ["s"];
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getHtml(paper, templateData, renderOptions) {
      return this.getHtml2(paper, templateData, renderOptions);
    }
  }
  class HLinePrintElement extends BasePrintElement {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(printElementType, options2) {
      super(printElementType);
      this.options = new PrintElementOptions(options2);
      this.options.setDefault(new PrintElementOptions(HiPrintConfig.instance.hline.default).getPrintElementOptionEntity());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    updateDesignViewFromOptions() {
      if (this.designTarget) this.css(this.designTarget, this.getData());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getConfigOptions() {
      return HiPrintConfig.instance.hline;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    createTarget(_title, _data) {
      return $('<div class="hiprint-printElement hiprint-printElement-hline" style="border-top:1px solid;position: absolute;"></div>');
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getReizeableShowPoints() {
      return ["e"];
    }
  }
  class RectPrintElement extends BasePrintElement {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(printElementType, options2) {
      super(printElementType);
      this.options = new PrintElementOptions(options2);
      this.options.setDefault(new PrintElementOptions(HiPrintConfig.instance.rect.default).getPrintElementOptionEntity());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    updateDesignViewFromOptions() {
      if (this.designTarget) this.css(this.designTarget, this.getData());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getConfigOptions() {
      return HiPrintConfig.instance.hline;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    createTarget(_title, _data) {
      return $('<div class="hiprint-printElement hiprint-printElement-rect" style="border:1px solid;position: absolute;"></div>');
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getHtml(paper, templateData, renderOptions) {
      return this.getHtml2(paper, templateData, renderOptions);
    }
  }
  class OvalPrintElement extends BasePrintElement {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(printElementType, options2) {
      super(printElementType);
      this.options = new PrintElementOptions(options2);
      this.options.setDefault(new PrintElementOptions(HiPrintConfig.instance.oval.default).getPrintElementOptionEntity());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    updateDesignViewFromOptions() {
      if (this.designTarget) this.css(this.designTarget, this.getData());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getConfigOptions() {
      return HiPrintConfig.instance.hline;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    createTarget(_title, _data) {
      return $('<div class="hiprint-printElement hiprint-printElement-oval" style="border:1px solid;position: absolute;border-radius: 50%;"></div>');
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getHtml(paper, templateData, renderOptions) {
      return this.getHtml2(paper, templateData, renderOptions);
    }
  }
  const HEADER_CELL_OPTION_NAMES = ["title", "halign", "align", "vAlign", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight"];
  class TableCustomPrintElementOptions extends PrintElementOptions {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(options2) {
      const normalizedOptions = options2 || {};
      super(normalizedOptions);
      if (normalizedOptions.width === void 0) this.width = 510;
      if (normalizedOptions.columns) {
        this.columns = [];
        normalizedOptions.columns.forEach((row) => {
          this.columns.push(new TableRowEntity(row));
        });
      } else {
        this.columns = [new TableRowEntity({
          columns: [
            new TableColumn({ title: "列1", width: 100, align: "center", halign: "center" }),
            new TableColumn({ title: "列2", width: 100, align: "center", halign: "center" })
          ]
        })];
      }
      this.lHeight = normalizedOptions.lHeight;
      this.autoCompletion = normalizedOptions.autoCompletion;
      this.tableFooterRepeat = normalizedOptions.tableFooterRepeat;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getPrintElementOptionEntity() {
      const entity = super.getPrintElementOptionEntity();
      entity.columns = [];
      this.columns.forEach((row) => {
        entity.columns.push(row.getPrintElementOptionEntity());
      });
      return entity;
    }
  }
  class TableCustomPrintElement extends BasePrintElement {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(printElementType, options2) {
      super(printElementType);
      this.options = new TableCustomPrintElementOptions(options2);
      this.options.setDefault(new TableCustomPrintElementOptions(HiPrintConfig.instance.tableCustom.default).getPrintElementOptionEntity());
      this.columns = this.options.columns;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    updateDesignViewFromOptions() {
      if (this.designTarget) {
        this.css(this.designTarget, this.getData());
        const content = this.designTarget.find(".hiprint-printElement-table-content");
        const html = this.getHtml(this.designPaper);
        content.html("");
        content.append(html[0].target.find(".hiprint-printElement-tableTarget"));
        this.setHiReizeable();
        this.bindColumnHeaderEvents();
      }
    }
    bindColumnHeaderEvents() {
      this.designTarget.find("thead td").unbind("click.hiprint").bind("click.hiprint", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const targetCell = $(event.currentTarget);
        const columnIndex = targetCell.attr("data-column-index");
        const column2 = this.getColumnByIndex(columnIndex);
        if (!column2) {
          const headerCell = this.getHeaderCellByTarget(targetCell);
          if (!headerCell) {
            hinnn.event.trigger(this.getPrintElementSelectEventKey(), { printElement: this, selectionKind: "element" });
            return;
          }
          this.openHeaderCellOptionPanel(headerCell);
          return;
        }
        const optionItems = this.getPrintElementOptionItemsByName("tableColumn");
        this.openColumnOptionPanel(column2, optionItems);
      });
    }
    openColumnOptionPanel(column2, optionItems) {
      hinnn.event.trigger(this.getPrintElementSelectEventKey(), {
        printElement: this,
        selectionKind: "tableColumn",
        selectedColumn: column2,
        customOptionsInput: [{
          title: `${column2.title || column2.field || "列"}-列属性`,
          optionItems,
          options: column2,
          printElement: this,
          bindingContext: "tableColumn",
          callback: (nextOptions) => {
            this.applyHeaderCellOptions(column2, nextOptions);
          }
        }]
      });
    }
    openHeaderCellOptionPanel(headerCell) {
      const optionItems = HEADER_CELL_OPTION_NAMES.map((name) => PrintElementOptionItemManager.getItem(name)).filter(Boolean);
      hinnn.event.trigger(this.getPrintElementSelectEventKey(), {
        printElement: this,
        selectionKind: "tableHeaderCell",
        selectedColumn: headerCell,
        customOptionsInput: [{
          title: `${headerCell.title || "表头单元格"}-单元格属性`,
          optionItems,
          options: headerCell,
          printElement: this,
          bindingContext: "tableHeaderCell",
          callback: (nextOptions) => {
            this.applyHeaderCellOptions(headerCell, nextOptions);
          }
        }]
      });
    }
    applyHeaderCellOptions(cell, nextOptions) {
      Object.keys(nextOptions || {}).forEach((name) => {
        if (name !== "__bindingContext") cell[name] = nextOptions[name];
      });
      this.updateDesignViewFromOptions();
      hinnn.event.trigger(`hiprintTemplateDataChanged_${this.templateId}`);
    }
    getHeaderCellByTarget(targetCell) {
      var _a, _b;
      const rowIndex = parseInt((targetCell.attr("data-header-row-index") || "").toString(), 10);
      const cellIndex = parseInt((targetCell.attr("data-header-cell-index") || "").toString(), 10);
      if (!Number.isNaN(rowIndex) && !Number.isNaN(cellIndex)) {
        const cell = (_b = (_a = (this.columns || [])[rowIndex]) == null ? void 0 : _a.columns) == null ? void 0 : _b[cellIndex];
        if (cell) return cell;
      }
      return this.getHeaderCellById(targetCell.attr("id"));
    }
    getHeaderCellById(id) {
      if (!id) return void 0;
      for (const row of this.columns || []) {
        for (const column2 of row.columns || []) {
          if (column2.id != null && column2.id.toString() === id) return column2;
        }
      }
      return void 0;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getDesignTarget(paper) {
      this.designTarget = this.getHtml(paper)[0].target;
      this.designPaper = paper;
      this.designTarget.click((event) => {
        if ($(event.target).closest("td").length) return;
        hinnn.event.trigger(this.getPrintElementSelectEventKey(), { printElement: this, selectionKind: "element" });
      });
      this.designTarget.find("td").hidroppable({
        accept: ".rn-draggable-item",
        /**
         * 中文说明：处理drop事件，驱动打印元素中的拖拽、编辑或菜单行为。
         */
        onDrop(_target, _source) {
        },
        /**
         * 中文说明：处理drag enter事件，驱动打印元素中的拖拽、编辑或菜单行为。
         */
        onDragEnter(_target, source2) {
          $(source2).removeClass("rn-draggable-item");
        },
        /**
         * 中文说明：处理drag leave事件，驱动打印元素中的拖拽、编辑或菜单行为。
         */
        onDragLeave(_target, source2) {
          $(source2).addClass("rn-draggable-item");
        }
      });
      this.bindColumnHeaderEvents();
      return this.designTarget;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getConfigOptions() {
      return HiPrintConfig.instance.tableCustom;
    }
    getColumnByIndex(index) {
      const numericIndex = parseInt(index, 10);
      if (Number.isNaN(numericIndex)) return void 0;
      return TableExcelHelper.reconsitutionTableColumnTree(this.columns).rowColumns[numericIndex];
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    createTarget(_title, data, printData) {
      const target = $('<div class="hiprint-printElement hiprint-printElement-table" style="position: absolute;"><div class="hiprint-printElement-table-handle"></div><div class="hiprint-printElement-table-content" style="height:100%;width:100%"></span></div>');
      target.find(".hiprint-printElement-table-content").append(this.getTableHtml(data, printData));
      return target;
    }
    /**
     * 中文说明：读取table html，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getTableHtml(data, printData) {
      const table = $('<table class="hiprint-printElement-tableTarget" style="border-collapse: collapse;width:100%;"></table>');
      table.append(TableExcelHelper.createTableHead(this.columns, this.options.getWidth()));
      table.append(TableExcelHelper.createTableRow(this.columns, data, this.options, this.printElementType));
      if (this.getFooterFormatter()) {
        if (this.options.tableFooterRepeat === "no") ;
        else if (this.options.tableFooterRepeat === "last") {
          table.find("tbody").append(TableExcelHelper.createTableFooter(this.columns, data, this.options, this.getFooterContext(), printData, data).html());
        } else {
          table.append(TableExcelHelper.createTableFooter(this.columns, data, this.options, this.getFooterContext(), printData, []));
        }
      }
      return table;
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getHtml(paper, printData) {
      this.setCurrenttemplateData(printData);
      this.createTempContainer();
      const result = this.getPaperHtmlResult(paper, printData);
      this.removeTempContainer();
      return result;
    }
    /**
     * 中文说明：读取paper html result，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getPaperHtmlResult(paper, printData) {
      const results = [];
      const data = this.getData(printData);
      const table = this.getTableHtml(data, printData);
      const emptyTarget = this.createTarget(this.printElementType.title, [], printData);
      printData ? this.updateTargetWidth(emptyTarget) : this.updateTargetSize(emptyTarget);
      this.css(emptyTarget, data);
      this.css(table, data);
      this.getTempContainer().html("");
      this.getTempContainer().append(emptyTarget);
      let printTopInPaper;
      let beginTop = this.getBeginPrintTopInPaperByReferenceElement(paper);
      let paperIndex = 0;
      let isEnd = false;
      while (!isEnd) {
        let remainingFirstPageHeight = 0;
        let paperFooter = paper.getPaperFooter(paperIndex);
        if (paperIndex === 0 && beginTop > paperFooter) {
          beginTop = beginTop - paperFooter + paper.paperHeader;
          results.push(new PaperHtmlResult({ target: void 0, printLine: void 0, referenceElement: void 0 }));
          paperIndex += 1;
          remainingFirstPageHeight = paper.getContentHeight(paperIndex) - (beginTop - paper.paperHeader);
          paperFooter = paper.getPaperFooter(paperIndex);
        }
        const previousTarget = results.length > 0 ? results[results.length - 1].target : void 0;
        const rows = this.getRowsInSpecificHeight(remainingFirstPageHeight > 0 ? remainingFirstPageHeight : paperIndex === 0 ? paperFooter - beginTop : paper.getContentHeight(paperIndex), emptyTarget, table, paperIndex, previousTarget, printData);
        isEnd = rows.isEnd;
        let printLine = void 0;
        if (rows.target) {
          rows.target.css("left", this.options.displayLeft());
          rows.target[0].height = "";
        }
        if (paperIndex === 0 || remainingFirstPageHeight > 0) {
          if (rows.target) {
            printTopInPaper = beginTop;
            rows.target.css("top", beginTop + "pt");
          }
          printLine = isEnd && this.options.lHeight != null ? beginTop + (rows.height > this.options.lHeight ? rows.height : this.options.lHeight) : beginTop + rows.height;
        } else {
          if (rows.target) {
            printTopInPaper = paper.paperHeader;
            rows.target.css("top", paper.paperHeader + "pt");
          }
          printLine = paper.paperHeader + rows.height;
        }
        results.push(new PaperHtmlResult({
          target: rows.target,
          printLine,
          referenceElement: new PrintReferenceElement({
            top: this.options.getTop(),
            left: this.options.getLeft(),
            height: this.options.getHeight(),
            width: this.options.getWidth(),
            beginPrintPaperIndex: paper.index,
            bottomInLastPaper: printLine,
            printTopInPaper,
            endPrintPaperIndex: void 0
          })
        }));
        paperIndex += 1;
      }
      return results;
    }
    /**
     * 中文说明：读取rows in specific height，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getRowsInSpecificHeight(height, emptyTarget, table, _paperIndex, previousTarget, printData) {
      let result = void 0;
      const tbody = table.find("tbody");
      const heightPx = hinnn.pt.toPx(height);
      emptyTarget.find("tbody").html("");
      for (let currentHeight = emptyTarget.outerHeight(), rowsData = []; ; ) {
        if (currentHeight <= heightPx) {
          if (tbody.find("tr").length === 0) {
            if (printData && this.options.autoCompletion) {
              this.autoCompletion(heightPx, emptyTarget);
              currentHeight = emptyTarget.outerHeight();
            }
            result = { target: emptyTarget.clone(), length: emptyTarget.find("tbody tr").length, height: hinnn.px.toPt(currentHeight), isEnd: true };
            if (emptyTarget.find("tbody tr").length === 0 && previousTarget) result = { target: void 0, length: 0, height: 0, isEnd: true };
          } else {
            const row = tbody.find("tr:lt(1)");
            emptyTarget.find("tbody").append(row);
            currentHeight = emptyTarget.outerHeight();
            const rowData = row.data("rowData");
            rowsData.push(rowData);
            if (currentHeight > heightPx) {
              tbody.prepend(row);
              rowsData.pop();
              currentHeight = emptyTarget.outerHeight();
              result = { target: emptyTarget.clone(), length: emptyTarget.find("tbody tr").length, height: hinnn.px.toPt(currentHeight), isEnd: false };
            }
          }
        } else result = { target: void 0, length: 0, height: 0, isEnd: false };
        if (result) {
          if (this.getFooterFormatter() && emptyTarget.find("tfoot")) result.target.find("tfoot").html(TableExcelHelper.createTableFooter(this.columns, this.getData(printData), this.options, this.getFooterContext(), printData, rowsData).html());
          break;
        }
      }
      return result;
    }
    getFooterContext() {
      return { ...this.printElementType, columns: this.columns };
    }
    getFooterFormatter() {
      return TableExcelHelper.getFooterFormatter(this.options, this.getFooterContext());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getData(printData) {
      if (!printData) return [{}];
      const boundValue = this.getDataBindingValue(printData);
      const data = boundValue.found ? boundValue.value : printData[this.getField()];
      return cloneRows(data);
    }
    /**
     * 中文说明：按表格配置自动补齐行或列，保证打印表格数据不足时仍保持模板结构。
     */
    autoCompletion(heightPx, target) {
      let row;
      const emptyRow = this.getEmptyRowTarget();
      let currentHeight = target.outerHeight();
      for (; heightPx > currentHeight; ) {
        row = emptyRow.clone();
        target.find("tbody").append(row);
        currentHeight = target.outerHeight();
      }
      if (row) row.remove();
    }
    /**
     * 中文说明：读取empty row target，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getEmptyRowTarget() {
      return TableExcelHelper.createEmptyRowTarget(this.columns);
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    onResize(_event, height, width, top, left) {
      super.updateSizeAndPositionOptions(left, top, width, height);
      TableExcelHelper.resizeTableCellWidth(this.designTarget, this.columns, this.options.getWidth());
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getReizeableShowPoints() {
      return ["s", "e"];
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    design(designOptions, paper) {
      this.designTarget.hidraggable({
        handle: this.designTarget.find(".hiprint-printElement-table-handle"),
        axis: this.options.axis && designOptions && designOptions.axisEnabled ? this.options.axis : void 0,
        onDrag: (_event, left, top) => {
          this.updateSizeAndPositionOptions(left, top);
          this.createLineOfPosition(paper);
        },
        moveUnit: "pt",
        minMove: HiPrintConfig.instance.movingDistance,
        onBeforeDrag: (_event) => {
          HiPrintlib.instance.draging = true;
          this.createLineOfPosition(paper);
        },
        onStopDrag: (_event) => {
          HiPrintlib.instance.draging = false;
          this.removeLineOfPosition();
        }
      });
      this.setHiReizeable();
      this.designTarget.hireizeable({
        showPoints: this.getReizeableShowPoints(),
        noContainer: true,
        onBeforeResize: () => {
          HiPrintlib.instance.draging = true;
        },
        onResize: (event, height, width, top, left) => {
          this.onResize(event, height, width, top, left);
          this.hitable.updateColumnGrips();
          this.createLineOfPosition(paper);
        },
        onStopResize: () => {
          HiPrintlib.instance.draging = false;
          this.removeLineOfPosition();
        }
      });
      this.bingKeyboardMoveEvent(this.designTarget, paper);
    }
    /**
     * 中文说明：设置hi reizeable，同步打印元素配置并影响后续显示或打印结果。
     */
    setHiReizeable() {
      this.hitable = new HiTale({
        table: this.designTarget.find("table"),
        rows: this.columns,
        resizeRow: false,
        resizeColumn: true,
        trs: $(this.designTarget).find("tbody tr"),
        handle: this.designTarget.find("table thead"),
        columnDisplayEditable: true,
        columnDisplayIndexEditable: true,
        columnResizable: true,
        columnAlignEditable: true,
        isEnableEdit: true,
        isEnableEditText: true,
        isEnableEditField: false,
        isEnableContextMenu: true,
        isEnableInsertRow: true,
        isEnableDeleteRow: true,
        isEnableInsertColumn: true,
        isEnableDeleteColumn: true,
        isEnableMergeCell: true
      });
      hinnn.event.on("updateTable" + this.hitable.id, () => {
        this.updateDesignViewFromOptions();
      });
    }
  }
  class BuiltinPrintElementTypeEntity {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(source2) {
      this.field = source2.field;
      this.title = source2.title;
      this.type = source2.type;
      this.columns = source2.columns;
    }
  }
  class TableBuiltinPrintElementType {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(source2) {
      this.text = source2.text;
      this.field = source2.field;
      this.fields = source2.fields;
      this.title = source2.title;
      this.tid = source2.tid;
      this.data = source2.data;
      this.styler = source2.styler;
      this.formatter = source2.formatter;
      this.type = source2.type;
      this.options = source2.options;
      this.editable = source2.editable;
      this.columnDisplayEditable = source2.columnDisplayEditable;
      this.columnDisplayIndexEditable = source2.columnDisplayIndexEditable;
      this.columnTitleEditable = source2.columnTitleEditable;
      this.columnResizable = source2.columnResizable;
      this.columnAlignEditable = source2.columnAlignEditable;
      this.columns = [];
      (source2.columns || []).forEach((row) => {
        this.columns.push(this.createTableColumnArray(row));
      });
      this.rowStyler = source2.rowStyler;
      this.striped = source2.striped;
      this.groupFields = source2.groupFields || [];
      this.groupFormatter = source2.groupFormatter;
      this.groupFooterFormatter = source2.groupFooterFormatter;
      this.footerFormatter = source2.footerFormatter;
      this.gridColumnsFooterFormatter = source2.gridColumnsFooterFormatter;
    }
    /**
     * 中文说明：读取text，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getText() {
      return this.text || this.title || "";
    }
    /**
     * 中文说明：创建print element，供打印元素在设计器或打印渲染流程中使用。
     */
    createPrintElement(options2) {
      if (this.columns && this.columns.length === 0) {
        (options2.columns || []).forEach((row) => {
          this.columns.push(this.createTableColumnArray(row));
        });
      }
      return new TablePrintElement(this, options2);
    }
    /**
     * 中文说明：读取data，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getData() {
      return [{}];
    }
    /**
     * 中文说明：创建table column array，供打印元素在设计器或打印渲染流程中使用。
     */
    createTableColumnArray(row) {
      const columns = [];
      row.forEach((column2) => {
        columns.push(new TableColumn(column2));
      });
      return columns;
    }
    /**
     * 中文说明：读取print element type entity，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getPrintElementTypeEntity() {
      return new BuiltinPrintElementTypeEntity({ title: this.title, type: this.type });
    }
    /**
     * 中文说明：读取fields，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getFields() {
      return this.fields;
    }
    /**
     * 中文说明：读取options，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getOptions() {
      return this.options || {};
    }
  }
  class BasicPrintElementType {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(source2) {
      this.field = source2.field;
      this.fields = source2.fields;
      this.title = source2.title;
      this.text = source2.text;
      this.tid = source2.tid;
      this.data = source2.data;
      this.styler = source2.styler;
      this.formatter = source2.formatter;
      this.type = source2.type;
      this.onRendered = source2.onRendered;
      this.render = source2.render;
      this.renderDesign = source2.renderDesign;
      this.options = source2.options;
    }
    /**
     * 中文说明：读取text，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getText(design) {
      return design ? this.title || this.text || "" : this.text || this.title || "";
    }
    /**
     * 中文说明：读取data，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getData() {
      return this.data;
    }
    /**
     * 中文说明：创建print element，供打印元素在设计器或打印渲染流程中使用。
     */
    createPrintElement(options2) {
      const mergedOptions = {};
      $.extend(mergedOptions, this.options || {});
      $.extend(mergedOptions, options2 || {});
      return BuiltinPrintElementFactory.createPrintElement(this, mergedOptions);
    }
    /**
     * 中文说明：读取print element type entity，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getPrintElementTypeEntity() {
      return new BuiltinPrintElementTypeEntity({ title: this.title, type: this.type });
    }
    /**
     * 中文说明：读取fields，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getFields() {
      return this.fields;
    }
    /**
     * 中文说明：读取options，为打印元素的布局计算、序列化或渲染提供数据。
     */
    getOptions() {
      return this.options || {};
    }
  }
  class TableCustomBuiltinPrintElementType extends TableBuiltinPrintElementType {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(source2) {
      super(source2);
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    createPrintElement(options2) {
      return new TableCustomPrintElement(this, options2);
    }
  }
  class TextBuiltinPrintElementType extends BasicPrintElementType {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(source2) {
      super(source2);
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    createPrintElement(options2) {
      const mergedOptions = {};
      $.extend(mergedOptions, this.options || {});
      $.extend(mergedOptions, options2 || {});
      return BuiltinPrintElementFactory.createPrintElement(this, mergedOptions);
    }
    /**
     * 中文说明：处理打印元素的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getPrintElementTypeEntity() {
      return new BuiltinPrintElementTypeEntity({ title: this.title, type: this.type });
    }
  }
  class BuiltinPrintElementFactory {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
    }
    /**
     * 中文说明：创建print element，供打印元素在设计器或打印渲染流程中使用。
     */
    static createPrintElement(printElementType, options2) {
      return printElementType.type === "text" ? new TextPrintElement(printElementType, options2) : printElementType.type === "image" ? new ImagePrintElement(printElementType, options2) : printElementType.type === "longText" ? new LongTextPrintElement(printElementType, options2) : printElementType.type === "custom" ? new CustomPrintElement(printElementType, options2) : printElementType.type === "vline" ? new VLinePrintElement(printElementType, options2) : printElementType.type === "hline" ? new HLinePrintElement(printElementType, options2) : printElementType.type === "rect" ? new RectPrintElement(printElementType, options2) : printElementType.type === "oval" ? new OvalPrintElement(printElementType, options2) : void 0;
    }
  }
  class BuiltinPrintElementTypeFactory {
    /**
     * 中文说明：初始化打印元素对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
    }
    /**
     * 中文说明：创建print element type，供打印元素在设计器或打印渲染流程中使用。
     */
    static createPrintElementType(source2) {
      source2.type = source2.type || "text";
      if (!BuiltinPrintElementTypeFactory.isSupportedType(source2.type)) return void 0;
      return source2.type === "text" ? new TextBuiltinPrintElementType(source2) : source2.type === "tableCustom" ? new TableCustomBuiltinPrintElementType(source2) : new BasicPrintElementType(source2);
    }
    /**
     * 中文说明：判断元素类型是否仍属于当前版本支持范围，已移除类型不再创建兜底实例。
     */
    static isSupportedType(type) {
      return [
        "text",
        "image",
        "longText",
        "custom",
        "vline",
        "hline",
        "rect",
        "oval",
        "tableCustom"
      ].includes(String(type));
    }
  }
  function getJQuery() {
    const candidate = globalThis.$ ?? globalThis.jQuery;
    if (!candidate) throw new Error("运行时依赖缺失：jQuery global is required by print element type facade");
    return candidate;
  }
  function createPaletteDragProxy(source2) {
    const $2 = getJQuery();
    const label = ($2(source2).text() || "").toString().trim() || "元素";
    return $2(`<div class="hiprint-drag-proxy">${label}</div>`).appendTo("body").css({
      position: "absolute",
      "z-index": 9999,
      width: "72px",
      height: "32px",
      padding: "0 10px",
      border: "1px solid #2563eb",
      "border-radius": "4px",
      background: "#eff6ff",
      color: "#1d4ed8",
      "font-size": "12px",
      "font-weight": 600,
      "line-height": "30px",
      "text-align": "center",
      "box-shadow": "0 8px 18px rgba(37, 99, 235, 0.18)",
      "pointer-events": "none",
      overflow: "hidden",
      "white-space": "nowrap",
      "text-overflow": "ellipsis"
    });
  }
  const _ModuleLocalPrintElementTypeManager = class _ModuleLocalPrintElementTypeManager {
    /**
     * 中文说明：初始化hiprint 门面对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
      /**
       * 中文说明：处理hiprint 门面的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
       */
      __publicField(this, "allElementTypes");
      this.allElementTypes = [];
    }
    /**
     * 中文说明：返回打印元素类型管理器单例，统一维护可拖入设计器的元素类型。
     */
    static get instance() {
      if (!this._instance) this._instance = new _ModuleLocalPrintElementTypeManager();
      return this._instance;
    }
    /**
     * 中文说明：添加print element types，扩展hiprint 门面的元素、样式或交互能力。
     */
    addPrintElementTypes(moduleName, groups) {
      const formattedModule = moduleName;
      this[formattedModule] ? this[formattedModule] = this[formattedModule].concat(groups) : this[formattedModule] = groups;
      groups.forEach((group) => {
        this.allElementTypes = this.allElementTypes.concat(group.printElementTypes);
      });
    }
    /**
     * 中文说明：读取element type groups，为hiprint 门面的布局计算、序列化或渲染提供数据。
     */
    getElementTypeGroups(moduleName) {
      return this[this.formatterModule(moduleName)] || [];
    }
    /**
     * 中文说明：读取element type，为hiprint 门面的布局计算、序列化或渲染提供数据。
     */
    getElementType(tid) {
      const elementTypes = this.allElementTypes.filter((elementType) => elementType.tid == tid);
      if (elementTypes.length > 0) return elementTypes[0];
      return void 0;
    }
    /**
     * 中文说明：构造元素类型格式化模块，把配置中的函数字符串转成运行时函数。
     */
    formatterModule(moduleName) {
      return moduleName || "_default";
    }
  };
  /**
   * 中文说明：处理hiprint 门面的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
   */
  __publicField(_ModuleLocalPrintElementTypeManager, "_instance");
  let ModuleLocalPrintElementTypeManager = _ModuleLocalPrintElementTypeManager;
  const moduleLocalPrintElementTypeManager = ModuleLocalPrintElementTypeManager.instance;
  class PrintElementTypeHtmlFactory {
    /**
     * 中文说明：初始化hiprint 门面对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
    }
    /**
     * 中文说明：创建print element type html，供hiprint 门面在设计器或打印渲染流程中使用。
     */
    createPrintElementTypeHtml(target, groups) {
      const $2 = getJQuery();
      const list = $2('<ul class="hiprint-printElement-type"></ul>');
      groups.forEach((group) => {
        const groupItem = $2("<li></li>");
        groupItem.append('<span class="title hiprint-printElement-type-group">' + group.name + "</span>");
        const childList = $2("<ul></ul>");
        groupItem.append(childList);
        group.printElementTypes.forEach((elementType) => {
          childList.append('<li><a class="ep-draggable-item" tid="' + elementType.tid + '">  ' + elementType.getText() + " </a></li>");
        });
        list.append(groupItem);
      });
      $2(target).append(list);
      return list.find(".ep-draggable-item");
    }
  }
  class PrintElementTypeEntity {
    /**
     * 中文说明：初始化hiprint 门面对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(entity) {
      this.field = entity.field;
      this.title = entity.title;
      this.type = entity.type;
      this.columns = entity.columns;
    }
  }
  function createConcretePrintElement(printElementType, options2) {
    return BuiltinPrintElementFactory.createPrintElement(printElementType, options2);
  }
  class SimplePrintElementType {
    /**
     * 中文说明：初始化hiprint 门面对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(input) {
      this.field = input.field;
      this.fields = input.fields;
      this.title = input.title;
      this.text = input.text;
      this.tid = input.tid;
      this.data = input.data;
      this.styler = input.styler;
      this.formatter = input.formatter;
      this.type = input.type;
      this.onRendered = input.onRendered;
      this.render = input.render;
      this.renderDesign = input.renderDesign;
      this.options = input.options;
    }
    /**
     * 中文说明：读取text，为hiprint 门面的布局计算、序列化或渲染提供数据。
     */
    getText(preferTitle) {
      return preferTitle ? this.title || this.text || "" : this.text || this.title || "";
    }
    /**
     * 中文说明：读取data，为hiprint 门面的布局计算、序列化或渲染提供数据。
     */
    getData() {
      return this.data;
    }
    /**
     * 中文说明：创建print element，供hiprint 门面在设计器或打印渲染流程中使用。
     */
    createPrintElement(options2) {
      const $2 = getJQuery();
      const merged = {};
      $2.extend(merged, this.options || {});
      $2.extend(merged, options2 || {});
      return createConcretePrintElement(this, merged);
    }
    /**
     * 中文说明：读取print element type entity，为hiprint 门面的布局计算、序列化或渲染提供数据。
     */
    getPrintElementTypeEntity() {
      return new PrintElementTypeEntity({
        title: this.title,
        type: this.type
      });
    }
    /**
     * 中文说明：读取fields，为hiprint 门面的布局计算、序列化或渲染提供数据。
     */
    getFields() {
      return this.fields;
    }
    /**
     * 中文说明：读取options，为hiprint 门面的布局计算、序列化或渲染提供数据。
     */
    getOptions() {
      return this.options || {};
    }
  }
  class TablePrintElementType {
    /**
     * 中文说明：初始化hiprint 门面对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(input) {
      this.text = input.text;
      this.field = input.field;
      this.fields = input.fields;
      this.title = input.title;
      this.tid = input.tid;
      this.data = input.data;
      this.styler = input.styler;
      this.formatter = input.formatter;
      this.type = input.type;
      this.options = input.options;
      this.editable = input.editable;
      this.columnDisplayEditable = input.columnDisplayEditable;
      this.columnDisplayIndexEditable = input.columnDisplayIndexEditable;
      this.columnTitleEditable = input.columnTitleEditable;
      this.columnResizable = input.columnResizable;
      this.columnAlignEditable = input.columnAlignEditable;
      this.columns = [];
      (input.columns || []).forEach((columnRow) => {
        this.columns.push(this.createTableColumnArray(columnRow));
      });
      this.rowStyler = input.rowStyler;
      this.striped = input.striped;
      this.groupFields = input.groupFields || [];
      this.groupFormatter = input.groupFormatter;
      this.groupFooterFormatter = input.groupFooterFormatter;
      this.footerFormatter = input.footerFormatter;
      this.gridColumnsFooterFormatter = input.gridColumnsFooterFormatter;
    }
    /**
     * 中文说明：读取text，为hiprint 门面的布局计算、序列化或渲染提供数据。
     */
    getText() {
      return this.text || this.title || "";
    }
    /**
     * 中文说明：创建print element，供hiprint 门面在设计器或打印渲染流程中使用。
     */
    createPrintElement(options2) {
      const $2 = getJQuery();
      const merged = {};
      $2.extend(merged, this.options || {});
      $2.extend(merged, options2 || {});
      if (this.columns && this.columns.length == 0) {
        (merged.columns || []).forEach((columnRow) => {
          this.columns.push(this.createTableColumnArray(columnRow));
        });
      }
      return new TablePrintElement(this, merged);
    }
    /**
     * 中文说明：读取data，为hiprint 门面的布局计算、序列化或渲染提供数据。
     */
    getData() {
      return [{}];
    }
    /**
     * 中文说明：创建table column array，供hiprint 门面在设计器或打印渲染流程中使用。
     */
    createTableColumnArray(columns) {
      const tableColumns = [];
      columns.forEach((column2) => {
        tableColumns.push(new TableColumn(column2));
      });
      return tableColumns;
    }
    /**
     * 中文说明：读取print element type entity，为hiprint 门面的布局计算、序列化或渲染提供数据。
     */
    getPrintElementTypeEntity() {
      return new PrintElementTypeEntity({
        title: this.title,
        type: this.type
      });
    }
    /**
     * 中文说明：读取fields，为hiprint 门面的布局计算、序列化或渲染提供数据。
     */
    getFields() {
      return this.fields;
    }
    /**
     * 中文说明：读取options，为hiprint 门面的布局计算、序列化或渲染提供数据。
     */
    getOptions() {
      return this.options || {};
    }
  }
  class TableCustomPrintElementType extends TablePrintElementType {
    /**
     * 中文说明：初始化hiprint 门面对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(input) {
      super(input);
    }
    /**
     * 中文说明：处理hiprint 门面的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    createPrintElement(options2) {
      const $2 = getJQuery();
      const merged = {};
      $2.extend(merged, this.options || {});
      $2.extend(merged, options2 || {});
      return new TableCustomPrintElement(this, merged);
    }
  }
  class TextPrintElementType extends SimplePrintElementType {
    /**
     * 中文说明：初始化hiprint 门面对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(input) {
      super(input);
    }
    /**
     * 中文说明：处理hiprint 门面的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    createPrintElement(options2) {
      const $2 = getJQuery();
      const merged = {};
      $2.extend(merged, this.options || {});
      $2.extend(merged, options2 || {});
      return createConcretePrintElement(this, merged);
    }
    /**
     * 中文说明：处理hiprint 门面的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    getPrintElementTypeEntity() {
      return new PrintElementTypeEntity({
        title: this.title,
        type: this.type
      });
    }
  }
  let PrintElementTypeFactory$1 = class PrintElementTypeFactory {
    /**
     * 中文说明：创建print element type，供hiprint 门面在设计器或打印渲染流程中使用。
     */
    static createPrintElementType(input) {
      input.type = input.type || "text";
      if (!BuiltinPrintElementTypeFactory.isSupportedType(input.type)) return void 0;
      return input.type == "text" ? new TextPrintElementType(input) : input.type == "tableCustom" ? new TableCustomPrintElementType(input) : new SimplePrintElementType(input);
    }
  };
  class PrintElementTypeManager {
    /**
     * 中文说明：初始化hiprint 门面对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
    }
    static addPrintElementTypes(moduleName, groups) {
      ModuleLocalPrintElementTypeManager.instance.addPrintElementTypes(moduleName, groups);
    }
    /**
     * 中文说明：读取element type groups，为hiprint 门面的布局计算、序列化或渲染提供数据。
     */
    static getElementTypeGroups(moduleName) {
      const formattedModule = this.formatterModule(moduleName);
      return ModuleLocalPrintElementTypeManager.instance[formattedModule] || [];
    }
    /**
     * 中文说明：读取element type，为hiprint 门面的布局计算、序列化或渲染提供数据。
     */
    static getElementType(tid, type) {
      if (tid) return ModuleLocalPrintElementTypeManager.instance.getElementType(tid);
      PrintElementTypeFactory$1.createPrintElementType({ type });
      return void 0;
    }
    /**
     * 中文说明：组装build，把模板配置转换为hiprint 门面可用的结构。
     */
    static build(target, moduleName) {
      const formattedModule = this.formatterModule(moduleName);
      const elementTypes = new PrintElementTypeHtmlFactory().createPrintElementTypeHtml(target, this.getElementTypeGroups(formattedModule));
      this.enableDrag(elementTypes);
    }
    /**
     * 中文说明：组装by html，把模板配置转换为hiprint 门面可用的结构。
     */
    static buildByHtml(target) {
      this.enableDrag(target);
    }
    /**
     * 中文说明：为元素类型面板启用拖拽，让用户可把元素拖入打印设计区域。
     */
    static enableDrag(target) {
      const $2 = getJQuery();
      target.hidraggable({
        revert: true,
        /**
         * 中文说明：生成拖拽代理元素，让元素类型从面板拖入设计区域时可预览位置。
         */
        proxy(_event) {
          return createPaletteDragProxy(this);
        },
        moveUnit: "pt",
        minMove: 4,
        /**
         * 中文说明：在hiprint 门面操作开始前执行校验，必要时阻止后续交互。
         */
        onBeforeDrag(event) {
          HiPrintlib.instance.draging = true;
          const printElementType = PrintElementTypeManager.getElementType($2(event.data.target).attr("tid"), $2(event.data.target).attr("ptype"));
          return HiPrintlib.instance.setDragingPrintElement(printElementType.createPrintElement()), true;
        },
        /**
         * 中文说明：处理drag事件，驱动hiprint 门面中的拖拽、编辑或菜单行为。
         */
        onDrag(_event, left, top) {
          var _a;
          (_a = HiPrintlib.instance.getDragingPrintElement()) == null ? void 0 : _a.updatePosition(left, top);
        },
        /**
         * 中文说明：处理stop drag事件，驱动hiprint 门面中的拖拽、编辑或菜单行为。
         */
        onStopDrag(_event) {
          HiPrintlib.instance.draging = false;
        }
      });
    }
    /**
     * 中文说明：构造元素类型格式化模块，把配置中的函数字符串转成运行时函数。
     */
    static formatterModule(moduleName) {
      return moduleName || "_default";
    }
  }
  class PrintElementTypeGroup {
    /**
     * 中文说明：初始化hiprint 门面对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(name, printElementTypes) {
      this.name = name;
      this.printElementTypes = [];
      printElementTypes.forEach((printElementType) => {
        const resolvedPrintElementType = PrintElementTypeFactory$1.createPrintElementType(printElementType);
        if (resolvedPrintElementType) this.printElementTypes.push(resolvedPrintElementType);
      });
    }
  }
  const RULER_SIZE_PX = 16;
  const RULER_MAJOR_STEP_MM = 10;
  const RULER_MIDDLE_STEP_MM = 5;
  const RULER_Z_INDEX = 20;
  class PrintPaper {
    /**
     * 中文说明：初始化打印模板对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(templateId, widthMm, heightMm, paperHeader, paperFooter, paperNumberLeft, paperNumberTop, paperNumberDisabled, paperNumberFormat, index, referenceElement) {
      this.defaultPaperNumberFormat = "paperNo-paperCount";
      this.printLine = 0;
      this.templateId = templateId;
      this.width = hinnn.mm.toPt(widthMm);
      this.height = hinnn.mm.toPt(heightMm);
      this.mmwidth = widthMm;
      this.mmheight = heightMm;
      this.paperHeader = paperHeader;
      this.paperFooter = paperFooter;
      this.contentHeight = paperFooter - paperHeader;
      this.createTarget();
      this.index = index;
      this.paperNumberLeft = paperNumberLeft || parseInt((this.width - 30).toString());
      this.paperNumberTop = paperNumberTop || parseInt((this.height - 22).toString());
      this.paperNumberDisabled = paperNumberDisabled;
      this.paperNumberFormat = paperNumberFormat;
      this.referenceElement = referenceElement ? $.extend({}, referenceElement) : new PrintReferenceElement({
        top: 0,
        left: 0,
        height: 0,
        width: 0,
        bottomInLastPaper: 0,
        beginPrintPaperIndex: 0,
        printTopInPaper: 0,
        endPrintPaperIndex: 0
      });
    }
    /**
     * 中文说明：处理纸张页面信息，支撑打印模板分页、页眉页脚和打印定位。
     */
    subscribePaperBaseInfoChanged(callback) {
      this.onPaperBaseInfoChanged = callback;
    }
    /**
     * 中文说明：处理纸张页面信息，支撑打印模板分页、页眉页脚和打印定位。
     */
    triggerOnPaperBaseInfoChanged() {
      if (this.onPaperBaseInfoChanged) {
        this.onPaperBaseInfoChanged({
          paperHeader: this.paperHeader,
          paperFooter: this.paperFooter,
          paperNumberLeft: this.paperNumberLeft,
          paperNumberTop: this.paperNumberTop,
          paperNumberDisabled: this.paperNumberDisabled,
          paperNumberFormat: this.paperNumberFormat
        });
      }
    }
    /**
     * 中文说明：设置footer，同步打印模板配置并影响后续显示或打印结果。
     */
    setFooter(firstPaperFooter, evenPaperFooter, oddPaperFooter, lastPaperFooter) {
      this.firstPaperFooter = firstPaperFooter;
      this.evenPaperFooter = evenPaperFooter;
      this.oddPaperFooter = oddPaperFooter;
      this.lastPaperFooter = lastPaperFooter;
    }
    /**
     * 中文说明：设置offset，同步打印模板配置并影响后续显示或打印结果。
     */
    setOffset(leftOffset, topOffset) {
      this.setLeftOffset(leftOffset);
      this.setTopOffset(topOffset);
    }
    /**
     * 中文说明：设置left offset，同步打印模板配置并影响后续显示或打印结果。
     */
    setLeftOffset(leftOffset) {
      leftOffset ? this.paperContentTarget.css("left", `${leftOffset}pt`) : this.paperContentTarget[0].style.left = "";
    }
    /**
     * 中文说明：设置top offset，同步打印模板配置并影响后续显示或打印结果。
     */
    setTopOffset(topOffset) {
      topOffset ? this.paperContentTarget.css("top", `${topOffset}pt`) : this.paperContentTarget[0].style.top = "";
    }
    /**
     * 中文说明：创建target，供打印模板在设计器或打印渲染流程中使用。
     */
    createTarget() {
      this.target = $('<div class="hiprint-printPaper"><div class="hiprint-printPaper-content"></div></div>');
      this.paperContentTarget = this.target.find(".hiprint-printPaper-content");
      this.target.css("position", "relative");
      this.target.css("width", `${this.mmwidth}mm`);
      this.target.css("height", `${this.mmheight - HiPrintConfig.instance.paperHeightTrim}mm`);
      this.target.attr("original-height", this.mmheight);
    }
    /**
     * 中文说明：创建header line，供打印模板在设计器或打印渲染流程中使用。
     */
    createHeaderLine() {
      this.headerLinetarget = $('<div class="hiprint-headerLine"  style="position: absolute;width: 100%;border-top: 1px dashed #c9bebe;height: 7pt;"></div>');
      this.headerLinetarget.css("top", `${this.paperHeader || -1}pt`);
      if (this.paperHeader === 0) this.headerLinetarget.addClass("hideheaderLinetarget");
      this.paperContentTarget.append(this.headerLinetarget);
      this.dragHeadLineOrFootLine(this.headerLinetarget, (_left, top) => {
        this.paperHeader = top;
        this.triggerOnPaperBaseInfoChanged();
      });
    }
    /**
     * 中文说明：创建footer line，供打印模板在设计器或打印渲染流程中使用。
     */
    createFooterLine() {
      this.footerLinetarget = $('<div class="hiprint-footerLine"  style="position: absolute;width: 100%;border-top: 1px dashed #c9bebe;height: 7pt;"></div>');
      this.footerLinetarget.css("top", `${parseInt(this.paperFooter.toString())}pt`);
      if (this.paperFooter === this.height) {
        this.footerLinetarget.css("top", `${this.mmheight - HiPrintConfig.instance.paperHeightTrim}mm`);
        this.footerLinetarget.addClass("hidefooterLinetarget");
      }
      this.paperContentTarget.append(this.footerLinetarget);
      this.dragHeadLineOrFootLine(this.footerLinetarget, (_left, top) => {
        this.paperFooter = top;
        this.triggerOnPaperBaseInfoChanged();
      });
    }
    /**
     * 中文说明：创建paper number，供打印模板在设计器或打印渲染流程中使用。
     */
    createPaperNumber(text) {
      const existing = this.target.find(".hiprint-paperNumber");
      if (existing.length) return existing.html(text), existing;
      const paperNumber = $(`<span class="hiprint-paperNumber"  style="position: absolute">${text}</span>`);
      paperNumber.css("top", `${this.paperNumberTop}pt`);
      paperNumber.css("left", `${this.paperNumberLeft}pt`);
      this.paperContentTarget.append(paperNumber);
      this.dragHeadLineOrFootLine(paperNumber, (left, top) => {
        this.paperNumberTop = top;
        this.paperNumberLeft = left;
        this.triggerOnPaperBaseInfoChanged();
      }, true);
      return paperNumber;
    }
    /**
     * 中文说明：读取target，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getTarget() {
      return this.target;
    }
    /**
     * 中文说明：把纸张页面 DOM 追加到容器中，建立打印面板的页面结构。
     */
    append(target) {
      this.paperContentTarget.append(target);
    }
    /**
     * 中文说明：更新reference element，让打印模板的 DOM、尺寸或交互状态保持一致。
     */
    updateReferenceElement(referenceElement) {
      if (referenceElement) this.referenceElement = referenceElement;
    }
    /**
     * 中文说明：更新print line，让打印模板的 DOM、尺寸或交互状态保持一致。
     */
    updatePrintLine(printLine) {
      if (printLine >= this.printLine) this.printLine = printLine;
    }
    /**
     * 中文说明：进入设计模式，渲染可拖拽、可编辑的模板面板或纸张元素。
     */
    design(_options) {
      this.createHeaderLine();
      this.createFooterLine();
      this.target.addClass("design");
      this.paperNumberTarget = this.createPaperNumber(this.formatPaperNumber(1, 1));
      this.createRuler();
      this.resetPaperNumber(this.paperNumberTarget);
      $(this.paperNumberTarget).bind("dblclick.hiprint", () => {
        if (this.paperNumberDisabled == null) this.paperNumberDisabled = false;
        this.paperNumberDisabled = !this.paperNumberDisabled;
        this.resetPaperNumber(this.paperNumberTarget);
        this.triggerOnPaperBaseInfoChanged();
      });
      $(this.paperNumberTarget).bind("click.hiprint", () => {
        hinnn.event.trigger(`BuildCustomOptionSettingEventKey_${this.templateId}`, {
          options: {
            paperNumberFormat: this.paperNumberFormat,
            paperNumberDisabled: this.paperNumberDisabled
          },
          callback: (options2) => {
            this.paperNumberDisabled = !!options2.paperNumberDisabled || void 0;
            this.paperNumberFormat = options2.paperNumberFormat ? options2.paperNumberFormat : void 0;
            this.createPaperNumber(this.formatPaperNumber(1, 1));
            this.resetPaperNumber(this.paperNumberTarget);
            this.triggerOnPaperBaseInfoChanged();
          }
        });
      });
    }
    /**
     * 中文说明：处理纸张页面信息，支撑打印模板分页、页眉页脚和打印定位。
     */
    resetPaperNumber(target) {
      this.paperNumberDisabled ? target.addClass("hiprint-paperNumber-disabled") : target.removeClass("hiprint-paperNumber-disabled");
    }
    /**
     * 中文说明：更新paper number，让打印模板的 DOM、尺寸或交互状态保持一致。
     */
    updatePaperNumber(paperNo, paperCount, paperNumberToggleInEven) {
      const paperNumber = this.createPaperNumber(this.formatPaperNumber(paperNo, paperCount));
      this.paperNumberDisabled ? paperNumber.hide() : paperNumberToggleInEven && this.index % 2 === 1 && (paperNumber[0].style.left = "", paperNumber.css("right", `${this.paperNumberLeft}pt`));
    }
    /**
     * 中文说明：处理纸张页面信息，支撑打印模板分页、页眉页脚和打印定位。
     */
    formatPaperNumber(paperNo, paperCount) {
      return (this.paperNumberFormat ? this.paperNumberFormat : this.defaultPaperNumberFormat).replace("paperNo", paperNo.toString()).replace("paperCount", paperCount.toString());
    }
    /**
     * 中文说明：绑定页眉页脚参考线拖拽，用于在设计器中调整分页边界。
     */
    dragHeadLineOrFootLine(target, callback, freeAxis) {
      target.hidraggable({
        axis: freeAxis ? void 0 : "v",
        onDrag: (_event, left, top) => {
          callback(left, top);
        },
        moveUnit: "pt",
        minMove: HiPrintConfig.instance.movingDistance,
        onBeforeDrag: (_event) => {
          HiPrintlib.instance.draging = true;
        },
        onStopDrag: (_event) => {
          HiPrintlib.instance.draging = false;
          this.footerLinetarget.removeClass("hidefooterLinetarget");
          this.headerLinetarget.removeClass("hideheaderLinetarget");
        }
      });
    }
    /**
     * 中文说明：根据纸张或面板尺寸重新计算缩放与定位，保持设计器布局正确。
     */
    resize(widthMm, heightMm) {
      this.width = hinnn.mm.toPt(widthMm);
      this.height = hinnn.mm.toPt(heightMm);
      this.mmwidth = widthMm;
      this.mmheight = heightMm;
      this.target.css("width", `${widthMm}mm`);
      this.target.css("height", `${heightMm - HiPrintConfig.instance.paperHeightTrim}mm`);
      this.target.attr("original-height", this.mmheight);
      this.paperFooter = this.height;
      this.footerLinetarget.css("top", `${this.height}pt`);
      this.contentHeight = this.paperFooter - this.paperHeader;
      this.paperNumberLeft = parseInt((this.width - 30).toString());
      this.paperNumberTop = parseInt((this.height - 22).toString());
      this.paperNumberTarget.css("top", `${this.paperNumberTop}pt`);
      this.paperNumberTarget.css("left", `${this.paperNumberLeft}pt`);
      this.drawCurrentRuler();
      this.triggerOnPaperBaseInfoChanged();
    }
    /**
     * 中文说明：读取paper footer，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getPaperFooter(offset) {
      const pageIndex = this.index + offset;
      return pageIndex === 0 ? this.firstPaperFooter ? this.firstPaperFooter : this.oddPaperFooter ? this.oddPaperFooter : this.paperFooter : pageIndex % 2 === 0 ? this.oddPaperFooter ? this.oddPaperFooter : this.paperFooter : pageIndex % 2 === 1 ? this.evenPaperFooter ? this.evenPaperFooter : this.paperFooter : void 0;
    }
    /**
     * 中文说明：读取content height，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getContentHeight(offset) {
      return this.getPaperFooter(offset) - this.paperHeader;
    }
    /**
     * 中文说明：创建ruler，供打印模板在设计器或打印渲染流程中使用。
     */
    createRuler() {
      const existing = this.target.find(".hiprint_rul_wrapper");
      if (existing.length) existing.remove();
      const wrapper = $('<div class="hiprint_rul_wrapper"></div>');
      wrapper.css({
        position: "absolute",
        inset: "0",
        overflow: "visible",
        pointerEvents: "none",
        border: "0",
        margin: "0",
        padding: "0"
      });
      const horizontal = $('<canvas class="hiprint_rul_canvas hiprint_rul_canvas-horizontal"></canvas>');
      const vertical = $('<canvas class="hiprint_rul_canvas hiprint_rul_canvas-vertical"></canvas>');
      horizontal.css({
        position: "sticky",
        top: "0",
        marginLeft: `${RULER_SIZE_PX}px`,
        height: `${RULER_SIZE_PX}px`,
        width: `calc(100% - ${RULER_SIZE_PX}px)`,
        display: "block",
        zIndex: RULER_Z_INDEX
      });
      vertical.css({
        position: "sticky",
        left: "0",
        width: `${RULER_SIZE_PX}px`,
        height: `calc(100% - ${RULER_SIZE_PX}px)`,
        display: "block",
        zIndex: RULER_Z_INDEX
      });
      wrapper.append(horizontal, vertical);
      this.target.append(wrapper);
      this.rulerTarget = wrapper;
      this.drawCurrentRuler();
    }
    /**
     * 中文说明：绘制ruler，把纸张尺寸映射为毫米刻度，支持设计模式下的动态缩放显示。
     */
    drawRuler(canvas, orientation) {
      var _a, _b;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const fallbackWidth = hinnn.mm.toPx(this.mmwidth);
      const fallbackHeight = hinnn.mm.toPx(this.mmheight);
      const targetRect = (_b = (_a = this.target[0]) == null ? void 0 : _a.getBoundingClientRect) == null ? void 0 : _b.call(_a);
      const targetSize = orientation === "horizontal" ? Math.max((targetRect == null ? void 0 : targetRect.width) || 0, fallbackWidth) : Math.max((targetRect == null ? void 0 : targetRect.height) || 0, fallbackHeight);
      const pxPerMm = targetSize / (orientation === "horizontal" ? this.mmwidth : this.mmheight);
      const cssWidth = orientation === "horizontal" ? Math.max(((targetRect == null ? void 0 : targetRect.width) || fallbackWidth) - RULER_SIZE_PX, 1) : RULER_SIZE_PX;
      const cssHeight = orientation === "horizontal" ? RULER_SIZE_PX : Math.max(((targetRect == null ? void 0 : targetRect.height) || fallbackHeight) - RULER_SIZE_PX, 1);
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.ceil(cssWidth * ratio));
      canvas.height = Math.max(1, Math.ceil(cssHeight * ratio));
      canvas.style.width = `${Math.max(1, cssWidth)}px`;
      canvas.style.height = `${Math.max(1, cssHeight)}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.fillStyle = "#faf7f6";
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      ctx.strokeStyle = "#c9bebe";
      ctx.fillStyle = "#666";
      ctx.lineWidth = 1;
      ctx.font = "10px sans-serif";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      const drawTick = (positionMm, isMajor, isMiddle) => {
        const positionPx = positionMm * pxPerMm;
        const tickLength = isMajor ? 10 : isMiddle ? 7 : 4;
        ctx.beginPath();
        if (orientation === "horizontal") {
          ctx.moveTo(positionPx + 0.5, cssHeight);
          ctx.lineTo(positionPx + 0.5, cssHeight - tickLength);
        } else {
          ctx.moveTo(cssWidth, positionPx + 0.5);
          ctx.lineTo(cssWidth - tickLength, positionPx + 0.5);
        }
        ctx.stroke();
        if (isMajor) {
          const label = String(positionMm);
          if (orientation === "horizontal") {
            ctx.fillText(label, positionPx + 2, 1);
          } else {
            ctx.save();
            ctx.translate(1, positionPx + 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(label, 0, 0);
            ctx.restore();
          }
        }
      };
      const maxMm = orientation === "horizontal" ? this.mmwidth : this.mmheight;
      for (let mm = 0; mm <= maxMm; mm += 1) {
        drawTick(mm, mm % RULER_MAJOR_STEP_MM === 0, mm % RULER_MIDDLE_STEP_MM === 0);
      }
      if (orientation === "horizontal") {
        ctx.fillText("mm", cssWidth - 18, 1);
      }
    }
    /**
     * 中文说明：重绘当前ruler，让打印模板在尺寸变化后保持刻度同步。
     */
    drawCurrentRuler() {
      const rulerTarget = this.target.find(".hiprint_rul_wrapper");
      if (!rulerTarget.length) return;
      const horizontal = rulerTarget.find(".hiprint_rul_canvas-horizontal")[0];
      const vertical = rulerTarget.find(".hiprint_rul_canvas-vertical")[0];
      if (horizontal) this.drawRuler(horizontal, "horizontal");
      if (vertical) this.drawRuler(vertical, "vertical");
    }
    /**
     * 中文说明：格式化显示height，把内部数值转成设计器可直接使用的 CSS 值。
     */
    displayHeight() {
      return `${this.mmheight - HiPrintConfig.instance.paperHeightTrim}mm`;
    }
    /**
     * 中文说明：格式化显示width，把内部数值转成设计器可直接使用的 CSS 值。
     */
    displayWidth() {
      return `${this.mmwidth}mm`;
    }
    /**
     * 中文说明：读取panel target，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getPanelTarget() {
      return this.target.parent(".hiprint-printPanel ");
    }
  }
  class PrintElementTypeFactory {
    /**
     * 中文说明：创建print element type，供打印模板在设计器或打印渲染流程中使用。
     */
    static createPrintElementType(source2) {
      return BuiltinPrintElementTypeFactory.createPrintElementType(source2);
    }
  }
  const _PrintElementTypeRegistry = class _PrintElementTypeRegistry {
    /**
     * 中文说明：初始化打印模板对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor() {
      this.allElementTypes = [];
    }
    /**
     * 中文说明：返回打印面板单例或实例入口，承载模板面板的设计与渲染状态。
     */
    static get instance() {
      if (!this._instance) this._instance = new _PrintElementTypeRegistry();
      return this._instance;
    }
    /**
     * 中文说明：添加print element types，扩展打印模板的元素、样式或交互能力。
     */
    addPrintElementTypes(moduleName, groups) {
      this[moduleName] ? this[moduleName] = this[moduleName].concat(groups) : this[moduleName] = groups;
      groups.forEach((group) => {
        this.allElementTypes = this.allElementTypes.concat(group.printElementTypes);
      });
    }
    /**
     * 中文说明：读取element type groups，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getElementTypeGroups(moduleName) {
      return this[this.formatterModule(moduleName)] || [];
    }
    /**
     * 中文说明：读取element type，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getElementType(tid) {
      const matches = this.allElementTypes.filter((elementType) => elementType.tid == tid);
      if (matches.length > 0) return matches[0];
      return void 0;
    }
    /**
     * 中文说明：构造格式化函数模块，把模板中的函数字符串转为可调用格式化器。
     */
    formatterModule(moduleName) {
      return moduleName || "_default";
    }
  };
  __publicField(_PrintElementTypeRegistry, "_instance");
  let PrintElementTypeRegistry = _PrintElementTypeRegistry;
  class PrintPanelEntity {
    /**
     * 中文说明：初始化打印模板对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(source2) {
      this.index = source2.index;
      this.paperType = source2.paperType;
      if (this.paperType) {
        const paper = HiPrintlib.instance[this.paperType];
        source2.height ? (this.height = source2.height, this.width = source2.width) : (this.height = paper.height, this.width = paper.width);
      } else {
        this.height = source2.height;
        this.width = source2.width;
      }
      this.paperHeader = source2.paperHeader || 0;
      this.paperFooter = source2.paperFooter || hinnn.mm.toPt(this.height);
      this.printElements = source2.printElements || [];
      this.paperNumberLeft = source2.paperNumberLeft;
      this.paperNumberTop = source2.paperNumberTop;
      this.paperNumberDisabled = source2.paperNumberDisabled;
      this.paperNumberFormat = source2.paperNumberFormat;
      this.panelPaperRule = source2.panelPaperRule;
      this.rotate = source2.rotate || void 0;
      this.firstPaperFooter = source2.firstPaperFooter;
      this.evenPaperFooter = source2.evenPaperFooter;
      this.oddPaperFooter = source2.oddPaperFooter;
      this.lastPaperFooter = source2.lastPaperFooter;
      this.topOffset = source2.topOffset;
      this.fontFamily = source2.fontFamily;
      this.leftOffset = source2.leftOffset;
      this.orient = source2.orient;
    }
  }
  class MultipleSelectRect {
    /**
     * 中文说明：初始化打印模板对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(x, y, left, top) {
      this.startX = this.minX = x;
      this.startY = this.minY = y;
      this.maxX = x;
      this.maxY = y;
      this.lastLeft = left;
      this.lastTop = top;
    }
    /**
     * 中文说明：更新rect，让打印模板的 DOM、尺寸或交互状态保持一致。
     */
    updateRect(x, y) {
      this.minX = this.startX < x ? this.startX : x;
      this.minY = this.startY < y ? this.startY : y;
      this.maxX = this.startX < x ? x : this.startX;
      this.maxY = this.startY < y ? y : this.startY;
    }
    /**
     * 中文说明：更新position by multiple select，让打印模板的 DOM、尺寸或交互状态保持一致。
     */
    updatePositionByMultipleSelect(leftDelta, topDelta) {
      if (leftDelta != null) this.lastLeft = this.lastLeft + leftDelta;
      if (topDelta != null) this.lastTop = this.lastTop + topDelta;
      this.target.css({
        left: `${this.lastLeft}pt`,
        top: `${this.lastTop}pt`
      });
    }
  }
  class PrintPanel {
    /**
     * 中文说明：初始化打印模板对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(entity, templateId) {
      this.templateId = templateId;
      this.index = entity.index;
      this.width = entity.width;
      this.height = entity.height;
      this.paperType = entity.paperType;
      this.paperHeader = entity.paperHeader;
      this.paperFooter = entity.paperFooter;
      this.initPrintElements(entity.printElements);
      this.paperNumberLeft = entity.paperNumberLeft;
      this.paperNumberTop = entity.paperNumberTop;
      this.paperNumberDisabled = entity.paperNumberDisabled;
      this.paperNumberFormat = entity.paperNumberFormat;
      this.panelPaperRule = entity.panelPaperRule;
      this.firstPaperFooter = entity.firstPaperFooter;
      this.evenPaperFooter = entity.evenPaperFooter;
      this.oddPaperFooter = entity.oddPaperFooter;
      this.lastPaperFooter = entity.lastPaperFooter;
      this.topOffset = entity.topOffset;
      this.leftOffset = entity.leftOffset;
      this.fontFamily = entity.fontFamily;
      this.orient = entity.orient;
      this.target = this.createTarget();
      this.rotate = entity.rotate;
    }
    /**
     * 中文说明：进入设计模式，渲染可拖拽、可编辑的模板面板或纸张元素。
     */
    design(options2) {
      this.orderPrintElements();
      this.designPaper = this.createNewPage(0);
      this.target.html("");
      this.target.append(this.designPaper.getTarget());
      this.droppablePaper(this.designPaper);
      this.designPaper.design(options2);
      this.designPaper.subscribePaperBaseInfoChanged((paperInfo) => {
        this.paperHeader = paperInfo.paperHeader;
        this.paperFooter = paperInfo.paperFooter;
        this.paperNumberLeft = paperInfo.paperNumberLeft;
        this.paperNumberTop = paperInfo.paperNumberTop;
        this.paperNumberDisabled = paperInfo.paperNumberDisabled;
        this.paperNumberFormat = paperInfo.paperNumberFormat;
      });
      this.printElements.forEach((element) => {
        this.appendDesignPrintElement(this.designPaper, element);
        element.design(options2, this.designPaper);
      });
      this.target.bind("click.hiprint", () => {
        hinnn.event.trigger(`BuildCustomOptionSettingEventKey_${this.templateId}`, {
          options: {
            panelPaperRule: this.panelPaperRule,
            // firstPaperFooter: this.firstPaperFooter,
            // evenPaperFooter: this.evenPaperFooter,
            // oddPaperFooter: this.oddPaperFooter,
            // lastPaperFooter: this.lastPaperFooter,
            leftOffset: this.leftOffset,
            topOffset: this.topOffset,
            fontFamily: this.fontFamily,
            orient: this.orient,
            paperNumberFormat: this.paperNumberFormat
          },
          callback: (nextOptions) => {
            this.panelPaperRule = nextOptions.panelPaperRule;
            this.leftOffset = nextOptions.leftOffset;
            this.topOffset = nextOptions.topOffset;
            this.fontFamily = nextOptions.fontFamily;
            this.orient = nextOptions.orient;
            this.paperNumberFormat = nextOptions.paperNumberFormat;
            this.designPaper.paperNumberFormat = this.paperNumberFormat;
            this.designPaper.updatePaperNumber(1, 1);
            this.designPaper.setOffset(this.leftOffset, this.topOffset);
            this.css(this.target);
          }
        });
      });
      this.bindBatchMoveElement();
    }
    /**
     * 中文说明：应用 CSS 相关配置，保持打印模板元素在设计器和打印页面中的样式一致。
     */
    css(target) {
      if (this.fontFamily) {
        target.css("fontFamily", this.fontFamily);
        target.find(".hiprint-printPaper, .hiprint-printPaper-content").css("fontFamily", this.fontFamily);
      } else {
        target.css("fontFamily", "");
        target.find(".hiprint-printPaper, .hiprint-printPaper-content").css("fontFamily", "");
      }
    }
    /**
     * 中文说明：读取html，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getHtml(data, options2, papers, panelForJoint, jointOptions) {
      this.orderPrintElements();
      let panelTarget;
      const paperList = papers || [];
      const targetPanel = panelForJoint || this;
      let currentPaper;
      if (panelForJoint) {
        currentPaper = paperList[paperList.length - 1];
        panelTarget = currentPaper.getPanelTarget();
        currentPaper.updateReferenceElement(new PrintReferenceElement({
          top: this.paperHeader,
          left: 0,
          height: 0,
          width: 0,
          bottomInLastPaper: currentPaper.referenceElement.bottomInLastPaper,
          beginPrintPaperIndex: paperList.length - 1,
          printTopInPaper: currentPaper.referenceElement.bottomInLastPaper,
          endPrintPaperIndex: paperList.length - 1
        }));
      } else {
        panelTarget = targetPanel.createTarget();
        currentPaper = targetPanel.createNewPage(paperList.length);
        paperList.push(currentPaper);
        panelTarget.append(currentPaper.getTarget());
      }
      this.printElements.filter((element) => !element.isFixed() && !element.isHeaderOrFooter()).forEach((element) => {
        let elementHtmlResults = [];
        const lastPaper = paperList[paperList.length - 1];
        if (lastPaper.referenceElement.isPositionLeftOrRight(element.options.getTop())) {
          currentPaper = paperList[lastPaper.referenceElement.beginPrintPaperIndex];
          elementHtmlResults = element.getHtml(currentPaper, data);
        } else {
          currentPaper = paperList[lastPaper.referenceElement.endPrintPaperIndex];
          elementHtmlResults = element.getHtml(currentPaper, data);
        }
        elementHtmlResults.forEach((result, resultIndex) => {
          if (result.referenceElement) result.referenceElement.endPrintPaperIndex = result.referenceElement.beginPrintPaperIndex + elementHtmlResults.length - 1;
          if (resultIndex > 0) {
            if (currentPaper.index < paperList.length - 1) currentPaper = paperList[currentPaper.index + 1];
            else {
              currentPaper = targetPanel.createNewPage(paperList.length, currentPaper.referenceElement);
              paperList.push(currentPaper);
            }
            panelTarget.append(currentPaper.getTarget());
          }
          if (result.target) {
            currentPaper.append(result.target);
            currentPaper.updatePrintLine(result.printLine);
            element.onRendered(currentPaper, result.target);
          }
          if (resultIndex === elementHtmlResults.length - 1 && result.referenceElement) currentPaper.updateReferenceElement(result.referenceElement);
        });
      });
      if (jointOptions) {
        jointOptions.templates.forEach((templateConfig) => {
          const nextData = templateConfig.data || {};
          const nextOptions = templateConfig.options || {};
          templateConfig.template.printPanels.forEach((panel) => {
            panel.getHtml(nextData, nextOptions, paperList, this);
          });
        });
      }
      if (!panelForJoint) {
        if (this.lastPaperFooter) {
          if (paperList[paperList.length - 1].printLine > this.lastPaperFooter) {
            currentPaper = targetPanel.createNewPage(paperList.length, currentPaper.referenceElement);
            paperList.push(currentPaper);
            panelTarget.append(currentPaper.getTarget());
          }
        }
        if (this.panelPaperRule) {
          if (this.panelPaperRule === "odd" && paperList.length % 2 === 0) {
            currentPaper = targetPanel.createNewPage(paperList.length, currentPaper.referenceElement);
            paperList.push(currentPaper);
            panelTarget.append(currentPaper.getTarget());
          }
          if (this.panelPaperRule === "even" && paperList.length % 2 === 1) {
            currentPaper = targetPanel.createNewPage(paperList.length, currentPaper.referenceElement);
            paperList.push(currentPaper);
            panelTarget.append(currentPaper.getTarget());
          }
        }
        paperList.forEach((paper) => {
          paper.updatePaperNumber(paper.index + 1, paperList.length, options2.paperNumberToggleInEven);
          this.fillPaperHeaderAndFooter(paper, data, paperList.length);
          if (options2) {
            if (options2.leftOffset != null) paper.setLeftOffset(options2.leftOffset);
            if (options2.topOffset != null) paper.setTopOffset(options2.topOffset);
          }
        });
        panelTarget.prepend(this.getPrintStyle());
      }
      return panelTarget;
    }
    /**
     * 中文说明：根据纸张或面板尺寸重新计算缩放与定位，保持设计器布局正确。
     */
    resize(paperType, width, height, rotate) {
      this.width = width;
      this.height = height;
      this.paperType = paperType;
      this.rotate = rotate;
      this.designPaper.resize(width, height);
    }
    /**
     * 中文说明：处理纸张页面信息，支撑打印模板分页、页眉页脚和打印定位。
     */
    rotatePaper() {
      if (this.rotate == null) this.rotate = false;
      this.rotate = !this.rotate;
      this.resize(this.paperType, this.height, this.width, this.rotate);
    }
    /**
     * 中文说明：读取target，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getTarget() {
      return this.target;
    }
    /**
     * 中文说明：启用打印面板交互能力，允许元素选择、拖拽和键盘移动。
     */
    enable() {
      this.target.removeClass("hipanel-disable");
    }
    /**
     * 中文说明：处理打印模板的菜单或事件回调，控制当前操作是否可用以及触发后的行为。
     */
    disable() {
      this.target.addClass("hipanel-disable");
    }
    /**
     * 中文说明：读取panel entity，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getPanelEntity(includePrintElementType) {
      const printElements = [];
      this.printElements.forEach((element) => {
        printElements.push(element.getPrintElementEntity(includePrintElementType));
      });
      return new PrintPanelEntity({
        index: this.index,
        width: this.width,
        height: this.height,
        paperType: this.paperType,
        paperHeader: this.paperHeader,
        paperFooter: this.paperFooter,
        paperNumberDisabled: !!this.paperNumberDisabled || void 0,
        paperNumberFormat: this.paperNumberFormat ? this.paperNumberFormat : void 0,
        panelPaperRule: this.panelPaperRule ? this.panelPaperRule : void 0,
        paperNumberLeft: this.paperNumberLeft,
        paperNumberTop: this.paperNumberTop,
        printElements,
        rotate: this.rotate,
        firstPaperFooter: this.firstPaperFooter,
        evenPaperFooter: this.evenPaperFooter,
        oddPaperFooter: this.oddPaperFooter,
        lastPaperFooter: this.lastPaperFooter,
        topOffset: this.topOffset,
        fontFamily: this.fontFamily,
        orient: this.orient,
        leftOffset: this.leftOffset
      });
    }
    /**
     * 中文说明：创建target，供打印模板在设计器或打印渲染流程中使用。
     */
    createTarget() {
      const target = $(`<div class="hiprint-printPanel panel-index-${this.index}"></div>`);
      this.css(target);
      return target;
    }
    /**
     * 中文说明：处理纸张页面信息，支撑打印模板分页、页眉页脚和打印定位。
     */
    droppablePaper(paper) {
      paper.getTarget().hidroppable({
        accept: ".ep-draggable-item",
        onDrop: (_target, _source) => {
          const dragging = HiPrintlib.instance.getDragingPrintElement();
          const printElement = dragging.printElement;
          printElement.updateSizeAndPositionOptions(this.mathroundToporleft(dragging.left - hinnn.px.toPt(this.target.offset().left)), this.mathroundToporleft(dragging.top - hinnn.px.toPt(this.target.offset().top)));
          printElement.setTemplateId(this.templateId);
          printElement.setPanel(this);
          this.appendDesignPrintElement(this.designPaper, printElement, true);
          this.printElements.push(printElement);
          printElement.design(void 0, paper);
          hinnn.event.trigger(printElement.getPrintElementSelectEventKey(), {
            printElement,
            selectionKind: "element"
          });
        }
      });
    }
    /**
     * 中文说明：初始化print elements，为打印模板后续渲染和设计操作准备状态。
     */
    initPrintElements(printElements) {
      this.printElements = [];
      if (printElements) {
        printElements.forEach((entity) => {
          const elementType = entity.printElementType ? PrintElementTypeFactory.createPrintElementType(entity.printElementType) : PrintElementTypeRegistry.instance.getElementType(entity.tid);
          if (elementType) {
            const printElement = elementType.createPrintElement(entity.options);
            if (!printElement) {
              console.warn(`unsupported print element type ${JSON.stringify(entity.printElementType || entity.tid)}`);
              return;
            }
            printElement.setTemplateId(this.templateId);
            printElement.setPanel(this);
            this.printElements.push(printElement);
          } else {
            console.warn(`missing print element type ${JSON.stringify(entity.printElementType || entity.tid)}`);
          }
        });
      }
    }
    /**
     * 中文说明：对元素 top/left 坐标做精度归整，减少拖拽后的小数误差。
     */
    mathroundToporleft(value) {
      const step = HiPrintConfig.instance.movingDistance;
      return Math.round(value / step) * step;
    }
    /**
     * 中文说明：处理打印相关逻辑，把模板、数据或页面内容交给打印模板的打印流程。
     */
    appendDesignPrintElement(paper, printElement, initSizeByHtml) {
      printElement.setCurrenttemplateData(void 0);
      const designTarget = printElement.getDesignTarget(paper);
      designTarget.addClass("design");
      if (initSizeByHtml) printElement.initSizeByHtml(designTarget);
      paper.append(designTarget);
    }
    /**
     * 中文说明：创建new page，供打印模板在设计器或打印渲染流程中使用。
     */
    createNewPage(index, referenceElement) {
      const paper = new PrintPaper(this.templateId, this.width, this.height, this.paperHeader, this.paperFooter, this.paperNumberLeft, this.paperNumberTop, this.paperNumberDisabled, this.paperNumberFormat, index, referenceElement);
      paper.setFooter(this.firstPaperFooter, this.evenPaperFooter, this.oddPaperFooter, this.lastPaperFooter);
      paper.setOffset(this.leftOffset, this.topOffset);
      return paper;
    }
    /**
     * 中文说明：处理打印相关逻辑，把模板、数据或页面内容交给打印模板的打印流程。
     */
    orderPrintElements() {
      this.printElements = hinnn.orderBy(this.printElements, (element) => element.options.getLeft());
      this.printElements = hinnn.orderBy(this.printElements, (element) => element.options.getTop());
    }
    /**
     * 中文说明：处理纸张页面信息，支撑打印模板分页、页眉页脚和打印定位。
     */
    fillPaperHeaderAndFooter(paper, data, paperCount) {
      this.printElements.filter((element) => element.isFixed() || element.isHeaderOrFooter()).forEach((element) => {
        element.isFixed();
        if (element.showInPage(paper.index, paperCount)) {
          const html = element.getHtml(paper, data);
          if (html.length) paper.append(html[0].target);
        }
      });
    }
    /**
     * 中文说明：清空打印模板中的面板或元素状态，重置设计器内容。
     */
    clear() {
      this.printElements.forEach((element) => {
        if (element.designTarget && element.designTarget.length) element.designTarget.remove();
      });
      this.printElements = [];
    }
    /**
     * 中文说明：插入print element to panel，维护打印模板的行列结构与合并单元格关系。
     */
    insertPrintElementToPanel(entity) {
      const elementType = this.getPrintElementTypeByEntity(entity);
      if (elementType) {
        const printElement = elementType.createPrintElement(entity.options);
        if (!printElement) {
          console.warn(`unsupported print element type ${JSON.stringify(entity.printElementType || entity.tid)}`);
          return;
        }
        printElement.setTemplateId(this.templateId);
        printElement.setPanel(this);
        this.printElements.push(printElement);
      }
    }
    /**
     * 中文说明：添加print text，扩展打印模板的元素、样式或交互能力。
     */
    addPrintText(entity) {
      entity.printElementType = entity.printElementType || {};
      entity.printElementType.type = "text";
      this.insertPrintElementToPanel(entity);
    }
    /**
     * 中文说明：添加print html，扩展打印模板的元素、样式或交互能力。
     */
    addPrintHtml(entity) {
      entity.printElementType = entity.printElementType || {};
      entity.printElementType.type = "html";
      this.insertPrintElementToPanel(entity);
    }
    /**
     * 中文说明：添加print table，扩展打印模板的元素、样式或交互能力。
     */
    addPrintTable(entity) {
      entity.printElementType = entity.printElementType || {};
      entity.printElementType.type = "table";
      if (entity.options && entity.options.columns) {
        const columns = $.extend({}, entity.options.columns);
        entity.printElementType.columns = columns.columns;
        columns.columns = void 0;
      }
      this.insertPrintElementToPanel(entity);
    }
    /**
     * 中文说明：添加print image，扩展打印模板的元素、样式或交互能力。
     */
    addPrintImage(entity) {
      entity.printElementType = entity.printElementType || {};
      entity.printElementType.type = "image";
      this.insertPrintElementToPanel(entity);
    }
    /**
     * 中文说明：添加print long text，扩展打印模板的元素、样式或交互能力。
     */
    addPrintLongText(entity) {
      entity.printElementType = entity.printElementType || {};
      entity.printElementType.type = "longText";
      this.insertPrintElementToPanel(entity);
    }
    /**
     * 中文说明：添加print vline，扩展打印模板的元素、样式或交互能力。
     */
    addPrintVline(entity) {
      entity.printElementType = entity.printElementType || {};
      entity.printElementType.type = "vline";
      this.insertPrintElementToPanel(entity);
    }
    /**
     * 中文说明：添加print hline，扩展打印模板的元素、样式或交互能力。
     */
    addPrintHline(entity) {
      entity.printElementType = entity.printElementType || {};
      entity.printElementType.type = "hline";
      this.insertPrintElementToPanel(entity);
    }
    /**
     * 中文说明：添加print rect，扩展打印模板的元素、样式或交互能力。
     */
    addPrintRect(entity) {
      entity.printElementType = entity.printElementType || {};
      entity.printElementType.type = "rect";
      this.insertPrintElementToPanel(entity);
    }
    /**
     * 中文说明：添加print oval，扩展打印模板的元素、样式或交互能力。
     */
    addPrintOval(entity) {
      entity.printElementType = entity.printElementType || {};
      entity.printElementType.type = "oval";
      this.insertPrintElementToPanel(entity);
    }
    /**
     * 中文说明：读取print element type by entity，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getPrintElementTypeByEntity(entity) {
      const elementType = entity.tid ? PrintElementTypeRegistry.instance.getElementType(entity.tid) : PrintElementTypeFactory.createPrintElementType(entity.printElementType);
      if (!elementType) console.log(`miss ${JSON.stringify(entity)}`);
      return elementType;
    }
    /**
     * 中文说明：读取print style，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getPrintStyle() {
      return ` <style printStyle>
        @page
        {
             border:0;
             padding:0cm;
             margin:0cm;
             ${this.getPrintSizeStyle()}
        }
        </style>
        `;
    }
    /**
     * 中文说明：读取print size style，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getPrintSizeStyle() {
      return this.paperType ? `size:${this.paperType} ${this.height > this.width ? "portrait" : "landscape"};` : `size:${this.width}mm ${this.height}mm ${this.orient ? this.orient === 1 ? "portrait" : "landscape" : ""};`;
    }
    /**
     * 中文说明：删除print element，同步调整打印模板的结构和选择状态。
     */
    deletePrintElement(printElement) {
      this.printElements.filter((element, index) => {
        if (element.id == printElement.id) {
          printElement.delete();
          this.printElements.splice(index, 1);
        }
        return false;
      });
    }
    /**
     * 中文说明：读取element by tid，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getElementByTid(tid) {
      return this.printElements.filter((element) => element.printElementType.tid === tid).map((element) => element);
    }
    /**
     * 中文说明：读取element by name，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getElementByName(name) {
      return this.printElements.filter((element) => element.options.name === name).map((element) => element);
    }
    /**
     * 中文说明：读取fields in panel，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getFieldsInPanel() {
      const fields = [];
      this.printElements.forEach((element) => {
        element.options && element.options.field ? fields.push(element.options.field) : element.printElementType.field && fields.push(element.printElementType.field);
      });
      return fields;
    }
    /**
     * 中文说明：绑定多选元素批量移动逻辑，让设计器选区可整体拖动。
     */
    bindBatchMoveElement() {
      this.designPaper.getTarget().on("mousemove", (event) => {
        if (!HiPrintlib.instance.draging && event.buttons === 1) {
          this.mouseRect.updateRect(event.pageX, event.pageY);
          this.updateRectPanel(this.mouseRect);
        }
      }).on("mousedown", (event) => {
        if (!HiPrintlib.instance.draging) {
          if (this.mouseRect && this.mouseRect.target) this.mouseRect.target.remove();
          if (event.buttons === 1) this.mouseRect = new MultipleSelectRect(event.pageX, event.pageY, HiPrintlib.instance.dragLengthCNum(event.pageX - this.designPaper.getTarget().offset().left, HiPrintConfig.instance.movingDistance), HiPrintlib.instance.dragLengthCNum(event.pageY - this.designPaper.getTarget().offset().top, HiPrintConfig.instance.movingDistance));
        }
      });
    }
    /**
     * 中文说明：读取element in rect，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getElementInRect(rect) {
      const elements = [];
      this.printElements.forEach((element) => {
        if (element.inRect(rect)) elements.push(element);
      });
      return elements;
    }
    /**
     * 中文说明：更新rect panel，让打印模板的 DOM、尺寸或交互状态保持一致。
     */
    updateRectPanel(rect) {
      const paperTarget = this.designPaper.getTarget();
      if (!this.mouseRect.target) {
        this.mouseRect.target = $('<div tabindex="1" style="z-index:2;position: absolute;opacity:0.2;border: 1px dashed #000;background-color:#31676f;"><span></span></div>');
        paperTarget.find(".hiprint-printPaper-content").append(this.mouseRect.target);
        this.mouseRect.target.focus();
        this.bingKeyboardMoveEvent(this.mouseRect.target);
        this.mouseRect.target.hidraggable({
          onDrag: (_event, left, top) => {
            this.mouseRect.lastLeft = this.mouseRect.lastLeft ? this.mouseRect.lastLeft : left;
            this.mouseRect.lastTop = this.mouseRect.lastTop ? this.mouseRect.lastTop : top;
            (this.mouseRect.mouseRectSelectedElement || []).forEach((element) => {
              element.updatePositionByMultipleSelect(left - this.mouseRect.lastLeft, top - this.mouseRect.lastTop);
            });
            this.mouseRect.lastLeft = left;
            this.mouseRect.lastTop = top;
          },
          moveUnit: "pt",
          minMove: HiPrintConfig.instance.movingDistance,
          onBeforeDrag: (_event) => {
            this.mouseRect.target.focus();
            HiPrintlib.instance.draging = true;
            this.mouseRect.mouseRectSelectedElement || (this.mouseRect.mouseRectSelectedElement = this.getElementInRect(this.mouseRect));
          },
          onStopDrag: (_event) => {
            HiPrintlib.instance.draging = false;
          }
        });
      }
      this.mouseRect.target.css({
        height: `${rect.maxY - rect.minY}px`,
        width: `${rect.maxX - rect.minX}px`,
        left: `${rect.lastLeft}pt`,
        top: `${rect.lastTop}pt`
      });
    }
    /**
     * 中文说明：绑定键盘方向键移动事件，用于微调设计器中选中元素的位置。
     */
    bingKeyboardMoveEvent(target) {
      target.attr("tabindex", "1");
      target.keydown((event) => {
        this.mouseRect.mouseRectSelectedElement || (this.mouseRect.mouseRectSelectedElement = this.getElementInRect(this.mouseRect));
        const selectedElements = this.mouseRect.mouseRectSelectedElement || [];
        switch (event.keyCode) {
          case 37:
            this.mouseRect.updatePositionByMultipleSelect(0 - HiPrintConfig.instance.movingDistance, 0);
            selectedElements.forEach((element) => {
              element.updatePositionByMultipleSelect(0 - HiPrintConfig.instance.movingDistance, 0);
            });
            event.preventDefault();
            break;
          case 38:
            this.mouseRect.updatePositionByMultipleSelect(0, 0 - HiPrintConfig.instance.movingDistance);
            selectedElements.forEach((element) => {
              element.updatePositionByMultipleSelect(0, 0 - HiPrintConfig.instance.movingDistance);
            });
            event.preventDefault();
            break;
          case 39:
            this.mouseRect.updatePositionByMultipleSelect(HiPrintConfig.instance.movingDistance, 0);
            selectedElements.forEach((element) => {
              element.updatePositionByMultipleSelect(HiPrintConfig.instance.movingDistance, 0);
            });
            event.preventDefault();
            break;
          case 40:
            this.mouseRect.updatePositionByMultipleSelect(0, HiPrintConfig.instance.movingDistance);
            selectedElements.forEach((element) => {
              element.updatePositionByMultipleSelect(0, HiPrintConfig.instance.movingDistance);
            });
            event.preventDefault();
            break;
        }
      });
    }
  }
  function readDataBindingState(target) {
    const options2 = target.kind === "tableColumn" ? target.columnOptions : target.elementOptions;
    return {
      kind: target.kind,
      field: (options2 == null ? void 0 : options2.field) == null || options2.field === "" ? void 0 : options2.field.toString(),
      binding: normalizeDataBinding(options2 == null ? void 0 : options2.dataBinding)
    };
  }
  function applyDataBindingState(target, nextState) {
    const options2 = target.kind === "tableColumn" ? target.columnOptions : target.elementOptions;
    if (!options2) return;
    options2.field = nextState.field;
    options2.dataBinding = nextState.binding;
  }
  function createDataBindingStateFromField(target, sourceId, field, dataSources) {
    var _a, _b, _c;
    if (target.kind === "tableColumn") {
      const tableBinding = normalizeDataBinding((_a = target.elementOptions) == null ? void 0 : _a.dataBinding);
      const store = createDataSourceStore(dataSources);
      const context = store.getColumnContext(tableBinding);
      if (!((_b = context.tableBinding) == null ? void 0 : _b.path) || ((_c = context.source) == null ? void 0 : _c.id) !== sourceId) return void 0;
      const prefix = `${context.tableBinding.path}[].`;
      if (!field.path.startsWith(prefix)) return void 0;
      const relativePath = field.path.slice(prefix.length);
      return {
        kind: target.kind,
        field: relativePath,
        binding: normalizeDataBinding({ path: relativePath })
      };
    }
    return {
      kind: target.kind,
      field: field.path,
      binding: normalizeDataBinding({ sourceId, path: field.path })
    };
  }
  function isDataFieldBound(target, sourceId, field) {
    var _a, _b, _c;
    const state = readDataBindingState(target);
    if (target.kind === "tableColumn") {
      const tableBinding = normalizeDataBinding((_a = target.elementOptions) == null ? void 0 : _a.dataBinding);
      const columnBinding = normalizeDataBinding((_b = target.columnOptions) == null ? void 0 : _b.dataBinding);
      if (!(tableBinding == null ? void 0 : tableBinding.path) || !(columnBinding == null ? void 0 : columnBinding.path) || tableBinding.sourceId !== sourceId) return false;
      return field.path === `${tableBinding.path}[].${columnBinding.path}`;
    }
    return ((_c = state.binding) == null ? void 0 : _c.sourceId) === sourceId && state.binding.path === field.path;
  }
  let cssInjected = false;
  function injectCss() {
    if (cssInjected || typeof document === "undefined") return;
    cssInjected = true;
    const style = document.createElement("style");
    style.setAttribute("data-hiprint-data-source-panel", "true");
    style.textContent = `
    .hiprint-data-source-panel { height: 100%; display: flex; flex-direction: column; gap: 10px; }
    .hiprint-data-source-panel__toolbar { display: flex; gap: 8px; }
    .hiprint-data-source-panel button { height: 28px; padding: 0 9px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; color: #334155; font-size: 12px; cursor: pointer; }
    .hiprint-data-source-panel button.is-primary { border-color: #2563eb; background: #2563eb; color: #fff; }
    .hiprint-data-source-panel button:disabled { border-color: #e2e8f0; background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
    .hiprint-data-source-panel__tree { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; overflow: auto; padding: 3px 2px; }
    .hiprint-data-source-panel__tree-source { background: transparent; }
    .hiprint-data-source-panel__tree-source.is-active > .hiprint-data-source-panel__tree-source-header { background: #eff6ff; color: #1d4ed8; }
    .hiprint-data-source-panel__tree-source-header { display: flex; align-items: center; gap: 7px; min-height: 32px; padding: 3px 6px; border-radius: 4px; cursor: pointer; }
    .hiprint-data-source-panel__tree-source-header:hover { background: #f8fafc; }
    .hiprint-data-source-panel__tree-source-title { min-width: 0; flex: 1 1 auto; color: inherit; font-size: 13px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hiprint-data-source-panel__tree-source-body { padding: 1px 0 3px; }
    .hiprint-data-source-panel__tree-empty { padding: 5px 8px 5px 43px; color: #64748b; font-size: 12px; }
    .hiprint-data-source-panel__search { width: 100%; height: 30px; padding: 0 8px; border: 1px solid #cbd5e1; border-radius: 4px; color: #1f2937; font-size: 12px; }
    .hiprint-data-source-panel__field { display: flex; align-items: center; gap: 7px; min-height: 30px; padding: 3px 6px; border-radius: 4px; color: #334155; font-size: 13px; cursor: pointer; }
    .hiprint-data-source-panel__field:hover { background: #f8fafc; }
    .hiprint-data-source-panel__field.is-bound { background: #eff6ff; color: #1d4ed8; }
    .hiprint-data-source-panel__tree-caret { width: 12px; height: 18px; flex: 0 0 12px; display: inline-flex; align-items: center; justify-content: center; color: #94a3b8; cursor: pointer; user-select: none; }
    .hiprint-data-source-panel__tree-caret::before { content: ''; width: 6px; height: 6px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: rotate(45deg); transition: transform 120ms ease, color 120ms ease; }
    .hiprint-data-source-panel__tree-caret.is-collapsed::before { transform: rotate(-45deg); }
    .hiprint-data-source-panel__tree-caret:hover { color: #2563eb; }
    .hiprint-data-source-panel__tree-caret-placeholder { width: 12px; height: 18px; flex: 0 0 12px; }
    .hiprint-data-source-panel__node-icon { position: relative; width: 16px; height: 16px; flex: 0 0 16px; color: #475569; }
    .hiprint-data-source-panel__tree-source.is-active > .hiprint-data-source-panel__tree-source-header .hiprint-data-source-panel__node-icon,
    .hiprint-data-source-panel__field.is-bound .hiprint-data-source-panel__node-icon { color: #2563eb; }
    .hiprint-data-source-panel__node-icon--source { border: 1.5px solid currentColor; border-radius: 8px / 4px; }
    .hiprint-data-source-panel__node-icon--source::before { content: ''; position: absolute; left: -1.5px; right: -1.5px; top: -1.5px; height: 6px; border: 1.5px solid currentColor; border-radius: 8px / 4px; background: #fff; }
    .hiprint-data-source-panel__node-icon--field { border: 1.5px solid currentColor; border-radius: 2px; }
    .hiprint-data-source-panel__node-icon--field::after { content: ''; position: absolute; right: -1.5px; top: -1.5px; width: 6px; height: 6px; border-left: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; background: #fff; }
    .hiprint-data-source-panel__node-icon--object { border: 1.5px solid currentColor; border-radius: 2px; }
    .hiprint-data-source-panel__node-icon--object::before { content: ''; position: absolute; left: 1px; top: -4px; width: 8px; height: 5px; border: 1.5px solid currentColor; border-bottom: 0; border-radius: 2px 2px 0 0; background: #fff; }
    .hiprint-data-source-panel__node-icon--array { border: 1.5px solid currentColor; border-radius: 2px; background-image: linear-gradient(currentColor, currentColor), linear-gradient(currentColor, currentColor), linear-gradient(currentColor, currentColor); background-size: 100% 1px, 1px 100%, 1px 100%; background-position: 0 5px, 5px 0, 10px 0; background-repeat: no-repeat; }
    .hiprint-data-source-panel__node-main { min-width: 0; flex: 1 1 auto; display: flex; align-items: center; gap: 6px; }
    .hiprint-data-source-panel__field-name { min-width: 0; flex: 1 1 auto; color: inherit; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hiprint-data-source-panel__node-tag { max-width: 86px; height: 18px; flex: 0 1 auto; display: inline-flex; align-items: center; padding: 0 7px; border: 1px solid #dbe3ee; border-radius: 999px; background: #f8fafc; color: #64748b; font-size: 11px; line-height: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hiprint-data-source-panel__tree-source.is-active > .hiprint-data-source-panel__tree-source-header .hiprint-data-source-panel__node-tag,
    .hiprint-data-source-panel__field.is-bound .hiprint-data-source-panel__node-tag { border-color: #bfdbfe; background: #dbeafe; color: #1d4ed8; }
    .hiprint-data-source-panel__tree-source-body.is-collapsed { display: none; }
    .hiprint-data-source-panel__status { min-height: 28px; padding: 6px 8px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; line-height: 16px; }
    .hiprint-data-source-panel__status.is-success { color: #166534; }
    .hiprint-data-source-panel__status.is-warning { color: #b45309; }
    .hiprint-data-source-panel__empty { padding: 12px 8px; color: #64748b; font-size: 12px; }
  `;
    document.head.appendChild(style);
  }
  function escapeHtml(value) {
    return (value == null ? "" : value.toString()).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function isTableElement(printElement) {
    var _a;
    const type = (_a = printElement == null ? void 0 : printElement.printElementType) == null ? void 0 : _a.type;
    return type === "tableCustom";
  }
  function isValueField(field) {
    return field.kind !== "object" && field.kind !== "array";
  }
  function getArrayPathFromItemPath(path) {
    if (!path.includes("[]")) return void 0;
    return path.split("[]")[0];
  }
  function getRelativePathInArray(path, arrayPath) {
    const prefix = `${arrayPath}[].`;
    if (!path.startsWith(prefix)) return void 0;
    return path.slice(prefix.length);
  }
  class DataSourcePanel {
    constructor(template, container) {
      __publicField(this, "template");
      __publicField(this, "container");
      __publicField(this, "selectedId");
      __publicField(this, "currentPrintElement");
      __publicField(this, "currentColumnOptions");
      __publicField(this, "fieldQuery", "");
      __publicField(this, "statusText", "先选择画布元素，再点击字段完成绑定。");
      __publicField(this, "statusKind", "muted");
      __publicField(this, "collapsedSourceKeys", /* @__PURE__ */ new Set());
      __publicField(this, "collapsedFieldKeys", /* @__PURE__ */ new Set());
      __publicField(this, "selectListener");
      var _a;
      injectCss();
      this.template = template;
      this.container = $(container);
      this.selectedId = (_a = this.template.getDataSources()[0]) == null ? void 0 : _a.id;
      this.bindTemplateEvents();
      this.render();
      this.loadSourcesFromProvider();
    }
    /**
     * 中文说明：渲染数据源工具栏、搜索框、字段树和状态提示。
     */
    render() {
      var _a;
      const dataSources = this.template.getDataSources();
      const visibleSources = this.getVisibleSources(dataSources);
      const provider = this.getProvider();
      if (!this.selectedId || !visibleSources.some((source2) => source2.id === this.selectedId)) this.selectedId = (_a = visibleSources[0]) == null ? void 0 : _a.id;
      this.container.addClass("hiprint-data-source-panel");
      this.container.html(`
      <div class="hiprint-data-source-panel__toolbar">
        <button type="button" class="is-primary hiprint-data-source-add"${(provider == null ? void 0 : provider.create) ? "" : " disabled"}>新增</button>
        <button type="button" class="hiprint-data-source-edit"${(provider == null ? void 0 : provider.update) && this.selectedId ? "" : " disabled"}>编辑</button>
        <button type="button" class="hiprint-data-source-delete"${(provider == null ? void 0 : provider.remove) && this.selectedId ? "" : " disabled"}>删除</button>
      </div>
      <input type="text" class="hiprint-data-source-panel__search" placeholder="搜索字段名或路径" value="${escapeHtml(this.fieldQuery)}">
      <div class="hiprint-data-source-panel__tree"></div>
      <div class="hiprint-data-source-panel__status is-${this.statusKind}">${escapeHtml(this.statusText)}</div>
    `);
      this.renderTree(visibleSources);
      this.bindEvents();
    }
    /**
     * 中文说明：根据当前搜索词和选中元素上下文刷新字段树。
     */
    renderTree(sources) {
      const target = this.container.find(".hiprint-data-source-panel__tree");
      if (!sources.length) {
        target.html('<div class="hiprint-data-source-panel__empty">暂无可绑定数据源。</div>');
        return;
      }
      const query = normalizeBindingFieldQuery(this.fieldQuery);
      const html = sources.map((source2) => this.renderSourceNode(source2, query)).join("");
      target.html(html || '<div class="hiprint-data-source-panel__empty">暂无可绑定数据源。</div>');
    }
    /**
     * 中文说明：渲染单个数据源根节点，并按折叠状态输出子字段列表。
     */
    renderSourceNode(source2, query) {
      const mode = this.getFieldDisplayMode();
      const sourceMatches = !query || [source2.name, source2.id].some((value) => value && value.toString().toLowerCase().includes(query));
      const contextFields = this.getContextFields(source2, mode);
      const fields = this.filterFields(contextFields, query, mode);
      if (!sourceMatches && !fields.length) return "";
      const hasChildren = !!fields.length;
      const sourceKey = this.getSourceKey(source2.id);
      const collapsed = !query && this.collapsedSourceKeys.has(sourceKey);
      const caret = hasChildren ? `<span class="hiprint-data-source-panel__tree-caret${collapsed ? " is-collapsed" : ""}" data-source-key="${escapeHtml(sourceKey)}" aria-label="${collapsed ? "展开数据源" : "收起数据源"}"></span>` : '<span class="hiprint-data-source-panel__tree-caret-placeholder"></span>';
      return `
      <div class="hiprint-data-source-panel__tree-source${source2.id === this.selectedId ? " is-active" : ""}" data-source-id="${escapeHtml(source2.id)}">
        <div class="hiprint-data-source-panel__tree-source-header" data-source-id="${escapeHtml(source2.id)}">
          ${caret}
          <span class="hiprint-data-source-panel__node-icon hiprint-data-source-panel__node-icon--source" aria-hidden="true"></span>
          <div class="hiprint-data-source-panel__node-main">
            <div class="hiprint-data-source-panel__tree-source-title">${escapeHtml(source2.name)}</div>
            <span class="hiprint-data-source-panel__node-tag" title="${escapeHtml(source2.id)}">${escapeHtml(source2.id)}</span>
          </div>
        </div>
        <div class="hiprint-data-source-panel__tree-source-body${collapsed ? " is-collapsed" : ""}">
          ${hasChildren ? this.renderFieldList(source2, fields, 0, query) : '<div class="hiprint-data-source-panel__tree-empty">暂无字段。</div>'}
        </div>
      </div>
    `;
    }
    /**
     * 中文说明：按搜索词和绑定上下文过滤字段，确保表格、表格列、普通元素只看到可绑定字段。
     */
    filterFields(fields, query, mode) {
      return fields.map((field) => {
        var _a;
        const canDescend = field.kind !== "array" || mode === "any";
        const children = canDescend ? this.filterFields(field.children || [], query, mode) : [];
        const itemChildren = canDescend ? this.filterFields(((_a = field.item) == null ? void 0 : _a.children) || [], query, mode) : [];
        const matched = fieldMatchesQuery(field, query);
        const selectable = this.isFieldSelectableInMode(field, mode);
        const shouldInclude = selectable && (!query || matched) || children.length || itemChildren.length;
        if (!shouldInclude) return void 0;
        return {
          ...field,
          children: children.length ? children : selectable && mode !== "array" && mode !== "columnValue" ? field.children : void 0,
          item: field.item && mode !== "array" ? { ...field.item, children: itemChildren.length ? itemChildren : selectable && mode === "any" ? field.item.children : void 0 } : void 0
        };
      }).filter(Boolean);
    }
    isFieldSelectableInMode(field, mode) {
      return isSelectableBindingField(field, mode === "columnValue" ? "value" : mode);
    }
    getFieldDisplayMode() {
      if (this.currentColumnOptions) return "columnValue";
      if (this.currentPrintElement && isTableElement(this.currentPrintElement)) return "array";
      if (this.currentPrintElement) return "value";
      return "any";
    }
    getVisibleSources(dataSources) {
      var _a, _b;
      if (!this.currentColumnOptions) return dataSources;
      const binding = normalizeDataBinding((_b = (_a = this.currentPrintElement) == null ? void 0 : _a.options) == null ? void 0 : _b.dataBinding);
      if (!(binding == null ? void 0 : binding.sourceId)) return [];
      return dataSources.filter((source2) => source2.id === binding.sourceId);
    }
    getContextFields(source2, mode) {
      var _a, _b, _c;
      if (mode !== "columnValue") return source2.schema || [];
      const context = createDataSourceStore(this.template.getDataSources()).getColumnContext((_b = (_a = this.currentPrintElement) == null ? void 0 : _a.options) == null ? void 0 : _b.dataBinding);
      return ((_c = context.source) == null ? void 0 : _c.id) === source2.id ? context.rowFields || [] : [];
    }
    getEmptyFieldsText(mode) {
      if (mode === "array") return "当前元素是表格，请选择数组字段作为表格数据。";
      if (mode === "columnValue") return "当前列只能绑定当前表格数组下的行字段。";
      if (mode === "value") return "当前元素只能绑定文本、数字、日期、图片等值字段。";
      return "暂无字段，请通过宿主应用配置数据源字段。";
    }
    renderFieldList(source2, fields, depth, query) {
      if (!fields.length && depth === 0) return '<div class="hiprint-data-source-panel__empty">暂无字段，请通过宿主应用配置数据源字段。</div>';
      return fields.map((field) => {
        var _a;
        const children = field.kind === "array" ? (_a = field.item) == null ? void 0 : _a.children : field.children;
        const hasChildren = !!(children == null ? void 0 : children.length);
        const fieldKey = this.getFieldKey(source2.id, field.path);
        const collapsed = hasChildren && !query && this.collapsedFieldKeys.has(fieldKey);
        const activeClass = this.isFieldBound(source2.id, field) ? " is-bound" : "";
        const caret = hasChildren ? `<span class="hiprint-data-source-panel__tree-caret${collapsed ? " is-collapsed" : ""}" data-field-key="${escapeHtml(fieldKey)}" aria-label="${collapsed ? "展开字段" : "收起字段"}"></span>` : '<span class="hiprint-data-source-panel__tree-caret-placeholder"></span>';
        return `
        <div class="hiprint-data-source-panel__field${activeClass}" style="padding-left:${20 + depth * 16}px" title="${escapeHtml(field.path)}" data-source-id="${escapeHtml(source2.id)}" data-field-path="${escapeHtml(field.path)}" data-field-kind="${escapeHtml(field.kind)}">
          ${caret}
          <span class="hiprint-data-source-panel__node-icon ${escapeHtml(this.getFieldIconClass(field))}" aria-hidden="true"></span>
          <span class="hiprint-data-source-panel__node-main">
            <span class="hiprint-data-source-panel__field-name">${escapeHtml(field.label || field.name)}</span>
            <span class="hiprint-data-source-panel__node-tag">${escapeHtml(field.kind)}</span>
          </span>
        </div>
        ${hasChildren && !collapsed ? this.renderFieldList(source2, children, depth + 1, query) : ""}
      `;
      }).join("");
    }
    getFieldKey(sourceId, path) {
      return `${sourceId}:${path}`;
    }
    getSourceKey(sourceId) {
      return sourceId;
    }
    getFieldIconClass(field) {
      if (field.kind === "array") return "hiprint-data-source-panel__node-icon--array";
      if (field.kind === "object") return "hiprint-data-source-panel__node-icon--object";
      return "hiprint-data-source-panel__node-icon--field";
    }
    /**
     * 中文说明：绑定工具栏、搜索框和字段树事件。
     */
    bindEvents() {
      this.bindSourceHeaderEvents();
      this.container.find(".hiprint-data-source-add").on("click", () => this.createSource());
      this.container.find(".hiprint-data-source-edit").on("click", () => {
        const source2 = this.template.getDataSources().find((item) => item.id === this.selectedId);
        this.updateSource(source2);
      });
      this.container.find(".hiprint-data-source-delete").on("click", () => this.removeSource());
      this.container.find(".hiprint-data-source-panel__search").on("input", (event) => {
        var _a;
        this.fieldQuery = ((_a = $(event.currentTarget).val()) == null ? void 0 : _a.toString()) || "";
        this.renderTree(this.getVisibleSources(this.template.getDataSources()));
        this.bindSourceHeaderEvents();
        this.bindFieldEvents();
      });
      this.bindFieldEvents();
    }
    bindSourceHeaderEvents() {
      this.container.find(".hiprint-data-source-panel__tree-source-header").off("click").on("click", (event) => {
        this.selectedId = $(event.currentTarget).attr("data-source-id");
        this.render();
      });
    }
    /**
     * 中文说明：绑定字段节点点击与折叠事件，字段树局部刷新后会重新绑定。
     */
    bindFieldEvents() {
      this.container.find(".hiprint-data-source-panel__tree-caret[data-source-key]").on("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const key = $(event.currentTarget).attr("data-source-key");
        if (!key) return;
        if (this.collapsedSourceKeys.has(key)) this.collapsedSourceKeys.delete(key);
        else this.collapsedSourceKeys.add(key);
        this.renderTree(this.getVisibleSources(this.template.getDataSources()));
        this.bindSourceHeaderEvents();
        this.bindFieldEvents();
      });
      this.container.find(".hiprint-data-source-panel__tree-caret[data-field-key]").on("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const key = $(event.currentTarget).attr("data-field-key");
        if (!key) return;
        if (this.collapsedFieldKeys.has(key)) this.collapsedFieldKeys.delete(key);
        else this.collapsedFieldKeys.add(key);
        this.renderTree(this.getVisibleSources(this.template.getDataSources()));
        this.bindSourceHeaderEvents();
        this.bindFieldEvents();
      });
      this.container.find(".hiprint-data-source-panel__field").on("click", (event) => {
        event.stopPropagation();
        const sourceId = $(event.currentTarget).attr("data-source-id");
        const path = $(event.currentTarget).attr("data-field-path");
        const source2 = this.template.getDataSources().find((item) => item.id === sourceId);
        const field = createDataSourceStore(this.template.getDataSources()).findField(sourceId, path);
        if (source2 && field) {
          this.selectedId = source2.id;
          this.applyFieldBinding(source2, field);
        }
      });
    }
    /**
     * 中文说明：监听模板元素选中事件，同步当前可绑定上下文。
     */
    bindTemplateEvents() {
      if (!this.template.getPrintElementSelectEventKey) return;
      this.selectListener = (...args) => {
        const selectEvent = args[0];
        const isHeaderCellSelection = (selectEvent == null ? void 0 : selectEvent.selectionKind) === "tableHeaderCell";
        this.currentPrintElement = isHeaderCellSelection ? void 0 : selectEvent == null ? void 0 : selectEvent.printElement;
        this.currentColumnOptions = this.resolveColumnOptions(selectEvent);
        if (!this.currentPrintElement) {
          this.statusText = "先选择画布元素，再点击字段完成绑定。";
        } else if (this.currentColumnOptions) {
          this.statusText = "已选中表格列，点击当前表格数组下的字段进行绑定。";
        } else {
          this.statusText = "已选中画布元素，点击字段进行绑定。";
        }
        this.statusKind = "muted";
        this.render();
      };
      hinnn.event.on(this.template.getPrintElementSelectEventKey(), this.selectListener);
    }
    resolveColumnOptions(event) {
      var _a, _b;
      if ((event == null ? void 0 : event.selectionKind) === "tableColumn") {
        return (event == null ? void 0 : event.selectedColumn) || ((_b = (_a = event == null ? void 0 : event.customOptionsInput) == null ? void 0 : _a[0]) == null ? void 0 : _b.options);
      }
      return void 0;
    }
    /**
     * 中文说明：把选中的字段绑定到当前画布元素；表格元素绑定数组字段，普通元素绑定值字段。
     */
    applyFieldBinding(source2, field) {
      if (!this.currentPrintElement) {
        this.setStatus("请先选择画布上的元素，再点击字段绑定。", "warning");
        return;
      }
      if (this.currentColumnOptions) {
        this.applyColumnBinding(source2, field);
        return;
      }
      if (isTableElement(this.currentPrintElement)) {
        if (field.kind !== "array") {
          this.setStatus("表格元素需要绑定数组字段。", "warning");
          return;
        }
        applyDataBindingState({
          kind: "table",
          elementOptions: this.currentPrintElement.options
        }, {
          field: field.path,
          binding: this.mergeBinding(this.currentPrintElement.options.dataBinding, { sourceId: source2.id, path: field.path })
        });
        this.afterBindingApplied("已绑定表格数据源。");
        return;
      }
      if (!isValueField(field)) {
        this.setStatus("普通元素只能绑定文本、数字、日期、图片等值字段。", "warning");
        return;
      }
      applyDataBindingState({
        kind: "element",
        elementOptions: this.currentPrintElement.options
      }, {
        field: field.path,
        binding: this.mergeBinding(this.currentPrintElement.options.dataBinding, { sourceId: source2.id, path: field.path })
      });
      this.afterBindingApplied("已绑定当前元素。");
    }
    /**
     * 中文说明：把当前表格列绑定到表格数据数组中的相对字段，并在首次绑定时自动补齐列标题。
     */
    applyColumnBinding(source2, field) {
      const printElement = this.currentPrintElement;
      const columnOptions = this.currentColumnOptions;
      if (!printElement || !columnOptions) return;
      if (!isValueField(field)) {
        this.setStatus("表格列只能绑定数组行里的值字段。", "warning");
        return;
      }
      const tableBinding = normalizeDataBinding(printElement.options.dataBinding);
      let relativePath = (tableBinding == null ? void 0 : tableBinding.sourceId) === source2.id && tableBinding.path ? getRelativePathInArray(field.path, tableBinding.path) : void 0;
      if (!relativePath) {
        const inferredArrayPath = getArrayPathFromItemPath(field.path);
        if (inferredArrayPath) {
          relativePath = getRelativePathInArray(field.path, inferredArrayPath);
          applyDataBindingState({
            kind: "table",
            elementOptions: printElement.options
          }, {
            field: inferredArrayPath,
            binding: this.mergeBinding(printElement.options.dataBinding, { sourceId: source2.id, path: inferredArrayPath })
          });
        }
      }
      if (!relativePath) {
        this.setStatus("表格列需要绑定到当前表格数组字段下的字段。", "warning");
        return;
      }
      const nextState = createDataBindingStateFromField({
        kind: "tableColumn",
        elementOptions: printElement.options
      }, source2.id, field, this.template.getDataSources()) || {
        field: relativePath,
        binding: normalizeDataBinding({ path: relativePath })
      };
      nextState.binding = this.mergeBinding(columnOptions.dataBinding, nextState.binding || { path: relativePath });
      applyDataBindingState({
        kind: "tableColumn",
        elementOptions: printElement.options,
        columnOptions
      }, nextState);
      if (!columnOptions.title) {
        columnOptions.title = field.label || field.name;
      }
      this.afterBindingApplied("已绑定表格列字段。", true);
    }
    mergeBinding(current, next) {
      const normalized = normalizeDataBinding(current);
      return normalized && Object.prototype.hasOwnProperty.call(normalized, "fallback") ? { ...next, fallback: normalized.fallback } : next;
    }
    afterBindingApplied(message, keepColumnPanel = false) {
      var _a, _b;
      (_b = (_a = this.currentPrintElement) == null ? void 0 : _a.updateDesignViewFromOptions) == null ? void 0 : _b.call(_a);
      if (this.template.id) hinnn.event.trigger(`hiprintTemplateDataChanged_${this.template.id}`);
      this.refreshOptionPanel(keepColumnPanel);
      this.setStatus(message, "success", false);
      this.render();
    }
    refreshCurrentSelection() {
      if (!this.template.getPrintElementSelectEventKey || !this.currentPrintElement) return;
      this.refreshOptionPanel(!!this.currentColumnOptions);
    }
    refreshOptionPanel(keepColumnPanel) {
      var _a;
      if (!this.template.getPrintElementSelectEventKey || !this.currentPrintElement) return;
      if (keepColumnPanel && this.currentColumnOptions) {
        const printElement = this.currentPrintElement;
        const columnOptions = this.currentColumnOptions;
        const optionItems = (_a = printElement.getPrintElementOptionItemsByName) == null ? void 0 : _a.call(printElement, "tableColumn");
        if (optionItems == null ? void 0 : optionItems.length) {
          hinnn.event.trigger(this.template.getPrintElementSelectEventKey(), {
            printElement,
            selectionKind: "tableColumn",
            selectedColumn: columnOptions,
            customOptionsInput: [{
              title: `${columnOptions.title || columnOptions.field || "表格列"}-列属性`,
              optionItems,
              options: columnOptions,
              printElement,
              bindingContext: "tableColumn",
              callback: () => {
                var _a2;
                optionItems.forEach((optionItem) => {
                  columnOptions[optionItem.name] = optionItem.getValue();
                });
                (_a2 = printElement.submitOption) == null ? void 0 : _a2.call(printElement);
              }
            }]
          });
          return;
        }
      }
      hinnn.event.trigger(this.template.getPrintElementSelectEventKey(), { printElement: this.currentPrintElement });
    }
    setStatus(text, kind, shouldRender = true) {
      this.statusText = text;
      this.statusKind = kind;
      if (shouldRender) this.render();
    }
    isFieldBound(sourceId, field) {
      if (!this.currentPrintElement) return false;
      return isDataFieldBound({
        kind: this.currentColumnOptions ? "tableColumn" : isTableElement(this.currentPrintElement) ? "table" : "element",
        elementOptions: this.currentPrintElement.options,
        columnOptions: this.currentColumnOptions
      }, sourceId, field);
    }
    getProvider() {
      var _a, _b;
      return (_b = (_a = this.template).getDataSourceProvider) == null ? void 0 : _b.call(_a);
    }
    getProviderContext(selectedSource) {
      return {
        template: this.template,
        dataSources: normalizeDataSources(this.template.getDataSources()),
        selectedSource,
        selectedElement: this.currentPrintElement,
        selectedColumn: this.currentColumnOptions
      };
    }
    async loadSourcesFromProvider() {
      const provider = this.getProvider();
      if (!(provider == null ? void 0 : provider.list)) return;
      await this.runProviderAction(async () => {
        var _a;
        const sources = await provider.list(this.getProviderContext());
        const dataSources = (sources || []).map((source2) => this.normalizeProviderSource(source2)).filter(Boolean);
        this.selectedId = (_a = dataSources[0]) == null ? void 0 : _a.id;
        this.template.setDataSources(dataSources);
        this.setStatus("已加载数据源。", "success");
      });
    }
    async createSource() {
      const provider = this.getProvider();
      if (!(provider == null ? void 0 : provider.create)) {
        this.setStatus("当前未配置数据源新增处理器。", "warning");
        return;
      }
      await this.runProviderAction(async () => {
        const source2 = await provider.create(this.getProviderContext());
        if (!source2) {
          this.setStatus("已取消新增数据源。", "muted");
          return;
        }
        this.upsertSource(source2, void 0, "已新增数据源。");
      });
    }
    async updateSource(source2) {
      if (!source2) {
        this.setStatus("请先选择要编辑的数据源。", "warning");
        return;
      }
      const provider = this.getProvider();
      if (!(provider == null ? void 0 : provider.update)) {
        this.setStatus("当前未配置数据源编辑处理器。", "warning");
        return;
      }
      await this.runProviderAction(async () => {
        const nextSource = await provider.update(source2, this.getProviderContext(source2));
        if (!nextSource) {
          this.setStatus("已取消编辑数据源。", "muted");
          return;
        }
        this.upsertSource(nextSource, source2.id, "已更新数据源。");
      });
    }
    async removeSource() {
      const source2 = this.template.getDataSources().find((item) => item.id === this.selectedId);
      if (!source2) {
        this.setStatus("请先选择要删除的数据源。", "warning");
        return;
      }
      const provider = this.getProvider();
      if (!(provider == null ? void 0 : provider.remove)) {
        this.setStatus("当前未配置数据源删除处理器。", "warning");
        return;
      }
      await this.runProviderAction(async () => {
        var _a;
        const result = await provider.remove(source2, this.getProviderContext(source2));
        if (result === false) {
          this.setStatus("已取消删除数据源。", "muted");
          return;
        }
        const dataSources = normalizeDataSources(this.template.getDataSources());
        const nextDataSources = dataSources.filter((item) => item.id !== source2.id);
        this.selectedId = (_a = nextDataSources[0]) == null ? void 0 : _a.id;
        this.template.setDataSources(nextDataSources);
        this.setStatus("已删除数据源。", "success");
      });
    }
    upsertSource(value, previousId, message) {
      const source2 = this.normalizeProviderSource(value);
      if (!source2) {
        this.setStatus("数据源格式不正确，需要包含 id、name 和 schema。", "warning");
        return;
      }
      const dataSources = normalizeDataSources(this.template.getDataSources());
      const conflict = dataSources.find((item) => item.id === source2.id && item.id !== previousId);
      if (conflict) {
        this.setStatus(`数据源标识 ${source2.id} 已存在。`, "warning");
        return;
      }
      const index = dataSources.findIndex((item) => item.id === previousId || item.id === source2.id);
      if (index >= 0) dataSources.splice(index, 1, source2);
      else dataSources.push(source2);
      this.selectedId = source2.id;
      this.template.setDataSources(dataSources);
      this.setStatus(message, "success");
    }
    normalizeProviderSource(value) {
      const source2 = normalizeDataSource(value);
      if (!source2) return void 0;
      return source2;
    }
    async runProviderAction(action) {
      try {
        await action();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.setStatus(`数据源处理失败：${message}`, "warning");
      }
    }
    destroy() {
      if (this.selectListener && this.template.getPrintElementSelectEventKey) hinnn.event.off(this.template.getPrintElementSelectEventKey(), this.selectListener);
      this.container.removeClass("hiprint-data-source-panel").html("");
    }
  }
  function classList(...classNames) {
    return classNames.filter(Boolean).join(" ");
  }
  function classSelector(className) {
    return `.${className}`;
  }
  function bindOptionPanelAutoSubmit(target, onSubmit, onRefresh) {
    target.change(() => {
      onSubmit();
      onRefresh();
    });
    target.bind("keydown.submitOption", (keyEvent) => {
      if ((keyEvent == null ? void 0 : keyEvent.keyCode) == 13) {
        onSubmit();
        onRefresh();
      }
    });
    target.bind("input.refreshOptionVisibility", () => {
      onRefresh();
    });
  }
  function notifyClientPrintNotConnected(templateId) {
    emitRuntimeMessage({
      type: "error",
      code: "CLIENT_PRINT_NOT_CONNECTED",
      message: "连接客户端失败",
      templateId,
      endpoint: hiwebSocket.getEndpoint()
    });
  }
  function createClientPrintPayload(templateId, type, options2) {
    return $.extend({}, options2 || {}, {
      type,
      id: HiPrintlib.instance.guid(),
      templateId
    });
  }
  function ensureClientPrintOpened(templateId) {
    if (hiwebSocket.opened) return true;
    notifyClientPrintNotConnected(templateId);
    return false;
  }
  function notifyBlobPdfOnly(templateId, methodName) {
    const message = "ArcoPrint 客户端仅支持 blob_pdf 打印方式";
    hinnn.event.trigger(`printError_${templateId}`, {
      templateId,
      message,
      methodName
    });
    emitRuntimeMessage({
      type: "warning",
      code: "CLIENT_PRINT_BLOB_PDF_ONLY",
      message,
      templateId,
      methodName
    });
  }
  function toPdfBase64(pdfValue) {
    if (typeof pdfValue !== "string") return void 0;
    return pdfValue.indexOf(",") > -1 ? pdfValue.split(",")[1] : pdfValue;
  }
  function base64ToUint8Array(base64) {
    const normalized = base64.replace(/\s/g, "");
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  async function toPdfUint8Array(pdfValue) {
    if (pdfValue instanceof Uint8Array) return pdfValue;
    if (pdfValue instanceof ArrayBuffer) return new Uint8Array(pdfValue);
    if (pdfValue instanceof Blob) return new Uint8Array(await pdfValue.arrayBuffer());
    return base64ToUint8Array(toPdfBase64(pdfValue) || "");
  }
  class PrintTemplateEntity {
    /**
     * 中文说明：初始化打印模板对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(source2) {
      this.panels = [];
      this.dataSources = [];
      if (source2) {
        this.dataSources = normalizeDataSources(source2.dataSources);
        if (source2.panels) {
          for (let index = 0; index < source2.panels.length; index += 1) {
            this.panels.push(new PrintPanelEntity(source2.panels[index]));
          }
        }
      }
    }
  }
  class PrintElementOptionSettingPanel {
    /**
     * 中文说明：初始化打印模板对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(printTemplate, settingContainer) {
      this.printElementOptionSettingPanel = {};
      this.printTemplate = printTemplate;
      this.settingContainer = $(settingContainer);
      hinnn.event.on(printTemplate.getPrintElementSelectEventKey(), (event) => {
        this.buildSetting(event);
      });
      hinnn.event.on(printTemplate.getBuildCustomOptionSettingEventKey(), (event) => {
        this.buildSettingByCustomOptions(event);
      });
    }
    /**
     * 中文说明：初始化打印模板实例，绑定默认配置、DOM 结构和必要的交互事件。
     */
    init() {
    }
    clearLastSelection() {
      if (this.lastPrintElement) {
        this.lastPrintElement.getPrintElementOptionItems().forEach((item) => {
          item.destroy();
        });
      }
      this.lastPrintElement = void 0;
    }
    createOptionItemsPanel(params) {
      const panel = $(`<div class="${OPTION_PANEL_CLASS_NAMES.panel}"></div>`);
      const { optionItems, optionContext, valueSource, printElement, printElementType, title, trackTargets, onSubmit } = params;
      const refresh = () => refreshOptionPanelVisibility(optionItems);
      if (title) {
        panel.append(`<div class="${classList(OPTION_PANEL_CLASS_NAMES.item, OPTION_PANEL_CLASS_NAMES.row)}">
            <div class="${classList(OPTION_PANEL_CLASS_NAMES.label, OPTION_PANEL_CLASS_NAMES.title)}">
              ${title}
            </div>
        </div>`);
      }
      optionItems.forEach((item) => {
        item.submit = () => {
          onSubmit();
          refresh();
        };
        const target = item.createTarget(printElement, optionContext, printElementType);
        if (trackTargets) this.printElementOptionSettingPanel[item.name] = target;
        panel.append(target);
        item.setValue(valueSource == null ? void 0 : valueSource[item.name], optionContext, printElementType);
      });
      bindOptionPanelAutoSubmit(panel.find(classSelector(OPTION_PANEL_CLASS_NAMES.autoSubmit)), onSubmit, refresh);
      refresh();
      return panel;
    }
    /**
     * 中文说明：组装setting，把模板配置转换为打印模板可用的结构。
     */
    buildSetting(event) {
      const printElement = event.printElement;
      const customOptionsInput = event.customOptionsInput;
      this.clearLastSelection();
      this.settingContainer.html("");
      if (!printElement) {
        return;
      }
      if (customOptionsInput) {
        customOptionsInput.forEach((customOption) => {
          const callback = customOption.callback;
          customOption.callback = (value) => {
            var _a;
            if (callback) callback(value);
            (_a = printElement.updateDesignViewFromOptions) == null ? void 0 : _a.call(printElement);
            hinnn.event.trigger(`hiprintTemplateDataChanged_${this.printTemplate.id}`);
          };
          this.buildSettingByCustomOptions(customOption, this.settingContainer);
        });
        this.lastPrintElement = printElement;
        return;
      }
      const optionItems = printElement.getPrintElementOptionItems();
      const panel = this.createOptionItemsPanel({
        optionItems,
        optionContext: printElement.options,
        valueSource: printElement.options,
        printElement,
        printElementType: printElement.printElementType,
        trackTargets: true,
        onSubmit: () => printElement.submitOption()
      });
      const deleteButton = $(`<button class="${classList(OPTION_PANEL_CLASS_NAMES.settingButton, OPTION_PANEL_CLASS_NAMES.deleteButton)}"
        type="button">删除</button>`);
      panel.append(deleteButton);
      deleteButton.bind("click.deleteBtn", () => {
        this.printTemplate.deletePrintElement(printElement);
      });
      this.settingContainer.append(panel);
      this.lastPrintElement = printElement;
    }
    /**
     * 中文说明：组装setting by custom options，把模板配置转换为打印模板可用的结构。
     */
    buildSettingByCustomOptions(event, container) {
      this.clearLastSelection();
      const targetContainer = container || this.settingContainer;
      if (!container) this.settingContainer.html("");
      const optionItems = event.optionItems ? event.optionItems : [];
      if (!optionItems.length && event.options) {
        Object.keys(event.options).forEach((name) => {
          const item = PrintElementOptionItemManager.getItem(name);
          if (item) optionItems.push(item);
        });
      }
      const optionContext = event.bindingContext ? { ...event.options || {}, __bindingContext: event.bindingContext } : event.options;
      const submit = event.callback || (() => {
      });
      const panel = this.createOptionItemsPanel({
        optionItems,
        optionContext,
        valueSource: event.options,
        printElement: event.printElement,
        title: event.title,
        onSubmit: () => submit(this.getValueByOptionItems(optionItems))
      });
      targetContainer.append(panel);
    }
    /**
     * 中文说明：读取value by option items，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getValueByOptionItems(optionItems) {
      return getOptionItemValues(optionItems);
    }
  }
  class PrintPaginationCreator {
    /**
     * 中文说明：初始化打印模板对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(paginationContainer, template) {
      this.paginationContainer = paginationContainer;
      this.jqPaginationContainer = $(this.paginationContainer);
      this.template = template;
    }
    /**
     * 中文说明：组装pagination，把模板配置转换为打印模板可用的结构。
     */
    buildPagination(_event) {
      const total = this.template.getPaneltotal();
      this.jqPaginationContainer.html("");
      const list = $('<ul class="hiprint-pagination"></ul>');
      const self = this;
      for (let index = 0; index < total; index += 1) {
        const panelIndex = index;
        const item = $(`<li><span>${panelIndex + 1}</span><a href="javascript:void(0);">x</a></li>`);
        item.find("span").click(function onPanelClick() {
          self.template.selectPanel(panelIndex);
          item.removeClass("selected");
          $(this).parent("li").addClass("selected");
        });
        item.find("a").click(() => {
          this.template.deletePanel(panelIndex);
          this.buildPagination();
        });
        list.append(item);
      }
      const addItem = $("<li><span>+</span></li>");
      list.append(addItem);
      this.jqPaginationContainer.append(list);
      addItem.click(() => {
        this.template.addPrintPanel(void 0, true);
        this.buildPagination();
      });
    }
  }
  class PrintTemplate {
    /**
     * 中文说明：初始化打印模板对象，保存后续渲染、设计或交互所需的状态。
     */
    constructor(options2) {
      this.tempimageBase64 = {};
      this.id = HiPrintlib.instance.guid();
      HiPrintlib.instance.setPrintTemplateById(this.id, this);
      const normalizedOptions = options2 || {};
      this.printPanels = [];
      const templateEntity = new PrintTemplateEntity(normalizedOptions.template || []);
      this.dataSources = normalizeDataSources(normalizedOptions.dataSources || templateEntity.dataSources);
      this.dataSourceProvider = normalizedOptions.dataSourceProvider;
      if (normalizedOptions.template) {
        templateEntity.panels.forEach((panel) => {
          this.printPanels.push(new PrintPanel(panel, this.id));
        });
      }
      if (normalizedOptions.fields) this.fields = normalizedOptions.fields;
      if (normalizedOptions.settingContainer) new PrintElementOptionSettingPanel(this, normalizedOptions.settingContainer);
      if (normalizedOptions.dataSourceContainer) this.bindDataSourcePanel(normalizedOptions.dataSourceContainer);
      if (normalizedOptions.paginationContainer) {
        this.printPaginationCreator = new PrintPaginationCreator(normalizedOptions.paginationContainer, this);
        this.printPaginationCreator.buildPagination();
      }
      this.initAutoSave();
    }
    /**
     * 中文说明：进入设计模式，渲染可拖拽、可编辑的模板面板或纸张元素。
     */
    design(container, options2) {
      options2 || (options2 = {});
      if (this.printPanels.length === 0) {
        const panel = this.createDefaultPanel();
        this.printPanels.push(panel);
      }
      if (!container) throw new Error("options.container can not be empty");
      this.createContainer(container);
      this.printPanels.forEach((panel, index) => {
        this.container.append(panel.getTarget());
        if (index > 0) panel.disable();
        panel.design(options2);
      });
      this.selectPanel(0);
      this.container.on("mousedown", (event) => {
        const $target = $(event.target);
        const isPrintElement = $target.closest(".hiprint-printElement").length > 0;
        if (!isPrintElement) {
          hinnn.event.trigger(`PrintElementSelectEventKey_${this.id}`, {
            printElement: null,
            selectionKind: "none"
          });
        }
      });
    }
    /**
     * 中文说明：读取simple html，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getSimpleHtml(data, options2) {
      options2 || (options2 = {});
      const target = $('<div class="hiprint-printTemplate"></div>');
      data && data.constructor === Array ? data.forEach((item) => {
        if (item) {
          this.printPanels.forEach((panel) => {
            target.append(panel.getHtml(item, options2));
          });
        }
      }) : this.printPanels.forEach((panel) => {
        target.append(panel.getHtml(data, options2));
      });
      if (options2 && options2.imgToBase64) this.transformImg(target.find("img"));
      return target;
    }
    /**
     * 中文说明：读取html，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getHtml(data, options2) {
      data || (data = {});
      return this.getSimpleHtml(data, options2);
    }
    /**
     * 中文说明：读取joint html，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getJointHtml(data, options2, jointOptions) {
      const target = $('<div class="hiprint-printTemplate"></div>');
      const papers = [];
      this.printPanels.forEach((panel) => {
        target.append(panel.getHtml(data, options2, papers, void 0, jointOptions));
      });
      return target;
    }
    /**
     * 中文说明：设置paper，同步打印模板配置并影响后续显示或打印结果。
     */
    setPaper(paperTypeOrWidth, height) {
      if (/^(([1-9][0-9]*)|(([0]\.\d{1,2}|[1-9][0-9]*\.\d{1,2})))$/.test(paperTypeOrWidth)) this.editingPanel.resize(void 0, parseFloat(paperTypeOrWidth), parseFloat(height), false);
      else {
        const paper = HiPrintlib.instance[paperTypeOrWidth];
        if (!paper) throw new Error(`not found pagetype:${paperTypeOrWidth || ""}`);
        this.editingPanel.resize(paperTypeOrWidth, paper.width, paper.height, false);
      }
    }
    /**
     * 中文说明：处理纸张页面信息，支撑打印模板分页、页眉页脚和打印定位。
     */
    rotatePaper() {
      this.editingPanel.rotatePaper();
    }
    /**
     * 中文说明：添加print panel，扩展打印模板的元素、样式或交互能力。
     */
    addPrintPanel(panelOptions, render) {
      const panel = panelOptions ? new PrintPanel(new PrintPanelEntity(panelOptions), this.id) : this.createDefaultPanel();
      if (panelOptions) panelOptions.index = this.printPanels.length;
      if (render) {
        this.container.append(panel.getTarget());
        panel.design();
      }
      this.printPanels.push(panel);
      if (render) this.selectPanel(panel.index);
      return panel;
    }
    /**
     * 中文说明：切换当前选中的打印面板，使后续元素操作作用在目标面板上。
     */
    selectPanel(index) {
      this.printPanels.forEach((panel, panelIndex) => {
        if (index == panelIndex) {
          panel.enable();
          this.editingPanel = panel;
        } else panel.disable();
      });
    }
    /**
     * 中文说明：删除panel，同步调整打印模板的结构和选择状态。
     */
    deletePanel(index) {
      this.printPanels[index].clear();
      this.printPanels[index].getTarget().remove();
      this.printPanels.splice(index, 1);
    }
    /**
     * 中文说明：读取paneltotal，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getPaneltotal() {
      return this.printPanels.length;
    }
    /**
     * 中文说明：创建default panel，供打印模板在设计器或打印渲染流程中使用。
     */
    createDefaultPanel() {
      return new PrintPanel(new PrintPanelEntity({
        index: this.printPanels.length,
        paperType: "A4"
      }), this.id);
    }
    /**
     * 中文说明：创建container，供打印模板在设计器或打印渲染流程中使用。
     */
    createContainer(container) {
      container ? (this.container = $(container), this.container.addClass("hiprint-printTemplate")) : this.container = $('<div class="hiprint-printTemplate"></div>');
    }
    /**
     * 中文说明：读取json tid，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getJsonTid() {
      const panels = [];
      this.printPanels.forEach((panel) => {
        if (panel.getPanelEntity().printElements.length) panels.push(panel.getPanelEntity());
      });
      return new PrintTemplateEntity({ panels, dataSources: this.getDataSources() });
    }
    /**
     * 中文说明：读取json，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getJson() {
      const panels = [];
      this.printPanels.forEach((panel) => {
        panels.push(panel.getPanelEntity(true));
      });
      return new PrintTemplateEntity({ panels, dataSources: this.getDataSources() });
    }
    getDataSources() {
      return normalizeDataSources(this.dataSources);
    }
    setDataSources(dataSources) {
      var _a, _b;
      this.dataSources = normalizeDataSources(dataSources);
      (_a = this.dataSourcePanel) == null ? void 0 : _a.render();
      (_b = this.dataSourcePanel) == null ? void 0 : _b.refreshCurrentSelection();
      hinnn.event.trigger(`hiprintTemplateDataChanged_${this.id}`);
    }
    getDataSourceProvider() {
      return this.dataSourceProvider;
    }
    setDataSourceProvider(provider) {
      this.dataSourceProvider = provider;
    }
    bindDataSourcePanel(container) {
      if (this.dataSourcePanel) this.dataSourcePanel.destroy();
      this.dataSourcePanel = new DataSourcePanel(this, container);
      return this.dataSourcePanel;
    }
    /**
     * 中文说明：读取print element select event key，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getPrintElementSelectEventKey() {
      return `PrintElementSelectEventKey_${this.id}`;
    }
    /**
     * 中文说明：读取build custom option setting event key，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getBuildCustomOptionSettingEventKey() {
      return `BuildCustomOptionSettingEventKey_${this.id}`;
    }
    /**
     * 中文说明：清空打印模板中的面板或元素状态，重置设计器内容。
     */
    clear() {
      this.printPanels.forEach((panel) => {
        panel.clear();
        if (panel.index > 0) {
          const target = panel.getTarget();
          if (target && target.length) target.remove();
        }
      });
      this.printPanels = [this.printPanels[0]];
      if (this.printPaginationCreator) this.printPaginationCreator.buildPagination();
    }
    /**
     * 中文说明：读取paper type，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getPaperType(index) {
      return this.printPanels[0].paperType;
    }
    /**
     * 中文说明：读取orient，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getOrient(index) {
      if (index == null) index = 0;
      return this.printPanels[index].height > this.printPanels[index].width ? 1 : 2;
    }
    /**
     * 中文说明：读取print style，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getPrintStyle(index) {
      return this.printPanels[index].getPrintStyle();
    }
    /**
     * 中文说明：处理打印相关逻辑，把模板、数据或页面内容交给打印模板的打印流程。
     */
    print(data, options2) {
      data || (data = {});
      this.getHtml(data, options2).hiwprint();
    }
    /**
     * 中文说明：收集当前页面打印样式，保证发送给客户端的 HTML 可以脱离原页面渲染。
     */
    collectPrintStyles(callback) {
      let loadedCount = 0;
      const cssByIndex = {};
      const links = $("link[media=print]").length > 0 ? $("link[media=print]") : $("link");
      if (!links.length) {
        callback("");
        return;
      }
      links.each((index, element) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", $(element).attr("href"));
        const onComplete = () => {
          if (xhr.status === 200) {
            cssByIndex[index + ""] = `<style rel="stylesheet" type="text/css">${xhr.responseText}</style>`;
          }
          loadedCount += 1;
          if (loadedCount === links.length) {
            let cssText = "";
            for (let cssIndex = 0; cssIndex < links.length; cssIndex += 1) cssText += cssByIndex[cssIndex + ""] || "";
            callback(cssText);
          }
        };
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) onComplete();
        };
        xhr.onerror = () => onComplete();
        xhr.send();
      });
    }
    /**
     * 中文说明：处理打印相关逻辑，把模板、数据或页面内容交给打印模板的打印流程。
     */
    print2(data, options2) {
      return this.printPdf2(data, options2);
    }
    /**
     * 中文说明：把打印模板中的图片地址转换为 base64，便于预览、导出和客户端打印内联资源。
     */
    imageToBase64(target) {
      const src = $(target).attr("src");
      if (src.indexOf("base64") === -1) {
        try {
          if (!this.tempimageBase64[src]) {
            const canvas = document.createElement("canvas");
            const image = new Image();
            image.src = target.attr("src");
            canvas.width = image.width;
            canvas.height = image.height;
            canvas.getContext("2d").drawImage(image, 0, 0);
            if (src) this.tempimageBase64[src] = canvas.toDataURL("image/png");
          }
          target.attr("src", this.tempimageBase64[src]);
        } catch (_error) {
          try {
            this.xhrLoadImage(target);
          } catch (error) {
            console.log(error);
          }
        }
      }
    }
    /**
     * 中文说明：通过 XHR 加载模板图片资源，为图片转 base64 提供 Blob 数据。
     */
    xhrLoadImage(_target) {
    }
    /**
     * 中文说明：把渲染后的打印任务发送到本地客户端执行静默或直接打印。
     */
    sentToClient(_styleText, _data, _options2) {
      notifyBlobPdfOnly(this.id, "sentToClient");
    }
    /**
     * 中文说明：处理打印相关逻辑，把模板、数据或页面内容交给打印模板的打印流程。
     */
    printByHtml(html) {
      $(html).hiwprint();
    }
    /**
     * 中文说明：处理打印相关逻辑，把模板、数据或页面内容交给打印模板的打印流程。
     */
    printByHtml2(_html, _options2) {
      notifyBlobPdfOnly(this.id, "printByHtml2");
    }
    /**
     * 中文说明：发送 PDF URL 或本地 PDF 文件路径给本地客户端打印。
     */
    printUrlPdf2(_pdfPath, _options2) {
      notifyBlobPdfOnly(this.id, "printUrlPdf2");
    }
    /**
     * 中文说明：按客户端 printByFragments 协议分片发送 HTML，适合大体积 HTML 打印。
     */
    printByFragments(_html, _options2) {
      notifyBlobPdfOnly(this.id, "printByFragments");
    }
    /**
     * 中文说明：发送模板 JSON 和打印数据给客户端，由客户端渲染后打印。
     */
    renderPrint(_data, _options2) {
      notifyBlobPdfOnly(this.id, "renderPrint");
    }
    /**
     * 中文说明：删除print element，同步调整打印模板的结构和选择状态。
     */
    deletePrintElement(printElement) {
      this.printPanels.forEach((panel) => {
        panel.deletePrintElement(printElement);
      });
    }
    /**
     * 中文说明：转换打印页面中的图片资源，避免导出或客户端打印时远程图片丢失。
     */
    transformImg(targets) {
      targets.map((_index, element) => {
        this.imageToBase64($(element));
      });
    }
    /**
     * 中文说明：把当前模板和数据导出为 PDF 文件，并自动补齐 pdf 后缀。
     */
    toPdf(data, fileName, options2) {
      this.createPdf(data, options2).then((pdf) => {
        fileName.indexOf(".pdf") > -1 ? pdf.save(fileName) : pdf.save(`${fileName}.pdf`);
      });
    }
    /**
     * 中文说明：按原版 hiprint 的整页截图、JPEG、按页裁切流程生成 PDF 实例。
     */
    createPdf(data, options2) {
      if (!this.printPanels.length) return Promise.reject(new Error("Cannot create PDF without print panels."));
      return new Promise((resolve, reject) => {
        const widthPt = hinnn.mm.toPt(this.printPanels[0].width);
        const heightPt = hinnn.mm.toPt(this.printPanels[0].height);
        const widthPx = hinnn.pt.toPx(widthPt);
        const html2canvasOptions = $.extend({
          scale: 2,
          width: widthPx,
          x: 0,
          y: 0,
          useCORS: true
        }, options2 || {});
        const pdf = new jsPDF({
          orientation: this.getOrient(0) == 1 ? "portrait" : "landscape",
          unit: "pt",
          format: this.printPanels[0].paperType ? this.printPanels[0].paperType.toLocaleLowerCase() : [widthPt, heightPt]
        });
        const html = this.getHtml(data, options2);
        this.createTempContainer();
        const tempContainer = this.getTempContainer();
        this.svg2canvas(html).then(() => {
          tempContainer.html(html[0]);
          const pageCount = tempContainer.find(".hiprint-printPanel .hiprint-printPaper").length;
          $(html).css({
            position: "fixed",
            left: "-100000px",
            top: "0",
            margin: "0"
          });
          const rect = html[0].getBoundingClientRect();
          const captureOptions = $.extend({}, html2canvasOptions, {
            x: Math.floor(rect.left),
            y: Math.floor(rect.top)
          });
          return html2canvas(html[0], captureOptions).then((canvas) => ({ canvas, pageCount }));
        }).then(({ canvas, pageCount }) => {
          const context = canvas.getContext("2d");
          context.mozImageSmoothingEnabled = false;
          context.webkitImageSmoothingEnabled = false;
          context.msImageSmoothingEnabled = false;
          context.imageSmoothingEnabled = false;
          const image = canvas.toDataURL("image/jpeg");
          for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
            pdf.addImage(image, "JPEG", 0, 0 - pageIndex * heightPt, widthPt, pageCount * heightPt);
            if (pageIndex < pageCount - 1) pdf.addPage();
          }
          this.removeTempContainer();
          resolve(pdf);
        }).catch((error) => {
          this.removeTempContainer();
          reject(error);
        });
      });
    }
    /**
     * 中文说明：生成 PDF data URI，作为本地客户端打印扩展的数据来源。
     */
    toPdfDataUri(data, options2) {
      return this.createPdf(data, options2).then((pdf) => pdf.output("datauristring"));
    }
    /**
     * 中文说明：发送 HTML 给本地客户端，由客户端转换为 PDF 后再打印。
     */
    printClientPdf(data, options2) {
      return this.printPdf2(data, options2);
    }
    /**
     * 中文说明：发送 PDF 二进制、base64 或 data URI 给本地客户端，由客户端保存临时 PDF 后打印。
     */
    printBlobPdf2(pdfBlob, options2) {
      options2 || (options2 = {});
      if (!ensureClientPrintOpened(this.id)) return;
      if (!pdfBlob) {
        hinnn.event.trigger(`printError_${this.id}`, {
          templateId: this.id,
          message: "PDF 数据不能为空"
        });
        return;
      }
      const sendOptions = createClientPrintPayload(this.id, "blob_pdf", options2);
      const pdfBase64 = toPdfBase64(pdfBlob);
      toPdfUint8Array(pdfBlob).then((pdfBytes) => {
        sendOptions.pdf_blob = pdfBytes;
        sendOptions.pdfBlob = pdfBytes;
        if (pdfBase64) {
          sendOptions.pdf_base64 = pdfBase64;
          sendOptions.pdfBase64 = pdfBase64;
          if (typeof pdfBlob === "string" && pdfBlob.indexOf(",") > -1) {
            sendOptions.pdfDataUri = pdfBlob;
          }
        }
        hiwebSocket.send(sendOptions);
      }).catch((error) => {
        hinnn.event.trigger(`printError_${this.id}`, {
          templateId: this.id,
          message: error && error.message ? error.message : String(error)
        });
      });
    }
    /**
     * 中文说明：生成 PDF 后发送到本地客户端打印，保留原 WebSocket 事件模型。
     */
    printPdf2(data, clientOptions, pdfOptions) {
      data || (data = {});
      clientOptions || (clientOptions = {});
      if (ensureClientPrintOpened(this.id)) {
        this.toPdfDataUri(data, pdfOptions).then((pdfDataUri) => {
          this.printBlobPdf2(pdfDataUri, clientOptions);
        }).catch((error) => {
          hinnn.event.trigger(`printError_${this.id}`, {
            templateId: this.id,
            message: error && error.message ? error.message : String(error)
          });
        });
      }
    }
    /**
     * 中文说明：创建temp container，供打印模板在设计器或打印渲染流程中使用。
     */
    createTempContainer() {
      this.removeTempContainer();
      $("body").prepend($('<div class="hiprint_temp_Container" style="overflow:hidden;height: 0px;box-sizing: border-box;"></div>'));
    }
    /**
     * 中文说明：移除temp container，清理打印模板中不再需要的 DOM、样式或状态。
     */
    removeTempContainer() {
      $(".hiprint_temp_Container").remove();
    }
    /**
     * 中文说明：读取temp container，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getTempContainer() {
      return $(".hiprint_temp_Container");
    }
    /**
     * 中文说明：把页面中的 SVG 转换到 canvas，避免导出或打印时矢量内容丢失。
     */
    async svg2canvas(target) {
      const tasks = [];
      target.find("svg").each((_index, svg) => {
        const parent = svg.parentNode;
        const size = this.getSvgCanvasSize(svg);
        const canvas = document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        $(svg).before(canvas);
        parent.removeChild(svg);
        $(canvas).css("width", `${size.width}px`);
        $(canvas).css("height", `${size.height}px`);
        tasks.push(this.renderSvgToCanvas(svg, canvas, size));
      });
      await Promise.all(tasks);
    }
    /**
     * 中文说明：使用当前页面加载的 canvg 把 SVG 栅格化，优先走新版异步 API，避免百分比 SVG 把 canvas 改成 800x600。
     */
    async renderSvgToCanvas(svg, canvas, size) {
      const clonedSvg = svg.cloneNode(true);
      clonedSvg.setAttribute("width", `${size.width}`);
      clonedSvg.setAttribute("height", `${size.height}`);
      if (!clonedSvg.getAttribute("preserveAspectRatio")) clonedSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      const source2 = new XMLSerializer().serializeToString(clonedSvg);
      const context = canvas.getContext("2d");
      const canvgRuntime = typeof canvg !== "undefined" ? canvg : void 0;
      const CanvgCtor = (canvgRuntime == null ? void 0 : canvgRuntime.Canvg) || (canvgRuntime == null ? void 0 : canvgRuntime.default);
      if ((CanvgCtor == null ? void 0 : CanvgCtor.fromString) && context) {
        const renderer = CanvgCtor.fromString(context, source2, {
          ignoreDimensions: true,
          ignoreAnimation: true,
          ignoreMouse: true
        });
        await renderer.render();
        return;
      }
      if (typeof canvgRuntime === "function") {
        canvgRuntime(canvas, source2, {
          ignoreDimensions: true,
          ignoreAnimation: true,
          ignoreMouse: true
        });
      }
    }
    /**
     * 中文说明：读取 SVG 所在容器的实际像素尺寸，避免默认 300x150 canvas 拉伸二维码或条码。
     */
    getSvgCanvasSize(svg) {
      const svgWidth = this.cssLengthToPx(svg.getAttribute("width") || svg.style.width);
      const svgHeight = this.cssLengthToPx(svg.getAttribute("height") || svg.style.height);
      const parentSize = this.getElementCanvasSize(svg.parentElement);
      const width = svgWidth || parentSize.width;
      const height = svgHeight || parentSize.height;
      return {
        width: Math.max(1, Math.round(width || 1)),
        height: Math.max(1, Math.round(height || 1))
      };
    }
    /**
     * 中文说明：递归解析元素尺寸，兼容离屏 DOM 中 getBoundingClientRect 为 0 的导出场景。
     */
    getElementCanvasSize(element) {
      var _a;
      if (!element) return { width: 1, height: 1 };
      const htmlElement = element;
      const rect = (_a = htmlElement.getBoundingClientRect) == null ? void 0 : _a.call(htmlElement);
      let width = rect && rect.width ? rect.width : 0;
      let height = rect && rect.height ? rect.height : 0;
      width || (width = this.cssLengthToPx(htmlElement.style.width));
      height || (height = this.cssLengthToPx(htmlElement.style.height));
      const computed = window.getComputedStyle ? window.getComputedStyle(htmlElement) : void 0;
      width || (width = this.cssLengthToPx(computed == null ? void 0 : computed.width));
      height || (height = this.cssLengthToPx(computed == null ? void 0 : computed.height));
      if ((!width || !height) && htmlElement.parentElement) {
        const parentSize = this.getElementCanvasSize(htmlElement.parentElement);
        width || (width = this.resolvePercentLength(htmlElement.style.width || (computed == null ? void 0 : computed.width), parentSize.width));
        height || (height = this.resolvePercentLength(htmlElement.style.height || (computed == null ? void 0 : computed.height), parentSize.height));
        width || (width = parentSize.width);
        height || (height = parentSize.height);
      }
      return { width: width || 1, height: height || 1 };
    }
    /**
     * 中文说明：把常见 CSS 长度转换为像素，供离屏 PDF 渲染前的 canvas 尺寸计算使用。
     */
    cssLengthToPx(value) {
      if (!value) return 0;
      const text = String(value).trim();
      if (!text || text === "auto" || text.endsWith("%")) return 0;
      const numberValue = parseFloat(text);
      if (!Number.isFinite(numberValue)) return 0;
      if (text.endsWith("pt")) return hinnn.pt.toPx(numberValue);
      if (text.endsWith("mm")) return hinnn.mm.toPx(numberValue);
      if (text.endsWith("cm")) return hinnn.mm.toPx(numberValue * 10);
      if (text.endsWith("in")) return numberValue * 96;
      return numberValue;
    }
    /**
     * 中文说明：按父级尺寸解析百分比长度，主要用于二维码容器 width/height:100% 的情况。
     */
    resolvePercentLength(value, parentSize) {
      if (!value || !value.trim().endsWith("%")) return 0;
      const percent = parseFloat(value);
      if (!Number.isFinite(percent)) return 0;
      return parentSize * percent / 100;
    }
    /**
     * 中文说明：处理on事件，驱动打印模板中的拖拽、编辑或菜单行为。
     */
    on(name, listener) {
      hinnn.event.on(`${name}_${this.id}`, listener);
    }
    /**
     * 中文说明：检查本地打印客户端连接状态，用于决定是否可直接发送打印任务。
     */
    clientIsOpened() {
      return hiwebSocket.opened;
    }
    /**
     * 中文说明：读取printer list，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getPrinterList() {
      const printers = hiwebSocket.getPrinterList();
      return printers || [];
    }
    /**
     * 中文说明：读取element by tid，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getElementByTid(tid, panelIndex) {
      if (panelIndex == null) panelIndex = 0;
      return this.printPanels[panelIndex].getElementByTid(tid);
    }
    /**
     * 中文说明：读取element by name，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getElementByName(name, panelIndex) {
      if (panelIndex == null) panelIndex = 0;
      return this.printPanels[panelIndex].getElementByName(name);
    }
    /**
     * 中文说明：读取panel，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getPanel(index) {
      if (index == null) index = 0;
      return this.printPanels[index];
    }
    /**
     * 中文说明：等待打印页面内所有图片加载完成，确保预览、导出和打印内容完整。
     */
    loadAllImages(target, callback, retry) {
      if (retry == null) retry = 0;
      const images = target[0].getElementsByTagName("img");
      let loaded = true;
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        if (image.src && image.src !== window.location.href && image.src.indexOf("base64") === -1 && !(image && image.naturalWidth !== void 0 && image.naturalWidth !== 0 && image.complete)) loaded = false;
      }
      retry += 1;
      !loaded && retry < 10 ? setTimeout(() => {
        this.loadAllImages(target, callback, retry);
      }, 500) : callback();
    }
    /**
     * 中文说明：设置fields，同步打印模板配置并影响后续显示或打印结果。
     */
    setFields(fields) {
      this.fields = fields;
    }
    /**
     * 中文说明：读取fields，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getFields() {
      return this.fields;
    }
    /**
     * 中文说明：读取fields in panel，为打印模板的布局计算、序列化或渲染提供数据。
     */
    getFieldsInPanel() {
      let fields = [];
      this.printPanels.forEach((panel) => {
        fields = fields.concat(panel.getFieldsInPanel());
      });
      return fields;
    }
    /**
     * 中文说明：初始化auto save，为打印模板后续渲染和设计操作准备状态。
     */
    initAutoSave() {
      if (this.autoSave) {
        hinnn.event.on(`hiprintTemplateDataChanged_${this.id}`, () => {
          hiLocalStorage.saveLocalData(this.autoSaveKey || "hiprintAutoSave", JSON.stringify(this.autoSaveMode == 1 ? this.getJson() : this.getJsonTid()));
        });
      }
    }
  }
  function print(data) {
    this.getHtml(data).hiwprint();
  }
  function print2(data, success, error) {
    const template = new PrintTemplate({});
    template.on("printSuccess", success);
    template.on("printError", error);
    template.printPdf2(data, data && data.options);
  }
  function getHtml(options2) {
    let html;
    if (options2) {
      options2.templates.forEach((templateConfig) => {
        const panelOptions = $.extend({}, templateConfig.options || {});
        if (options2.imgToBase64) panelOptions.imgToBase64 = true;
        html ? html.append(templateConfig.template.getHtml(templateConfig.data, panelOptions).html()) : html = templateConfig.template.getHtml(templateConfig.data, panelOptions);
      });
    }
    return html;
  }
  function installModule33SideEffects() {
    const globalWithJQuery = globalThis;
    const jquery = globalWithJQuery.jQuery ?? globalWithJQuery.$;
    if (jquery) {
      installHidraggable(jquery);
      installHidroppable(jquery);
      installHiprintParser(jquery);
      installHireizeable(jquery);
    }
    if (typeof window !== "undefined") {
      installHiWebSocket(window);
      installHiLocalStorage(window);
    }
    if (jquery) installHiContextMenu(jquery);
  }
  function init(options2) {
    HiPrintConfig.instance.init(options2);
    HiPrintConfig.instance.providers.forEach((provider) => {
      provider.addElementTypes(moduleLocalPrintElementTypeManager);
    });
    const clientPrintEnabled = resolveClientPrintEnabled(options2);
    const clientPrintEndpoint = resolveClientPrintEndpoint(options2);
    const clientPrintToken = resolveClientPrintToken(options2);
    if (clientPrintEndpoint) setClientPrintEndpoint(clientPrintEndpoint);
    if (clientPrintToken !== void 0) setClientPrintToken(clientPrintToken);
    if (typeof clientPrintEnabled === "boolean") setClientPrintEnabled(clientPrintEnabled);
  }
  function resolveClientPrintEnabled(options2) {
    if (!options2 || typeof options2 !== "object") return void 0;
    const value = options2;
    if (typeof value.clientPrintEnabled === "boolean") return value.clientPrintEnabled;
    if (typeof value.enableClientPrint === "boolean") return value.enableClientPrint;
    if (typeof value.clientPrint === "boolean") return value.clientPrint;
    return void 0;
  }
  function resolveClientPrintEndpoint(options2) {
    if (!options2 || typeof options2 !== "object") return void 0;
    const value = options2;
    return value.clientPrintEndpoint || value.clientPrintUrl || value.clientPrintHost;
  }
  function resolveClientPrintToken(options2) {
    if (!options2 || typeof options2 !== "object") return void 0;
    const value = options2;
    return value.clientPrintToken ?? value.clientToken;
  }
  function setClientPrintEnabled(enabled) {
    hiwebSocket.setEnabled(enabled);
  }
  function isClientPrintEnabled() {
    return hiwebSocket.isEnabled();
  }
  function setClientPrintEndpoint(endpoint) {
    hiwebSocket.setEndpoint(endpoint);
  }
  function getClientPrintEndpoint() {
    return hiwebSocket.getEndpoint();
  }
  function setClientPrintToken(token) {
    hiwebSocket.setToken(token);
  }
  function getClientPrintToken() {
    return hiwebSocket.getToken();
  }
  function startHiWebSocketWhenDocumentReady() {
    const jquery = globalThis.$ ?? globalThis.jQuery;
    if (typeof document !== "undefined" && jquery) {
      jquery(document).ready(() => {
        hiwebSocket.isEnabled() && hiwebSocket.hasIo() && hiwebSocket.start();
      });
    }
  }
  const hiprint = {
    init,
    PrintElementTypeManager,
    PrintElementTypeGroup,
    PrintTemplate,
    DataSourcePanel,
    print,
    print2,
    getHtml,
    inferDataFields,
    normalizeDataSources,
    normalizeDataSource,
    normalizeDataField,
    normalizeDataBinding,
    createDataSourceStore,
    DataSourceStore,
    applyDataBindingState,
    createDataBindingStateFromField,
    isDataFieldBound,
    isSelectableBindingField,
    readDataBindingState,
    toRowContextFields,
    resolveDataBindingValue,
    getValueByPath,
    optionPanelClassNames: OPTION_PANEL_CLASS_NAMES,
    setClientPrintEnabled,
    isClientPrintEnabled,
    setClientPrintEndpoint,
    getClientPrintEndpoint,
    setClientPrintToken,
    getClientPrintToken,
    setMessageHandler,
    getMessageHandler
  };
  installModule33SideEffects();
  startHiWebSocketWhenDocumentReady();
  if (typeof window !== "undefined") {
    window.hiprint = hiprint;
  }
  exports.CustomPrintElement = CustomPrintElement;
  exports.DataSourcePanel = DataSourcePanel;
  exports.DataSourceStore = DataSourceStore;
  exports.OPTION_PANEL_CLASS_NAMES = OPTION_PANEL_CLASS_NAMES;
  exports.PrintElementTypeGroup = PrintElementTypeGroup;
  exports.PrintElementTypeManager = PrintElementTypeManager;
  exports.PrintTemplate = PrintTemplate;
  exports.applyDataBindingState = applyDataBindingState;
  exports.createDataBindingStateFromField = createDataBindingStateFromField;
  exports.createDataSourceStore = createDataSourceStore;
  exports.default = hiprint;
  exports.getClientPrintEndpoint = getClientPrintEndpoint;
  exports.getHtml = getHtml;
  exports.getMessageHandler = getMessageHandler;
  exports.getValueByPath = getValueByPath;
  exports.hiprint = hiprint;
  exports.inferDataFields = inferDataFields;
  exports.isClientPrintEnabled = isClientPrintEnabled;
  exports.isDataFieldBound = isDataFieldBound;
  exports.isSelectableBindingField = isSelectableBindingField;
  exports.normalizeDataBinding = normalizeDataBinding;
  exports.normalizeDataField = normalizeDataField;
  exports.normalizeDataSource = normalizeDataSource;
  exports.normalizeDataSources = normalizeDataSources;
  exports.print = print;
  exports.print2 = print2;
  exports.readDataBindingState = readDataBindingState;
  exports.resolveDataBindingValue = resolveDataBindingValue;
  exports.setClientPrintEnabled = setClientPrintEnabled;
  exports.setClientPrintEndpoint = setClientPrintEndpoint;
  exports.setMessageHandler = setMessageHandler;
  exports.toRowContextFields = toRowContextFields;
  Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
})(this.hiprint = this.hiprint || {});
//# sourceMappingURL=hiprint.build.js.map
