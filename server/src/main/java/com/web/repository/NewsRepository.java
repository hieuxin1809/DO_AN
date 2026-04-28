package com.web.repository;

import com.web.entity.News;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface NewsRepository extends JpaRepository<News, Long> {

    @Query(value = "SELECT * FROM news order by news_id desc limit 6", nativeQuery = true)
    List<News> top6News();
}
