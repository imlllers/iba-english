package com.iba.testing.scale;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.security.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teacher/score-scales")
public class TeacherScoreScaleController {

    private final ScoreScaleService scales;

    public TeacherScoreScaleController(ScoreScaleService scales) {
        this.scales = scales;
    }

    @GetMapping
    public Object list() {
        return scales.list(CurrentUser.require().getId());
    }

    @PutMapping
    public Object replace(@RequestBody JsonNode body) {
        return scales.replace(CurrentUser.require().getId(), body);
    }
}
