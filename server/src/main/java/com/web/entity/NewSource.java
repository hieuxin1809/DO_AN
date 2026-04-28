package com.web.entity;

import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;

@Entity
@Table(name = "news_sources")
@Getter
@Setter
public class NewSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "source_id")
    private Long id;

    private String sourceName;

    private String sourceUrl;

    @ManyToOne
    @JoinColumn(name = "news_id")
    private News news;
}
