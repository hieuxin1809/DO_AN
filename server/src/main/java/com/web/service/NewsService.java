package com.web.service;

import com.web.entity.News;
import com.web.repository.NewsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Service quản lý tin tức y tế và tiêm chủng.
 */
@Component
public class NewsService {

    @Autowired
    private NewsRepository newsRepository;

    /**
     * Lấy top 6 bài viết tin tức mới nhất hiển thị ngoài trang chủ.
     */
    public List<News> top6News(){
        List<News> news = newsRepository.top6News();
        return news;
    }
}
