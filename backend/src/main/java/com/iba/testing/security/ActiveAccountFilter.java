package com.iba.testing.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iba.testing.common.response.ApiError;
import com.iba.testing.user.UserAccountRepository;
import com.iba.testing.user.UserStatus;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class ActiveAccountFilter extends OncePerRequestFilter {

    private final UserAccountRepository users;
    private final ObjectMapper objectMapper;

    public ActiveAccountFilter(UserAccountRepository users, ObjectMapper objectMapper) {
        this.users = users;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AppUserPrincipal principal) {
            var account = users.findById(principal.getId()).orElse(null);
            if (account == null || account.getStatus() != UserStatus.ACTIVE) {
                SecurityContextHolder.clearContext();
                HttpSession session = request.getSession(false);
                if (session != null) {
                    session.invalidate();
                }
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setCharacterEncoding("UTF-8");
                response.setContentType("application/json;charset=UTF-8");
                objectMapper.writeValue(response.getWriter(), new ApiError("BLOCKED", "Учётная запись заблокирована"));
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}
