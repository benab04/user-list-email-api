const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/:id/users", userController.getUsers);
router.post("/:id/users", userController.createUser);
router.post("/:id/users/upload", userController.uploadUsers);

module.exports = router;
