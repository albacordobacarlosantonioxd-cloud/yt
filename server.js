const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// 🛠️ TRUCO CLAVE: Hacer que la carpeta "downloads" sea pública en internet
// Todo lo que se guarde aquí se podrá descargar poniendo la URL del servidor
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

const PORT = process.env.PORT || 3000;

// Asegurarnos de que la carpeta de descargas exista al arrancar
if (!fs.existsSync('./downloads')) {
    fs.mkdirSync('./downloads');
}

app.post('/api/download', async (req, res) => {
    const { videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: "Falta la URL del video (videoUrl)" });
    }

    // Guardamos el video dentro de la carpeta pública con un nombre único
    const outputName = `video_${Date.now()}.mp4`;
    const outputPath = path.join(__dirname, 'downloads', outputName);

    console.log(`\n🚀 Descargando en 720p directamente al servidor: ${videoUrl}`);

    // Comando yt-dlp para clavar la calidad a 720p en MP4
    const ytdlpCommand = `yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" --merge-output-format mp4 -o "${outputPath}" "${videoUrl}"`;

    exec(ytdlpCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Error en yt-dlp: ${error.message}`);
            return res.status(500).json({ error: "Error al descargar el video con yt-dlp" });
        }

        console.log("✅ Video descargado con éxito en el almacenamiento local.");

        // 🎯 CONSTRUIMOS EL ENLACE DIRECTO DE TU PROPIO SERVIDOR
        // Usamos el host dinámico de la petición para que funcione tanto en local como en DuckCloud
        const host = req.get('host'); 
        const protocol = req.protocol; // http o https
        
        const finalDownloadLink = `${protocol}://${host}/downloads/${outputName}`;

        // 📦 DEVOLVEMOS EL JSON LIMPIO CON TU PROPIO LINK
        return res.status(200).json({
            success: true,
            message: "Video procesado con éxito",
            downloadUrl: finalDownloadLink
        });
    });
});

app.listen(PORT, () => {
    console.log(`🏁 Servidor de descargas activo en http://localhost:${PORT}`);
});
