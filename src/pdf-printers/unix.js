const unixPrint = require("unix-print");

function normalizeMediaName(pageSize) {
  if (typeof pageSize !== "string") return "";
  const value = pageSize.trim().toLowerCase();
  if (value === "a4") return "A4";
  if (value === "letter") return "Letter";
  return "";
}

function isCopiesOption(option) {
  return /(^|\s)-n\s+\d+(\s|$)/i.test(option) || /(^|\s)copies=/i.test(option);
}

function isCollateOption(option) {
  return /(^|\s)Collate=/i.test(option);
}

function getPrintOptions(data) {
  const options = Array.isArray(data.unixPrintOptions)
    ? data.unixPrintOptions.filter(
        (option) => !isCopiesOption(option) && !isCollateOption(option),
      )
    : [];
  const hasMediaOption = options.some((option) =>
    /(^|\s)(media|PageSize)=/i.test(option),
  );
  const media = normalizeMediaName(data.pageSize);
  if (!hasMediaOption && media) {
    options.push(`-o media=${media}`);
  }
  options.push(`-n ${data.copies}`);
  options.push(`-o Collate=${data.collate ? "True" : "False"}`);
  return options;
}

function printUnixPdf(pdfPath, printer, data) {
  const options = getPrintOptions(data);
  console.log(
    "print pdf:" +
      pdfPath +
      JSON.stringify({
        printer,
        unixPrintOptions: options,
        pageSize: data.pageSize,
        templateId: data.templateId,
        copies: data.copies,
        collate: data.collate,
      }),
  );
  return unixPrint.print(pdfPath, printer, options);
}

module.exports = {
  printUnixPdf,
};
