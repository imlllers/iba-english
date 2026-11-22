package com.iba.testing.media;

import org.junit.jupiter.api.Test;

import java.net.URISyntaxException;
import java.nio.file.Path;
import java.util.Objects;
import java.util.OptionalInt;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AudioDurationProbeTest {

    @Test
    void readsLengthFromMpegFile() throws URISyntaxException {
        Path file = Path.of(Objects.requireNonNull(getClass().getResource("/media/probe-short.mp3")).toURI());
        OptionalInt seconds = AudioDurationProbe.probeSeconds(file, "audio/mpeg");
        assertTrue(seconds.isPresent());
        assertTrue(seconds.getAsInt() > 0);
    }
}
