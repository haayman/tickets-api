const express = require("express");
const router = express.Router();

// expressjs.com
router.get("/", (req, res) => {
  res.render("index", { title: "The title", message: "Hello world" });
});

module.exports = router;
