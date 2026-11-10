package com.iba.testing.export;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.media.MediaAsset;
import com.iba.testing.media.MediaAssetRepository;
import com.iba.testing.media.MediaService;
import com.iba.testing.test.ExamAccess;
import com.iba.testing.test.ExamTest;
import com.iba.testing.test.TestViews;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class TestTransferService {

    private final ExamAccess access;
    private final TestViews views;
    private final MediaAssetRepository assets;
    private final MediaService media;
    private final ObjectMapper mapper;

    public TestTransferService(ExamAccess access, TestViews views, MediaAssetRepository assets, MediaService media, ObjectMapper mapper) {
        this.access = access;
        this.views = views;
        this.assets = assets;
        this.media = media;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public byte[] exportZip(UUID ownerId, UUID testId) {
        ExamTest test = access.requireOwned(testId, ownerId);
        ObjectNode snapshot = views.snapshot(test);
        ArrayNode manifest = mapper.createArrayNode();
        Map<UUID, MediaAsset> used = new HashMap<>();
        String raw = snapshot.toString();
        for (MediaAsset asset : assets.findByOwnerAndAttemptIsNull(test.getOwner())) {
            if (raw.contains(asset.getId().toString())) {
                used.put(asset.getId(), asset);
                ObjectNode item = manifest.addObject();
                item.put("id", asset.getId().toString());
                item.put("filename", asset.getOriginalFilename());
                item.put("mime", asset.getMimeType());
                item.put("entry", "media/" + asset.getStorageKey());
            }
        }
        ObjectNode root = mapper.createObjectNode();
        root.put("schemaVersion", 1);
        root.set("test", testMeta(test));
        root.set("sections", snapshot.path("sections"));
        root.set("media", manifest);
        try {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(buffer)) {
                zip.putNextEntry(new ZipEntry("test.json"));
                zip.write(mapper.writeValueAsBytes(root));
                zip.closeEntry();
                for (MediaAsset asset : used.values()) {
                    var path = media.directory().resolve(asset.getStorageKey());
                    if (Files.exists(path)) {
                        zip.putNextEntry(new ZipEntry("media/" + asset.getStorageKey()));
                        zip.write(Files.readAllBytes(path));
                        zip.closeEntry();
                    }
                }
            }
            return buffer.toByteArray();
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL", "Не удалось собрать экспорт");
        }
    }

    private ObjectNode testMeta(ExamTest test) {
        ObjectNode node = mapper.createObjectNode();
        node.put("title", test.getTitle());
        node.put("description", test.getDescription());
        if (test.getExamPreset() == null) {
            node.putNull("examPreset");
        } else {
            node.put("examPreset", test.getExamPreset());
        }
        node.set("settings", test.getSettings());
        return node;
    }
}
