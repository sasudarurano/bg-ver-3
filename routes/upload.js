const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' }); // folder lokal sementara
const { uploadFile } = require('../utils/cloudinary');

// POST /upload
router.post('/', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;

  const cloudinaryUrl = await uploadFile(filePath);

  fs.unlinkSync(filePath); // hapus file lokal setelah upload

  if (cloudinaryUrl) {
    res.json({ success: true, url: cloudinaryUrl });
  } else {
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

module.exports = router;
