package com.iba.testing.media;

import com.iba.testing.attempt.TestAttempt;
import com.iba.testing.user.UserAccount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, UUID> {

    @Query("""
            select m from MediaAsset m
            where m.owner = :owner
              and m.attempt is null
              and m.inLibrary = true
              and ((:folderId is null and m.folder is null) or m.folder.id = :folderId)
              and (:query = '' or lower(m.originalFilename) like lower(concat('%', :query, '%')))
              and (:kind = '' or m.mimeType like concat(:kind, '/%'))
            """)
    Page<MediaAsset> searchInFolder(UserAccount owner, UUID folderId, String query, String kind, Pageable pageable);

    @Query("""
            select m from MediaAsset m
            where m.owner = :owner
              and m.attempt is null
              and m.inLibrary = true
              and (:query = '' or lower(m.originalFilename) like lower(concat('%', :query, '%')))
              and (:kind = '' or m.mimeType like concat(:kind, '/%'))
            """)
    Page<MediaAsset> searchOwned(UserAccount owner, String query, String kind, Pageable pageable);

    List<MediaAsset> findByOwnerAndAttemptIsNull(UserAccount owner);

    List<MediaAsset> findByFolder(MediaFolder folder);

    @Modifying(clearAutomatically = true)
    @Query("update MediaAsset m set m.folder = null where m.folder = :source")
    int clearFolder(MediaFolder source);

    @Modifying(clearAutomatically = true)
    @Query("update MediaAsset m set m.folder = :target where m.folder = :source")
    int moveAllFromFolder(MediaFolder source, MediaFolder target);

    long countByAttempt(TestAttempt attempt);

    List<MediaAsset> findByAttempt(TestAttempt attempt);
}
