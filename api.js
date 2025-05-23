const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;

// Folder untuk simpan upload & hasil
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

// Setup multer untuk upload multiple images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// Remove.bg API key (isi dengan API key Anda)
const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;

if (!REMOVE_BG_API_KEY) {
  console.warn("Warning: REMOVE_BG_API_KEY belum di-set di environment variables.");
}

// Fungsi hapus background via remove.bg API
async function removeBackground(inputFilePath, outputFilePath) {
  const formData = new FormData();
  formData.append('image_file', fs.createReadStream(inputFilePath));
  formData.append('size', 'auto');

  const response = await axios({
    method: 'post',
    url: 'https://api.remove.bg/v1.0/removebg',
    data: formData,
    responseType: 'arraybuffer',
    headers: {
      ...formData.getHeaders(),
      'X-Api-Key': REMOVE_BG_API_KEY,
    },
  });

  if (response.status !== 200) {
    throw new Error('Failed to remove background');
  }

  fs.writeFileSync(outputFilePath, response.data);
}

// Endpoint proses upload dan background removal
app.post('/process', upload.array('images'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send("No files uploaded");
  }

  let processedFiles = [];

  try {
    for (const file of req.files) {
      const inputPath = file.path;
      const outputFilename = file.filename.replace(path.extname(file.filename), '_no_bg.png');
      const outputPath = path.join(UPLOAD_DIR, outputFilename);

      await removeBackground(inputPath, outputPath);

      processedFiles.push({
        original: file.originalname,
        result: outputFilename,
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error processing images");
  }

  // Simpan data hasil ke sessionStorage di client dengan redirect ke halaman result
  // Karena Express tidak bisa langsung set sessionStorage, kita redirect ke /result dan
  // kirim data lewat query string atau lebih baik simpan di file sementara.

  // Solusi sederhana: simpan data hasil di file JSON sementara berdasarkan session id,
  // tapi supaya simpel kita akan kirim data lewat redirect query (encode URI).

  const dataStr = encodeURIComponent(JSON.stringify(processedFiles));
  res.redirect(`/result?files=${dataStr}`);
});

// Endpoint tampil halaman result
app.get('/result', (req, res) => {
  // Halaman result.html static, kita butuh kirim data files ke client side.
  // Maka kita render static result.html dan di client-side ambil dari query string.

  res.sendFile(path.join(__dirname, 'public', 'result.html'));
});

// Endpoint download single file
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// Endpoint download all hasil zip
app.get('/download_all', (req, res) => {
  const output = new stream.PassThrough();
  const archive = archiver('zip', { zlib: { level: 9 } });

  res.attachment('all_no_bg_images.zip');

  archive.pipe(res);

  fs.readdirSync(UPLOAD_DIR)
    .filter(f => f.endsWith('_no_bg.png'))
    .forEach(file => {
      archive.file(path.join(UPLOAD_DIR, file), { name: file });
    });

  archive.finalize();
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
