package com.iba.testing.media;

import java.nio.charset.StandardCharsets;

final class FileSignatures {

    private FileSignatures() {
    }

    static boolean matches(String mime, byte[] head) {
        return switch (mime) {
            case "image/png" -> starts(head, 0, new byte[]{(byte) 0x89, 'P', 'N', 'G'});
            case "image/jpeg" -> starts(head, 0, new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});
            case "image/gif" -> ascii(head, 0, "GIF8");
            case "image/webp" -> ascii(head, 0, "RIFF") && ascii(head, 8, "WEBP");
            case "audio/mpeg" -> ascii(head, 0, "ID3") || (head.length > 1 && (head[0] & 0xFF) == 0xFF && (head[1] & 0xE0) == 0xE0);
            case "audio/wav" -> ascii(head, 0, "RIFF") && ascii(head, 8, "WAVE");
            case "audio/ogg" -> ascii(head, 0, "OggS");
            case "audio/webm" -> starts(head, 0, new byte[]{0x1A, 0x45, (byte) 0xDF, (byte) 0xA3});
            case "audio/mp4", "video/mp4" -> ascii(head, 4, "ftyp");
            case "video/webm" -> starts(head, 0, new byte[]{0x1A, 0x45, (byte) 0xDF, (byte) 0xA3});
            case "application/pdf" -> ascii(head, 0, "%PDF");
            default -> false;
        };
    }

    private static boolean ascii(byte[] head, int offset, String text) {
        return starts(head, offset, text.getBytes(StandardCharsets.US_ASCII));
    }

    private static boolean starts(byte[] head, int offset, byte[] expected) {
        if (head.length < offset + expected.length) {
            return false;
        }
        for (int index = 0; index < expected.length; index++) {
            if (head[offset + index] != expected[index]) {
                return false;
            }
        }
        return true;
    }
}
