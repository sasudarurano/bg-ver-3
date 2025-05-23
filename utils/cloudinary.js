const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dj5pru8pr',
  api_key: '261976255259265',
  api_secret: 'yPwNx6qgBahO_NgVj_vKDspNPFk'
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
