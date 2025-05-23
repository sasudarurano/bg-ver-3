require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const serverless = require("serverless-http"); // penting!

const app = express();

const UPLOAD_DIR = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Setup multer untuk upload file
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = file.originalname.replace(ext, '').replace(/\s+/g, '_');
        cb(null, `${name}-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Halaman upload
app.get('/', (req, res) => {
    res.render('upload');
});

// Proses upload dan hapus background
app.post('/process', upload.array('images', 10), async (req, res) => {
    const files = req.files;
    if (!files || files.length === 0) {
        return res.status(400).send('No files uploaded');
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) return res.status(500).send('Missing API key');

    const processedFiles = [];

    try {
        for (const file of files) {
            // Kirim file ke API remove.bg
            const formData = new FormData();
            formData.append('image_file', fs.createReadStream(file.path));
            formData.append('size', 'auto');

            const response = await axios({
                method: 'post',
                url: 'https://api.remove.bg/v1.0/removebg',
                data: formData,
                responseType: 'arraybuffer',
                headers: {
                    ...formData.getHeaders(),
                    'X-Api-Key': apiKey,
                },
            });

            if (response.status !== 200) {
                throw new Error('Failed to remove background');
            }

            // Simpan hasil file PNG tanpa background
            const outputFilename = file.filename.replace(path.extname(file.filename), '_no_bg.png');
            const outputPath = path.join(UPLOAD_DIR, outputFilename);
            fs.writeFileSync(outputPath, response.data);

            processedFiles.push({
                original: file.filename,
                result: outputFilename
            });
        }

        res.render('result', { files: processedFiles });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing images');
    }
});

// Route untuk download satu file
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(UPLOAD_DIR, filename);
    res.download(filepath);
});

// Route untuk download semua file sebagai ZIP
const archiver = require('archiver');
app.get('/download_all', (req, res) => {
    const files = fs.readdirSync(UPLOAD_DIR).filter(f => f.endsWith('_no_bg.png'));
    if (files.length === 0) return res.status(404).send('No files to download');

    res.attachment('all_no_bg_images.zip');
    const archive = archiver('zip');
    archive.pipe(res);

    files.forEach(file => {
        archive.file(path.join(UPLOAD_DIR, file), { name: file });
    });

    archive.finalize();
});

// Jalankan server (Vercel akan override)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
