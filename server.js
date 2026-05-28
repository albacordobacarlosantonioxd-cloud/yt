const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Hacer que la carpeta "downloads" sea pública en internet
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

const PORT = process.env.PORT || 8080;

// Asegurarnos de que la carpeta de descargas exista al arrancar el servidor
if (!fs.existsSync('./downloads')) {
    fs.mkdirSync('./downloads');
}

app.post('/api/download', async (req, res) => {
    const { videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: "Falta la URL del video (videoUrl)" });
    }

    // Nombre único para el archivo basado en el tiempo actual
    const outputName = `video_${Date.now()}.mp4`;
    const outputPath = path.join(__dirname, 'downloads', outputName);

    console.log(`\n🚀 Descargando en 720p al almacenamiento local: ${videoUrl}`);

    // Comando yt-dlp para forzar calidad máxima de 720p en formato MP4
    const ytdlpCommand = `yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" --merge-output-format mp4 -o "${outputPath}" "${videoUrl}"`;

    exec(ytdlpCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Error en yt-dlp: ${error.message}`);
            return res.status(500).json({ error: "Error al descargar el video con yt-dlp" });
        }

        console.log("✅ Video descargado con éxito en el servidor.");

        // Construir el enlace de descarga pública dinámicamente
        const host = req.get('host'); 
        const protocol = req.protocol; 
        const finalDownloadLink = `${protocol}://${host}/downloads/${outputName}`;

        // 1. RESPONDEMOS DE INMEDIATO AL BOT CON EL JSON
        res.status(200).json({
            success: true,
            message: "Video procesado con éxito",
            downloadUrl: finalDownloadLink
        });

        // 2. ⏳ CRONÓMETRO DE AUTO-DESTRUCCIÓN (2 MINUTOS)
        // 2 minutos = 2 * 60 * 1000 = 120,000 milisegundos
        console.log(`⏱️ Temporizador activado: El archivo ${outputName} se borrará en 2 minutos.`);
        
        setTimeout(() => {
            try {
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                    console.log(`🧹 [Limpieza Automática]: Archivo ${outputName} eliminado del disco.`);
                }
            } catch (err) {
                console.error("❌ Error al intentar borrar el archivo caducado:", err.message);
            }
        }, 600000); 
    });
});

app.listen(PORT, () => {
    console.log(`🏁 Servidor de descargas activo en el puerto ${PORT}`);
});
