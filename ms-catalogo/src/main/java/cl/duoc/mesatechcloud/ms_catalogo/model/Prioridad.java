package cl.duoc.mesatechcloud.ms_catalogo.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "prioridades")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Prioridad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String nombre;

    private Integer nivel;

    private Boolean activo = true;

    @PrePersist
    public void prePersist() {
        if (activo == null) {
            activo = true;
        }
    }
}