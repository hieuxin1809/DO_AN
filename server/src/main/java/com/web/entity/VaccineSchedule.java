package com.web.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import javax.persistence.*;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "vaccine_schedule")
@Getter
@Setter
public class VaccineSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    private Date startDate;

    private Date endDate;

    private Integer limitPeople;

    private Timestamp createdDate;

    private Long idPreSchedule;

    private BigDecimal price; // Thêm thuộc tính này nếu chưa có

    private String description;

    @ManyToOne
    @JoinColumn(name = "vaccine_id")
    private Vaccine vaccine;

    @ManyToOne
    @JoinColumn(name = "center_id")
    private Center center;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User user;

    @Transient
    private Boolean inStock = false;

    @OneToMany(mappedBy = "vaccineSchedule", cascade = CascadeType.REMOVE)
    @JsonIgnore
    private List<VaccineScheduleTime> vaccineScheduleTimes;
}
