const express = require("express");
const {
  createProduct,
  getAllProducts,
  deleteProduct,
  updateProduct,
  getProductBySlug,
  getAllProductsByAmdin,
  deleteProductsByAmdin,
  getAllSoldProducts,
  verifyAndAddCommissionProductByAmdin,
  getAllProductsofUser,
  getWonProducts,
} = require("../controllers/productCtr");
const { upload } = require("../utils/fileUpload");
const { protect, isSeller, isAdmin } = require("../middleware/authMiddleware");
const { validateProduct } = require("../middleware/validationMiddleware");
const { validationResult } = require("express-validator");
const router = express.Router();

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

router.post(
  "/",
  protect,
  isSeller,
  upload.single("image"),
  validateProduct,
  handleValidationErrors,
  createProduct
);
router.delete("/:id", protect, isSeller, deleteProduct);
router.put(
  "/:id",
  protect,
  isSeller,
  upload.single("image"),
  validateProduct,
  handleValidationErrors,
  updateProduct
);

router.get("/", getAllProducts);
router.get("/user", protect, getAllProductsofUser);
router.get("/won-products", protect, getWonProducts);
router.get("/sold", getAllSoldProducts);
router.get("/:id", getProductBySlug);

// Only access for admin users
router.patch(
  "/admin/product-verified/:id",
  protect,
  isAdmin,
  verifyAndAddCommissionProductByAmdin
);
router.get("/admin/products", protect, isAdmin, getAllProductsByAmdin);
router.delete("/admin/products", protect, isAdmin, deleteProductsByAmdin);

module.exports = router;
