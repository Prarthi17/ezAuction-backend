const { body } = require("express-validator");

// User validation
const validateRegister = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];

const validateLogin = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Product validation
const validateProduct = [
  body("title").notEmpty().withMessage("Title is required"),
  body("description").notEmpty().withMessage("Description is required"),
  body("price").isFloat({ gt: 0 }).withMessage("Price must be greater than 0"),
  body("category").notEmpty().withMessage("Category is required"),
];

// Category validation
const validateCategory = [
  body("title").notEmpty().withMessage("Title is required"),
];

// Bidding validation
const validateBid = [
  body("productId").notEmpty().withMessage("Product ID is required"),
  body("price").isFloat({ gt: 0 }).withMessage("Bid price must be greater than 0"),
];

module.exports = {
  validateRegister,
  validateLogin,
  validateProduct,
  validateCategory,
  validateBid,
};
