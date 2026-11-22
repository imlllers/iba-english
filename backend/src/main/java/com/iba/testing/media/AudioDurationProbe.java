package com.iba.testing.media;

import com.mpatric.mp3agic.Mp3File;

import javax.sound.sampled.AudioFileFormat;
import javax.sound.sampled.AudioSystem;
import java.nio.file.Path;
import java.util.Locale;
import java.util.OptionalInt;

public final class AudioDurationProbe {

    private AudioDurationProbe() {
    }

    public static OptionalInt probeSeconds(Path file) {
        return probeSeconds(file, null);
    }

    public static OptionalInt probeSeconds(Path file, String mimeType) {
        if (file == null || !java.nio.file.Files.isRegularFile(file)) {
            return OptionalInt.empty();
        }
        if (mpeg(file, mimeType)) {
            return probeMp3(file);
        }
        return probeWave(file);
    }

    private static boolean mpeg(Path file, String mimeType) {
        String mime = mimeType == null ? "" : mimeType.toLowerCase(Locale.ROOT).split(";")[0].trim();
        if ("audio/mpeg".equals(mime) || "audio/mp3".equals(mime)) {
            return true;
        }
        String name = file.getFileName() == null ? "" : file.getFileName().toString().toLowerCase(Locale.ROOT);
        return name.endsWith(".mp3");
    }

    private static OptionalInt probeMp3(Path file) {
        try {
            Mp3File mp3 = new Mp3File(file.toFile());
            long millis = mp3.getLengthInMilliseconds();
            if (millis <= 0) {
                return OptionalInt.empty();
            }
            int seconds = (int) Math.ceil(millis / 1000.0);
            return seconds > 0 ? OptionalInt.of(seconds) : OptionalInt.empty();
        } catch (Exception ignored) {
            return OptionalInt.empty();
        }
    }

    private static OptionalInt probeWave(Path file) {
        try {
            AudioFileFormat format = AudioSystem.getAudioFileFormat(file.toFile());
            long frames = format.getFrameLength();
            if (frames <= 0 || frames == AudioSystem.NOT_SPECIFIED) {
                return OptionalInt.empty();
            }
            float rate = format.getFormat().getFrameRate();
            if (rate <= 0) {
                return OptionalInt.empty();
            }
            int seconds = (int) Math.ceil(frames / rate);
            return seconds > 0 ? OptionalInt.of(seconds) : OptionalInt.empty();
        } catch (Exception ignored) {
            return OptionalInt.empty();
        }
    }
}
