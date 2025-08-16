const express = require("express");
const {
  createCategory,
  getAllCategory,
  getCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryCtr");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const { validateCategory } = require("../middleware/validationMiddleware");
const { validationResult } = require("express-validator");

const categoryRoute = express.Router();

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

categoryRoute.post(
  "/",
  protect,
  isAdmin,
  validateCategory,
  handleValidationErrors,
  createCategory
);
categoryRoute.get("/", getAllCategory);
categoryRoute.get("/:id", protect, isAdmin, getCategory);
categoryRoute.put(
  "/:id",
  protect,
  isAdmin,
  validateCategory,
  handleValidationErrors,
  updateCategory
);
categoryRoute.delete("/:id", protect, isAdmin, deleteCategory);

module.exports = categoryRoute;
