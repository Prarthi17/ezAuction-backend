const asyncHandler = require("express-async-handler");
// const User = require("../models/userModel");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
// const Product = require("../model/productModel");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// Cookie options: secure in production, lax in development (so it works on http://localhost)
const isProd = process.env.NODE_ENV === 'production';
const authCookieOptions = {
  path: "/",
  httpOnly: true,
  expires: new Date(Date.now() + 1000 * 86400), // 1 day
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
};
const logoutCookieOptions = {
  path: "/",
  httpOnly: true,
  expires: new Date(0),
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
};

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password,role ,commissionBalance,balance} = req.body;
  // console.log("REQ BODY:", req.body);

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please fill in all required fileds");
  }

  const userExits = await User.findOne({ email });
  if (userExits) {
    res.status(400);
    throw new Error("Email is already exit");
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || "buyer",
    commissionBalance,
    balance,
  });

  const token = generateToken(user._id);
  res.cookie("token", token, authCookieOptions);

  if (user) {
    const { _id, name, email, photo, role } = user;
    res.status(201).json({ _id, name, email, photo, token, role });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please add Email and Password");
  }
  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error("User not found, Please signUp");
  }

  const passwordIsCorrrect = await bcrypt.compare(password, user.password);

  const token = generateToken(user._id);
  res.cookie("token", token, authCookieOptions);

  if (user && passwordIsCorrrect) {
    const { _id, name, email, photo, role } = user;
    res.status(201).json({ _id, name, email, photo, role, token });
  } else {
    res.status(400);
    throw new Error("Invalid email or password");
  }
});

const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json(false);
  }
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  if (verified) {
    return res.json(true);
  }
  return res.json(false);
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  res.status(200).json(user);
});

// Update profile: name, email, balance and photo (multipart form with field name 'photo')
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name, email, balance } = req.body;
  if (name) user.name = name;

  // Email update with uniqueness check
  if (email && email !== user.email) {
    const exists = await User.findOne({ email });
    if (exists && exists._id.toString() !== user._id.toString()) {
      res.status(400);
      throw new Error("Email already in use");
    }
    user.email = email;
  }

  // Balance update (number)
  if (balance !== undefined) {
    const num = Number(balance);
    if (Number.isNaN(num)) {
      res.status(400);
      throw new Error("Balance must be a number");
    }
    user.balance = num;
  }

  // If file uploaded via multer
  if (req.file) {
    // Delete previous local file if it exists and was stored under /uploads
    try {
      if (user.photo && user.photo.startsWith("/uploads/")) {
        const oldPath = path.join(process.cwd(), user.photo.replace(/^\//, ""));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    } catch (err) {
      // Log and continue; photo replacement should still proceed
      console.warn("Failed to remove old user photo:", err.message);
    }

    // Stored by multer in /uploads, serve via /uploads static route
    user.photo = `/uploads/${req.file.filename}`;
  }

  await user.save();
  const { _id, email: newEmail, role, photo, balance: newBalance, commissionBalance } = user;
  res.status(200).json({ _id, name: user.name, email: newEmail, role, photo, balance: newBalance, commissionBalance });
});

// Change password: requires oldPassword and newPassword
const updateUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    res.status(400);
    throw new Error("oldPassword and newPassword are required");
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  const match = await bcrypt.compare(oldPassword, user.password);
  if (!match) {
    res.status(400);
    throw new Error("Old password is incorrect");
  }
  user.password = newPassword; // will be hashed by pre-save hook
  await user.save();
  res.status(200).json({ message: "Password updated" });
});

const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("token", "", logoutCookieOptions);
  return res.status(200).json({ message: "Successfully Logged Out" });
});

/* const loginAsSeller = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please add Email and Password");
  }
  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error("User not found, Please signUp");
  }

  const passwordIsCorrrect = await bcrypt.compare(password, user.password);

  const token = generateToken(user._id);

  res.cookie("token", token, authCookieOptions);

  user.role = "seller";
  user.save();
  if (user && passwordIsCorrrect) {
    const { _id, name, email, photo, role } = user;
    res.status(201).json({ _id, name, email, photo, role, token });
  } else {
    res.status(400);
    throw new Error("Invalid email or password");
  }
}); */
const loginAsSeller = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide both email and password");
  }

  // Find the user by email
  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error("User not found, please sign up");
  }

  // Verify the password
  const passwordIsCorrect = await bcrypt.compare(password, user.password);
  if (!passwordIsCorrect) {
    res.status(400);
    throw new Error("Invalid email or password");
  }

  // If password is correct, update the role to 'seller'
  user.role = "seller";
  await user.save();

  // Generate a token and set cookie
  const token = generateToken(user._id);
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400),
    sameSite: "none",
    secure: true,
  });

  // Send the response with updated user info
  const { _id, name, email: userEmail, photo, role } = user;
  res.status(200).json({ _id, name, email: userEmail, photo, role, token });
});

const getUserBalance = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    balance: user.balance,
  });
});

// Only for admin users
const getAllUser = asyncHandler(async (req, res) => {
  const userList = await User.find({});

  if (!userList.length) {
    return res.status(404).json({ message: "No user found" });
  }

  res.status(200).json(userList);
});

const estimateIncome = asyncHandler(async (req, res) => {
  try {
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      return res.status(404).json({ error: "Admin user not found" });
    }
    const commissionBalance = admin.commissionBalance;
    res.status(200).json({ commissionBalance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = {
  registerUser,
  loginUser,
  loginStatus,
  logoutUser,
  loginAsSeller,
  estimateIncome,
  getUser,
  updateUserProfile,
  updateUserPassword,
  getUserBalance,
  getAllUser,
};
