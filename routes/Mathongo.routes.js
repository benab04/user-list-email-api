const express = require("express");
const router = express.Router();
const {getUsers, addUser, updateUser, deleteUser}=require("../controllers/Mathongo.controller")

router.get("/",getUsers);
router.post("/",addUser);
router.put("/:id",updateUser);
router.delete("/:id",deleteUser);

module.exports = router;