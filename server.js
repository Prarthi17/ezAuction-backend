const dotenv = require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const userRoute = require("./routes/userRoute");
const productRoute = require("./routes/productRoute");
const biddingRoute = require("./routes/biddingRoute");
const categoryRoute = require("./routes/categoryRoute");
const errorHandler = require("./middleware/errorMiddleware");

// const User = require("./models/userModel");

const app = express();

// Security Middlewares
app.use(helmet());
app.use(morgan("dev"));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

//middlewareswe
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors({
  origin: ["http://localhost:3000"],
  credentials: true,
}));

const PORT = process.env.PORT || 5000;

//Routes Middleware
app.use("/api/users", userRoute);
app.use("/api/product", productRoute);
app.use("/api/bidding", biddingRoute);
app.use("/api/category", categoryRoute);


app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.get("/", (req, res) => {
  res.send("Home Pages");
});

// Error Middleware
app.use(errorHandler);

//connect to mongoose
mongoose.connect(process.env.DATABASE_CLOUD)
.then(() => {
  app.listen(PORT, () => {
    console.log(`Server Running on port ${PORT}`);
  });
})
.catch((err) => {
  console.log(err);
});
