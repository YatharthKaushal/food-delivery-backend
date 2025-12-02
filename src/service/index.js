import express from "express";
import deleteAccountPolicy from "./deleteAccountPolicy.js";

const router = express.Router();

// Mount delete account policy routes
router.use("/", deleteAccountPolicy);

export default router;
