package cl.duoc.mesatechcloud.ms_solicitudes.model;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity 
@Table (name= "solicitudes")
@Getter 
@Setter
@NoArgsConstructor   // chicas: de lombok, nos evitamos escribir a mano getter, setter y constrictores.
@AllArgsConstructor 


public class Solicitud {
 
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @NotBlank  //para que el campo no venga vacio
        private String titulo;

        @NotBlank 
        private String descripcion;

        private String categoria;

        private String prioridad;

        private String usuarioId;    //ojo que es el JWT que valida el BFF

        @Enumerated (EnumType.STRING)
        private Estado estado;

        private LocalDateTime fechaCreacion;

        @PrePersist 
        public void prePersist(){
                if (estado == null){
                    estado =Estado.CREADA;
                }
                if (fechaCreacion == null){
                    fechaCreacion = LocalDateTime.now();
                }

        }
}
