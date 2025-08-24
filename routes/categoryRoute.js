const express = require("express");
const {
  createCategory,
  getAllCategory,
  getCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryCtr");
const { protect, isAdmin } = require("../middleware/authMiddleware");

const categoryRoute = express.Router();

categoryRoute.post("/", protect, isAdmin, createCategory);
categoryRoute.get("/", getAllCategory);
categoryRoute.get("/:id", protect, isAdmin, getCategory);
categoryRoute.put("/:id", protect, isAdmin, updateCategory);
categoryRoute.delete("/:id", protect, isAdmin, deleteCategory);

module.exports = categoryRoute;
