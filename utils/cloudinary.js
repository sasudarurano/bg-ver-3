const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'your-cloud-name',
  api_key: 'your-api-key',
  api_secret: 'your-api-secret'
});

const uploadFile = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'uploads' // opsional, bisa bikin folder di Cloudinary
    });
    return result.secure_url;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
};

module.exports = { uploadFile };
