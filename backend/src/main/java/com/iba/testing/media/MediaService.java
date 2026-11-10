package com.iba.testing.media;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.attempt.AttemptStatus;
import com.iba.testing.attempt.TestAttempt;
import com.iba.testing.attempt.TestAttemptRepository;
import com.iba.testing.common.Tokens;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.config.AppProperties;
import com.iba.testing.platform.PlatformService;
import com.iba.testing.test.ExamTest;
import com.iba.testing.test.ExamTestRepository;
import com.iba.testing.test.TestStatus;
import com.iba.testing.test.TestVersionRepository;
import com.iba.testing.user.UserAccount;
import com.iba.testing.user.UserAccountRepository;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class MediaService {

    private static final int MAX_ATTEMPT_UPLOADS = 30;
    private static final int MAX_FOLDER_DEPTH = 16;
    private static final int MAX_FOLDERS_IN_VIEW = 200;

    private static final Map<String, String> EXTENSIONS = Map.ofEntries(
            Map.entry("image/png", "png"),
            Map.entry("image/jpeg", "jpg"),
            Map.entry("image/gif", "gif"),
            Map.entry("image/webp", "webp"),
            Map.entry("audio/mpeg", "mp3"),
            Map.entry("audio/wav", "wav"),
            Map.entry("audio/ogg", "ogg"),
            Map.entry("audio/webm", "webm"),
            Map.entry("audio/mp4", "m4a"),
            Map.entry("video/mp4", "mp4"),
            Map.entry("video/webm", "webm"),
            Map.entry("application/pdf", "pdf")
    );

    private static final Map<String, String> ALIASES = Map.of(
            "audio/x-m4a", "audio/mp4",
            "audio/m4a", "audio/mp4",
            "audio/x-wav", "audio/wav",
            "audio/wave", "audio/wav",
            "audio/mp3", "audio/mpeg",
            "image/jpg", "image/jpeg"
    );

    private final MediaAssetRepository assets;
    private final MediaFolderRepository folders;
    private final UserAccountRepository users;
    private final ExamTestRepository tests;
    private final TestVersionRepository versions;
    private final TestAttemptRepository attempts;
    private final PlatformService platform;
    private final AppProperties properties;
    private final ObjectMapper mapper;

    public MediaService(MediaAssetRepository assets, MediaFolderRepository folders, UserAccountRepository users,
                        ExamTestRepository tests, TestVersionRepository versions, TestAttemptRepository attempts,
                        PlatformService platform, AppProperties properties, ObjectMapper mapper) {
        this.assets = assets;
        this.folders = folders;
        this.users = users;
        this.tests = tests;
        this.versions = versions;
        this.attempts = attempts;
        this.platform = platform;
        this.properties = properties;
        this.mapper = mapper;
    }

    @Transactional
    public ObjectNode storeForTeacher(UUID ownerId, MultipartFile file, String folderId, boolean library) {
        UserAccount owner = users.findById(ownerId).orElseThrow();
        MediaFolder folder = library ? resolveFolder(owner, folderId, false) : null;
        MediaAsset asset = store(file, owner, null, folder);
        if (!library) {
            asset.setInLibrary(false);
            asset = assets.save(asset);
        }
        return toAssetNode(asset);
    }

    @Transactional
    public ObjectNode storeForAttempt(String attemptToken, MultipartFile file) {
        TestAttempt attempt = attempts.findByAccessTokenHash(Tokens.sha256(attemptToken))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Попытка не найдена"));
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_SUBMITTED", "Попытка уже отправлена");
        }
        if (attempt.getExpiresAt() != null && OffsetDateTime.now().isAfter(attempt.getExpiresAt())) {
            throw new ApiException(HttpStatus.CONFLICT, "TIME_EXPIRED", "Время теста истекло");
        }
        if (assets.countByAttempt(attempt) >= MAX_ATTEMPT_UPLOADS) {
            throw new ApiException(HttpStatus.CONFLICT, "UPLOAD_LIMIT", "Достигнут лимит файлов для попытки");
        }
        String mime = file == null || file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!mime.startsWith("audio/")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FILE_TYPE", "Можно загрузить только аудиозапись");
        }
        return toAssetNode(store(file, null, attempt, null));
    }

    @Transactional(readOnly = true)
    public ObjectNode browse(UUID ownerId, String folderId, String query, String kind, int page, int size) {
        UserAccount owner = users.findById(ownerId).orElseThrow();
        String safeQuery = query == null ? "" : query.trim();
        String safeKind = Set.of("image", "audio", "video", "application").contains(kind) ? kind : "";
        boolean searching = !safeQuery.isBlank();

        MediaFolder current = searching ? null : resolveFolder(owner, folderId, false);
        UUID currentId = current == null ? null : current.getId();

        List<MediaFolder> folderItems;
        if (searching) {
            folderItems = folders.searchByName(owner, safeQuery).stream().limit(MAX_FOLDERS_IN_VIEW).toList();
        } else {
            folderItems = folders.findChildren(owner, currentId);
            if (folderItems.size() > MAX_FOLDERS_IN_VIEW) {
                folderItems = folderItems.subList(0, MAX_FOLDERS_IN_VIEW);
            }
        }

        var files = searching
                ? assets.searchOwned(owner, safeQuery, safeKind, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                : assets.searchInFolder(owner, currentId, "", safeKind, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        ObjectNode response = mapper.createObjectNode();
        if (current == null) {
            response.putNull("folderId");
            response.put("folderName", "Материалы");
        } else {
            response.put("folderId", current.getId().toString());
            response.put("folderName", current.getName());
        }
        response.set("path", pathNodes(current));
        ArrayNode folderNodes = response.putArray("folders");
        for (MediaFolder folder : folderItems) {
            folderNodes.add(toFolderNode(folder));
        }
        ArrayNode itemNodes = response.putArray("items");
        files.forEach(asset -> itemNodes.add(toAssetNode(asset)));
        response.put("page", page);
        response.put("size", size);
        response.put("total", files.getTotalElements());
        response.put("searching", searching);
        return response;
    }

    @Transactional(readOnly = true)
    public ArrayNode allFolders(UUID ownerId) {
        UserAccount owner = users.findById(ownerId).orElseThrow();
        ArrayNode nodes = mapper.createArrayNode();
        folders.findAllOwned(owner).forEach(folder -> nodes.add(toFolderNode(folder)));
        return nodes;
    }

    @Transactional
    public ObjectNode createFolder(UUID ownerId, MediaFolderWriteRequest request) {
        UserAccount owner = users.findById(ownerId).orElseThrow();
        String name = cleanFolderName(request.name());
        MediaFolder parent = resolveFolder(owner, request.parentId(), false);
        ensureDepth(parent, 1);
        if (folders.existsSiblingName(owner, parent == null ? null : parent.getId(), name, null)) {
            throw new ApiException(HttpStatus.CONFLICT, "NAME_TAKEN", "Папка с таким именем уже есть");
        }
        MediaFolder folder = new MediaFolder();
        folder.setId(UUID.randomUUID());
        folder.setOwner(owner);
        folder.setParent(parent);
        folder.setName(name);
        folder.setCreatedAt(OffsetDateTime.now());
        return toFolderNode(folders.save(folder));
    }

    @Transactional
    public ObjectNode updateFolder(UUID ownerId, UUID folderId, MediaFolderWriteRequest request) {
        UserAccount owner = users.findById(ownerId).orElseThrow();
        MediaFolder folder = requireOwnedFolder(owner, folderId);
        if (request.name() != null && !request.name().isBlank()) {
            String name = cleanFolderName(request.name());
            UUID parentId = folder.getParent() == null ? null : folder.getParent().getId();
            if (folders.existsSiblingName(owner, parentId, name, folder.getId())) {
                throw new ApiException(HttpStatus.CONFLICT, "NAME_TAKEN", "Папка с таким именем уже есть");
            }
            folder.setName(name);
        }
        if (request.parentId() != null) {
            MediaFolder newParent = resolveFolder(owner, blankToNull(request.parentId()), true);
            moveFolder(owner, folder, newParent);
        }
        return toFolderNode(folders.save(folder));
    }

    @Transactional
    public void deleteFolder(UUID ownerId, UUID folderId) {
        UserAccount owner = users.findById(ownerId).orElseThrow();
        MediaFolder folder = requireOwnedFolder(owner, folderId);
        MediaFolder parent = folder.getParent();
        for (MediaFolder child : folders.findByParent(folder)) {
            UUID parentId = parent == null ? null : parent.getId();
            if (folders.existsSiblingName(owner, parentId, child.getName(), child.getId())) {
                child.setName(uniqueName(owner, parentId, child.getName(), child.getId()));
            }
            child.setParent(parent);
            folders.save(child);
        }
        if (parent == null) {
            assets.clearFolder(folder);
        } else {
            assets.moveAllFromFolder(folder, parent);
        }
        folders.delete(folder);
    }

    @Transactional
    public ObjectNode updateAsset(UUID ownerId, UUID mediaId, MediaAssetWriteRequest request) {
        UserAccount owner = users.findById(ownerId).orElseThrow();
        MediaAsset asset = requireOwnedAsset(owner, mediaId);
        if (request.filename() != null && !request.filename().isBlank()) {
            asset.setOriginalFilename(cleanName(request.filename()));
        }
        if (request.folderId() != null) {
            asset.setFolder(resolveFolder(owner, blankToNull(request.folderId()), true));
        }
        return toAssetNode(assets.save(asset));
    }

    @Transactional
    public void deleteAsset(UUID ownerId, UUID mediaId) {
        UserAccount owner = users.findById(ownerId).orElseThrow();
        MediaAsset asset = requireOwnedAsset(owner, mediaId);
        asset.setInLibrary(false);
        asset.setFolder(null);
        assets.save(asset);
    }

    @Transactional(readOnly = true)
    public StoredFile teacherFile(UUID ownerId, UUID mediaId) {
        MediaAsset asset = require(mediaId);
        if (asset.getOwner() == null || !asset.getOwner().getId().equals(ownerId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Файл не найден");
        }
        return read(asset);
    }

    @Transactional(readOnly = true)
    public StoredFile teacherAttemptFile(UUID ownerId, UUID attemptId, UUID mediaId) {
        TestAttempt attempt = attempts.findById(attemptId)
                .filter(item -> item.getTestVersion().getTest().getOwner().getId().equals(ownerId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Файл не найден"));
        return attemptAsset(attempt, mediaId);
    }

    @Transactional(readOnly = true)
    public StoredFile publicTestFile(String publicToken, UUID mediaId) {
        ExamTest test = tests.findByPublicToken(publicToken)
                .filter(item -> item.getStatus() == TestStatus.PUBLISHED)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Файл не найден"));
        OffsetDateTime expires = test.getPublicTokenExpiresAt();
        if (expires != null && !OffsetDateTime.now().isBefore(expires)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "LINK_EXPIRED", "Срок ссылки истёк");
        }
        var version = versions.findFirstByTestOrderByVersionNumberDesc(test)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Файл не найден"));
        if (!version.getContentSnapshot().toString().contains(mediaId.toString())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Файл не найден");
        }
        return read(require(mediaId));
    }

    @Transactional(readOnly = true)
    public StoredFile attemptFile(String attemptToken, UUID mediaId) {
        TestAttempt attempt = attempts.findByAccessTokenHash(Tokens.sha256(attemptToken))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Файл не найден"));
        return attemptAsset(attempt, mediaId);
    }

    public Path directory() {
        return Path.of(properties.getMediaDir());
    }

    public static boolean allowed(String mime, byte[] head) {
        String normalized = normalizeMime(mime);
        return EXTENSIONS.containsKey(normalized) && FileSignatures.matches(normalized, head);
    }

    public static String normalizeMime(String mime) {
        String clean = mime == null ? "" : mime.toLowerCase(Locale.ROOT).split(";")[0].trim();
        return ALIASES.getOrDefault(clean, clean);
    }

    private void moveFolder(UserAccount owner, MediaFolder folder, MediaFolder newParent) {
        if (newParent != null && newParent.getId().equals(folder.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Нельзя переместить папку в саму себя");
        }
        MediaFolder cursor = newParent;
        while (cursor != null) {
            if (cursor.getId().equals(folder.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Нельзя переместить папку внутрь себя");
            }
            cursor = cursor.getParent();
        }
        ensureDepth(newParent, subtreeHeight(folder));
        UUID parentId = newParent == null ? null : newParent.getId();
        if (folders.existsSiblingName(owner, parentId, folder.getName(), folder.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "NAME_TAKEN", "Папка с таким именем уже есть");
        }
        folder.setParent(newParent);
    }

    private int subtreeHeight(MediaFolder folder) {
        int max = 1;
        for (MediaFolder child : folders.findByParent(folder)) {
            max = Math.max(max, 1 + subtreeHeight(child));
        }
        return max;
    }

    private void ensureDepth(MediaFolder parent, int extraLevels) {
        int depth = 0;
        MediaFolder cursor = parent;
        while (cursor != null) {
            depth++;
            cursor = cursor.getParent();
        }
        if (depth + extraLevels > MAX_FOLDER_DEPTH) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Слишком глубокая вложенность папок");
        }
    }

    private MediaFolder resolveFolder(UserAccount owner, String folderId, boolean allowRootToken) {
        if (folderId == null || folderId.isBlank()) {
            return null;
        }
        if (allowRootToken && ("root".equalsIgnoreCase(folderId) || "null".equalsIgnoreCase(folderId))) {
            return null;
        }
        UUID id;
        try {
            id = UUID.fromString(folderId.trim());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Некорректная папка");
        }
        return requireOwnedFolder(owner, id);
    }

    private MediaFolder requireOwnedFolder(UserAccount owner, UUID folderId) {
        return folders.findByIdAndOwner(folderId, owner)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Папка не найдена"));
    }

    private MediaAsset requireOwnedAsset(UserAccount owner, UUID mediaId) {
        MediaAsset asset = require(mediaId);
        if (asset.getOwner() == null || !asset.getOwner().getId().equals(owner.getId()) || asset.getAttempt() != null
                || !asset.isInLibrary()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Файл не найден");
        }
        return asset;
    }

    private String uniqueName(UserAccount owner, UUID parentId, String base, UUID excludeId) {
        String candidate = base;
        int index = 2;
        while (folders.existsSiblingName(owner, parentId, candidate, excludeId)) {
            String suffix = " (" + index + ")";
            candidate = base.length() + suffix.length() > 120 ? base.substring(0, 120 - suffix.length()) + suffix : base + suffix;
            index++;
            if (index > 100) {
                return base + " " + UUID.randomUUID().toString().substring(0, 8);
            }
        }
        return candidate;
    }

    private String cleanFolderName(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Укажите название папки");
        }
        String name = raw.trim().replaceAll("\\s+", " ");
        if (name.length() > 120) {
            name = name.substring(0, 120);
        }
        if (name.isBlank() || name.contains("/") || name.contains("\\")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Некорректное название папки");
        }
        return name;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private ArrayNode pathNodes(MediaFolder folder) {
        ArrayNode path = mapper.createArrayNode();
        if (folder == null) {
            return path;
        }
        List<MediaFolder> chain = new ArrayList<>();
        MediaFolder cursor = folder;
        while (cursor != null) {
            chain.add(cursor);
            cursor = cursor.getParent();
        }
        Collections.reverse(chain);
        for (MediaFolder item : chain) {
            ObjectNode node = path.addObject();
            node.put("id", item.getId().toString());
            node.put("name", item.getName());
        }
        return path;
    }

    private StoredFile attemptAsset(TestAttempt attempt, UUID mediaId) {
        MediaAsset asset = require(mediaId);
        boolean ownUpload = asset.getAttempt() != null && asset.getAttempt().getId().equals(attempt.getId());
        boolean inTest = attempt.getTestVersion().getContentSnapshot().toString().contains(mediaId.toString());
        if (!ownUpload && !inTest) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Файл не найден");
        }
        return read(asset);
    }

    private MediaAsset store(MultipartFile file, UserAccount owner, TestAttempt attempt, MediaFolder folder) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Файл пустой");
        }
        String mime = normalizeMime(file.getContentType());
        if (file.getSize() > uploadLimitFor(mime, attempt)) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "Файл больше допустимого размера");
        }
        String extension = EXTENSIONS.get(mime);
        if (extension == null || !extensionMatches(file.getOriginalFilename(), extension, mime) || !allowed(mime, head(file))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FILE_TYPE", "Такой тип файла не принимается");
        }
        UUID id = UUID.randomUUID();
        String key = id + "." + extension;
        try {
            Files.createDirectories(directory());
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, directory().resolve(key));
            }
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL", "Не удалось сохранить файл");
        }
        MediaAsset asset = new MediaAsset();
        asset.setId(id);
        asset.setOwner(owner);
        asset.setAttempt(attempt);
        asset.setFolder(folder);
        asset.setStorageKey(key);
        asset.setOriginalFilename(cleanName(file.getOriginalFilename()));
        asset.setMimeType(mime);
        asset.setSizeBytes(file.getSize());
        asset.setCreatedAt(OffsetDateTime.now());
        return assets.save(asset);
    }

    private long uploadLimitFor(String mime, TestAttempt attempt) {
        if (attempt != null) {
            return platform.uploadLimit("recording");
        }
        String kind = mime == null ? "" : mime.substring(0, Math.max(0, mime.indexOf('/')));
        return PlatformService.UPLOAD_KINDS.contains(kind) ? platform.uploadLimit(kind) : platform.uploadLimit();
    }

    private byte[] head(MultipartFile file) {
        try (InputStream input = file.getInputStream()) {
            return input.readNBytes(16);
        } catch (IOException exception) {
            return new byte[0];
        }
    }

    private boolean extensionMatches(String filename, String expected, String mime) {
        String name = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        int dot = name.lastIndexOf('.');
        if (dot < 0) {
            return false;
        }
        String actual = name.substring(dot + 1);
        if ("jpg".equals(expected)) {
            return actual.equals("jpg") || actual.equals("jpeg");
        }
        if ("audio/mp4".equals(mime)) {
            return Set.of("m4a", "mp4").contains(actual);
        }
        return actual.equals(expected);
    }

    private String cleanName(String filename) {
        String name = filename == null ? "file" : Path.of(filename).getFileName().toString();
        name = name.replaceAll("[^\\p{L}\\p{N}._ -]", "");
        if (name.isBlank()) {
            return "file";
        }
        return name.length() > 200 ? name.substring(0, 200) : name;
    }

    private MediaAsset require(UUID id) {
        return assets.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Файл не найден"));
    }

    private StoredFile read(MediaAsset asset) {
        Path path = directory().resolve(asset.getStorageKey());
        if (!Files.exists(path)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Файл не найден");
        }
        return new StoredFile(new FileSystemResource(path), asset.getMimeType(), asset.getOriginalFilename());
    }

    public ObjectNode toAssetNode(MediaAsset asset) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", asset.getId().toString());
        node.put("filename", asset.getOriginalFilename());
        node.put("mimeType", asset.getMimeType());
        node.put("sizeBytes", asset.getSizeBytes());
        node.put("createdAt", asset.getCreatedAt().toString());
        if (asset.getFolder() == null) {
            node.putNull("folderId");
        } else {
            node.put("folderId", asset.getFolder().getId().toString());
        }
        return node;
    }

    public ObjectNode toNode(MediaAsset asset) {
        return toAssetNode(asset);
    }

    private ObjectNode toFolderNode(MediaFolder folder) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", folder.getId().toString());
        node.put("name", folder.getName());
        if (folder.getParent() == null) {
            node.putNull("parentId");
        } else {
            node.put("parentId", folder.getParent().getId().toString());
        }
        node.put("createdAt", folder.getCreatedAt().toString());
        return node;
    }

    public record StoredFile(Resource resource, String mimeType, String filename) {

        public ResponseEntity<Resource> toResponse() {
            ContentDisposition disposition = ContentDisposition.inline().filename(filename, StandardCharsets.UTF_8).build();
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                    .header("X-Content-Type-Options", "nosniff")
                    .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                    .contentType(MediaType.parseMediaType(mimeType))
                    .body(resource);
        }
    }
}
