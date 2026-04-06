const express = require("express");
const router = express.Router();
const {
  createAsset,
  getAllAssets,
  getAssetById,
} = require("../controllers/asset.controller");

router.post("/", createAsset);
router.get("/", getAllAssets);
router.get("/:id", getAssetById);

module.exports = router;