package com.web.repository;

import com.web.entity.Authority;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface AuthorityRepository extends JpaRepository<Authority,Long> {

    @Query("select a from Authority a where a.name = ?1")
    public Authority findByName(String name);

    @Query("select a from Authority a")
    public List<Authority> findAll();
}
