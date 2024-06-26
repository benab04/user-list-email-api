const express = require("express");
const router = express.Router();
const listController = require("../controllers/listController");

router.get("/new", (req, res) => {
  res.render("createList");
});

router.get("/", listController.getDashboard);
router.post("/", listController.createList);
router.get("/:id", listController.getList);
router.put("/:id", listController.updateList);
router.delete("/:id", listController.deleteList);
router.get("/:id/edit", listController.editList);
router.post("/:id/fallbacks", listController.updateFallbacks);
module.exports = router;
