package cl.duoc.mesatechcloud.ms_solicitudes.repository;

import cl.duoc.mesatechcloud.ms_solicitudes.model.Solicitud;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

//Se ocupo interface y no clase, porque Spring genera la consultas sql equivalente SELECT * FROM solicitudes WHERE usuario_id = ? sin escribir consulta


public interface SolicitudRepository extends JpaRepository <Solicitud,Long> {
    List <Solicitud> findByUsuarioId (String usuarioId);                        //findbyusario es para GET /v1/solicitudes/xx no olvidar!

    
}