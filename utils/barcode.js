const bwipjs = require("bwip-js");

const generateBarcodeValue = ({ medicineId, batchId, expiryDate, price,}) => {
  const formattedExpiry = new Date(expiryDate).toISOString().split("T")[0];
  return `MED=${medicineId}|BATCH=${batchId}|EXP=${formattedExpiry}|PRICE=${price}`;
};

const generateBarcodeImage = async (barcodeValue,type = "qrcode") => {

  const options = {text: barcodeValue,scale: 4,includetext: true,textxalign: "center",};

  if (type === "qrcode") {
    return await bwipjs.toBuffer({...options,bcid: "qrcode", eclevel: "M", });
  }

  if (type === "barcode") {
    return await bwipjs.toBuffer({ ...options, bcid: "code128",height: 20,textsize: 10, });
  }
  throw new Error("Invalid code type");
};

module.exports = { generateBarcodeValue,generateBarcodeImage,};