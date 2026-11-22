package com.iba.testing.config;

import com.iba.testing.media.MediaService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(200)
public class MediaDurationBackfill implements ApplicationRunner {

    private final MediaService media;

    public MediaDurationBackfill(MediaService media) {
        this.media = media;
    }

    @Override
    public void run(ApplicationArguments args) {
        media.backfillMissingDurations();
    }
}
