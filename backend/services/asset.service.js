const Asset = require("../models/Asset.model");

// ─────────────────────────────────────────────────────────────────────────────
//  ASSET SERVICE
//  All database operations + business logic for Assets go here.
//  Controller just calls these functions and sends the response.
// ─────────────────────────────────────────────────────────────────────────────

// ── CREATE ASSET ─────────────────────────────────────────────────────────────
const createAsset = async (assetData) => {
  const { asset_name, asset_type } = assetData;

  // Check if asset with this name already exists
  const existing = await Asset.findOne({
    asset_name: asset_name.trim(),
  });
  if (existing) {
    throw new Error(`Asset "${asset_name}" already exists`);
  }

  const asset = await Asset.create({ asset_name, asset_type });
  return asset;
};

// ── GET ALL ASSETS ────────────────────────────────────────────────────────────
const getAllAssets = async () => {
  const assets = await Asset.find().sort({ createdAt: -1 });
  return assets;
};

// ── GET SINGLE ASSET ─────────────────────────────────────────────────────────
const getAssetById = async (id) => {
  const asset = await Asset.findById(id);
  if (!asset) {
    throw new Error("Asset not found");
  }
  return asset;
};

// ── INCREMENT TICKET COUNT ────────────────────────────────────────────────────
// Called by ticket.service.js every time a NEW ticket is created for this asset
// Also updates warning_flag if count crosses 3
const incrementTicketCount = async (assetId) => {
  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw new Error("Asset not found while incrementing count");
  }

  asset.total_ticket_count += 1;

  // Business Rule: more than 3 tickets → flag this asset as high maintenance
  if (asset.total_ticket_count > 3) {
    asset.warning_flag = true;
  }

  await asset.save();
  return asset;
};

// ── DECREMENT TICKET COUNT ────────────────────────────────────────────────────
// Called by ticket.service.js every time a ticket for this asset is DELETED
// Re-evaluates warning_flag after decrement
const decrementTicketCount = async (assetId) => {
  const asset = await Asset.findById(assetId);
  if (!asset) return; // if asset was already deleted, just skip

  asset.total_ticket_count = Math.max(0, asset.total_ticket_count - 1);

  // Re-evaluate warning flag after decrement
  if (asset.total_ticket_count <= 3) {
    asset.warning_flag = false;
  }

  await asset.save();
  return asset;
};

module.exports = {
  createAsset,
  getAllAssets,
  getAssetById,
  incrementTicketCount,
  decrementTicketCount,
};