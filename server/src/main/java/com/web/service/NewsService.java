package com.web.service;

import com.web.entity.News;
import com.web.repository.NewsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class NewsService {

    @Autowired
    private NewsRepository newsRepository;

    public List<News> top6News(){
        List<News> news = newsRepository.top6News();
        return news;
    }
}
