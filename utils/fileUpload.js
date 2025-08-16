const multer = require("multer")
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads")
  },
  filename: function (req, file, cb) {
    // Sanitize filename
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, new Date().toISOString().replace(/:/g, "-") + "-" + safeName)
  },
})

function fileFilter(req, file, cb) {
  if (file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg") {
    cb(null, true)
  } else {
    cb(new Error("Only .png, .jpg and .jpeg format allowed!"), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
})

module.exports = { upload }
