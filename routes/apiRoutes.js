const express = require("express");
const router = express.Router();
const apiController = require("../controllers/apiController");

router.get("/", apiController.getDashboard);
router.post("/", apiController.createList);
router.get("/:id", apiController.getList);
router.put("/:id", apiController.updateList);
router.delete("/:id", apiController.deleteList);
router.post("/:id/fallbacks", apiController.updateFallbacks);
router.get("/:id/users", apiController.getUsers);
router.post("/:id/users", apiController.createUser);
router.post("/:id/users/upload", apiController.uploadUsers);
router.delete("/:id1/users/:id2", apiController.deleteUser);
module.exports = router;
