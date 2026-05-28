const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/api/download', async (req, res) => {
    const { videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: "Falta la URL del video (videoUrl)" });
    }

    const outputName = `video_${Date.now()}.mp4`;
    const outputPath = path.join(__dirname, outputName);

    console.log(`\n🚀 Procesando descarga en 720p para: ${videoUrl}`);

    // Comando yt-dlp para clavar la calidad a 720p en MP4 usando ffmpeg
    const ytdlpCommand = `yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" --merge-output-format mp4 -o "${outputPath}" "${videoUrl}"`;

    exec(ytdlpCommand, async (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Error en yt-dlp: ${error.message}`);
            return res.status(500).json({ error: "Error al descargar el video con yt-dlp" });
        }

        console.log("✅ Video listo localmente. Preparando subida a duck.opik.net...");

        try {
            if (!fs.existsSync(outputPath)) {
                throw new Error("El archivo no se creó en el disco.");
            }

            // Creamos el contenedor Form Data para el archivo
            const form = new FormData();
            form.append('file', fs.createReadStream(outputPath));

            console.log("☁️ Enviando ráfaga de datos a la nube...");

            // 🛠️ HEADERS ESPECÍFICOS PARA EVITAR ERRORES DE CONEXIÓN O RECHAZO
            const uploadResponse = await axios.post('https://duck.opik.net/api/upload', form, {
                headers: {
                    ...form.getHeaders(), // Genera automáticamente el Boundary obligatorio del multipart
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Linux; CharlyBot-Downloader; Node.js)'
                },
                maxContentLength: Infinity, // Evita que Axios truene si el video de 720p pesa más de 10MB
                maxBodyLength: Infinity
            });

            // 🧹 Borramos el video de tu PC para cuidar tu SSD inmediatamente
            fs.unlinkSync(outputPath);
            console.log("🧹 Archivo temporal eliminado del servidor local.");

            // 🎯 Procesamos la respuesta para extraer el enlace limpio
            // Nota: Si la API de opik te devuelve el link en data.url o data.file.url, lo mapeamos aquí
            const finalLink = uploadResponse.data.url || uploadResponse.data.data?.url || uploadResponse.data.link || "No se pudo extraer el enlace directo";

            // 📦 DEVOLVEMOS EL JSON CON EL ENLACE QUE TU BOT NECESITA
            return res.status(201).json({
                success: true,
                message: "Video descargado y alojado con éxito",
                downloadUrl: finalLink
            });

        } catch (uploadError) {
            console.error(`❌ Error al subir a Duck Opik: ${uploadError.message}`);
            
            // Limpieza preventiva si falló el internet al subir
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

            return res.status(500).json({
                success: false,
                error: "Fallo en la subida a la nube",
                details: uploadError.message
            });
        }
    });
});

app.listen(PORT, () => {
    console.log(`🏁 Servidor de descargas activo en http://localhost:${PORT}`);
});
