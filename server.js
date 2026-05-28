const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 41010; // Asegúrate que este sea el puerto que te asignó DuckCloud

app.use(express.json());

// Ruta principal para verificar que el servidor vive
app.get('/', (req, res) => {
    res.send('🚀 Bot de Descargas Activo');
});

// Endpoint para descargar
app.post('/api/download', async (req, res) => {
    const { videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: "Falta la URL del video" });
    }

    const fileName = `video_${Date.now()}.mp4`;
    const outputPath = path.join(__dirname, 'downloads', fileName);

    // Aseguramos que la carpeta existe
    if (!fs.existsSync(path.join(__dirname, 'downloads'))) {
        fs.mkdirSync(path.join(__dirname, 'downloads'));
    }

    // Comando blindado con cookies
    const ytdlpCommand = `yt-dlp --no-check-certificate --no-cache-dir --cookies "${path.join(__dirname, 'cookies.txt')}" -f "best[ext=mp4]/best" -o "${outputPath}" "${videoUrl}"`;

    console.log("📥 Procesando:", videoUrl);

    exec(ytdlpCommand, (error, stdout, stderr) => {
        if (error) {
            console.error("❌ Error de ejecución:", stderr);
            return res.status(500).json({ error: "Fallo en la descarga", details: stderr });
        }

        console.log("✅ Video descargado:", fileName);

        // Retornamos la URL pública
        const downloadUrl = `http://descargas.duck.opik.net:${PORT}/downloads/${fileName}`;
        
        res.json({
            success: true,
            downloadUrl: downloadUrl
        });

        // Borrado automático tras 10 minutos (600,000 ms)
        setTimeout(() => {
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
                console.log(`🗑️ Archivo ${fileName} borrado.`);
            }
        }, 600000);
    });
});

// Servir archivos estáticos para que el bot pueda bajar el video
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

app.listen(PORT, () => {
    console.log(`🚀 Servidor de descargas activo en el puerto ${PORT}`);
});
