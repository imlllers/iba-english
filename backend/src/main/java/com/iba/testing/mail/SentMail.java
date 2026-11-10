package com.iba.testing.mail;

public record SentMail(String to, String subject, String text, String html) {

    public SentMail(String to, String subject, String text) {
        this(to, subject, text, null);
    }
}
