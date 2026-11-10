package com.iba.testing.security;

import com.iba.testing.user.UserAccountRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserAccountRepository users;

    public AppUserDetailsService(UserAccountRepository users) {
        this.users = users;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return users.findByEmailIgnoreCase(username)
                .map(AppUserPrincipal::new)
                .orElseThrow(() -> new UsernameNotFoundException("Пользователь не найден"));
    }
}
