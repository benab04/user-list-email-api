const express = require("express");
const router = express.Router();
const listController = require("../controllers/listController");

router.get("/new", (req, res) => {
  res.render("createList");
});

router.post("/", listController.createList);
router.get("/:id", listController.getList);
router.delete("/:id", listController.deleteList);
// router.get("/", listController.getDashboard);

module.exports = router;
