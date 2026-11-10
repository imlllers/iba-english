package com.iba.testing.media;

import com.iba.testing.user.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MediaFolderRepository extends JpaRepository<MediaFolder, UUID> {

    @Query("""
            select f from MediaFolder f
            where f.owner = :owner
              and ((:parentId is null and f.parent is null) or f.parent.id = :parentId)
            order by lower(f.name) asc
            """)
    List<MediaFolder> findChildren(UserAccount owner, UUID parentId);

    @Query("""
            select f from MediaFolder f
            where f.owner = :owner
              and lower(f.name) like lower(concat('%', :query, '%'))
            order by lower(f.name) asc
            """)
    List<MediaFolder> searchByName(UserAccount owner, String query);

    @Query("""
            select count(f) > 0 from MediaFolder f
            where f.owner = :owner
              and lower(f.name) = lower(:name)
              and ((:parentId is null and f.parent is null) or f.parent.id = :parentId)
              and (:excludeId is null or f.id <> :excludeId)
            """)
    boolean existsSiblingName(UserAccount owner, UUID parentId, String name, UUID excludeId);

    Optional<MediaFolder> findByIdAndOwner(UUID id, UserAccount owner);

    List<MediaFolder> findByParent(MediaFolder parent);

    @Query("select f from MediaFolder f left join fetch f.parent where f.owner = :owner order by lower(f.name) asc")
    List<MediaFolder> findAllOwned(UserAccount owner);
}
