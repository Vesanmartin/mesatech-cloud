package cl.duoc.mesatechcloud.ms_solicitudes.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * EP2: COPIA local de una categoria recibida por RabbitMQ. Vive en la RDS de Solicitudes.
 * categoriaId conserva el id de ORIGEN (RDS Catalogo); el id propio es solo tecnico.
 * Solicitudes nunca consulta la base de Catalogo: usa esta tabla.
 */
@Entity
@Table(name = "categorias_locales")
@Getter
@Setter
@NoArgsConstructor
public class CategoriaLocal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "categoria_id", nullable = false, unique = true)
    private Long categoriaId;

    @Column(nullable = false, length = 255)
    private String nombre;

    @Column(name = "event_id", nullable = false, length = 36)
    private String eventId;

    @Column(name = "fecha_evento", nullable = false, length = 40)
    private String fechaEvento;

    @Column(name = "fecha_recepcion", nullable = false)
    private LocalDateTime fechaRecepcion;

    @PrePersist
    public void prePersist() {
        if (fechaRecepcion == null) {
            fechaRecepcion = LocalDateTime.now();
        }
    }
}
