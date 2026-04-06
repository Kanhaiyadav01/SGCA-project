const assetService = require("../services/asset.service");

// 
//  ASSET CONTROLLER — Thin layer, calls service, sends response
// 


// POST /api/assets
const createAsset = async (req, res) => {
  try {
    const asset = await assetService.createAsset(req.body);
    res.status(201).json({
      success: true,
      message: "Asset created successfully",
      data: asset,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


// GET /api/assets
const getAllAssets = async (req, res) => {
  try {
    const assets = await assetService.getAllAssets();
    res.status(200).json({
      success: true,
      count: assets.length,
      data: assets,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// GET /api/assets/:id
const getAssetById = async (req, res) => {
  try {
    const asset = await assetService.getAssetById(req.params.id);
    res.status(200).json({ success: true, data: asset });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};


module.exports = { createAsset, getAllAssets, getAssetById };